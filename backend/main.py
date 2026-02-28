from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import mimetypes
import time
import uuid
import os

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
