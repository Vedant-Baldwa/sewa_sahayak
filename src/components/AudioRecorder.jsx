import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

export default function AudioRecorder({ onRecordingComplete, isRecordingProp, onStart, onStop }) {
    const [isProcessing, setIsProcessing] = useState(false);

    // Internal state if props aren't provided
    const [internalRecording, setInternalRecording] = useState(false);
    const isRecording = isRecordingProp !== undefined ? isRecordingProp : internalRecording;

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        if (isRecording || isProcessing) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                console.log(`[AudioRecorder] Data available: ${event.data.size} bytes`);
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                setIsProcessing(true);
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                // Allow a slight delay for processing UI to show before executing Heavy Task
                setTimeout(() => {
                    onRecordingComplete(audioBlob);
                    setIsProcessing(false);
                }, 100);
            };

            mediaRecorderRef.current.start();
            console.log('[AudioRecorder] Recorder started, state:', mediaRecorderRef.current.state);
            if (onStart) onStart();
            else setInternalRecording(true);
        } catch (err) {
            console.error('[AudioRecorder] CRITICAL: Microphone failure:', err);
            alert('Could not access microphone. Please check permissions and ensure no other app is using it.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (onStop) onStop();
        else setInternalRecording(false);
    };

    // If controlled externally (like holding a card), we sync with prop
    useEffect(() => {
        if (isRecordingProp === true) {
            startRecording();
        } else if (isRecordingProp === false && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            if (onStop) onStop();
            else setInternalRecording(false);
        }
    }, [isRecordingProp]);

    if (isProcessing) {
        return (
            <button className="btn-3d" disabled style={{ opacity: 0.7, padding: '1rem 1.75rem', fontSize: '0.9rem', width: '100%' }}>
                <Loader2 className="animate-spin" size={19} /> Processing...
            </button>
        );
    }

    if (isRecording) {
        return (
            <button
                className="btn-3d"
                style={{
                    backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', color: 'white',
                    animation: 'pulse 1.5s infinite', padding: '1rem 1.75rem', fontSize: '0.9rem', width: '100%'
                }}
                onClick={stopRecording}
            >
                <Square size={19} fill="currentColor" /> Stop
            </button>
        );
    }

    return (
        <button className="btn-3d secondary-btn-3d" style={{ padding: '1rem 1.75rem', fontSize: '0.9rem', color: 'var(--text)', width: '100%' }} onClick={startRecording}>
            <Mic size={19} /> Audio
        </button>
    );
}
