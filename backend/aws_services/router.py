import os
import json
from authlib.jose import errors # not needed directly but good
from typing import Dict, Any, Optional

try:
    from aws_services.location import reverse_geocode, verify_address
except ImportError:
    pass

def load_portals() -> Dict[str, Any]:
    portals_path = os.path.join(os.path.dirname(__file__), "..", "portals.json")
    with open(portals_path, "r", encoding="utf-8") as f:
        return json.load(f)

def find_portal_by_city(city: str, portals: Dict[str, Any]) -> Optional[Dict[str, str]]:
    if not city:
        return None
        
    city_upper = city.upper()
    
    # Check Municipal Corporations specifically
    municipalities = portals.get("MUNICIPAL_CORP", {})
    for key, url in municipalities.items():
        if city_upper in key:
            return {"portal_name": key, "portal_url": url, "jurisdiction_level": "Municipal"}
            
    return None

def find_portal_by_state(state: str, portals: Dict[str, Any]) -> Optional[Dict[str, str]]:
    if not state:
        return None
        
    state_upper = state.upper().replace(" ", "_")
    
    states = portals.get("STATE_GOVERNMENT", {})
    for key, url in states.items():
        if state_upper in key:
            return {"portal_name": key, "portal_url": url, "jurisdiction_level": "State"}
            
    return None

def get_default_portal(portals: Dict[str, Any]) -> Dict[str, str]:
    # Defaulting to Central CPGRAMS if no specific municipal/state match
    central = portals.get("CENTRAL", {})
    url = central.get("CPGRAMS", "https://pgportal.gov.in/")
    return {"portal_name": "CPGRAMS", "portal_url": url, "jurisdiction_level": "Central"}


def route_complaint(lat: float, lng: float, manual_address: Optional[str] = None) -> Dict[str, Any]:
    """
    Given strict coordinates, or a manual address string, dynamically map 
    the location to the correct government portal URL.
    """
    
    portals = load_portals()
    location_data = None
    
    if lat and lng:
        # 1. Reverse geocode via AWS Geo Places
        location_data = reverse_geocode(lat, lng)
    elif manual_address:
         # 2. Try to verify the manual address to extract city/state cleanly
         # This is a bit tricky, but let's assume manual_address has City/State embedded.
         # For simplicity in testing without full AWS setup, we can also basic string match.
         location_data = verify_address("", "", manual_address) 
         
    if location_data:
        city = location_data.get("City", "")
        state = location_data.get("State", "")
        
        # Priority 1: Municipal Corporation
        portal_match = find_portal_by_city(city, portals)
        if portal_match:
            return {**portal_match, "mapped_location": location_data}
            
        # Priority 2: State Government Helpdesk
        portal_match = find_portal_by_state(state, portals)
        if portal_match:
             return {**portal_match, "mapped_location": location_data}
             
    # Priority 3: Central Portal (Fallback)
    fallback = get_default_portal(portals)
    return {**fallback, "mapped_location": location_data or {"Address": manual_address}}

