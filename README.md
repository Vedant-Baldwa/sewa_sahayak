# Sewa Sahayak

Sewa Sahayak is a civic-tech solution that leverages Amazon Bedrock's multi-modal AI capabilities to automate road damage reporting to Indian government portals. The system addresses the "Reporting Wall" problem by acting as an intelligent intermediary that processes citizen-submitted evidence (video/voice) and automatically fills government forms using agentic web automation.

By reducing reporting time from 15+ minutes to under 3 minutes, the system aims to increase civic participation in infrastructure maintenance.

## Architecture & Technology Stack

The system combines **Amazon Bedrock LLMs** for multi-modal analysis with **Amazon Nova Act** for browser automation, creating a seamless bridge between citizens and government reporting systems.

It follows a microservices architecture leveraging AWS:
- **Frontend & App Area**: Mobile Web App / Progressive Web App (PWA)
- **API & Auth**: Amazon API Gateway, AWS Cognito 
- **Core Processing**: AWS Step Functions, AWS Lambda Functions
- **AI/ML Services**: Amazon Bedrock LLMs, Amazon Rekognition
- **Web Automation**: Amazon Nova Act & Browser Automation Engine
- **Storage**: Amazon S3, Amazon DynamoDB, AWS Secrets Manager

## Key Components

1. **Evidence Capture Module**: Processes video, voice, and location data from user submissions, extracting GPS coordinates and converting formats. Features support for offline storage and synchronization logic.
2. **Bedrock Analysis Agent**: Responsible for vision analysis to gauge infrastructure damage (e.g., potholes, cracks), voice transcription spanning regional Indian languages, and comprehensive severity assessments.
3. **Portal Router**: Determines the appropriate government jurisdiction (municipal, state, or central) and selects the relevant portal based on location and historical effectiveness tracking.
4. **Web Bridge Agent**: Uses visual form field detection to interact with government websites and automate data entry, while handling session management and CAPTCHA detection.
5. **Privacy Engine**: Applies PII redaction rules utilizing Amazon Rekognition to anonymize human faces, license plates, and sensitive audio before storage or submission.
6. **Human Loop Interface**: Ensures reporting safety by providing users an opportunity to verify generated official reports prior to automated submission (specifically on 90%+ completion or CAPTCHA encounters).

## Data Flow Pipeline

1. **Submission**: User uploads photos/videos/audio via the lightweight PWA.
2. **Analysis**: AI identifies the exact damage type and severity, transcribes regional dialects, and establishes location context.
3. **Privacy Scrubbing**: Videos and photos are scanned for faces/license plates and instantly blurred.
4. **Drafting**: The Web Bridge generates a highly detailed official report combining AI descriptions, metadata, and GPS markers. 
5. **Automation**: Nova Act assumes control of a headless browser to map the generated draft payloads into corresponding municipal reporting endpoints.

## Testing & Correctness Guarantee

The platform is designed to guarantee specific correctness properties, enforced by continuous testing strategies leveraging **fast-check** property-based testing and Jest:
- **100% Jurisdiction Accuracy** mapping for multi-tier Indian municipal, state, and central layers.
- **Fail-safe Error Recovery** for form validation blocks and session timeouts using human-in-the-loop escalation.
- **Regional Language Capability** spanning Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, and Odia.

## Development

- Start local development server with `npm run dev`
- Ensure `.env` is populated with correct AWS sandbox configurations before spinning up the backend services.

*This project is built to empower citizens with automated, accessible, private, and localized civic engagement toolsets.*
