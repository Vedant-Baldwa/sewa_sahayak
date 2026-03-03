/**
 * Amazon Bedrock Draft Generation Service - Real Backend Integration
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const generateDraftWithBedrock = async (captureData) => {
    console.log(`[Amazon Bedrock Draft] Generating formal complaint draft via real API...`);

    try {
        const response = await fetch(`${BACKEND_URL}/api/draft`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(captureData),
            credentials: 'include'
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
