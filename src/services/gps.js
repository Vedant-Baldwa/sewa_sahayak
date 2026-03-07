/**
 * GPS Extraction Service using Browser Geolocation
 */

export const getDeviceLocation = async () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.warn("[GPS] Geolocation API not available in this browser.");
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }

        console.log("[GPS] Requesting current position...");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log("[GPS] Position acquired:", position.coords.latitude, position.coords.longitude);
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    speed: position.coords.speed,
                    timestamp: position.timestamp
                };
                console.log(`[GPS] Real location acquired: (${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}) ±${locationData.accuracy.toFixed(0)}m`);
                resolve(locationData);
            },
            (err) => {
                console.warn("[GPS] Geolocation failed:", err.code, err.message);
                reject(new Error("Location permission denied or unavailable. Please enter location manually."));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
};

/**
 * Note: Jurisdiction mapping is now handled server-side via Amazon Bedrock 
 * in the /api/route endpoint. This local function is kept as a minimal fallback.
 */
export const mapJurisdiction = (lat, lng) => {
    return {
        jurisdiction_level: "Determining...",
        portal_name: "Detecting Portal...",
        portal_url: "",
        ward_district: "Checking jurisdiction...",
        mapped_coordinates: { lat, lng }
    };
};
