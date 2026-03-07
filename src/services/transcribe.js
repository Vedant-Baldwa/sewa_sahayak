/**
 * Amazon Transcribe Service - Real Backend Integration
 */
export const mockTranscribeAudio = async (audioBlob, language = 'hi-IN') => {
    console.log(`[AWS Transcribe via Python API] Sending audio for transcription...`);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice_note.webm');
    formData.append('language', language);

    try {
        const response = await fetch(`${BACKEND_URL}/api/transcribe`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Transcription API Error");
        }

        return await response.json();
    } catch (error) {
        console.error("Transcription failed:", error);
        throw error;
    }
};
