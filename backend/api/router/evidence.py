import os
import uuid
import io
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
from PIL import Image, ImageDraw
from core.config import s3_client, Config
from services.aws.amazon_transcribe import upload_audio_to_s3, start_transcription_job, poll_transcription_job, extract_transcript
from services.aws.amazon_rekognition import redact_image_pii

router = APIRouter(prefix="/api", tags=["Evidence & Ingestion"])

@router.post("/evidence/upload")
async def upload_evidence(evidence: UploadFile = File(...), ticketId: str = Form(...)):
    try:
        s3_key = f"reports/{ticketId}/{evidence.filename}"
        s3_client.upload_fileobj(evidence.file, Config.S3_BUCKET_NAME, s3_key, ExtraArgs={'ContentType': evidence.content_type})
        return {"s3_uri": f"s3://{Config.S3_BUCKET_NAME}/{s3_key}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/redact")
async def redact_media(media: UploadFile = File(...)):
    image_bytes = await media.read()
    redacted_bytes, faces, texts = redact_image_pii(image_bytes)
    
    return StreamingResponse(
        io.BytesIO(redacted_bytes), 
        media_type=media.content_type,
        headers={
            "X-Faces-Redacted": str(faces),
            "X-Plates-Redacted": str(texts),
            "Access-Control-Expose-Headers": "X-Faces-Redacted, X-Plates-Redacted"
        }
    )

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), language: str = Form("hi-IN")):
    print(f"[AWS Transcribe API] Received audio: {audio.filename}, hint: {language}")
    # Extract extension for AWS format
    ext = audio.filename.split('.')[-1].lower() if '.' in audio.filename else 'webm'
    format_mapping = {'webm': 'webm', 'mp3': 'mp3', 'm4a': 'm4a', 'mp4': 'mp4', 'wav': 'wav', 'ogg': 'ogg'}
    audio_format = format_mapping.get(ext, 'webm')

    # Save temp file
    temp_path = f"temp_{uuid.uuid4()}_{audio.filename}"
    with open(temp_path, "wb") as f: 
        f.write(await audio.read())
    
    try:
        # S3 Upload
        if not Config.S3_BUCKET_NAME:
            raise HTTPException(status_code=500, detail="S3 Bucket not configured")
            
        s3_key = f"audio/{temp_path}"
        s3_uri = upload_audio_to_s3(temp_path, Config.S3_BUCKET_NAME, s3_key)
        
        if not s3_uri:
            raise HTTPException(status_code=500, detail="S3 Direct Upload Failed")

        # Transcribe Start
        job_name = f"trans_{uuid.uuid4().hex}"
        job_started = start_transcription_job(job_name, s3_uri, audio_format)
        if not job_started:
            raise HTTPException(status_code=500, detail="Transcription job initiation failed")

        # Wait & Poll
        print(f"Polling job {job_name} ({audio_format})...")
        result = poll_transcription_job(job_name)
        
        if result.get("TranscriptionJobStatus") != "COMPLETED":
            raise HTTPException(status_code=500, detail=f"Job failed with status: {result.get('TranscriptionJobStatus')}")

        transcript = extract_transcript(result)
        
        return {
            "transcript": transcript, 
            "extractedData": {"damage_type": "civic issue"},
            "job_name": job_name
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
