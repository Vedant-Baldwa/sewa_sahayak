import boto3
import os
import json

# Bedrock is often configured in a region that supports the requested model
REGION = os.getenv('BEDROCK_REGION', 'us-east-1')
bedrock_client = boto3.client('bedrock-runtime', region_name=REGION)

def get_portal_routing(location_string: str, portals_db: dict):
    system_prompt = f"""System Role: You are the Lead Dispatcher for the Sewa Sahayak Road Infrastructure Platform. Your job is to analyze a location string and select the single most appropriate government portal for filing a road complaint.

Rules:
If the address contains "NH" or "National Highway", select NHAI.
If the address contains "SH" or "State Highway", select the specific State PWD portal.
If the address is within a major city limit (e.g., Mumbai, Delhi) and not a highway, select the Municipal Corporation.
If the authority is ambiguous but the issue is serious, default to CPGRAMS.

Input Data: 
> - Location: {location_string}

Portal_DB: {json.dumps(portals_db)}

Output Format: (Strict JSON)
{{"portal_name": "...", "portal_url": "...", "reasoning": "..."}}"""

    # Amazon Nova models formatting
    messages = [
        {"role": "user", "content": [{"text": "Please provide the portal routing details based on the location provided."}]}
    ]

    try:
        response = bedrock_client.invoke_model(
            modelId="amazon.nova-micro-v1:0",
            body=json.dumps({
                "system": [{"text": system_prompt}],
                "messages": messages,
                "inferenceConfig": {"max_new_tokens": 512, "temperature": 0.1}
            }),
            contentType="application/json",
            accept="application/json"
        )
        response_body = json.loads(response['body'].read().decode('utf-8'))
        
        # Amazon Nova outputs are generally structured like this
        output_text = response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '')
        
        # Clean up possible markdown wrappers
        if "```json" in output_text:
            output_text = output_text.split("```json")[1].split("```")[0].strip()
        elif "```" in output_text:
            output_text = output_text.split("```")[1].strip()
            
        return json.loads(output_text)

    except Exception as e:
        print(f"Bedrock Routing Error: {e}")
        return {
            "portal_name": "CPGRAMS",
            "portal_url": portals_db.get('CENTRAL', {}).get('CPGRAMS', ''),
            "reasoning": f"Default fallback due to an error processing the request or LLM failure: {str(e)}"
        }

def generate_complaint_draft(data: dict):
    """
    Generates a formal, professional complaint draft using Amazon Bedrock Nova.
    """
    analysis = data.get("analysis", {})
    transcription = data.get("transcription", {})
    jurisdiction = data.get("jurisdiction", {})
    
    damage_type = analysis.get("damage_type", "Civic Issue")
    severity = analysis.get("severity", "Medium")
    location = jurisdiction.get("portal_name", "Local Authority")
    
    # Context for the AI
    issue_description = analysis.get("suggested_description", "")
    voice_transcript = transcription.get("transcript", "")
    
    system_prompt = """System Role: You are an AI assistant for Sewa Sahayak, an Indian civic tech platform. 
Your goal is to generate a professional, formal, and persuasive complaint to be submitted to government officials.

Rules:
1. Use formal language (e.g., 'To the concerned authority', 'Requested to take immediate action').
2. Be specific about the issue based on the provided data.
3. Keep the tone respectful but firm.
4. If a voice transcript is provided, incorporate its key details into the formal description.
5. The output must be a valid JSON object with specific fields.

Output Format: (Strict JSON)
{
    "applicantName": "Citizen Reporter",
    "damageType": "...",
    "severity": "...",
    "jurisdiction": "...",
    "ward": "...",
    "description": "The full body of the complaint..."
}"""

    user_input = f"""Please generate a complaint draft for:
- Issue: {damage_type}
- Severity: {severity}
- Jurisdiction: {location}
- AI Analysis: {issue_description}
- User's Voice Report: {voice_transcript}
- Location Context: {data.get('location_context', 'Not provided')}"""

    messages = [
        {"role": "user", "content": [{"text": user_input}]}
    ]

    try:
        response = bedrock_client.invoke_model(
            modelId="amazon.nova-micro-v1:0",
            body=json.dumps({
                "system": [{"text": system_prompt}],
                "messages": messages,
                "inferenceConfig": {"max_new_tokens": 1000, "temperature": 0.7}
            }),
            contentType="application/json",
            accept="application/json"
        )
        response_body = json.loads(response['body'].read().decode('utf-8'))
        output_text = response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '')
        
        # Clean up markdown
        if "```json" in output_text:
            output_text = output_text.split("```json")[1].split("```")[0].strip()
        elif "```" in output_text:
            output_text = output_text.split("```")[1].strip()
            
        return json.loads(output_text)

    except Exception as e:
        print(f"Bedrock Draft Generation Error: {e}")
        # Fallback to the original logic
        description = issue_description or ("Voice Report: " + voice_transcript) or "Observed civic hazard."
        return {
            "applicantName": "Citizen Reporter",
            "damageType": damage_type,
            "severity": severity,
            "jurisdiction": location,
            "ward": jurisdiction.get("ward_district") or "Default Ward",
            "description": f"To the concerned authority,\n\nI am reporting a issue regarding {damage_type}.\n\nDetails:\n{description}\n\nPlease address this at your earliest convenience.\n\nThank you."
        }

def generate_cluster_complaint(data: dict):
    """
    Generates a formal complaint for a cluster of detected issues.
    """
    authority = data.get("portal_name", "Local Authority")
    sub_area = data.get("sub_area", "this area")
    lat = data.get("latitude")
    lng = data.get("longitude")
    event_count = data.get("event_count", 1)
    severity = data.get("severity", "moderate")
    
    system_prompt = """System Role: You are an AI assistant for Sewa Sahayak. 
Your goal is to generate a comprehensive, formal complaint based on multiple dashcam detection events.

Rules:
1. Start with 'To the concerned [Authority]'.
2. Mention that this is an AI-validated report based on multiple dashcam captures.
3. Be professional, urgent (if severity is high), and clear.
4. Include the location details and GPS coordinates.
5. Emphasize that multiple events (provide the count) have been recorded in the same spot, indicating a recurring or persistent hazard.
6. The output must be the text of the complaint itself."""

    user_input = f"""Generate a complaint for:
- Authority: {authority}
- Location: {sub_area}
- GPS: {lat}, {lng}
- Detection Count: {event_count}
- Aggregate Severity: {severity}"""

    messages = [
        {"role": "user", "content": [{"text": user_input}]}
    ]

    try:
        response = bedrock_client.invoke_model(
            modelId="amazon.nova-micro-v1:0",
            body=json.dumps({
                "system": [{"text": system_prompt}],
                "messages": messages,
                "inferenceConfig": {"max_new_tokens": 1000, "temperature": 0.7}
            }),
            contentType="application/json",
            accept="application/json"
        )
        response_body = json.loads(response['body'].read().decode('utf-8'))
        output_text = response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '')
        return output_text.strip()

    except Exception as e:
        print(f"Bedrock Cluster Complaint Error: {e}")
        return f"To the concerned {authority},\n\nThis is a report regarding road damage at {sub_area} ({lat}, {lng}). Multiple events ({event_count}) have been recorded. Please inspect."
