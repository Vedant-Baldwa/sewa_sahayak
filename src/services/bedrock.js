/**
 * Amazon Bedrock (Nova Pro) Service - Real Backend Integration
 */
export const mockAnalyzeMedia = async (mediaBlob, type = 'image') => {
    console.log(`[Amazon Bedrock Nova Pro via Python API] Sending media for analysis: ${type}`);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

    const formData = new FormData();
    formData.append('media', mediaBlob, `capture.${type === 'image' ? 'jpg' : 'mp4'}`);
    formData.append('type', type);

    try {
        const response = await fetch(`${BACKEND_URL}/api/analyze`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Bedrock Analysis API Error");
        }

        return await response.json();
    } catch (error) {
        console.error("Bedrock Analysis failed:", error);
        throw error;
    }
};
