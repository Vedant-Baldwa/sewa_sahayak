import { openDB } from 'idb';
import { initDB } from '../utils/db';

/**
 * Mock AWS Services for Post-Submission Tracking
 */

export const saveReportDraft = async (draft, capture) => {
    console.log(`[Amazon DynamoDB] Autosaving draft for capture: ${capture.id}`);
    try {
        const payload = {
            id: capture.id, // Use capture.id as primary key
            timestamp: Date.now(),
            jurisdiction: draft.jurisdiction || capture.jurisdiction?.ward_district || 'Local Authority',
            damageType: draft.damageType || 'Pothole / Road Damage', // Default to Pothole as requested
            severity: draft.severity || 'Medium',
            status: 'DRAFT',
            captureId: capture.id,
            capturePreview: capture.previewUrl || draft.capturePreview,
            captureType: capture.type || draft.captureType || 'image',
            description: draft.description || '',
            department: 'Road Maintenance & Pothole Repair' // Explicitly set department
        };

        const db = await initDB();
        if (db.objectStoreNames.contains('reports')) {
            await db.put('reports', payload);
        }
    } catch (error) {
        console.error("Failed to save draft to local history", error);
    }
};

export const saveReportToDynamoDB = async (ticketId, draft, captureId) => {
    console.log(`[Amazon DynamoDB] Finalizing report for ticket: ${ticketId}`);
    try {
        const payload = {
            id: captureId, // Maintain same ID to update draft to submitted
            ticketId,
            timestamp: Date.now(),
            jurisdiction: draft.jurisdiction,
            damageType: draft.damageType || 'Pothole / Road Damage',
            severity: draft.severity,
            status: 'SUBMITTED',
            captureId,
            capturePreview: draft.capturePreview || null,
            captureType: draft.captureType || 'image',
            description: draft.description,
            department: 'Road Maintenance & Pothole Repair'
        };
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
        const res = await fetch(`${BACKEND_URL}/api/reports/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("DynamoDB save failed");

        // Update record in IndexedDB
        const db = await initDB();
        if (db.objectStoreNames.contains('reports')) {
            await db.put('reports', payload);
        }
    } catch (error) {
        console.error("Failed to save report to backend", error);
        alert(`DynamoDB Save Error: ${error.message}`);
    }
};

export const uploadEvidenceToS3 = async (blob, ticketId) => {
    console.log(`[Amazon S3] Encrypting (AES-256) and uploading evidence for ticket: ${ticketId} to ap-south-1...`);
    try {
        const formData = new FormData();
        formData.append("evidence", blob, "evidence.jpg");
        formData.append("ticketId", ticketId);

        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
        const res = await fetch(`${BACKEND_URL}/api/evidence/upload`, {
            method: "POST",
            body: formData
        });
        if (!res.ok) throw new Error("S3 Upload Failed");
        const data = await res.json();
        return data.s3_uri;
    } catch (error) {
        console.error("Failed to upload evidence to backend S3", error);
        alert(`S3 Upload Error: ${error.message}`);
        return `s3://mock-fallback/${ticketId}/evidence.blob`;
    }
};

// Browser Push Notification Wrapper
export const sendPushNotification = (title, options) => {
    if (typeof Notification === 'undefined') return;

    if (Notification.permission === 'granted') {
        new Notification(title, options);
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, options);
            }
        });
    }
};
