import os
import time
import random
import subprocess
import uuid
import shutil

def process_video_segment(filepath: str, metadata: dict, reports_table=None):
    """
    Simulates a background worker processing a 5-second dashcam segment.
    Extracts frames, mocks YOLO pothole detection, and extracts clips.
    """
    print(f"\n[Detection Worker] Processing segment: {os.path.basename(filepath)}")
    print(f"[Detection Worker] Metadata: {metadata}")
    
    # 1. Simulate frame extraction and AI inference time
    time.sleep(1.5)
    
    # 2. Mock YOLO detection (30% chance for testing)
    is_pothole_detected = random.random() < 0.3
    
    if not is_pothole_detected:
        print("[Detection Worker] Status: No damage detected. Segment discarded.\n")
        try:
            os.remove(filepath)
        except Exception:
            pass
        return None
        
    severity = random.choice(["minor", "moderate", "severe"])
    confidence = round(float(random.uniform(0.75, 0.98)), 2)
    print(f"[Detection Worker] Status: Alert! Pothole detected (Severity: {severity}, Confidence: {confidence})")
    
    # 3. Clip Extraction (mocking +/- 2 seconds -> simply extracting a 2-second subclip)
    clip_filename = f"clip_{str(uuid.uuid4())[:8]}.mp4"
    clip_path = os.path.join(os.path.dirname(filepath), clip_filename)
    
    try:
        # Try to use FFmpeg to trim the 5s segment to 2s
        subprocess.run(
            ["ffmpeg", "-i", filepath, "-ss", "00:00:01", "-to", "00:00:03", "-c", "copy", clip_path],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        print(f"[Detection Worker] FFmpeg Extracted Clip: {clip_filename}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(f"[Detection Worker] FFmpeg unavailable. Copying full segment as clip.")
        shutil.copy2(filepath, clip_path)
        
    # 4. Save to DynamoDB or locally
    event_data = {
        "event_id": str(uuid.uuid4()),
        "type": "pothole",
        "severity": severity,
        "confidence": float(confidence),
        "lat": metadata.get("lat"),
        "lng": metadata.get("lng"),
        "timestamp": str(int(time.time())),
        "clip_url": f"/temp/dashcam/{clip_filename}"  # Mock location URL
    }
    
    # Stub saving mechanism for prototype
    print(f"[Detection Worker] Storing event in database: {event_data['event_id']}")
    
    # Note: In reality, clustering would happen here or periodically over the DB
    # We will invoke clustering separately or save to DB.
    try:
        os.remove(filepath) # Remove the original 5s segment
    except Exception:
        pass
        
    return event_data
