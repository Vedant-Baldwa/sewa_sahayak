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

def compile_draft(data: dict, schema: dict) -> dict:
    """
    Takes the compiled incident data and pairs it with the scraped portal's JSON schema.
    Amazon Nova Pro is used to generate a 1:1 mapped payload that precisely fulfills 
    all the required portal form fields.
    """
    system_prompt = f"""You are an automated dispatch system.
Given the following incident data and the target strict JSON schema of the government portal, 
your job is to map the data exactly into this schema format so it can be submitted by an automated agent.
Ensure all mandatory fields are present. Output only valid JSON that matches the provided schema fields.
In your output, do NOT wrap the json output in ``` or any markdown formatting. Output raw JSON.

Target Form Schema: {json.dumps(schema)}
"""
    messages = [
        {"role": "user", "content": [{"text": f"Please map this incident data to the form schema:\\n{json.dumps(data)}"}]}
    ]

    try:
        response = bedrock_client.invoke_model(
            modelId="amazon.nova-pro-v1:0",
            body=json.dumps({
                "system": [{"text": system_prompt}],
                "messages": messages,
                "inferenceConfig": {"max_new_tokens": 1024, "temperature": 0.1}
            }),
            contentType="application/json",
            accept="application/json"
        )
        response_body = json.loads(response['body'].read().decode('utf-8'))
        
        output_text = response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '')
        
        # Clean up possible markdown wrappers
        if "```json" in output_text:
            output_text = output_text.split("```json")[1].split("```")[0].strip()
        elif "```" in output_text:
            output_text = output_text.split("```")[1].strip()
            
        return json.loads(output_text)
    
    except Exception as e:
        print(f"Bedrock Compilation Error: {e}")
        # Return fallback dictionary
        return {"error": str(e), "_raw_payload": data}
