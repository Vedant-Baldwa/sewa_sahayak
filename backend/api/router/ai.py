import json
from fastapi import APIRouter, File, UploadFile, Form, Request, HTTPException
from core.config import Config
from api.schemas import DraftRequest, RouteRequest
from services.aws.amazon_bedrock import get_portal_routing
from amazon_bedrock.analysis import analyze_capture_logic
from amazon_bedrock.draft import generate_complaint
from services.aws.amazon_location import reverse_geocode, verify_address
from amazon_nova_act.nova_act_scraper import extract_form_fields

router = APIRouter(prefix="/api", tags=["AI & Generation"])

# Load PORTAL_DB
try:
    with open("portals.json", "r") as f:
        PORTALS_DB = json.load(f)
except Exception:
    PORTALS_DB = {}

@router.post("/analyze")
async def analyze_media(media: UploadFile = File(...), type: str = Form(...)):
    image_bytes = await media.read()
    return analyze_capture_logic(image_bytes, media.content_type)

@router.post("/route")
async def route_complaint(route_req: RouteRequest):
    structured_address = {"Address": "Unknown Location", "City": "Unknown"}
    if route_req.lat is not None and route_req.lng is not None:
        structured_address = reverse_geocode(route_req.lat, route_req.lng)
    elif route_req.state and route_req.city and route_req.address:
        structured_address = verify_address(route_req.state, route_req.city, route_req.address)

    location_string = structured_address.get("Address") if structured_address else "Unknown Location"
    try:
        routing_result = get_portal_routing(location_string, PORTALS_DB)
    except Exception as e:
        print(f"[Route] Bedrock Routing Error: {e}")
        routing_result = {"portal_name": "CPGRAMS", "portal_url": "https://pgportal.gov.in/", "reasoning": "Default fallback due to routing error."}
    
    # Attempt Nova Act scraping (non-blocking – returns empty fields on failure)
    form_fields = {"fields": []}
    portal_url = routing_result.get("portal_url", "")
    portal_name = routing_result.get("portal_name", "Government Portal")
    if portal_url:
        try:
            form_fields = extract_form_fields(portal_url, portal_name)
            # If scraper returned a 'note' (i.e., Nova Act unavailable), log it
            if form_fields.get("note"):
                print(f"[Route] Nova Act: {form_fields['note']}")
        except Exception as e:
            print(f"[Route] Scrape Error (non-fatal): {e}")
            form_fields = {"fields": [], "note": f"Scraping unavailable: {e}"}

    return {"structured_address": structured_address, "routing": routing_result, "form_schema": form_fields}

@router.post("/draft")
async def generate_draft(data: DraftRequest, request: Request):
    print(f"[API] Generating draft for: {data.locationData.get('address') if data.locationData else 'Unknown'}")
    user_session = request.session.get('user')
    user_data = {"email": user_session.get("email"), "name": user_session.get("name")} if user_session else None
    try:
        return generate_complaint(data.dict(), data.form_schema, user_data)
    except Exception as e:
        print(f"[API] Draft Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
