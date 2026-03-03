import os
import boto3
from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

class Config:
    AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
    BEDROCK_REGION = os.getenv("BEDROCK_REGION", "ap-south-1")
    
    S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
    DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE")
    USERS_TABLE_NAME = os.getenv("USERS_TABLE_NAME")
    
    COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
    COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
    COGNITO_CLIENT_SECRET = os.getenv("COGNITO_CLIENT_SECRET")
    
    SECRET_KEY = os.getenv("SECRET_KEY") or os.urandom(24).hex()
    
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
    
    # Model IDs - Use APAC inference profiles for ap-south-1 region
    ROUTING_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "apac.amazon.nova-pro-v1:0")
    ANALYSIS_MODEL_ID = os.getenv("ANALYSIS_MODEL_ID", "apac.amazon.nova-pro-v1:0")
    DRAFT_MODEL_ID = os.getenv("DRAFT_MODEL_ID", "apac.amazon.nova-pro-v1:0")
    NOVA_ACT_MODEL_ID = os.getenv("NOVA_ACT_MODEL_ID", "amazon.nova-act-v1:0")

# Initialize Clients
s3_client = boto3.client('s3', region_name=Config.AWS_REGION)
cognito_client = boto3.client('cognito-idp', region_name=Config.AWS_REGION)
rekognition_client = boto3.client('rekognition', region_name=Config.AWS_REGION)
transcribe_client = boto3.client('transcribe', region_name=Config.AWS_REGION)
bedrock_client = boto3.client('bedrock-runtime', region_name=Config.BEDROCK_REGION)
dynamodb = boto3.resource('dynamodb', region_name=Config.AWS_REGION)

# Location Service Fallback
try:
    location_client = boto3.client('geo-places', region_name=Config.AWS_REGION)
    location_client_type = "geo-places"
except:
    try:
        location_client = boto3.client('location', region_name=Config.AWS_REGION)
        location_client_type = "location"
    except:
        location_client = None
        location_client_type = None

# Tables
reports_table = dynamodb.Table(Config.DYNAMODB_TABLE) if Config.DYNAMODB_TABLE else None
users_table = dynamodb.Table(Config.USERS_TABLE_NAME) if Config.USERS_TABLE_NAME else None
