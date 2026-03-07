from core.config import location_client, location_client_type, Config

def reverse_geocode(lat: float, lng: float):
    if not location_client: 
        return {"Address": f"Coordinates: {lat}, {lng}", "City": "Unknown", "State": "Unknown"}
    try:
        if location_client_type == "geo-places":
            response = location_client.reverse_geocode(
                QueryPosition=[lng, lat],
                MaxResults=1
            )
            if response.get('ResultItems'):
                place = response['ResultItems'][0]
                address = place.get('Address', {})
                return {
                    "Address": address.get('Label', f"{lat}, {lng}"),
                    "City": address.get('Locality', 'Unknown city'),
                    "District": address.get('District', ''),
                    "State": address.get('Region', {}).get('Name', 'Unknown state'),
                    "PostalCode": address.get('PostalCode', ''),
                    "Country": address.get('Country', {}).get('Name', 'India')
                }
        elif location_client_type == "location":
            # Fallback for standard location service (requires a Place Index)
            # Since we don't have one in .env, we still return a coordinate string
            return {"Address": f"Lat: {lat}, Lng: {lng}", "City": "Detected Location"}
        
        return {"Address": f"GPS: {lat}, {lng}", "City": "Unknown"}
    except Exception as e:
        print(f"Reverse Geocode Error: {e}")
        return {"Address": f"Point ({lat}, {lng})", "City": "Unknown"}

def verify_address(state: str, city: str, address: str):
    if not location_client: return {"Address": address, "City": city, "State": state}
    search_text = f"{address}, {city}, {state}, India"
    try:
        if location_client_type == "geo-places":
            response = location_client.geocode(
                QueryText=search_text,
                MaxResults=1
            )
            if response.get('ResultItems'):
                place = response['ResultItems'][0]
                address_info = place.get('Address', {})
                return {
                    "Address": address_info.get('Label', address),
                    "City": address_info.get('Locality', city),
                    "District": address_info.get('District', ''),
                    "State": address_info.get('Region', {}).get('Name', state),
                    "PostalCode": address_info.get('PostalCode', ''),
                    "Country": address_info.get('Country', {}).get('Name', 'India')
                }
        return {"Address": address, "City": city, "State": state}
    except Exception as e:
        print(f"Verify Address Error: {e}")
        return {"Address": address, "City": city, "State": state}
