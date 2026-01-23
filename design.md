# System Design Document - Sewa Sahayak

## Overview
This document describes the high-level architecture and detailed design for Sewa Sahayak, an AI-powered conversational assistant for government services submitted to the AWS AI for Bharat Hackathon.

## Project Information
- **Project Name**: Sewa Sahayak (Service Helper)
- **Tagline**: "Your Voice, Our AI - Simplifying Government Services for Every Indian"
- **Version**: 1.0
- **Date**: January 2026

## Architecture Overview

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│ USER LAYER                                                  │
├─────────────────────────────────────────────────────────────┤
│ [Mobile App] [Web Browser] [SMS] [WhatsApp] [IVR]         │
│    (PWA)     (Responsive)  Gateway  Business   Voice       │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌────────────┴────────────────────────────────────────────────┐
│ API GATEWAY LAYER                                           │
│ • AWS API Gateway / Kong                                    │
│ • Rate Limiting & Throttling                                │
│ • Authentication & Authorization (JWT)                      │
│ • Request Routing & Load Balancing                          │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌────────────┴────────────────────────────────────────────────┐
│ APPLICATION LAYER                                           │
│ • Conversation Service (Node.js/Express)                    │
│ • Form Processing Service (Python/FastAPI)                  │
│ • Complaint Management Service                              │
│ • Notification Service                                      │
│ • Authentication Service                                    │
│ • Analytics Service                                         │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌────────────┴────────────────────────────────────────────────┐
│ AI/ML LAYER                                                 │
│ • AWS Bedrock / Claude API (Conversational AI)             │
│ • AWS Rekognition (Computer Vision)                         │
│ • AWS Translate (Multilingual Support)                      │
│ • AWS Transcribe (Speech-to-Text)                           │
│ • AWS Polly (Text-to-Speech)                                │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌────────────┴────────────────────────────────────────────────┐
│ DATA LAYER                                                  │
│ • PostgreSQL (User data, complaints, forms)                 │
│ • MongoDB (Conversations, chat history)                     │
│ • Redis Cache (Session data, real-time data)               │
│ • AWS S3 (Images, documents, PDFs)                          │
│ • Elasticsearch (Full-text search, analytics)               │
│ • Apache Kafka (Event streaming)                            │
└─────────────────────────────────────────────────────────────┘
```

### System Components

1. **Frontend Layer**
   - Progressive Web App (PWA) using React.js
   - Tailwind CSS for responsive UI
   - Voice input integration (Web Speech API)
   - Camera/Gallery access for photo uploads
   - Service Workers for offline support
   - WebSockets for real-time updates

2. **API Layer**
   - REST API endpoints
   - JWT-based authentication & authorization
   - Rate limiting and throttling
   - Request validation and sanitization

3. **Application Layer**
   - Business logic processing
   - Data validation and transformation
   - Integration with AI/ML services
   - Complaint routing and management
   - Notification orchestration

4. **AI/ML Layer**
   - Conversational AI for natural language understanding
   - Computer vision for image analysis
   - Multilingual translation
   - Speech processing (STT/TTS)

5. **Data Layer**
   - Relational database for structured data
   - Document store for conversations
   - Object storage for media files
   - Caching layer for performance
   - Search engine for analytics

## AWS Services Architecture

### Core Services
- **Amazon EC2 / ECS**: Application hosting with container orchestration
- **AWS Lambda**: Serverless functions for event-driven tasks
- **Amazon API Gateway**: API management and rate limiting
- **Amazon S3**: Object storage for images, documents, and PDFs
- **Amazon RDS (PostgreSQL)**: Relational database for user data and complaints
- **Amazon ElastiCache (Redis)**: In-memory caching for sessions

### AI/ML Services
- **Amazon Bedrock / Anthropic Claude**: Conversational AI and NLU
- **Amazon Rekognition**: Image classification and damage assessment
- **Amazon Translate**: Multilingual support (12+ Indian languages)
- **Amazon Transcribe**: Speech-to-text conversion
- **Amazon Polly**: Text-to-speech for voice responses
- **Amazon Comprehend**: Sentiment analysis (optional)

### Supporting Services
- **Amazon CloudFront**: CDN for static content delivery
- **AWS IAM**: Identity and access management
- **Amazon CloudWatch**: Monitoring, logging, and alerting
- **AWS Secrets Manager**: Secure credential storage
- **AWS WAF**: Web application firewall
- **AWS Route 53**: DNS management
- **Amazon SES**: Email notifications
- **Amazon SNS**: Push notifications

## Detailed Component Design

### Frontend Design

**Technology Stack**: React.js 18+, Tailwind CSS, PWA

**Key Components**:
- **Authentication Module**: OTP-based login, Aadhaar integration
- **Conversation Interface**: Chat-like UI with voice input
- **Complaint Form**: Dynamic form with photo upload
- **Dashboard**: View complaints, track status, analytics
- **Settings**: Language selection, notifications, profile

**User Experience Flow**:
```
1. User opens Sewa Sahayak (web/PWA)
2. Language selection (auto-detect or manual)
3. Authentication (OTP verification)
4. Choose service: Register Complaint / Fill Form / Track
5. Conversational interaction with AI
6. Upload photos (if complaint)
7. Review and confirm details
8. Receive reference number
9. Track status in real-time
10. Rate and provide feedback
```

### Backend API Design

**Endpoints**:
```
Authentication:
POST /api/auth/send-otp          - Send OTP to phone
POST /api/auth/verify-otp        - Verify OTP and login
POST /api/auth/logout            - Logout user

Complaints:
POST /api/complaints             - Register new complaint
GET  /api/complaints/:id         - Get complaint details
GET  /api/complaints             - List user's complaints
PUT  /api/complaints/:id/status  - Update complaint status
POST /api/complaints/:id/feedback - Submit feedback

Forms:
GET  /api/forms                  - List available forms
POST /api/forms/:type            - Submit form data
GET  /api/forms/:id              - Get form submission status

Conversation:
POST /api/conversation/message   - Send message to AI
GET  /api/conversation/history   - Get chat history

Media:
POST /api/media/upload           - Upload photo/document
GET  /api/media/:id              - Retrieve media file

Analytics:
GET  /api/analytics/heatmap      - Get complaint heatmap
GET  /api/analytics/trends       - Get trending issues
GET  /api/analytics/stats        - Get user statistics

Notifications:
GET  /api/notifications          - Get user notifications
PUT  /api/notifications/:id/read - Mark notification as read
```

**Request/Response Format**:
```json
{
  "status": "success|error",
  "data": {},
  "message": "Human readable message",
  "timestamp": "2026-01-23T10:30:00Z"
}
```

### AI/ML Pipeline Design

**Conversational AI Flow**:
```
User Input (Voice/Text)
    ↓
Speech-to-Text (if voice) → AWS Transcribe
    ↓
Language Detection → AWS Comprehend
    ↓
Translation (if needed) → AWS Translate
    ↓
Intent Classification → Claude API (AWS Bedrock)
    ↓
Entity Extraction → Claude API
    ↓
Context Management → Application Layer
    ↓
Response Generation → Claude API
    ↓
Translation (if needed) → AWS Translate
    ↓
Text-to-Speech (if voice) → AWS Polly
    ↓
Response to User
```

**Image Processing Flow**:
```
User Uploads Photo
    ↓
Store in S3 → Generate presigned URL
    ↓
Image Analysis → AWS Rekognition
    ↓
Object Detection (pothole, garbage, etc.)
    ↓
Severity Assessment → Custom ML Model
    ↓
Geo-tagging → Extract EXIF data
    ↓
Auto-categorization → Update Complaint
    ↓
Store Results in Database
```

**Complaint Routing Flow**:
```
User Describes Problem
    ↓
AI Extracts Key Information
    ↓
Categorization → ML Model
    ↓
Department Mapping → Rule Engine
    ↓
Priority Assignment → Based on keywords/severity
    ↓
Generate Reference Number
    ↓
Route to Department Dashboard
    ↓
Send Confirmation Notification
```

### Database Design

**PostgreSQL Schema**:

```sql
-- Users Table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    preferred_language VARCHAR(10) DEFAULT 'en',
    aadhaar_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Complaints Table
CREATE TABLE complaints (
    complaint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(10) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(user_id),
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    description TEXT NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    address TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'registered',
    department VARCHAR(100),
    assigned_officer_id UUID,
    estimated_resolution_date DATE,
    actual_resolution_date DATE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Complaint Media Table
CREATE TABLE complaint_media (
    media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(complaint_id),
    media_type VARCHAR(20) NOT NULL,
    s3_url TEXT NOT NULL,
    ai_analysis JSONB,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Complaint Status History Table
CREATE TABLE complaint_status_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(complaint_id),
    status VARCHAR(20) NOT NULL,
    updated_by UUID,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forms Table
CREATE TABLE forms (
    form_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    form_type VARCHAR(50) NOT NULL,
    form_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    complaint_id UUID REFERENCES complaints(complaint_id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_via VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback Table
CREATE TABLE feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(complaint_id),
    user_id UUID REFERENCES users(user_id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments Table
CREATE TABLE departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(15),
    categories TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**MongoDB Collections**:

```javascript
// Conversations Collection
{
  _id: ObjectId,
  user_id: String,
  complaint_id: String,
  messages: [
    {
      role: "user|assistant",
      content: String,
      timestamp: Date,
      language: String,
      intent: String,
      entities: Object
    }
  ],
  created_at: Date,
  updated_at: Date
}

// Logs Collection
{
  _id: ObjectId,
  level: String,
  service: String,
  message: String,
  metadata: Object,
  timestamp: Date
}
```

## Security Design

### Authentication & Authorization
- **OTP-based Authentication**: SMS/WhatsApp OTP for user verification
- **JWT Tokens**: Stateless authentication with short-lived access tokens
- **Refresh Tokens**: Long-lived tokens stored securely
- **Aadhaar Integration**: Optional identity verification via UIDAI API
- **Role-Based Access Control**: User, Officer, Admin roles

### Data Security
- **Encryption at Rest**: AES-256 encryption for database and S3
- **Encryption in Transit**: TLS 1.3 for all API communications
- **Data Anonymization**: Remove PII for anonymous complaints
- **Secure File Upload**: Virus scanning, file type validation, size limits
- **API Key Management**: AWS Secrets Manager for credentials

### API Security
- **Rate Limiting**: 100 requests per minute per user
- **Input Validation**: Sanitize all user inputs
- **CORS Configuration**: Whitelist allowed origins
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy headers

## Performance Design

### Scalability Strategy
- **Horizontal Scaling**: Auto Scaling Groups for EC2 instances
- **Container Orchestration**: Kubernetes for microservices
- **Database Scaling**: Read replicas for PostgreSQL
- **Caching Strategy**: Redis for session data and frequently accessed data
- **CDN**: CloudFront for static assets and media files
- **Load Balancing**: Application Load Balancer for traffic distribution

### Performance Optimization
- **API Response Time**: <500ms for 95th percentile
- **Image Compression**: Optimize images before storage
- **Lazy Loading**: Progressive data loading in UI
- **Database Indexing**: Index on frequently queried fields
- **Query Optimization**: Use database query optimization techniques
- **Batch Processing**: Queue-based processing for heavy tasks (Kafka)

### Caching Strategy
```
Redis Cache Layers:
- Session data (TTL: 24 hours)
- User profile (TTL: 1 hour)
- Complaint categories (TTL: 1 day)
- Department mappings (TTL: 1 day)
- Frequently accessed complaints (TTL: 15 minutes)
```

## Monitoring and Logging

### Metrics to Track
- **Application Metrics**:
  - API response times (p50, p95, p99)
  - Request rate (requests per second)
  - Error rate (4xx, 5xx errors)
  - Active users (concurrent connections)
  
- **AI/ML Metrics**:
  - Model inference time
  - Intent classification accuracy
  - Image classification accuracy
  - Translation quality scores
  
- **Business Metrics**:
  - Complaints registered per day
  - Average resolution time
  - User satisfaction ratings
  - Department response times

### Logging Strategy
- **Structured Logging**: JSON format for all logs
- **Log Levels**: DEBUG, INFO, WARN, ERROR, FATAL
- **Centralized Logging**: CloudWatch Logs aggregation
- **Log Retention**: 30 days for application logs, 90 days for audit logs
- **Security Event Logging**: Track authentication attempts, data access

### Alerting
- **Performance Alerts**:
  - API response time > 2 seconds
  - Error rate > 5%
  - CPU utilization > 80%
  - Memory utilization > 85%
  
- **Business Alerts**:
  - Complaint resolution SLA breach
  - High-priority complaints unassigned for > 1 hour
  - Spike in complaint volume (> 200% of average)
  
- **Security Alerts**:
  - Multiple failed authentication attempts
  - Unusual API access patterns
  - Data breach attempts

## Deployment Strategy

### Environment Setup
- **Development**: Local development with Docker Compose
- **Staging**: AWS environment mirroring production
- **Production**: Multi-AZ deployment for high availability

### CI/CD Pipeline
```
1. Code Commit → GitHub
2. Automated Tests → Jest, Pytest
3. Code Quality Check → SonarQube
4. Build Docker Images → Docker
5. Push to Registry → Amazon ECR
6. Deploy to Staging → Kubernetes
7. Integration Tests → Automated test suite
8. Manual Approval → Team review
9. Deploy to Production → Blue-Green deployment
10. Post-Deployment Verification → Health checks
11. Rollback (if needed) → Automated rollback
```

### Infrastructure as Code
- **Terraform**: Infrastructure provisioning
- **Kubernetes Manifests**: Application deployment
- **Helm Charts**: Package management
- **Environment Variables**: Managed via AWS Secrets Manager

### Deployment Architecture
```
┌─────────────────────────────────────────────────────────────┐
│ Route 53 (DNS)                                              │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌────────────┴────────────────────────────────────────────────┐
│ CloudFront (CDN)                                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌────────────┴────────────────────────────────────────────────┐
│ Application Load Balancer                                   │
└────────────┬────────────────────────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
      ↓             ↓
┌─────────┐   ┌─────────┐
│ AZ-1    │   │ AZ-2    │
│ EC2/ECS │   │ EC2/ECS │
└─────────┘   └─────────┘
      │             │
      └──────┬──────┘
             │
             ↓
┌────────────┴────────────────────────────────────────────────┐
│ RDS (Multi-AZ)                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Complaint Registration Flow
```
User → Frontend → API Gateway → Auth Service (JWT validation)
    ↓
Conversation Service → Claude AI (NLU)
    ↓
Intent: "Register Complaint"
    ↓
Extract entities (location, category, description)
    ↓
Image Upload → S3 → Rekognition (classification)
    ↓
Complaint Service → Generate reference number
    ↓
Store in PostgreSQL + MongoDB (conversation)
    ↓
Routing Engine → Determine department
    ↓
Kafka Event → Notification Service
    ↓
Send SMS/WhatsApp/Email → User + Department
    ↓
Return reference number to user
```

### Status Update Flow
```
Officer updates status → Admin Dashboard
    ↓
API Gateway → Complaint Service
    ↓
Update PostgreSQL (complaints table)
    ↓
Insert into status_history table
    ↓
Kafka Event → Notification Service
    ↓
Send notification to user (SMS/WhatsApp/Push)
    ↓
WebSocket → Real-time update in user's dashboard
```

## Integration Points

### External APIs
- **Anthropic Claude API**: Conversational AI
- **Google Translate API / AWS Translate**: Multilingual support
- **Google Vision API / AWS Rekognition**: Image analysis
- **Twilio / MSG91**: SMS gateway
- **WhatsApp Business API**: WhatsApp notifications
- **SendGrid / AWS SES**: Email service
- **Google Maps / MapMyIndia**: Location services
- **UIDAI API**: Aadhaar authentication
- **Government Portals**: MyGov, state portals (if available)

### Internal Services
- **Authentication Service**: User authentication and authorization
- **Notification Service**: Multi-channel notifications
- **Analytics Service**: Data aggregation and insights
- **Routing Service**: Complaint categorization and routing

## Error Handling

### Error Categories
- **Client Errors (4xx)**:
  - 400 Bad Request: Invalid input data
  - 401 Unauthorized: Authentication required
  - 403 Forbidden: Insufficient permissions
  - 404 Not Found: Resource not found
  - 429 Too Many Requests: Rate limit exceeded

- **Server Errors (5xx)**:
  - 500 Internal Server Error: Unexpected error
  - 502 Bad Gateway: Upstream service failure
  - 503 Service Unavailable: Service temporarily down
  - 504 Gateway Timeout: Request timeout

### Error Response Format
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "The complaint description is required",
    "details": {
      "field": "description",
      "constraint": "required"
    },
    "timestamp": "2026-01-23T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

### Retry Strategy
- **Exponential Backoff**: For transient failures
- **Circuit Breaker**: Prevent cascading failures
- **Fallback Mechanisms**: Graceful degradation

## Technology Stack Summary

### Frontend
- React.js 18+
- Tailwind CSS
- Progressive Web App (PWA)
- Web Speech API
- Socket.io (WebSockets)

### Backend
- Node.js + Express.js
- Python + FastAPI
- AWS Lambda (Serverless)

### AI/ML
- Anthropic Claude API (AWS Bedrock)
- AWS Rekognition
- AWS Translate
- AWS Transcribe
- AWS Polly

### Databases
- PostgreSQL (RDS)
- MongoDB
- Redis (ElastiCache)
- Elasticsearch

### Infrastructure
- AWS EC2 / ECS
- Docker
- Kubernetes
- Terraform
- GitHub Actions (CI/CD)

### Monitoring
- AWS CloudWatch
- Prometheus + Grafana (optional)
- Sentry (Error tracking)

## Future Enhancements

### Phase 2 Features
- AI chatbot for government scheme FAQs
- Virtual queue for office visits
- Document verification assistance
- Appointment booking system
- DigiLocker integration
- Community forums
- Gamification (badges, leaderboards)

### Technical Improvements
- GraphQL API for flexible queries
- Microservices architecture refinement
- Advanced ML models for better accuracy
- Blockchain for complaint verification
- Mobile native apps (iOS/Android)
- Voice-only interface for feature phones

## Appendices

### A. API Documentation
Complete API documentation available at: `/docs/api-reference.md`

### B. Database Schema
Detailed schema diagrams available at: `/docs/database-schema.md`

### C. Deployment Guide
Step-by-step deployment instructions at: `/docs/deployment-guide.md`

### D. User Guide
End-user documentation at: `/docs/user-guide.md`

### E. Admin Dashboard Guide
Officer/admin documentation at: `/docs/admin-guide.md`
