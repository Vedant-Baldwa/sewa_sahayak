/**
 * Refactored Transcribe Service connecting to Python Backend
 */
export const mockTranscribeAudio = async (audioBlob, language = 'hi-IN') => {
    console.log(`[AWS Transcribe via Python API] Sending audio for transcription...`);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice_note.webm');

    try {
        const response = await fetch('http://localhost:8000/api/transcribe', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Backend API Error");
        return await response.json();
    } catch (error) {
        console.error("Transcription API failed:", error);
        throw error;
    }
};
