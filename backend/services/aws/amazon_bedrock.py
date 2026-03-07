import json
import base64
from core.config import bedrock_client, Config

def _invoke(model_id: str, system_prompt: str, messages: list, max_tokens: int = 1024) -> str:
    print(f"[Bedrock] Invoking model: {model_id}")
    try:
        response = bedrock_client.invoke_model(
            modelId=model_id,
            body=json.dumps({
                "system": [{"text": system_prompt}],
                "messages": messages,
                "inferenceConfig": {"maxTokens": max_tokens, "temperature": 0.1}
            }),
            contentType="application/json",
            accept="application/json"
        )
        body = json.loads(response['body'].read().decode('utf-8'))
        text = body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '')
        print(f"[Bedrock] Success. Response length: {len(text)} chars")
        return text
    except Exception as e:
        print(f"[Bedrock] _invoke Error: {e}")
        raise

def _parse_json(text: str) -> dict:
    # Remove markdown formatting if present
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    try:
        return json.loads(text)
    except Exception as e:
        print(f"JSON Parse Error: {e}\nRaw Text: {text}")
        # Try to find { and } if simple load fails
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            try: return json.loads(text[start:end+1])
            except: pass
        raise e

def get_portal_routing(location_string: str, portals_db: dict) -> dict:
    system_prompt = f"""You are the Lead Dispatcher for the Sewa Sahayak Road Infrastructure Platform.
Your mission is to map a reported civic issue to the most effective government portal in India for resolution.

Location Context provided by GPS/User: {location_string}

Hierarchical Routing Rules:
1. If the location is within a major city mentioned in the MUNICIPAL_CORP section of Portals_DB, select that Municipal portal first.
2. If the location mentions "NH" or "National Highway", select "NHAI" or "CPGRAMS".
3. If the location mentions "SH" or "State Highway", select the relevant State Government PWD portal if identifiable, otherwise the general State portal.
4. For all other cases, or if highly ambiguous, default to the most powerful central portal: "CPGRAMS".

Portals_DB (Hierarchical Data):
{json.dumps(portals_db)}

Output strict JSON only:
{{"portal_name": "Official Name", "portal_url": "Direct URL", "reasoning": "Brief explanation of why this was selected based on location hierarchy."}}"""

    try:
        output = _invoke(Config.ROUTING_MODEL_ID, system_prompt,
                         [{"role": "user", "content": [{"text": "Provide portal routing."}]}],
                         max_tokens=512)
        return _parse_json(output)
    except Exception as e:
        print(f"Bedrock Routing Error: {e}")
        return {
            "portal_name": "CPGRAMS",
            "portal_url": portals_db.get('CENTRAL', {}).get('CPGRAMS', ''),
            "reasoning": f"Default fallback: {e}"
        }

def analyze_image_with_bedrock(image_bytes: bytes, content_type: str = "image/jpeg") -> dict:
    fmt_map = {"image/jpeg": "jpeg", "image/jpg": "jpeg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
    img_format = fmt_map.get(content_type, "jpeg")

    system_prompt = """You are an AI system for analyzing urban civic infrastructure damage from photos.
Output strict JSON only:
{
  "damage_type": "<pothole|road_crack|surface_deterioration|waterlogging|broken_footpath|garbage|streetlight|other>",
  "severity": "<Low|Medium|High|Critical>",
  "confidence_score": <0.0-1.0>,
  "suggested_description": "<2-3 sentence professional description>",
  "bounding_box": {"x": <0-1>, "y": <0-1>, "w": <0-1>, "h": <0-1>},
  "needs_human_review": <true|false>,
  "media_quality": "<good|poor>"
}"""

    messages = [{
        "role": "user",
        "content": [
            {"image": {"format": img_format, "source": {"bytes": base64.b64encode(image_bytes).decode('utf-8')}}},
            {"text": "Analyze this image for civic infrastructure damage and return the JSON."}
        ]
    }]

    try:
        response = bedrock_client.invoke_model(
            modelId=Config.ANALYSIS_MODEL_ID,
            body=json.dumps({
                "system": [{"text": system_prompt}],
                "messages": messages,
                "inferenceConfig": {"maxTokens": 512, "temperature": 0.1}
            }),
            contentType="application/json",
            accept="application/json"
        )
        body = json.loads(response['body'].read().decode('utf-8'))
        text = body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '')
        return _parse_json(text)
    except Exception as e:
        print(f"Bedrock Image Analysis Error: {e}")
        return {
            "damage_type": "civic_issue", "severity": "Medium", "confidence_score": 0.5,
            "suggested_description": "Civic infrastructure issue observed. Manual review recommended.",
            "bounding_box": {"x": 0.1, "y": 0.1, "w": 0.8, "h": 0.8}
        }

def generate_draft_with_bedrock(capture_data: dict, form_schema: dict, user_data: dict = None) -> dict:
    if form_schema is None: form_schema = {}
    if capture_data is None: capture_data = {}
    
    analysis = capture_data.get("analysis", {}) or {}
    transcription = capture_data.get("transcription", {}) or {}
    location = capture_data.get("locationData", {}) or {}
    jurisdiction = capture_data.get("jurisdiction", {}) or {}

    user_name = "Citizen"
    user_phone = ""
    if user_data:
        user_name = user_data.get("name") or user_data.get("email", "Citizen").split("@")[0].title()
        user_phone = user_data.get("phone_number", "")

    portal_url = form_schema.get("portal_url", jurisdiction.get("portal_url", ""))
    portal_name = form_schema.get("portal_name", jurisdiction.get("portal_name", "Government Portal"))

    try:
        evidence = f"Applicant: {user_name} | Phone: {user_phone}\nAnalysis: {json.dumps(analysis)}\nTranscript: {transcription.get('transcript', 'N/A')}\nLocation: {json.dumps(location)}\nJurisdiction: {json.dumps(jurisdiction)}\nPortal: {portal_name}"
        
        system_prompt = """You are a professional complaint letter writer for Indian government portals (CPGRAMS, PWD, Municipalities). 
Your task is to convert evidence data into a HIGH-IMPACT, professional grievance report.

Rules:
1. Detect the language of the transcript (Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia).
2. Summarize the user's intent into a formal English complaint letter.
3. BE SPECIFIC: Mention the exact type of damage (e.g., "Deep pothole with jagged edges", "Severe surface deterioration"), the specific location/landmark, and the risk to public safety.
4. If a landmark is present in the address or transcript, emphasize it.
5. Use a tone that is urgent yet highly professional.
6. OUTPUT STRICT JSON ONLY:
{
  "applicantName": "...", 
  "phoneNumber": "...", 
  "damageType": "e.g., Deep Pothole / Surface Deterioration",
  "severity": "Low|Medium|High|Critical", 
  "jurisdiction": "...", 
  "ward": "...",
  "description": "<detailed 200-300 word formal complaint letter. State when it was observed, the exact nature of the damage, why it is dangerous for commuters, and a request for immediate restoration.>",
  "detected_language": "...",
  "landmark": "...",
  "portal_url": "...", 
  "portal_name": "..."
}"""

        messages = [{"role": "user", "content": [{"text": f"Generate complaint draft:\n{evidence}"}]}]
        output = _invoke(Config.DRAFT_MODEL_ID, system_prompt, messages, max_tokens=1024)
        draft = _parse_json(output)
        
        # Ensure portal metadata is preserved if missing in AI response
        if not draft.get("portal_url"): draft["portal_url"] = portal_url
        if not draft.get("portal_name"): draft["portal_name"] = portal_name
        
        return draft
    except Exception as e:
        print(f"Bedrock Draft Error: {e}")
        return {
            "applicantName": user_name, 
            "phoneNumber": user_phone, 
            "damageType": analysis.get("damage_type", "Civic Issue"),
            "severity": analysis.get("severity", "Medium"), 
            "jurisdiction": portal_name, 
            "ward": jurisdiction.get("ward_district", "Ward"),
            "description": f"Reporting civic infrastructure issue at {location.get('address', 'the stated location')}. {analysis.get('suggested_description', '')}",
            "portal_url": portal_url,
            "portal_name": portal_name
        }
def analyze_video_with_bedrock(video_bytes: bytes, content_type: str = "video/mp4") -> dict:
    """Analyze video using Amazon Nova Pro. Supports mp4, webm, etc."""
    fmt_map = {"video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov"}
    vid_format = fmt_map.get(content_type, "mp4")

    system_prompt = """You are an AI system for analyzing urban civic infrastructure damage from video clips.
Output strict JSON only:
{
  "damage_type": "<pothole|road_crack|surface_deterioration|waterlogging|broken_footpath|garbage|streetlight|other>",
  "severity": "<Low|Medium|High|Critical>",
  "confidence_score": <0.0-1.0>,
  "suggested_description": "<Brief professional description of the damage observed in the media>",
  "needs_human_review": <true|false>,
  "media_quality": "<good|poor>"
}"""

    messages = [{
        "role": "user",
        "content": [
            {"video": {"format": vid_format, "source": {"bytes": base64.b64encode(video_bytes).decode('utf-8')}}},
            {"text": "Analyze this video for civic infrastructure damage and return the JSON."}
        ]
    }]

    try:
        response = bedrock_client.invoke_model(
            modelId=Config.ANALYSIS_MODEL_ID,
            body=json.dumps({
                "system": [{"text": system_prompt}],
                "messages": messages,
                "inferenceConfig": {"maxTokens": 512, "temperature": 0.1}
            }),
            contentType="application/json",
            accept="application/json"
        )
        body = json.loads(response['body'].read().decode('utf-8'))
        text = body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '')
        return _parse_json(text)
    except Exception as e:
        print(f"Bedrock Video Analysis Error: {e}")
        return {
            "damage_type": "civic_issue", "severity": "Medium", "confidence_score": 0.5,
            "suggested_description": "Video evidence recorded. Manual verification required."
        }

def analyze_capture(media_bytes: bytes, content_type: str) -> dict:
    if content_type.startswith("image/"):
        return analyze_image_with_bedrock(media_bytes, content_type)
    elif content_type.startswith("video/"):
        return analyze_video_with_bedrock(media_bytes, content_type)
    return {"error": "Unsupported media type"}
