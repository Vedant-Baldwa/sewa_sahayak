/**
 * Amazon Transcribe Service - Real Backend Integration
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const transcribeAudioWithAWS = async (audioBlob, language = 'hi-IN') => {
    console.log(`[Amazon Transcribe] Sending audio for real transcription...`);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice_note.webm');
    formData.append('language', language);

    try {
        const response = await fetch(`${BACKEND_URL}/api/transcribe`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
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
