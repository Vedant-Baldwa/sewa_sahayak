import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Video, StopCircle, UploadCloud, CheckCircle } from 'lucide-react';
import { saveDashcamSegment, getUnsyncedDashcamSegments, markDashcamSegmentAsSynced } from '../utils/db';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getDeviceLocation } from '../services/gps';

const DashcamRecorder = () => {
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const isOnline = useOnlineStatus();

    const [isRecording, setIsRecording] = useState(false);
    const [segmentsCount, setSegmentsCount] = useState(0);
    const [unsyncedCount, setUnsyncedCount] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMSG, setErrorMSG] = useState(null);

    // Initialize camera
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false // Mute audio to preserve privacy & save sizing for dashcam
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            streamRef.current = stream;
            setErrorMSG(null);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setErrorMSG("Could not access the camera. Please allow permissions.");
        }
    };

    useEffect(() => {
        startCamera();
        return () => {
            // Cleanup stream and recording cycle on unmount
            if (cycleIntervalRef.current) {
                clearInterval(cycleIntervalRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Sync background loop — real upload to backend
    const syncSegments = useCallback(async () => {
        if (!isOnline || isUploading) return;
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
        try {
            setIsUploading(true);
            const unsynced = await getUnsyncedDashcamSegments();
            setUnsyncedCount(unsynced.length);

            if (unsynced.length === 0) {
                setIsUploading(false);
                return;
            }

            for (const segment of unsynced) {
                const sizeMB = (segment.blob.size / 1024 / 1024).toFixed(2);
                console.log(`Uploading segment ${segment.id} (${sizeMB} MB) to backend...`);

                try {
                    // Build multipart form data with the video blob + GPS
                    const formData = new FormData();
                    const ext = (segment.mimeType || 'video/webm').includes('mp4') ? 'mp4' : 'webm';
                    formData.append('segment', segment.blob, `dashcam_${segment.id}.${ext}`);
                    if (segment.lat != null) formData.append('lat', String(segment.lat));
                    if (segment.lng != null) formData.append('lng', String(segment.lng));

                    const res = await fetch(`${BACKEND_URL}/api/dashcam/upload`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                    });

                    if (res.ok) {
                        const result = await res.json();
                        console.log(`Segment ${segment.id} uploaded & queued:`, result);
                        await markDashcamSegmentAsSynced(segment.id);
                    } else {
                        console.error(`Upload failed for segment ${segment.id}: HTTP ${res.status}`);
                    }
                } catch (uploadErr) {
                    console.error(`Network error uploading segment ${segment.id}:`, uploadErr);
                    // Leave as unsynced so it retries on next interval
                }
            }

            const remaining = await getUnsyncedDashcamSegments();
            setUnsyncedCount(remaining.length);
        } catch (err) {
            console.error("Error during sync iteration", err);
        } finally {
            setIsUploading(false);
        }
    }, [isOnline, isUploading]);

    // Periodic check for unsynced segments
    useEffect(() => {
        let intervalId;
        if (isOnline) {
            syncSegments(); // Trigger immediately
            intervalId = setInterval(syncSegments, 5000); // Check every 5 seconds
        }
        return () => clearInterval(intervalId);
    }, [isOnline, syncSegments]);

    // Ref to hold the cycling interval
    const cycleIntervalRef = useRef(null);
    const selectedTypeRef = useRef('');

    /**
     * Start a single short recording session that collects data into one
     * self-contained blob, then automatically restarts for the next chunk.
     * This avoids the broken-header problem of MediaRecorder timeslice.
     */
    const startSingleRecording = useCallback(() => {
        if (!streamRef.current) return;

        const chunks = [];
        const recorder = new MediaRecorder(streamRef.current, { mimeType: selectedTypeRef.current });

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                chunks.push(event.data);
            }
        };

        recorder.onstop = async () => {
            if (chunks.length === 0) return;
            // Combine chunks into a single complete blob with proper headers
            const completeBlob = new Blob(chunks, { type: selectedTypeRef.current });
            console.log(`Captured complete segment: ${completeBlob.size} bytes`);

            let loc = null;
            try {
                loc = await getDeviceLocation();
            } catch (e) {
                console.warn("Could not fetch GPS for this segment", e);
            }

            // Save chunk to IndexedDB
            await saveDashcamSegment(completeBlob, {
                mimeType: selectedTypeRef.current,
                lat: loc?.lat,
                lng: loc?.lng
            });

            setSegmentsCount(prev => prev + 1);
            setUnsyncedCount(prev => prev + 1);

            // Trigger sync if online
            if (navigator.onLine) {
                syncSegments();
            }
        };

        recorder.start(); // No timeslice — record continuously
        mediaRecorderRef.current = recorder;
    }, [syncSegments]);

    // Start continuous recording
    const toggleRecording = async () => {
        if (isRecording) {
            // Stop
            if (cycleIntervalRef.current) {
                clearInterval(cycleIntervalRef.current);
                cycleIntervalRef.current = null;
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            return;
        }

        // Start
        if (!streamRef.current) {
            await startCamera();
            if (!streamRef.current) return;
        }

        try {
            // Detect best supported video format
            const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
            selectedTypeRef.current = '';
            for (const t of types) {
                if (MediaRecorder.isTypeSupported(t)) {
                    selectedTypeRef.current = t;
                    break;
                }
            }

            setIsRecording(true);
            setSegmentsCount(0);

            // Start the first recording immediately
            startSingleRecording();

            // Every 5 seconds: stop the current recording (triggers onstop → saves blob)
            // and start a fresh one with new headers
            cycleIntervalRef.current = setInterval(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop(); // triggers onstop → saves complete blob
                }
                startSingleRecording();
            }, 5000);

        } catch (err) {
            console.error("Could not start MediaRecorder", err);
            setErrorMSG("Failed to start recording. Unsupported format on this browser?");
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="heading-3" style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Video size={20} className={isRecording ? "text-danger" : ""} />
                    Dashcam Mode
                </h2>
                {isRecording && (
                    <span className="live-badge" style={{ background: 'var(--color-danger)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>
                        REC
                    </span>
                )}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Records your drive continuously. Uploads 5-second segments in the background.
            </p>

            {errorMSG && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{errorMSG}</p>}

            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Session Segments</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{segmentsCount}</span>
                </div>
                <div style={{ width: '1px', background: 'rgba(0,0,0,0.1)', height: '30px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Pending Upload</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {unsyncedCount > 0 ? (
                            <UploadCloud size={16} className={isUploading ? "text-warning animate-pulse" : "text-warning"} />
                        ) : (
                            <CheckCircle size={16} className="text-success" />
                        )}
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: unsyncedCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                            {unsyncedCount}
                        </span>
                    </div>
                </div>
            </div>

            <button
                className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
                onClick={toggleRecording}
                style={{ padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '1rem' }}
            >
                {isRecording ? <><StopCircle size={20} /> Stop Dashcam</> : <><Video size={20} /> Start Dashcam</>}
            </button>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        .text-danger { color: var(--color-danger); }
        .text-warning { color: var(--color-warning); }
        .text-success { color: var(--color-success); }
        .animate-pulse { animation: pulse 1.5s infinite; }
        `
            }} />
        </div>
    );
};

export default DashcamRecorder;
