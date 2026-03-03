/**
 * GPS Extraction and Jurisdiction Mapping Service
 */

// Uses browser Geolocation API to get high-accuracy coordinates
export const getDeviceLocation = async () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser"));
            return;
        }

        // In a real app we would ask for permissions gracefully
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                });
            },
            (err) => {
                // Reject rather than mocking, to enforce manual location via UI
                console.warn("Geolocation failed or denied", err);
                reject(new Error("Location permission denied or unavailable."));
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
};

// Maps coordinates to a specific government body and portal
export const mapJurisdiction = async (lat, lng) => {
    console.log(`Mapping jurisdiction for: ${lat}, ${lng}`);

    let addressString = "Unknown Location";

    // Attempt Reverse Geocoding via free OpenStreetMap Nominatim API
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: {
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'SewaSahayakApp/1.0' // Nominatim requires User-Agent
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Nominatim Raw Geocode Data:", data); // Added for Debugging

            if (data && data.address) {
                // Try grabbing the most detailed `display_name` directly if it exists, otherwise build it
                if (data.display_name) {
                    // split to avoid it being overly huge, taking the most granular parts
                    const parts = data.display_name.split(', ');
                    addressString = parts.slice(0, Math.min(4, parts.length)).join(', ');
                } else {
                    const parts = [];
                    if (data.address.road || data.address.pedestrian) parts.push(data.address.road || data.address.pedestrian);
                    if (data.address.suburb || data.address.neighbourhood || data.address.residential) parts.push(data.address.suburb || data.address.neighbourhood || data.address.residential);
                    if (data.address.city || data.address.town || data.address.village || data.address.county) parts.push(data.address.city || data.address.town || data.address.village || data.address.county);
                    if (data.address.state) parts.push(data.address.state);

                    if (parts.length > 0) {
                        addressString = parts.join(', ');
                    }
                }
            }
        }
    } catch (err) {
        console.warn("Reverse geocoding failed, falling back to basic mapping", err);
    }

    // Dummy Portal Routing Ruleset based on coordinates:
    // If we are around Mumbai coordinates (approx), route it to Municipal (BMC)
    // Else if some other coordinate, State/Central
    if (lat > 18.5 && lat < 19.5 && lng > 72.0 && lng < 73.5) {
        return {
            jurisdiction_level: "Municipal",
            portal_name: "BMC Complaint Portal",
            portal_url: "https://mock-mcgm.gov.in/report",
            ward_district: addressString !== "Unknown Location" ? addressString : "Mumbai Region",
            mapped_coordinates: { lat, lng }
        };
    }

    // Default fallback routing for rest of India
    return {
        jurisdiction_level: "State/Central",
        portal_name: "Public Works Department (PWD)",
        portal_url: "https://mock-pwd.gov.in/complaints",
        ward_district: addressString !== "Unknown Location" ? addressString : "General Highway Division",
        mapped_coordinates: { lat, lng }
    };
};
