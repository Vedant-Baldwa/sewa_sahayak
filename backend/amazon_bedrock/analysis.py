from services.aws.amazon_bedrock import analyze_capture

def analyze_capture_logic(media_bytes: bytes, content_type: str):
    """Business logic for analyzing a visual capture (image or video)."""
    return analyze_capture(media_bytes, content_type)
