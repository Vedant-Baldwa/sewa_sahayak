import os
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import mimetypes
import time
import uuid
from aws_services.transcribe import upload_audio_to_s3, start_transcription_job, poll_transcription_job, extract_transcript

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

app = FastAPI(title="Sewa Sahayak PWA API (Mock)")

# CORS Middleware to allow requests from the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def read_root():
    return {"message": "Sewa Sahayak Mock API Running"}

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
