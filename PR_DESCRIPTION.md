# Feature: Amazon Transcribe Integration for Voice Reports

## Description
This Pull Request integrates Amazon Transcribe to automatically generate text transcripts from citizen audio reports containing civic issues (e.g., potholes, water leaks). It establishes a direct pipeline from the FastAPI backend to an AWS S3 Bucket, triggering a transcription job with auto-language detection for Indic languages.

## Approach & Setup
- **AWS S3 Uploads**: Scaffolds `upload_audio_to_s3` in `aws_services/transcribe.py` to route inbound FastAPI `UploadFile` streams into an S3 Evidence Vault (`sewa-sahayak-evidence-vault-mumbai`).
- **Amazon Transcribe Task**: Triggers `start_transcription_job` with `IdentifyLanguage=True` to seamlessly process Hindi, English, or other natively spoken reports, outputting precise transcripts.
- **Polling & Extraction**: Implemented an async-friendly polling loop (`poll_transcription_job`) that waits for the job to complete and automatically downloads the JSON transcript URL payload.
- **Test Scripts**: Extracted logic into `backend/test_transcribe.py` to allow isolated unit testing of the backend route.

## ⚠️ Important Configuration Note (AWS Credentials)
During local testing, we discovered that `uvicorn` and `dotenv` do not reliably load `AWS_ACCESS_KEY_ID` into the `boto3` environment when using Windows PowerShell, resulting in `Unable to locate credentials` exceptions.

**To successfully run this backend locally, use the global AWS CLI config:**
1. Install AWS CLI if you haven't already.
2. Run `aws configure` in your terminal and pass your keys:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region: `ap-south-1`
   
This creates a `~/.aws/credentials` file, which `boto3` will read natively, completely bypassing any `.env` variable loading bugs in FastAPI.
