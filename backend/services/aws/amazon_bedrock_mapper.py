import json
from core.config import bedrock_client, Config

def map_draft_to_form_fields(draft: dict, form_schema: dict) -> dict:
    if not form_schema or not form_schema.get("fields"):
        return {
            "Name": draft.get("applicantName", ""),
            "Mobile": draft.get("phoneNumber", ""),
            "Description": draft.get("description", ""),
            "Subject": draft.get("damageType", "Civic Issue"),
        }

    system_prompt = """You are an expert form-filling assistant for Indian Government Grievance Portals (like CPGRAMS, MyGov, state PWD portals).
Your goal is to map a citizen's complaint draft and evidence to the exact technical fields of a web form.

Evidence and Draft Context:
- Damage Type: e.g. Pothole, Road Crack
- Description: Full formal complaint
- Location: Street address, ward, and district
- Landmark: Nearby recognizable spots

Instructions:
1. Review the list of web form fields (title, label, type, options).
2. For each field, determine the most appropriate value from the Draft data.
3. If a field asks for "Grievance Category", "Nature of Grievance", or "Subject", use the summarized damage type.
4. If a field asks for "Description" or "Details", use the full generated description.
5. If a field is a dropdown/radio, pick the BEST match from the provided options. Never invent an option. Use index or value if required.
6. If a mandatory field has no direct data, use a reasonable default like "N/A" or "Civic Issue".

Output strict JSON only: {"Field Label / ID": "Actual value to type"}"""

    user_message = f"Web Form Fields extracted by Scraper: {json.dumps(form_schema.get('fields', []))}\n\nGenerated Complaint Draft: {json.dumps(draft)}"

    try:
        response = bedrock_client.invoke_model(
            modelId=Config.DRAFT_MODEL_ID,
            body=json.dumps({
                "system": [{"text": system_prompt}],
                "messages": [{"role": "user", "content": [{"text": user_message}]}],
                "inferenceConfig": {"maxTokens": 1024, "temperature": 0.0}
            }),
            contentType="application/json",
            accept="application/json"
        )
        body = json.loads(response['body'].read().decode('utf-8'))
        text = body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '')

        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].strip()
        return json.loads(text)
    except Exception as e:
        print(f"[Bedrock Form Mapper] Error: {e}")
        return {"Name": draft.get("applicantName", ""), "Mobile": draft.get("phoneNumber", ""), "Description": draft.get("description", "")}
