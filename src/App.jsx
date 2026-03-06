import React, { useState, useRef, useEffect } from 'react';
import OnlineIndicator from './components/OnlineIndicator';
import AudioRecorder from './components/AudioRecorder';
import { Camera, Video, CheckCircle, RefreshCw } from 'lucide-react';
import { saveMediaLocally, getUnsyncedMedia, markMediaAsSynced } from './utils/db';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { mockTranscribeAudio } from './services/transcribe';
import { mockAnalyzeMedia } from './services/bedrock';
import { mockRedactMedia } from './services/rekognition';
import { getDeviceLocation, mapJurisdiction } from './services/gps';
import DraftReview from './components/DraftReview';
import AgenticSubmission from './components/AgenticSubmission';
import Auth from './components/Auth';
import { uploadEvidenceToS3, saveReportToDynamoDB, sendPushNotification } from './services/tracking';
import MyReports from './components/MyReports';
import { Shield, MapPin, FileText, UserCircle, LogOut } from 'lucide-react';
import DashcamRecorder from './components/DashcamRecorder';
import Dashboard from './components/Dashboard';

function App() {
  const isOnline = useOnlineStatus();
  const [captures, setCaptures] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRedacting, setIsRedacting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedCaptureForDraft, setSelectedCaptureForDraft] = useState(null);
  const [activeSubmissionDraft, setActiveSubmissionDraft] = useState(null);
  const [user, setUser] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Sync effect when coming online & Req Notification
  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Check for active OAuth session
    const checkSession = async () => {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser({ ...data.user, userData: data.userData, token: data.token });
        }
      } catch (err) {
        console.warn("No active session or backend unavailable.");
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
            // Generate a dummy ticketId for offline synced draft
            const offlineTicketId = `BMC-OFFLINE-${Math.floor(Math.random() * 10000)}`;

            // Only sync if there is a blob
            if (item.blob) {
              await uploadEvidenceToS3(item.blob, offlineTicketId);

              // If the item has drafting data stored as metadata, use it, otherwise create a base
              const draftData = {
                jurisdiction: item.jurisdiction || 'Unknown',
                damageType: 'Offline Submission',
                severity: 'Unknown'
              };
              await saveReportToDynamoDB(offlineTicketId, draftData, item.id);

              await markMediaAsSynced(item.id);
              console.log(`Successfully synced offline capture ${item.id} with ticket ${offlineTicketId}`);
            } else {
              await markMediaAsSynced(item.id);
            }
          } catch (syncErr) {
            console.error(`Failed to sync capture ${item.id}`, syncErr);
            // Leave as unsynced for next time
          }
        }
        // Update local UI state
        setCaptures(prev => prev.map(c => ({ ...c, synced: true })));
      }
    } catch (err) {
      console.error("Sync failed", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMediaCapture = async (blob, type, additionalMetaData = {}) => {
    if (!blob) return;

    const previewUrl = URL.createObjectURL(blob);
    const timestamp = Date.now();

    setIsLocating(true);
    let locationData = null;
    let jurisdiction = null;
    try {
      locationData = await getDeviceLocation();
      jurisdiction = mapJurisdiction(locationData.lat, locationData.lng);
    } catch (err) {
      console.warn("Location capture failed", err);
    } finally {
      setIsLocating(false);
    }

    const metadata = { previewUrl, jurisdiction, ...additionalMetaData };
    // Save locally via IndexedDB
    const id = await saveMediaLocally(blob, type, metadata);

    const newCapture = {
      id,
      blob,
      type,
      timestamp,
      synced: isOnline,
      ...metadata
    };

    setCaptures(prev => [newCapture, ...prev]);

    // If online, mock immediate sync
    if (isOnline) {
      setTimeout(async () => {
        await markMediaAsSynced(id);
      }, 500);
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
      console.error("Redaction failed", err);
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

  const onPhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (file) await processVisualMedia(file, 'image');
  };

  const onVideoSelect = async (e) => {
    const file = e.target.files[0];
    if (file) await processVisualMedia(file, 'video');
  };

  const onAudioRecorded = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const transcriptionResult = await mockTranscribeAudio(audioBlob);
      await handleMediaCapture(audioBlob, 'audio', { transcription: transcriptionResult });
    } catch (err) {
      console.error("Transcription failed", err);
      await handleMediaCapture(audioBlob, 'audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDraftSubmit = (compiledDraft) => {
    console.log("Submitting final draft:", compiledDraft);
    setActiveSubmissionDraft({
      ...compiledDraft,
      captureId: selectedCaptureForDraft.id,
      captureBlob: selectedCaptureForDraft.blob
    });
    setSelectedCaptureForDraft(null);
  };

  const onAgenticSubmissionComplete = async (ticketId) => {
    if (activeSubmissionDraft) {
      // Mock tracking storage
      await uploadEvidenceToS3(activeSubmissionDraft.captureBlob, ticketId);
      await saveReportToDynamoDB(ticketId, activeSubmissionDraft, activeSubmissionDraft.captureId);
    }

    sendPushNotification("Sewa Sahayak", {
      body: `Your ticket ${ticketId} has been successfully submitted!`,
      icon: '/pwa-192x192.png'
    });

    alert(`Report saved and tracked successfully! Acknowledgement ID: ${ticketId}`);
    setActiveSubmissionDraft(null);
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

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  if (showReports) {
    return (
      <main className="app-main" style={{ height: '100vh', padding: 0 }}>
        <MyReports onClose={() => setShowReports(false)} />
      </main>
    );
  }

  if (showDashboard) {
    return (
      <>
        <header className="app-header">
          <h1 className="heading-2 text-gradient" style={{ fontSize: '1.5rem', margin: 0 }}>Damage Map</h1>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', borderRadius: '8px' }} onClick={() => setShowDashboard(false)}>Back</button>
        </header>
        <main className="app-main" style={{ height: 'calc(100vh - 80px)', padding: 0 }}>
          <Dashboard />
        </main>
      </>
    );
  }

  if (activeSubmissionDraft) {
    return (
      <>
        <header className="app-header">
          <h1 className="heading-2 text-gradient">Sewa Sahayak</h1>
          <OnlineIndicator />
        </header>
        <main className="app-main" style={{ height: 'calc(100vh - 80px)', padding: '1rem' }}>
          <AgenticSubmission
            draft={activeSubmissionDraft}
            onComplete={onAgenticSubmissionComplete}
          />
        </main>
      </>
    );
  }

  if (selectedCaptureForDraft) {
    return (
      <>
        <header className="app-header">
          <h1 className="heading-2 text-gradient">Sewa Sahayak</h1>
          <OnlineIndicator />
        </header>
        <main className="app-main" style={{ height: 'calc(100vh - 80px)', padding: '1rem' }}>
          <DraftReview
            capture={selectedCaptureForDraft}
            onClose={() => setSelectedCaptureForDraft(null)}
            onSubmit={handleDraftSubmit}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <header className="app-header">
        <h1 className="heading-2 text-gradient" style={{ fontSize: '1.5rem', margin: 0 }}>Sewa Sahayak</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <OnlineIndicator />
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '0.8rem', minWidth: '40px', border: '1px solid rgba(0,0,0,0.1)' }}
            onClick={() => setShowDashboard(true)}
            title="Intelligence Dashboard"
          >
            <MapPin size={18} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '0.8rem', minWidth: '40px', border: '1px solid rgba(0,0,0,0.1)' }}
            onClick={() => setShowReports(true)}
            title="My Reports"
          >
            <UserCircle size={18} />
          </button>
          <button
            className="btn btn-danger"
            style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '0.8rem', minWidth: '40px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--color-danger)', color: 'white' }}
            onClick={handleLogout}
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h2 className="heading-2" style={{ marginBottom: '0.5rem' }}>Report an Issue</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Capture a photo, video, or voice note of the problem.
          </p>

          {/* Hidden Inputs for Native Mobile Camera Triggers */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={photoInputRef}
            onChange={onPhotoSelect}
            style={{ display: 'none' }}
          />
          <input
            type="file"
            accept="video/*"
            capture="environment"
            ref={videoInputRef}
            onChange={onVideoSelect}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={() => photoInputRef.current.click()}>
              <Camera size={20} />
              Take Photo
            </button>
            <button className="btn btn-secondary" onClick={() => videoInputRef.current.click()}>
              <Video size={20} />
              Record Video (Manual)
            </button>
            <AudioRecorder onRecordingComplete={onAudioRecorded} />
            <DashcamRecorder />
            {isTranscribing && (
              <div style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: '12px', textAlign: 'center', color: 'var(--color-primary)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>Processing Regional Voice via AWS Transcribe...</p>
              </div>
            )}
            {isRedacting && (
              <div style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: '12px', textAlign: 'center', color: 'var(--color-success)' }}>
                <Shield size={24} className="animate-pulse" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>Applying DPDP Privacy Guardrails (Redacting PII)...</p>
              </div>
            )}
            {isAnalyzing && (
              <div style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: '12px', textAlign: 'center', color: 'var(--color-secondary)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>Analyzing Media via Amazon Bedrock (Nova Pro)...</p>
              </div>
            )}
            {isLocating && (
              <div style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: '12px', textAlign: 'center', color: 'var(--color-text-main)' }}>
                <MapPin size={24} className="animate-pulse" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>Extracting GPS & Mapping Jurisdiction...</p>
              </div>
            )}
          </div>
        </div>

        {captures.length > 0 && (
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="heading-2" style={{ fontSize: '1.25rem' }}>Recent Evidence</h3>
              {isSyncing && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                  <RefreshCw size={14} className="animate-spin" />
                  Syncing...
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {captures.map(capture => (
                <div key={capture.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {capture.type === 'image' && <img src={capture.previewUrl} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    {capture.type === 'video' && <video src={capture.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />}
                    {capture.type === 'audio' && <audio src={capture.previewUrl} controls style={{ width: '120px', transform: 'scale(0.8)' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', textTransform: 'capitalize', fontSize: '0.9rem' }}>{capture.type} Capture</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{new Date(capture.timestamp).toLocaleTimeString()}</p>
                    {capture.transcription && (
                      <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '6px', marginTop: '4px' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-main)', fontStyle: 'italic' }}>"{capture.transcription.transcript}"</p>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.7rem', background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>{capture.transcription.extractedData.damage_type}</span>
                          <span style={{ fontSize: '0.7rem', background: 'var(--color-warning)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>{capture.transcription.extractedData.severity_keywords[0]}</span>
                        </div>
                      </div>
                    )}
                    {capture.analysis && (
                      <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '6px', borderRadius: '6px', marginTop: '4px' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-main)', fontStyle: 'italic' }}>{capture.analysis.suggested_description}</p>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.7rem', background: 'var(--color-secondary)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>{capture.analysis.damage_type}</span>
                          <span style={{ fontSize: '0.7rem', background: 'var(--color-danger)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>Severity: {capture.analysis.severity}</span>
                          <span style={{ fontSize: '0.7rem', background: 'var(--color-success)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>AI Conf: {(capture.analysis.confidence_score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    )}
                    {capture.redaction && (capture.redaction.faces > 0 || capture.redaction.plates > 0) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: 'var(--color-success)' }}>
                        <Shield size={14} />
                        <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                          PII Redacted: {capture.redaction.faces} faces, {capture.redaction.plates} plates
                        </span>
                      </div>
                    )}
                    {capture.jurisdiction && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginTop: '6px', color: 'var(--color-text-main)' }}>
                        <MapPin size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                            {capture.jurisdiction.portal_name}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                            {capture.jurisdiction.ward_district} ({capture.jurisdiction.jurisdiction_level})
                          </span>
                        </div>
                      </div>
                    )}
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', marginTop: '1rem', width: '100%' }}
                      onClick={() => setSelectedCaptureForDraft(capture)}
                    >
                      <FileText size={16} />
                      Generate Official Report
                    </button>
                  </div>
                  <div style={{ alignSelf: 'flex-start' }}>
                    {capture.synced ? (
                      <CheckCircle size={20} color="var(--color-success)" />
                    ) : (
                      <RefreshCw size={20} color="var(--color-text-muted)" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </>
  );
}

export default App;
