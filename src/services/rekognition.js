/**
 * Amazon Rekognition Service - Real Backend Integration
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const redactMediaWithRekognition = async (mediaBlob) => {
    console.log(`[Amazon Rekognition] Scanning media for PII via real API...`);

    const formData = new FormData();
    formData.append('media', mediaBlob, 'raw_capture.blob');

    try {
        const response = await fetch(`${BACKEND_URL}/api/redact`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Redaction API Error");
        }

        const facesRedacted = parseInt(response.headers.get("X-Faces-Redacted") || "0", 10);
        const platesRedacted = parseInt(response.headers.get("X-Plates-Redacted") || "0", 10);

        const redactedBlob = await response.blob();
        // Do not mutate `redactedBlob.isRedacted = true` here as it causes DataCloneError in IndexedDB

        return {
            redactedFile: redactedBlob,
            facesRedacted,
            platesRedacted
        };
    } catch (error) {
        console.error("Redaction failed:", error);
        throw error;
    }
};
