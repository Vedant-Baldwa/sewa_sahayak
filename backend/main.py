from fastapi import FastAPI, File, UploadFile, Form, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
import mimetypes
import time
import uuid
import os
import traceback

# Load environment variables from .env file
load_dotenv()

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

app = FastAPI(title="Sewa Sahayak PWA API (Mock)")

# CORS Middleware to allow requests from the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print(f"CORS origins configured for: {_frontend_url}")

# Session Middleware for Authlib OAuth
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY") or os.urandom(24).hex())

oauth = OAuth()
oauth.register(
    name='cognito',
    client_id=os.getenv("COGNITO_CLIENT_ID"),
    client_secret=os.getenv("COGNITO_CLIENT_SECRET"),
    server_metadata_url=f"https://cognito-idp.{os.getenv('AWS_REGION', 'ap-south-1')}.amazonaws.com/{os.getenv('COGNITO_USER_POOL_ID')}/.well-known/openid-configuration",
    client_kwargs={'scope': 'email openid phone'}
)

@app.get("/api/health")
def read_root():
    return {"message": "Sewa Sahayak AWS API Running"}

# --- AWS Configuration & Initialization ---
import boto3
from botocore.exceptions import ClientError, BotoCoreError, NoCredentialsError, NoCredentialsError
from fastapi import HTTPException

S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
DYNAMODB_TABLE_NAME = os.getenv("DYNAMODB_TABLE")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
USERS_TABLE_NAME = os.getenv("USERS_TABLE_NAME")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    cognito_client = boto3.client('cognito-idp', region_name=AWS_REGION)
    rekognition_client = boto3.client('rekognition', region_name=AWS_REGION)
    dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
    reports_table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    users_table = dynamodb.Table(USERS_TABLE_NAME)
    print("AWS Services (S3, Cognito, Rekognition, DynamoDB) configured successfully.")
except Exception as e:
    print(f"Warning: Failed to initialize AWS clients. Ensure credentials are set. Error: {e}")
    s3_client, cognito_client, rekognition_client, reports_table, users_table = None, None, None, None, None

# --- Engineer 1: Identity & Authorization (OAuth 2.0 Hosted UI) ---

@app.get("/login")
async def login(request: Request):
    redirect_uri = f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/authorize"
    return await oauth.cognito.authorize_redirect(request, redirect_uri)

@app.get("/authorize")
async def authorize(request: Request):
    try:
        token = await oauth.cognito.authorize_access_token(request)
        user = token.get('userinfo')
        if user:
            request.session['user'] = user
            request.session['id_token'] = token.get('id_token')
            request.session['access_token'] = token.get('access_token')
            
            uuid_sub = user.get('sub')
            user_metadata = None
            if uuid_sub and users_table:
                try:
                    db_response = users_table.get_item(Key={'userId': uuid_sub})
                    user_metadata = db_response.get('Item')

                    # First login — create a new user record
                    if not user_metadata:
                        import time as _time
                        user_metadata = {
                            'userId':       uuid_sub,
                            'email':        user.get('email', ''),
                            'phone_number': user.get('phone_number', ''),
                            'createdAt':    str(int(_time.time())),
                        }
                        users_table.put_item(Item=user_metadata)
                        print(f"New user created in DynamoDB: {uuid_sub}")
                    else:
                        print(f"Returning user found in DynamoDB: {uuid_sub}")

                except Exception as e:
                    print(f"Warning DB: {e}")
            
            request.session['userData'] = user_metadata
            return RedirectResponse(url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/")
            
    except Exception as e:
        print(f"OAuth Callback Error: {e}")
        # fallback for mock testing without real AWS flow
        user = {"email": "mock@example.com", "sub": "mock-sub-uuid", "phone_number": "+910000000000"}
        request.session['user'] = user
        request.session['id_token'] = "mock-token"
        
        if users_table:
            try:
                import time as _time
                user_metadata = {
                    'userId':       user['sub'],
                    'email':        user['email'],
                    'phone_number': user['phone_number'],
                    'createdAt':    str(int(_time.time())),
                }
                users_table.put_item(Item=user_metadata)
                request.session['userData'] = user_metadata
                print(f"Created mocked user in DynamoDB: {user['sub']}")
            except Exception as db_e:
                print(f"Warning DB Mock Insert: {db_e}")
                
        return RedirectResponse(url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/")
        
    return JSONResponse({"error": "Failed to login"}, status_code=400)

@app.get("/api/auth/me")
async def get_current_user(request: Request):
    user = request.session.get('user')
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    return {
        "user": user, 
        "userData": request.session.get('userData'),
        "token": request.session.get('id_token')
    }

@app.post("/api/auth/logout")
async def logout(request: Request):
    request.session.pop('user', None)
    request.session.pop('id_token', None)
    return {"message": "Logged out successfully"}

class DraftRequest(BaseModel):
    damageType: str | None = None
    severity: str | None = None
    jurisdiction: str | None = None
    ward: str | None = None
    description: str | None = None
    lat: float | str | None = None
    lng: float | str | None = None

# --- Engineer 1: Object Storage (S3 Evidence Vault) ---
@app.post("/api/evidence/upload")
async def upload_evidence_to_s3(evidence: UploadFile = File(...), ticketId: str = Form(...)):
    print(f"S3 Upload Request: ticketId={ticketId}, filename={evidence.filename}, content_type={evidence.content_type}")
    if not s3_client:
        print(f"[Mock S3] Uploading {evidence.filename} for ticket {ticketId}")
        time.sleep(1)
        return {"message": "Mock upload successful", "s3_uri": f"s3://mock-bucket/reports/{ticketId}/{evidence.filename}"}
    
    try:
        if not S3_BUCKET_NAME:
            print("Error: S3_BUCKET_NAME not set in environment.")
            raise HTTPException(status_code=500, detail="S3_BUCKET_NAME not configured")
            
        s3_key = f"reports/{ticketId}/{evidence.filename or 'evidence.jpg'}"
        content_type = evidence.content_type or mimetypes.guess_type(s3_key)[0] or "application/octet-stream"
        
        print(f"Uploading to S3: bucket={S3_BUCKET_NAME}, key={s3_key}, type={content_type}")
        print(f"File Object Type: {type(evidence.file)}")
        
        # Seek to beginning just in case
        evidence.file.seek(0)
        
        s3_client.upload_fileobj(
            evidence.file,
            S3_BUCKET_NAME,
            s3_key,
            ExtraArgs={'ContentType': content_type}
        )
        print(f"S3 Upload Successful: {s3_key}")
        return {
            "message": "Upload successful",
            "s3_uri": f"s3://{S3_BUCKET_NAME}/{s3_key}"
        }
    except Exception as e:
        print(f"CRITICAL S3 Upload Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload evidence to S3: {str(e)}")

# --- Engineer 1: Database (DynamoDB Reports Table) ---
@app.post("/api/reports/save")
async def save_report_dynamodb(data: dict):
    if not reports_table:
        print(f"[Mock DynamoDB] Saving report: {data}")
        time.sleep(1)
        return {"message": "Mock save successful", "ticketId": data.get("ticketId")}
    
    try:
        # Convert any float values to strings to satisfy DynamoDB requirements easily
        # Ensure timestamp is string or int, not a complex type
        if 'lat' in data and data['lat'] is not None: data['lat'] = str(data['lat'])
        if 'lng' in data and data['lng'] is not None: data['lng'] = str(data['lng'])
        
        reports_table.put_item(Item=data)
        return {"message": "Report saved successfully", "ticketId": data.get("ticketId")}
    except Exception as e:
        print(f"DynamoDB Save Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save report to DynamoDB")


# Feature 2 Endpoint
@app.post("/api/transcribe")
async def mock_transcribe(audio: UploadFile = File(...)):
    print(f"[AWS Transcribe] Started transcription for {audio.filename}")
    time.sleep(1.5) # Simulate processing
    return {
        "transcript": "यहाँ मुख्य सड़क पर एक बहुत बड़ा गड्ढा है, जिससे काफी पानी भर गया है। स्थिति गंभीर है।",
        "detectedLanguage": "hi-IN",
        "extractedData": {
            "damage_type": "pothole and waterlogging",
            "location_description": "main road",
            "severity_keywords": ["very big", "serious", "गंभीर", "बड़ा गड्ढा"]
        },
        "confidence": 0.94,
        "piiRedacted": True
    }

# Feature 3 Endpoint (Live Bedrock Nova Pro)
@app.post("/api/analyze")
async def analyze_media(media: UploadFile = File(...), type: str = Form(...)):
    if not bedrock_runtime:
        print(f"[Mock Bedrock Nova Pro] Visual analysis for: {type}")
        time.sleep(1.0)
        return {
            "damage_type": "pothole",
            "severity": "high",
            "confidence_score": 0.95,
            "suggested_description": "Mock analysis of identified issue.",
            "bounding_box": {"x": 0.2, "y": 0.4, "w": 0.5, "h": 0.3}
        }
    
    try:
        content = await media.read()
        model_id = os.getenv("ANALYSIS_MODEL_ID", "amazon.nova-pro-v1:0")
        
        print(f"Calling Bedrock {model_id} for analysis. Media size: {len(content)} bytes. Type: {media.content_type}")
        
        # Determine format for multimodal block
        ext = media.filename.split('.')[-1].lower() if '.' in media.filename else ""
        if ext == "jpg": ext = "jpeg"
        
        media_block = {}
        if "image" in media.content_type or ext in ["jpg", "jpeg", "png", "webp"]:
            media_block = {
                "image": {
                    "format": ext if ext in ["jpeg", "png", "webp", "gif"] else "jpeg",
                    "source": {"bytes": content}
                }
            }
        else:
            media_block = {
                "video": {
                    "format": ext if ext in ["mp4", "mkv", "mov", "webm"] else "mp4",
                    "source": {"bytes": content}
                }
            }
            
        message = {
            "role": "user",
            "content": [
                media_block,
                {
                    "text": "Analyze this civic issue. Provide a concise 1-2 sentence summary of what is happening. Identify the damage_type (e.g. pothole, broken pipe, etc.) and severity (low, medium, high). Return ONLY JSON with fields: { 'damage_type': string, 'severity': string, 'confidence': float, 'suggested_description': string }. Ensure the summary is empathetic and professional."
                }
            ]
        }
        
        import json
        import re
        
        response = bedrock_runtime.converse(
            modelId=model_id,
            messages=[message],
            inferenceConfig={"maxTokens": 1024, "temperature": 0.1}
        )
        
        raw_output = response['output']['message']['content'][0]['text']
        print(f"Bedrock Raw Analysis Output: {raw_output}")
        
        # Robust JSON extraction
        json_match = re.search(r'\{.*\}', raw_output, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            # Basic cleanup for common LLM JSON errors (like single quotes)
            json_str = json_str.replace("'", '"')
            try:
                analysis = json.loads(json_str)
            except json.JSONDecodeError:
                print("Failed to parse JSON using standard loads, attempting simple fallback")
                # If it's really messy, just use the raw output or a default
                analysis = {}
        else:
            print("No JSON found in Bedrock output")
            analysis = {}
        
        return {
            "damage_type": analysis.get("damage_type") or analysis.get("issue_type") or "Civic Issue",
            "severity": analysis.get("severity") or "Medium",
            "confidence_score": float(analysis.get("confidence", analysis.get("confidence_score", 0.9))),
            "suggested_description": analysis.get("suggested_description") or "Analysis of the uploaded evidence.",
            "bounding_box": {"x": 0, "y": 0, "w": 0, "h": 0} 
        }
        
    except Exception as e:
        print(f"Bedrock Analysis Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

from fastapi.responses import StreamingResponse
from PIL import Image, ImageDraw
import io

# Feature 4 Endpoint
@app.post("/api/redact")
async def mock_redact(media: UploadFile = File(...)):
    print(f"[Amazon Rekognition] Scanning media for PII...")
    
    # Read the file bytes
    image_bytes = await media.read()
    
    if not rekognition_client:
        print("[Mock Rekognition] Returning unredacted mock image because client is None.")
        return StreamingResponse(io.BytesIO(image_bytes), media_type=media.content_type, headers={
            "X-Faces-Redacted": "0", "X-Plates-Redacted": "0"
        })
        
    try:
        # Detect Faces
        face_response = rekognition_client.detect_faces(Image={'Bytes': image_bytes})
        faces = face_response.get('FaceDetails', [])
        
        # Detect Text
        text_response = rekognition_client.detect_text(Image={'Bytes': image_bytes})
        texts = text_response.get('TextDetections', [])
        
        # Only care about text lines that look like numbers/plates for this mock
        # For a full implementation, could check bounding boxes specifically or use Rekognition text categorization
        plates = [t for t in texts if t['Type'] == 'LINE']
        
        # Open Image with Pillow
        try:
            image = Image.open(io.BytesIO(image_bytes))
            draw = ImageDraw.Draw(image)
            width, height = image.size
            
            # Draw black boxes over faces
            for face in faces:
                box = face['BoundingBox']
                left = width * box['Left']
                top = height * box['Top']
                right = left + (width * box['Width'])
                bottom = top + (height * box['Height'])
                draw.rectangle([left, top, right, bottom], fill="black")
                
            # Draw black boxes over text/plates
            for text in plates:
                # In a real app we would heuristically check if text resembles A-Z 0-9 license plate
                # For demonstration, we'll redact all detected LINE texts.
                box = text['Geometry']['BoundingBox']
                left = width * box['Left']
                top = height * box['Top']
                right = left + (width * box['Width'])
                bottom = top + (height * box['Height'])
                draw.rectangle([left, top, right, bottom], fill="black")
                
            # Save the redacted image to a bytes buffer
            output_buffer = io.BytesIO()
            img_format = image.format if image.format else "JPEG"
            image.save(output_buffer, format=img_format)
            output_buffer.seek(0)
            
            headers = {
                "X-Faces-Redacted": str(len(faces)),
                "X-Plates-Redacted": str(len(plates)),
                "Access-Control-Expose-Headers": "X-Faces-Redacted, X-Plates-Redacted"
            }
            
            print(f"[Amazon Rekognition] Successfully redacted {len(faces)} faces and {len(plates)} text regions.")
            return StreamingResponse(output_buffer, media_type=media.content_type, headers=headers)
            
        except Exception as img_e:
            print(f"Pillow Image Error: {img_e}")
            # If it's a video or unrecognized format, skip redaction
            return StreamingResponse(io.BytesIO(image_bytes), media_type=media.content_type, headers={
                "X-Faces-Redacted": "0", "X-Plates-Redacted": "0"
            })
            
    except Exception as e:
        print(f"Rekognition Error: {e}")
        return StreamingResponse(io.BytesIO(image_bytes), media_type=media.content_type, headers={
            "X-Faces-Redacted": "0", "X-Plates-Redacted": "0"
        })

class DraftRequest(BaseModel):
    damageType: str | None = None
    severity: str | None = None
    jurisdiction: str | None = None
    ward: str | None = None
    description: str | None = None
    lat: float | str | None = None
    lng: float | str | None = None

# Feature 6 Endpoint (Live Bedrock Draft Compilation)
@app.post("/api/draft")
async def generate_draft(data: dict):
    if not bedrock_runtime:
        print(f"[Mock Bedrock] Generating draft for data: {data}")
        time.sleep(1.0)
        return {
            "applicantName": "A Citizen",
            "phoneNumber": "+91-9876543210",
            "damageType": "Civic Issue",
            "severity": "Medium",
            "jurisdiction": "Municipal Corp",
            "ward": "Default Ward",
            "description": "Mock draft content.",
        }

    try:
        import json
        import re
        
        # Extract structured data from the request
        analysis = data.get('analysis') or {}
        jurisdiction = data.get('jurisdiction') or {}
        transcription = data.get('transcription') or {}
        
        damage_type = analysis.get('damage_type', 'civic issue')
        severity = analysis.get('severity', 'medium')
        ai_confidence = analysis.get('confidence_score', 0.0)
        ai_description = analysis.get('suggested_description', '')
        
        portal_name = jurisdiction.get('portal_name', 'Municipal Corporation')
        ward_district = jurisdiction.get('ward_district', 'Local Ward')
        jurisdiction_level = jurisdiction.get('jurisdiction_level', 'Municipal')
        lat = data.get('lat') or (jurisdiction.get('mapped_coordinates') or {}).get('lat', 'N/A')
        lng = data.get('lng') or (jurisdiction.get('mapped_coordinates') or {}).get('lng', 'N/A')
        
        voice_transcript = (transcription.get('transcript') or '') if isinstance(transcription, dict) else str(transcription)
        citizen_note = data.get('description', '')
        
        model_id = os.getenv("DRAFT_MODEL_ID", "amazon.nova-pro-v1:0")
        print(f"Calling Bedrock {model_id} for draft generation with damage='{damage_type}', severity='{severity}'")
        
        prompt = f"""You are an expert Indian civic complaint letter writer. A citizen has used the Sewa Sahayak app to report a public infrastructure problem. Generate a compelling, formal, and authoritative complaint application letter that will compel a government official to take immediate action.

## EVIDENCE GATHERED BY THE APP

**AI Visual Analysis (Amazon Nova Pro)**
- Damage Type: {damage_type}
- Severity: {severity}
- AI Confidence Score: {round(float(ai_confidence) * 100, 1)}%
- AI Visual Summary: "{ai_description}"

**GPS Location Data**
- Target Authority: {portal_name}
- Ward / District: {ward_district}
- Jurisdiction Level: {jurisdiction_level}
- GPS Coordinates: Latitude {lat}, Longitude {lng}

**Citizen Voice Note (Transcribed)**
- "{voice_transcript or 'No voice note provided.'}"

**Additional Citizen Notes**
- "{citizen_note or 'None provided.'}"

## YOUR TASK

Write a formal complaint letter that:
1. Opens with a respectful salutation to the appropriate authority (use {portal_name})
2. Clearly states the problem: the AI has confirmed a **{damage_type}** of **{severity} severity** at GPS location ({lat}, {lng}) in **{ward_district}**
3. Articulates the public safety risk and urgency (mention the AI confidence of {round(float(ai_confidence) * 100, 1)}%)
4. References the citizen's own voice testimony if provided
5. Requests immediate inspection and rectification with a reasonable deadline (7-14 days)
6. Closes professionally

In the "description" field, write the COMPLETE formal letter text (100-200 words minimum).

## OUTPUT FORMAT

Return ONLY a valid JSON object. No markdown, no extra text. Strictly follow this schema:
{{
  "applicantName": "Concerned Citizen",
  "phoneNumber": "Provided via App",
  "damageType": "{damage_type}",
  "severity": "{severity}",
  "jurisdiction": "{portal_name}",
  "ward": "{ward_district}",
  "description": "FULL FORMAL COMPLAINT LETTER TEXT HERE"
}}"""

        response = bedrock_runtime.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 1500, "temperature": 0.4}
        )
        
        raw_draft = response['output']['message']['content'][0]['text']
        print(f"Bedrock Raw Draft Output (first 300 chars): {raw_draft[:300]}")
        
        # Robust JSON extraction
        json_match = re.search(r'\{.*\}', raw_draft, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                # Try to clean it up
                json_str = re.sub(r'[\x00-\x1f\x7f]', '', json_str)  # Remove control chars
                try:
                    return json.loads(json_str)
                except:
                    print("Draft JSON parse failed, using text fallback.")
        
        # Final fallback: return with the raw text as the description
        return {
            "applicantName": "Concerned Citizen",
            "phoneNumber": "Provided via App",
            "damageType": damage_type.title(),
            "severity": severity.title(),
            "jurisdiction": portal_name,
            "ward": ward_district,
            "description": raw_draft if len(raw_draft) > 50 else f"A formal complaint regarding a {severity} severity {damage_type} at {ward_district} has been initiated."
        }
        
    except Exception as e:
        print(f"Draft Generation Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Draft generation failed: {str(e)}")

# Serve static assets from Vite dist folder
app.mount("/assets", StaticFiles(directory="../dist/assets"), name="assets")

# Optional: serve public files like images/icons if they exist in dist root
@app.get("/{file_name:path}")
async def serve_static_root(file_name: str):
    if file_name.startswith("api/"):
        return
    
    file_path = os.path.join("../dist", file_name)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # SPA fallback: Serve index.html for unknown routes
    return FileResponse("../dist/index.html")
