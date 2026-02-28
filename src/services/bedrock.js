/**
 * Refactored Amazon Bedrock (Nova Pro) Service connecting to Python Backend
 */
export const mockAnalyzeMedia = async (mediaBlob, type = 'image') => {
    console.log(`[Amazon Bedrock Nova Pro via Python API] Sending media for analysis: ${type}`);

    const formData = new FormData();
    formData.append('media', mediaBlob, `capture.${type === 'image' ? 'jpg' : 'mp4'}`);
    formData.append('type', type);

    try {
        const response = await fetch('http://localhost:8000/api/analyze', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Backend API Error");
        return await response.json();
    } catch (error) {
        console.error("Analysis API failed:", error);
        throw error;
    }
};
