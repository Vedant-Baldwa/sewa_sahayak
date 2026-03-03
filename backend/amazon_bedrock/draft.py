from services.aws.amazon_bedrock import generate_draft_with_bedrock

def generate_complaint(capture_data: dict, form_schema: dict, user_data: dict = None):
    """Business logic for generating a formal complaint draft."""
    return generate_draft_with_bedrock(capture_data, form_schema, user_data)
