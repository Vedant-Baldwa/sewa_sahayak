from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import boto3, os
from core.config import Config

router = APIRouter(prefix="/api/chatbot", tags=["AI Chatbot"])

bedrock = boto3.client(
    "bedrock-runtime",
    region_name=os.getenv("BEDROCK_REGION", "ap-south-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

SYSTEM_PROMPT = """You are Sahayak, the helpful AI assistant built into the Sewa Sahayak civic reporting platform.

You ONLY assist with:
- How to use Sewa Sahayak (capturing evidence, filing complaints, using the AI agent)
- Understanding complaint status and Acknowledgement IDs
- Government portals the platform supports (CPGRAMS, NHAI, MyGov, MCD, State PWD)
- Login, session, or upload issues users face
- How Bedrock, Nova Act, Rekognition, Transcribe, and Cognito are used in this app
- DPDP Act 2023 and user privacy in this platform

Politely decline anything off-topic and redirect the user back.
Keep replies concise (under 150 words), friendly, and action-oriented.
Always speak as if you are part of the platform, not just a generic chatbot."""

class ChatMessage(BaseModel):
    message: str
    history: list = []
    lang: str = "en"

@router.post("/message")
async def chat(req: ChatMessage, request: Request):
    # Allow quest chat for general platform questions
    user = request.session.get('user')
    prefix = ""
    if not user:
        prefix = "[GUEST MODE] "
        # We still allow guest chat but Bedrock will know they are a guest
    
    # Build message history
    messages = []
    history = req.history[-8:]  # last 4 turns
    for h in history:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": [{"text": content}]})

    # Ensure last message is from user
    if not messages or messages[-1]["role"] != "user":
        messages.append({"role": "user", "content": [{"text": req.message}]})
    elif messages[-1]["content"][0]["text"] != req.message:
        messages.append({"role": "user", "content": [{"text": req.message}]})

    # Ensure first message is from user (Bedrock Converse API strict requirement)
    while messages and messages[0]["role"] == "assistant":
        messages.pop(0)
        
    # Collapse consecutive messages of the same role
    collapsed_messages = []
    for m in messages:
        if not collapsed_messages:
            collapsed_messages.append(m)
        else:
            if collapsed_messages[-1]["role"] == m["role"]:
                collapsed_messages[-1]["content"][0]["text"] += f"\n\n{m['content'][0]['text']}"
            else:
                collapsed_messages.append(m)
    messages = collapsed_messages

    # Map language codes to full names for Bedrock
    lang_map = {
        "hi": "Hindi", "bn": "Bengali", "te": "Telugu", 
        "mr": "Marathi", "ta": "Tamil", "gu": "Gujarati", 
        "kn": "Kannada", "ml": "Malayalam", "pa": "Punjabi", "or": "Odia"
    }
    target_lang = lang_map.get(req.lang, "English")
    
    lang_instruction = f"\n\nCRITICAL: The user has selected {target_lang}. You MUST respond exclusively in {target_lang} script and language." if req.lang != "en" else ""
    system_text = (SYSTEM_PROMPT + lang_instruction + 
                  ("\nNote: Current user is a GUEST. They can ask about features, but cannot file reports yet. Encourage them to sign in." if not user else ""))

    try:
        response = bedrock.converse(
            modelId=os.getenv("BEDROCK_MODEL_ID", "apac.amazon.nova-pro-v1:0"),
            system=[{"text": system_text}],
            messages=messages,
            inferenceConfig={"maxTokens": 600, "temperature": 0.5},
        )
        reply = response["output"]["message"]["content"][0]["text"]
        return {"reply": reply}
    except Exception as e:
        print(f"[Chatbot] Bedrock error: {e}")
        return {"reply": "I'm having trouble reaching the AI service right now. Please try again in a moment — I'll be back shortly!"}

