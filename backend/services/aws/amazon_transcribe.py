import time
import json
import urllib.request
from typing import Dict, Any, Optional
from core.config import s3_client, transcribe_client

def upload_audio_to_s3(file_path: str, bucket_name: str, object_name: str) -> str:
    try:
        s3_client.upload_file(file_path, bucket_name, object_name)
        return f"s3://{bucket_name}/{object_name}"
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        return ""

def start_transcription_job(job_name: str, media_uri: str, format: str = "webm") -> Optional[str]:
    try:
        response = transcribe_client.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': media_uri},
            MediaFormat=format,
            IdentifyLanguage=True,
        )
        return response['TranscriptionJob']['TranscriptionJobName']
    except Exception as e:
        print(f"Error starting transcription job: {e}")
        return None

def poll_transcription_job(job_name: str, max_retries: int = 60, wait_seconds: int = 2) -> Dict[str, Any]:
    for _ in range(max_retries):
        response = transcribe_client.get_transcription_job(TranscriptionJobName=job_name)
        status = response['TranscriptionJob']['TranscriptionJobStatus']
        if status in ['COMPLETED', 'FAILED']:
            return response['TranscriptionJob']
        time.sleep(wait_seconds)
    return {"TranscriptionJobStatus": "TIMEOUT"}

def extract_transcript(transcript_result: Dict[str, Any]) -> str:
    if transcript_result.get("TranscriptionJobStatus") != "COMPLETED":
        return ""
    transcript_uri = transcript_result.get("Transcript", {}).get("TranscriptFileUri")
    if not transcript_uri:
        return ""
    try:
        with urllib.request.urlopen(transcript_uri) as response:
            data = json.loads(response.read().decode())
            return data["results"]["transcripts"][0]["transcript"]
    except Exception as e:
        print(f"Error fetching transcript from URI: {e}")
        return ""
