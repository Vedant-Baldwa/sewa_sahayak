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
                // Fallback for mocked local testing without permissions
                console.warn("Geolocation failed, using mock location", err);
                resolve({
                    lat: 19.0760, // Mumbai Mock
                    lng: 72.8777,
                    accuracy: 50,
                    timestamp: Date.now()
                });
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
};

// Maps coordinates to a specific government body and portal
export const mapJurisdiction = (lat, lng) => {
    console.log(`Mapping jurisdiction for: ${lat}, ${lng}`);

    // Dummy Ruleset:
    // If we are around Mumbai coordinates (approx), route it to Municipal (BMC)
    // Else if some other coordinate, State/Central

    if (lat > 18.5 && lat < 19.5 && lng > 72.0 && lng < 73.5) {
        return {
            jurisdiction_level: "Municipal",
            portal_name: "BMC Pothole Tracking Portal",
            portal_url: "https://mock-mcgm.gov.in/report",
            ward_district: "K-East Ward, Andheri",
            mapped_coordinates: { lat, lng }
        };
    }

    // Default fallback
    return {
        jurisdiction_level: "State",
        portal_name: "State Public Works Department (PWD)",
        portal_url: "https://mock-pwd.gov.in/complaints",
        ward_district: "Highway Division 4",
        mapped_coordinates: { lat, lng }
    };
};
