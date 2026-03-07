import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { getUnsyncedMedia, markMediaAsSynced, saveMediaLocally } from './utils/db';
import { uploadEvidenceToS3, saveReportToDynamoDB, sendPushNotification } from './services/tracking';
import { mockTranscribeAudio } from './services/transcribe';
import { mockAnalyzeMedia } from './services/bedrock';
import { mockRedactMedia } from './services/rekognition';
import { getDeviceLocation, mapJurisdiction } from './services/gps';

// Components & Pages
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import OnlineIndicator from './components/OnlineIndicator';
import DraftReview from './components/DraftReview';
import AgenticSubmission from './components/AgenticSubmission';

// New Pages
import Home from './pages/Home';
import DashcamPage from './pages/DashcamPage';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const isOnline = useOnlineStatus();
  const [captures, setCaptures] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [user, setUser] = useState(null);

  // Media processing states for manual reporting
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRedacting, setIsRedacting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Drafting process states
  const [selectedCaptureForDraft, setSelectedCaptureForDraft] = useState(null);
  const [activeSubmissionDraft, setActiveSubmissionDraft] = useState(null);

  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Sync effect & Session Check
  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkSession = async () => {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser({ ...data.user, userData: data.userData, token: data.token });
        }
      } catch (err) {
        console.warn("No active session.");
      }
    };
    checkSession();
  }, [isOnline]);

  const syncOfflineData = async () => {
    setIsSyncing(true);
    try {
      const unsynced = await getUnsyncedMedia();
      if (unsynced.length > 0) {
        console.log(`Found ${unsynced.length} offline captures to sync`);
        for (const item of unsynced) {
          try {
            const offlineTicketId = `BMC-OFFLINE-${Math.floor(Math.random() * 10000)}`;
            if (item.blob) {
              await uploadEvidenceToS3(item.blob, offlineTicketId);
              const draftData = {
                jurisdiction: item.jurisdiction || 'Unknown',
                damageType: 'Offline Submission',
                severity: 'Unknown'
              };
              await saveReportToDynamoDB(offlineTicketId, draftData, item.id);
              await markMediaAsSynced(item.id);
            } else {
              await markMediaAsSynced(item.id);
            }
          } catch (syncErr) {
            console.error(`Failed to sync capture ${item.id}`, syncErr);
          }
        }
        setCaptures(prev => prev.map(c => ({ ...c, synced: true })));
      }
    } catch (err) {
      console.error("Sync failed", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
      setUser(null);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // ---------------------------------------------------------------------------
  // Media Capture & Processing Logic (kept from old App.jsx and passed to ReportPage)
  // ---------------------------------------------------------------------------
  const handleMediaCapture = async (blob, type, additionalMetaData = {}) => {
    if (!blob) return;
    const previewUrl = URL.createObjectURL(blob);
    const timestamp = Date.now();
    setIsLocating(true);
    let locationData = null;
    let jurisdiction = null;
    try {
      locationData = await getDeviceLocation();
      jurisdiction = await mapJurisdiction(locationData.lat, locationData.lng);
    } catch (err) {
      console.warn("Location capture failed", err);
    } finally {
      setIsLocating(false);
    }
    const metadata = { previewUrl, jurisdiction, ...additionalMetaData };
    const id = await saveMediaLocally(blob, type, metadata);
    const newCapture = { id, blob, type, timestamp, synced: isOnline, ...metadata };
    setCaptures(prev => [newCapture, ...prev]);
    if (isOnline) {
      setTimeout(async () => { await markMediaAsSynced(id); }, 500);
    }
  };

  const processVisualMedia = async (file, type) => {
    setIsRedacting(true);
    let finalFile = file;
    let redactionInfo = null;
    try {
      const redactionResult = await mockRedactMedia(file);
      finalFile = redactionResult.redactedFile;
      redactionInfo = { faces: redactionResult.facesRedacted, plates: redactionResult.platesRedacted };
    } catch (err) {
      console.error("Redaction error", err);
    } finally {
      setIsRedacting(false);
    }

    setIsAnalyzing(true);
    try {
      const analysis = await mockAnalyzeMedia(finalFile, type);
      await handleMediaCapture(finalFile, type, { analysis, redaction: redactionInfo });
    } catch (err) {
      console.error("Analysis failed", err);
      await handleMediaCapture(finalFile, type, { redaction: redactionInfo });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onPhotoSelect = async (e) => { const file = e.target.files[0]; if (file) await processVisualMedia(file, 'image'); };

  const onVideoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('segment', file, file.name || 'manual_upload.mp4');

      let loc = null;
      try { loc = await getDeviceLocation(); } catch (e) { }

      if (loc) {
        formData.append('lat', loc.lat);
        formData.append('lng', loc.lng);
      }

      const res = await fetch('/api/dashcam/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert('Video submitted to AI worker successfully. Detections will appear on the Damage Intelligence map shortly.');
      } else {
        throw new Error("API rejected file");
      }
    } catch (err) {
      console.error("Manual video processing error:", err);
      alert('Failed to process video with AI worker. Falling back to local offline manual processing.');
      await processVisualMedia(file, 'video');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onAudioRecorded = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const transcriptionResult = await mockTranscribeAudio(audioBlob);
      await handleMediaCapture(audioBlob, 'audio', { transcription: transcriptionResult });
    } catch (err) {
      console.error(err);
      await handleMediaCapture(audioBlob, 'audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Draft Flow
  const handleDraftSubmit = (compiledDraft) => {
    setActiveSubmissionDraft({
      ...compiledDraft,
      captureId: selectedCaptureForDraft.id,
      captureBlob: selectedCaptureForDraft.blob
    });
    setSelectedCaptureForDraft(null);
  };

  const onAgenticSubmissionComplete = async (ticketId) => {
    if (activeSubmissionDraft) {
      await uploadEvidenceToS3(activeSubmissionDraft.captureBlob, ticketId);
      await saveReportToDynamoDB(ticketId, activeSubmissionDraft, activeSubmissionDraft.captureId);
    }
    sendPushNotification("Sewa Sahayak", { body: `Ticket ${ticketId} submitted!`, icon: '/pwa-192x192.png' });
    alert(`Report saved and tracked! Acknowledgement ID: ${ticketId}`);
    setActiveSubmissionDraft(null);
  };

  // Render Drafting popups inside a Portal/Overlay logic if active
  if (activeSubmissionDraft) {
    return (
      <main className="app-main" style={{ minHeight: '100vh', padding: '1rem' }}>
        <AgenticSubmission draft={activeSubmissionDraft} onComplete={onAgenticSubmissionComplete} />
      </main>
    );
  }
  if (selectedCaptureForDraft) {
    return (
      <main className="app-main" style={{ minHeight: '100vh', padding: '1rem' }}>
        <DraftReview capture={selectedCaptureForDraft} onClose={() => setSelectedCaptureForDraft(null)} onSubmit={handleDraftSubmit} />
      </main>
    );
  }

  // Main UI
  return (
    <Router>
      <div className="app-layout">
        <Navbar user={user} onLogout={handleLogout} />

        {/* Hidden inputs for Report Page triggers */}
        <input type="file" accept="image/*" capture="environment" ref={photoInputRef} onChange={onPhotoSelect} style={{ display: 'none' }} />
        <input type="file" accept="video/*" capture="environment" ref={videoInputRef} onChange={onVideoSelect} style={{ display: 'none' }} />

        <main className="app-content">
          <Routes>
            <Route path="/" element={<Home user={user} />} />

            <Route path="/login" element={
              user ? <Navigate to="/dashboard" /> : <Auth onLogin={setUser} />
            } />

            <Route path="/dashcam" element={
              user ? <DashcamPage /> : <Navigate to="/login" />
            } />

            <Route path="/report" element={
              user ? (
                <ReportPage
                  onVideoClick={() => videoInputRef.current.click()}
                  isRedacting={isRedacting}
                  isAnalyzing={isAnalyzing}
                  isLocating={isLocating}
                />
              ) : <Navigate to="/login" />
            } />

            <Route path="/dashboard" element={
              user ? <MapPage /> : <Navigate to="/login" />
            } />

            <Route path="/profile" element={
              user ? <ProfilePage user={user} /> : <Navigate to="/login" />
            } />

          </Routes>
        </main>

        {/* Persistent Online Indicator */}
        <div className="fixed bottom-4 right-4 z-50">
          <OnlineIndicator />
        </div>
      </div>
    </Router>
  );
}

export default App;
