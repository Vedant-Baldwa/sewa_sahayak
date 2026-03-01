/**
 * Amazon Bedrock (Nova Pro) Draft Generation Service
 * Sends full evidence context to generate a formal complaint letter.
 */
export const mockGenerateDraft = async (captureData) => {
    // Build a rich payload from all the collected capture evidence
    const payload = {
        // Core evidence from AI image analysis
        analysis: captureData.analysis || null,
        // GPS & jurisdiction data
        jurisdiction: captureData.jurisdiction || null,
        lat: captureData.jurisdiction?.mapped_coordinates?.lat || null,
        lng: captureData.jurisdiction?.mapped_coordinates?.lng || null,
        // Voice transcription (if any)
        transcription: captureData.transcription || null,
        // Citizen-entered notes
        description: captureData.description || '',
    };

    console.log('[Bedrock Draft] Sending payload to /api/draft:', payload);

    try {
        const response = await fetch('http://localhost:8000/api/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Draft API Error: ${response.status} - ${err}`);
        }
        const draft = await response.json();
        console.log('[Bedrock Draft] Received draft:', draft);
        return draft;
    } catch (error) {
        console.error("Draft Generation API failed:", error);
        throw error;
    }
};
