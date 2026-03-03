import io
from PIL import Image, ImageDraw
from core.config import rekognition_client

def redact_image_pii(image_bytes: bytes) -> tuple[bytes, int, int]:
    """Detects faces and text in an image and redactions them."""
    try:
        # 1. AWS API Calls
        face_response = rekognition_client.detect_faces(Image={'Bytes': image_bytes})
        text_response = rekognition_client.detect_text(Image={'Bytes': image_bytes})
        
        # 2. Setup Image for editing
        image = Image.open(io.BytesIO(image_bytes))
        draw = ImageDraw.Draw(image)
        width, height = image.size
        
        # 3. Process Detections
        face_details = face_response.get('FaceDetails', [])
        text_detections = text_response.get('TextDetections', [])
        
        faces_count = len(face_details)
        text_count = 0
        
        for face in face_details:
            box = face.get('BoundingBox')
            if not box: continue
            draw.rectangle([
                width * box['Left'], 
                height * box['Top'], 
                width * (box['Left'] + box['Width']), 
                height * (box['Top'] + box['Height'])
            ], fill="black")
            
        for text in text_detections:
            if text.get('Type') == 'LINE':
                text_count += 1
                box = text.get('Geometry', {}).get('BoundingBox')
                if not box: continue
                draw.rectangle([
                    width * box['Left'], 
                    height * box['Top'], 
                    width * (box['Left'] + box['Width']), 
                    height * (box['Top'] + box['Height'])
                ], fill="black")

        # 4. Save and return
        buf = io.BytesIO()
        fmt = image.format  # Pillow preserves format when opened from BytesIO with a valid header
        if not fmt:
            # Fallback: detect from magic bytes
            fmt = "PNG" if image_bytes[:8] == b'\x89PNG\r\n\x1a\n' else "JPEG"
        image.save(buf, format=fmt)
        return buf.getvalue(), faces_count, text_count
    except Exception as e:
        print(f"[Rekognition Redaction] Error: {e}")
        return image_bytes, 0, 0
