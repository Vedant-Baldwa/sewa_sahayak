import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { getUnsyncedMedia, markMediaAsSynced, saveMediaLocally } from './utils/db';
import { uploadEvidenceToS3, saveReportToDynamoDB, sendPushNotification } from './services/tracking';

// Components & Pages
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import OnlineIndicator from './components/OnlineIndicator';

// New Pages
import Home from './pages/Home';
import DashcamPage from './pages/DashcamPage';
import MapPage from './pages/MapPage';
import ProfilePage from './pages/ProfilePage';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import OnlineIndicator from './components/OnlineIndicator';
import AudioRecorder from './components/AudioRecorder';
import {
  Camera, Video, CheckCircle, RefreshCw, X as XIcon, Menu, ArrowRight, MapPin,
  UserCircle, Shield, Bot, FileText, AlertCircle, LogOut, Home, Archive, Bell,
  MessageSquare, History, Phone, User, Zap, Lock, Sun, Moon, Globe
} from 'lucide-react';
import { saveMediaLocally, getUnsyncedMedia, markMediaAsSynced } from './utils/db';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { transcribeAudioWithAWS } from './services/transcribe';
import { analyzeMediaWithBedrock } from './services/bedrock';
import { redactMediaWithRekognition } from './services/rekognition';
import { getDeviceLocation } from './services/gps';
import DraftReview from './components/DraftReview';
import AgenticSubmission from './components/AgenticSubmission';
import Auth from './components/Auth';
import AIChatbot from './components/AIChatbot';
import LandingNav from './components/landing/LandingNav';
import HeroSection from './components/landing/HeroSection';
import FeatureGrid from './components/landing/FeatureGrid';
import HowItWorks from './components/landing/HowItWorks';
import LandingFooter from './components/landing/LandingFooter';
import MyReports from './components/MyReports';
import UserProfileForm from './components/UserProfileForm';
import LanguageSelector from './components/LanguageSelector';
import { uploadEvidenceToS3, saveReportToDynamoDB, sendPushNotification } from './services/tracking';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';


// ─────────────────────────────── Main App ────────────────────────────────────
function App() {
  const isOnline = useOnlineStatus();

  // ── Core capture state (unchanged from original) ──────────────────────────
  const [captures, setCaptures] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [user, setUser] = useState(null);

  // Sync effect & Session Check
  useEffect(() => {
    document.body.className = `theme-${globalTheme}`;
    localStorage.setItem('sahayak_global_theme', globalTheme);
  }, [globalTheme]);

  // ── Notify helper ─────────────────────────────────────────────────────────
  const notify = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const scrollToAuth = (mode = 'signin') => {
    setAuthMode(mode);
    setShowAuth(true);
  };

    const checkSession = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser({ ...data.user, userData: data.userData, token: data.token });
        }
      } catch (err) {
        console.warn("No active session.");
      }
    };
    checkSession();
  }, []);

  // ── Offline sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOnline) syncOfflineData();
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isOnline]);

  const syncOfflineData = async () => {
    setIsSyncing(true);
    try {
      const unsynced = await getUnsyncedMedia();
      if (unsynced.length > 0) {
        console.log(`Syncing ${unsynced.length} offline captures...`);
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
        notify(`${unsynced.length} offline report(s) synced to AWS.`);
      }
    } catch (err) {
      console.error('Sync failed', err);
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


<<<<<<< HEAD
      const routeRes = await fetch(`${BACKEND_URL}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ address: manualLocationInput })
      });

      let jurisdiction = {
        jurisdiction_level: "Municipal",
        portal_name: "Fallback Jurisdiction",
        portal_url: "https://mock.gov.in/report",
        ward_district: manualLocationInput,
        mapped_coordinates: { lat: 0, lng: 0 }
      };

      let formSchema = null;

      if (routeRes.ok) {
        const routeData = await routeRes.json();
        jurisdiction = {
          ...routeData.routing,
          ward_district: routeData.structured_address ? (routeData.structured_address.City || routeData.structured_address.District || manualLocationInput) : manualLocationInput
        };
        formSchema = routeData.form_schema;
      }

      await finalizeCapture({
        ...pendingCapture,
        jurisdiction: jurisdiction,
        locationData: { address: manualLocationInput },
        additionalMetaData: { ...pendingCapture.additionalMetaData, formSchema }
      });

      // Cleanup states
      setLocationError(null);
      setPendingCapture(null);
      setManualLocationInput('');
    } catch {
      console.error("Manual Entry Error");
      alert("Error saving manual location");
    }
  };

  const finalizeCapture = async ({ blob, type, previewUrl, timestamp, jurisdiction, locationData, additionalMetaData }) => {
    const metadata = { previewUrl, jurisdiction, locationData, ...additionalMetaData };
    const id = await saveMediaLocally(blob, type, metadata);
    const newCapture = { id, blob, type, timestamp, synced: isOnline, ...metadata };
    setCaptures(prev => [newCapture, ...prev]);
    if (isOnline) {
      setTimeout(async () => { try { await markMediaAsSynced(id); } catch { /* ignore */ } }, 500);
    }
    // Automatically jump straight to agentic draft step
    setSelectedCaptureForDraft(newCapture);
  };

  const processVisualMedia = async (file, type) => {
    setIsRedacting(true);
    let finalFile = file;
    let redactionInfo = null;
    try {
      const redactionResult = await redactMediaWithRekognition(file);
      finalFile = redactionResult.redactedFile;
      redactionInfo = { faces: redactionResult.facesRedacted, plates: redactionResult.platesRedacted };
    } catch (err) {
      console.error('Redaction failed', err);
    } finally {
      setIsRedacting(false);
    }
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeMediaWithBedrock(finalFile, type);
      await handleMediaCapture(finalFile, type, { analysis, redaction: redactionInfo });
    } catch (err) {
      console.error('Analysis failed', err);
      await handleMediaCapture(finalFile, type, { redaction: redactionInfo });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onPhotoSelect = async (e) => { const f = e.target.files[0]; if (f) await processVisualMedia(f, 'image'); };
  const onVideoSelect = async (e) => { const f = e.target.files[0]; if (f) await processVisualMedia(f, 'video'); };
  const onAudioRecorded = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const result = await transcribeAudioWithAWS(audioBlob, currentLang);
      await handleMediaCapture(audioBlob, 'audio', { transcription: result });
    } catch {
      await handleMediaCapture(audioBlob, 'audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDraftSubmit = (compiledDraft, formSchema = {}) => {
    setActiveSubmissionDraft({
      ...compiledDraft,
      captureId: selectedCaptureForDraft.id,
      captureBlob: selectedCaptureForDraft.blob,
      capturePreview: selectedCaptureForDraft.previewUrl,
      captureType: selectedCaptureForDraft.type,
      form_schema: formSchema,
      portal_url: compiledDraft.portal_url || selectedCaptureForDraft.jurisdiction?.portal_url || '',
      portal_name: compiledDraft.portal_name || selectedCaptureForDraft.jurisdiction?.portal_name || 'Government Portal',
    });
    setSelectedCaptureForDraft(null);
  };

  const onAgenticSubmissionComplete = async (ticketId) => {
    if (activeSubmissionDraft) {
      await uploadEvidenceToS3(activeSubmissionDraft.captureBlob, ticketId);
      await saveReportToDynamoDB(ticketId, activeSubmissionDraft, activeSubmissionDraft.captureId);
    }
    sendPushNotification('Sewa Sahayak', { body: `Ticket ${ticketId} submitted!`, icon: '/pwa-192x192.png' });
    notify(`✅ Report filed! Acknowledgement ID: ${ticketId}`);
    setActiveSubmissionDraft(null);
  };


  // ── Loading splash ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 20 }}>
        <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--primary), var(--secondary))', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 0 var(--primary-dark), 0 30px 60px rgba(59,130,246,0.5)', animation: 'pulse 1.5s ease-in-out infinite' }}>
          <Shield size={28} color="white" />
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', letterSpacing: 2, fontWeight: 700 }}>LOADING...</p>
      </div>
    );
  }

  // ── Landing Page (unauthenticated) ────────────────────────────────────────
  if (!user) {
    return (
      <div className="landing">
        <LandingNav
          onGetStarted={scrollToAuth}
          onToggleChat={() => setChatbotOpen(v => !v)}
          onToggleTheme={() => setGlobalTheme(t => t === 'dark' ? 'light' : 'dark')}
          currentTheme={globalTheme}
          isChatOpen={chatbotOpen}
        />
        <HeroSection
          heroRef={heroRef}
          tiltRef={tiltRef}
          onGetStarted={scrollToAuth}
          onToggleChat={() => setChatbotOpen(true)}
        />
        <FeatureGrid onPageAction={scrollToAuth} />
        <HowItWorks onPageAction={scrollToAuth} />
        <LandingFooter onPageAction={scrollToAuth} />
        {/* Auth modal shown on top of landing page */}
        {showAuth && (
          <Auth
            onLogin={setUser}
            mode={authMode}
            onToggleMode={() => setAuthMode(prev => prev === 'signin' ? 'signup' : 'signin')}
            onClose={() => setShowAuth(false)}
          />
        )}
        <AIChatbot userAuthenticated={false} isOpen={chatbotOpen} onToggle={(val) => setChatbotOpen(val !== undefined ? val : !chatbotOpen)} />
      </div>
    );
  }

  // ── ONBOARDING logic ──────────────────────────────────────────────────────
  if (user && !user.userData?.onboardingComplete) {
    return <UserProfileForm onComplete={(data) => setUser(curr => ({ ...curr, userData: { ...curr.userData, ...data, onboardingComplete: true } }))} backendUrl={BACKEND_URL} />;
  }

  // ── Sub-views for authenticated users ─────────────────────────────────────
  if (activeSubmissionDraft) {
    return (
      <AppShell
        user={user} onLogout={handleLogout} activeView={activeView} setActiveView={setActiveView}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} notification={notification}
        isOnline={isOnline} isSyncing={isSyncing}
        chatbotOpen={chatbotOpen} setChatbotOpen={setChatbotOpen}
        globalTheme={globalTheme} setGlobalTheme={setGlobalTheme}
      >
        <AgenticSubmission draft={activeSubmissionDraft} onComplete={onAgenticSubmissionComplete} />
      </AppShell>
    );
  }

  if (selectedCaptureForDraft) {
    return (
      <AppShell
        user={user} onLogout={handleLogout} activeView={activeView} setActiveView={setActiveView}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} notification={notification}
        isOnline={isOnline} isSyncing={isSyncing}
        chatbotOpen={chatbotOpen} setChatbotOpen={setChatbotOpen}
        globalTheme={globalTheme} setGlobalTheme={setGlobalTheme}
      >
        <DraftReview capture={selectedCaptureForDraft} onClose={() => setSelectedCaptureForDraft(null)} onSubmit={handleDraftSubmit} />
      </AppShell>
    );
  }

  if (locationError && pendingCapture) {
    return (
      <AppShell
        user={user} onLogout={handleLogout} activeView={activeView} setActiveView={setActiveView}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} notification={notification}
        isOnline={isOnline} isSyncing={isSyncing}
        chatbotOpen={chatbotOpen} setChatbotOpen={setChatbotOpen}
        globalTheme={globalTheme} setGlobalTheme={setGlobalTheme}
      >
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: 480, margin: '4rem auto' }}>
          <MapPin size={48} color="var(--danger)" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontWeight: 800, marginBottom: '0.75rem', fontSize: '1.4rem' }}>Location Required</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>{locationError}</p>
          <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: 8 }}>Landmark, Street, City</label>
            <input className="input-field" placeholder="e.g. Opposite Metro Pillar 42, Andheri East" value={manualLocationInput} onChange={e => setManualLocationInput(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setLocationError(null); setPendingCapture(null); }}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={!manualLocationInput.trim()} onClick={submitManualLocation}>Save Location</button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (activeView === 'reports') {
    return (
      <AppShell
        user={user} onLogout={handleLogout} activeView={activeView} setActiveView={setActiveView}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} notification={notification}
        isOnline={isOnline} isSyncing={isSyncing}
        chatbotOpen={chatbotOpen} setChatbotOpen={setChatbotOpen}
        globalTheme={globalTheme} setGlobalTheme={setGlobalTheme}
      >
        <MyReports onClose={() => setActiveView('dashboard')} />
      </AppShell>
    );
  }

  if (activeView === 'profile') {
    return (
      <AppShell
        user={user} onLogout={handleLogout} activeView={activeView} setActiveView={setActiveView}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} notification={notification}
        isOnline={isOnline} isSyncing={isSyncing}
        chatbotOpen={chatbotOpen} setChatbotOpen={setChatbotOpen}
        globalTheme={globalTheme} setGlobalTheme={setGlobalTheme}
      >
        <UserProfileForm
          initialData={user.userData}
          onCancel={() => setActiveView('dashboard')}
          onComplete={(data) => {
            setUser(curr => ({ ...curr, userData: { ...curr.userData, ...data, onboardingComplete: true } }));
            setActiveView('dashboard');
            notify("Profile updated successfully!", 'success');
          }}
          backendUrl={BACKEND_URL}
        />
      </AppShell>
    );
  }

  // ── MAIN DASHBOARD ────────────────────────────────────────────────────────
=======
  // Main UI
>>>>>>> 711e76874574420a4a052df8f022d7b549e08ffd
  return (
    <Router>
      <div className="app-layout">
        <Navbar user={user} onLogout={handleLogout} />

        <main className="app-content">
          <Routes>
            <Route path="/" element={<Home user={user} />} />

            <Route path="/login" element={
              user ? <Navigate to="/dashboard" /> : <Auth onLogin={setUser} />
            } />

            <Route path="/dashcam" element={
              user ? <DashcamPage /> : <Navigate to="/login" />
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
