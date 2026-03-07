/**
 * Amazon Bedrock Draft Generation Service - Real Backend Integration
 */
export const mockGenerateDraft = async (captureData) => {
    console.log(`[Amazon Bedrock Draft via Python API] Generating drafted complaint...`);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

    try {
        const response = await fetch(`${BACKEND_URL}/api/draft`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(captureData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Draft Generation API Error");
        }

        return await response.json();
    } catch (error) {
        console.error("Draft Generation failed:", error);
        throw error;
    }
};
