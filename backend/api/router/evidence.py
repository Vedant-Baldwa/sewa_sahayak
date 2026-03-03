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
async def transcribe_audio(audio: UploadFile = File(...)):
    temp_path = f"temp_{uuid.uuid4()}.webm"
    with open(temp_path, "wb") as f: f.write(await audio.read())
    
    s3_uri = upload_audio_to_s3(temp_path, Config.S3_BUCKET_NAME, f"audio/{temp_path}")
    job_name = f"trans_{uuid.uuid4().hex[:8]}"
    start_transcription_job(job_name, s3_uri)
    result = poll_transcription_job(job_name)
    transcript = extract_transcript(result)
    
    os.remove(temp_path)
    return {"transcript": transcript, "extractedData": {"damage_type": "civic issue"}}
