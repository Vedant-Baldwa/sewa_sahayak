import os
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

from fastapi import FastAPI, File, UploadFile, Form
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
from aws_services.transcribe import upload_audio_to_s3, start_transcription_job, poll_transcription_job, extract_transcript
from aws_services.location import reverse_geocode, verify_address
from aws_services.bedrock import get_portal_routing
import json
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
    if not s3_client:
        print(f"[Mock S3] Uploading {evidence.filename} for ticket {ticketId}")
        time.sleep(1)
        return {"message": "Mock upload successful", "s3_uri": f"s3://mock-bucket/reports/{ticketId}/{evidence.filename}"}
    
    try:
        s3_key = f"reports/{ticketId}/{evidence.filename}"
        s3_client.upload_fileobj(
            evidence.file,
            S3_BUCKET_NAME,
            s3_key,
            ExtraArgs={'ContentType': evidence.content_type}
        )
        return {
            "message": "Upload successful",
            "s3_uri": f"s3://{S3_BUCKET_NAME}/{s3_key}"
        }
    except Exception as e:
        print(f"S3 Upload Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload evidence to S3")

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


# Feature 2 Endpoint: Voice Transcription
@app.post("/api/transcribe")
async def mock_transcribe(audio: UploadFile = File(...)):
    print(f"[AWS Transcribe] Started transcription for {audio.filename}")
    print(f"DEBUG AWS_ACCESS_KEY_ID in main.py: {os.getenv('AWS_ACCESS_KEY_ID')}")
    print(f"DEBUG S3_BUCKET_NAME in main.py: {os.getenv('S3_BUCKET_NAME')}")
    
    # 1. Save uploaded file temporarily
    temp_dir = os.path.join(os.getcwd(), "temp")
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{audio.filename}")
    
    with open(temp_path, "wb") as buffer:
        buffer.write(await audio.read())
        
    bucket_name = os.getenv("S3_BUCKET_NAME", "sewa-sahayak-evidence-vault-mumbai")
    s3_object_name = f"audio/{os.path.basename(temp_path)}"
    
    # 2. Upload to S3
    print(f"Uploading {temp_path} to S3 bucket {bucket_name} as {s3_object_name}...")
    s3_uri = upload_audio_to_s3(temp_path, bucket_name, s3_object_name)
    
    if not s3_uri:
        return {"error": "Failed to upload audio to S3"}
        
    # 3. Start Transcribe Job
    job_name = f"sewa_sahayak_transcribe_{uuid.uuid4().hex[:8]}"
    print(f"Starting Transcription Job: {job_name} for URI: {s3_uri}...")
    
    # Extract extension for format
    ext = audio.filename.split('.')[-1].lower()
    format_mapping = {'webm': 'webm', 'mp3': 'mp3', 'm4a': 'm4a', 'mp4': 'mp4', 'wav': 'wav'}
    audio_format = format_mapping.get(ext, 'webm')
    
    started_job = start_transcription_job(job_name, s3_uri, audio_format)
    if not started_job:
        return {"error": "Failed to start transcription job"}
        
    # 4. Poll and wait for completion
    print(f"Polling job {job_name} for completion...")
    result = poll_transcription_job(job_name, max_retries=60, wait_seconds=3)
    
    if result.get("TranscriptionJobStatus") != "COMPLETED":
        return {"error": "Transcription failed or timed out", "details": result}
        
    # 5. Extract the text
    print(f"Job {job_name} completed. Extracting transcript...")
    transcript_text = extract_transcript(result)
    detected_language = result.get("LanguageCode", "unknown")
    
    # Clean up temp file
    try:
        os.remove(temp_path)
    except Exception as e:
        print(f"Failed to remove temp file: {e}")
        
    # Note: PII redaction on transcript and specific damage extraction 
    # would ideally be done via Amazon Comprehend or Bedrock here.
    # For now, we return the raw transcript.
    
    return {
        "transcript": transcript_text,
        "detectedLanguage": detected_language,
        "extractedData": {
            "damage_type": "civic issue (requires AI extraction)",
            "location_description": "extracted from transcript",
            "severity_keywords": []
        },
        "confidence": 0.95,
        "piiRedacted": False
    }

# Feature 3 Endpoint
@app.post("/api/analyze")
async def mock_analyze(media: UploadFile = File(...), type: str = Form(...)):
    print(f"[Amazon Bedrock Nova Pro] Started visual analysis for: {type}")
    time.sleep(2.0) # Simulate LLM analysis
    return {
        "damage_type": "pothole",
        "severity": "high",
        "confidence_score": 0.98,
        "suggested_description": "Deep pothole identified on asphalt road surface. Edges are jagged indicating recent widening. Poses immediate risk to two-wheelers.",
        "bounding_box": {"x": 0.2, "y": 0.4, "w": 0.5, "h": 0.3}
    }

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

class RouteRequest(BaseModel):
    lat: float | None = None
    lng: float | None = None
    state: str | None = None
    city: str | None = None
    address: str | None = None

# Load PORTAL_DB
try:
    with open(os.path.join(os.path.dirname(__file__), "portals.json"), "r") as f:
        PORTALS_DB = json.load(f)
except Exception:
    PORTALS_DB = {}

# Feature 5 Endpoint: Cognitive Dispatcher
@app.post("/api/route")
async def route_complaint(route_req: RouteRequest):
    print(f"[Cognitive Dispatcher] Processing routing request: {route_req}")
    structured_address = None
    
    # Scenario A: High-Trust Reporting (GPS Enabled)
    if route_req.lat is not None and route_req.lng is not None:
        print("[Location Service] Using Reverse Geocoding...")
        structured_address = reverse_geocode(route_req.lat, route_req.lng)
        
    # Scenario B: Manual Reporting (No GPS / Gallery Uploads)
    elif route_req.state and route_req.city and route_req.address:
        print("[Location Service] Using Geocoding Verification...")
        structured_address = verify_address(route_req.state, route_req.city, route_req.address)
        
    if not structured_address:
        if route_req.address or route_req.city or route_req.state:
            location_string = f"{route_req.address or ''}, {route_req.city or ''}, {route_req.state or ''}".strip(", ")
        else:
            return {
                "structured_address": None,
                "routing": {
                    "portal_name": "CPGRAMS",
                    "portal_url": PORTALS_DB.get("CENTRAL", {}).get("CPGRAMS", "https://pgportal.gov.in/Registration"),
                    "reasoning": "Insufficient location data provided. Routing to the central CPGRAMS portal as a default fallback."
                }
            }
    else:
        location_string = (
            structured_address.get("Address")
            if structured_address
            else f"{route_req.address or ''}, {route_req.city or ''}, {route_req.state or ''}"
        )
        
    print(f"[Bedrock Nova Pro] Determining portal for: {location_string}")
    # 2 & 3: The Routing Knowledge Base & The LLM System Prompt
    routing_result = get_portal_routing(location_string, PORTALS_DB)
    
    if not routing_result:
        raise HTTPException(status_code=500, detail="Failed to route complaint")
        
    return {
        "structured_address": structured_address,
        "routing": routing_result
    }

# Feature 6 Endpoint
@app.post("/api/draft")
async def mock_generate_draft(data: dict):
    print(f"[Amazon Bedrock] Generating draft for data: {data}")
    time.sleep(2.0)
    
    analysis_desc = data.get("analysis", {}).get("suggested_description", "")
    transcript_desc = data.get("transcription", {}).get("transcript", "")
    
    description = analysis_desc or ("Voice Report: " + transcript_desc) or "Observed civic issue."
    
    return {
        "applicantName": "A Citizen",
        "phoneNumber": "+91-9876543210",
        "damageType": data.get("analysis", {}).get("damage_type") or "Civic Issue",
        "severity": data.get("analysis", {}).get("severity") or "Medium",
        "jurisdiction": data.get("jurisdiction", {}).get("portal_name") or "Municipal Corporation",
        "ward": data.get("jurisdiction", {}).get("ward_district") or "Default Ward",
        "description": f"To the concerned authority,\n\nI am reporting a issue regarding civic hazard.\n\nDetails:\n{description}\n\nPlease address this at your earliest convenience.\n\nThank you.",
    }

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
