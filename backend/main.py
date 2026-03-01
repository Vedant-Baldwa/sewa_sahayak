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
_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_frontend_url, _frontend_url.replace("localhost", "127.0.0.1")],
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
    # Nova models are currently not available in ap-south-1. Overriding to us-east-1.
    bedrock_region = "us-east-1"
    bedrock_runtime = boto3.client('bedrock-runtime', region_name=bedrock_region)
    dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
    reports_table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    users_table = dynamodb.Table(USERS_TABLE_NAME)
    print(f"AWS Services (S3, Cognito, Bedrock in {bedrock_region}, DynamoDB) configured successfully.")
except Exception as e:
    print(f"Warning: Failed to initialize AWS clients. Ensure credentials are set. Error: {e}")
    s3_client, cognito_client, bedrock_runtime, reports_table, users_table = None, None, None, None, None

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
                except Exception as e:
                    print(f"Warning DB: {e}")
            
            request.session['userData'] = user_metadata
            return RedirectResponse(url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/")
            
    except Exception as e:
        print(f"OAuth Callback Error: {e}")
        # fallback for mock testing without real AWS flow
        request.session['user'] = {"email": "mock@example.com", "sub": "mock-sub-uuid"}
        request.session['id_token'] = "mock-token"
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
        
        print(f"Calling Bedrock {model_id} for analysis...")
        
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
        response = bedrock_runtime.converse(
            modelId=model_id,
            messages=[message],
            inferenceConfig={"maxTokens": 512, "temperature": 0.1}
        )
        
        raw_output = response['output']['message']['content'][0]['text']
        print(f"Bedrock Raw Analysis Output: {raw_output}")
        
        # Extract JSON from markdown if exists
        if "```json" in raw_output:
            raw_output = raw_output.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_output:
            raw_output = raw_output.split("```")[1].split("```")[0].strip()
            
        analysis = json.loads(raw_output)
        
        return {
            "damage_type": analysis.get("damage_type", "Unknown"),
            "severity": analysis.get("severity", "Medium"),
            "confidence_score": analysis.get("confidence", 0.9),
            "suggested_description": analysis.get("suggested_description", ""),
            "bounding_box": {"x": 0, "y": 0, "w": 0, "h": 0} 
        }
        
    except Exception as e:
        print(f"Bedrock Analysis Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# Feature 4 Endpoint
@app.post("/api/redact")
async def mock_redact(media: UploadFile = File(...)):
    print(f"[Amazon Rekognition] Scanning media for PII...")
    time.sleep(1.5)
    
    # Generate a dummy URL that points back to the backend
    # or a dummy reference since the real file isn't uploaded to S3 yet
    fake_redacted_path = f"/temp/{uuid.uuid4()}_{media.filename}"
    
    return {
        "redactedFileUrl": fake_redacted_path,
        "facesRedacted": 2, 
        "platesRedacted": 1
    }

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
        model_id = os.getenv("DRAFT_MODEL_ID", "amazon.nova-pro-v1:0")
        print(f"Calling Bedrock {model_id} for draft generation...")
        
        prompt = f"""
        Generate a formal civic complaint application based on the following data:
        - Jurisdiction/Authority: {data.get('jurisdiction')}
        - AI Visual Analysis: {data.get('analysis')}
        - Voice Transcription: {data.get('transcription')}
        - Citizen Input: {data.get('description', 'N/A')}
        
        The letter should be professional, respectful, and include all relevant details to help the authority resolve the issue. 
        Summarize the situation clearly in the 'description' field.
        
        Return ONLY valid JSON with EXACTLY these fields:
        {{
            "applicantName": "string",
            "phoneNumber": "string",
            "damageType": "string",
            "severity": "string",
            "jurisdiction": "string",
            "ward": "string",
            "description": "string (full formal letter text)"
        }}
        """
        
        response = bedrock_runtime.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"temperature": 0.7}
        )
        
        import json
        raw_draft = response['output']['message']['content'][0]['text']
        print(f"Bedrock Raw Draft Output: {raw_draft}")
        
        if "```json" in raw_draft:
            raw_draft = raw_draft.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_draft:
            raw_draft = raw_draft.split("```")[1].split("```")[0].strip()
            
        return json.loads(raw_draft)
        
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
