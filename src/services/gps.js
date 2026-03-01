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
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // Increased timeout to 15s
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

// --- NEW RE-TIME TRACKING FEATURE ---
export const watchDeviceLocation = (onSuccess, onError) => {
    if (!navigator.geolocation) {
        onError(new Error("Geolocation not supported"));
        return null;
    }

    return navigator.geolocation.watchPosition(
        (position) => {
            onSuccess({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
            });
        },
        (err) => onError(err),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 } // Increased timeout
    );
};

// --- Reverse Geocoding for City Name ---
export const getCityName = async (lat, lng) => {
    // Basic local mapping for quick results if API is slow
    const isMumbai = lat > 18.5 && lat < 19.5 && lng > 72.5 && lng < 73.5;
    const isDelhi = lat > 28.3 && lat < 28.9 && lng > 76.8 && lng < 77.5;
    const isBangalore = lat > 12.8 && lat < 13.1 && lng > 77.4 && lng < 77.7;

    try {
        // Fetch from OSM with a 4s timeout to prevent hanging UI
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();

        const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.state;
        if (city) return city;
    } catch (error) {
        console.warn("Reverse geocoding failed, using local rules:", error);
    }

    // Fallback if API fails
    if (isMumbai) return "Mumbai, MH";
    if (isDelhi) return "New Delhi, DL";
    if (isBangalore) return "Bengaluru, KA";

    return "Live Location Active";
};
