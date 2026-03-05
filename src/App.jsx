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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRedacting, setIsRedacting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [pendingCapture, setPendingCapture] = useState(null);
  const [manualLocationInput, setManualLocationInput] = useState('');
  const [selectedCaptureForDraft, setSelectedCaptureForDraft] = useState(null);
  const [activeSubmissionDraft, setActiveSubmissionDraft] = useState(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  // ── Auth & UI state ───────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('signin');
  const [showAuth, setShowAuth] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [globalTheme, setGlobalTheme] = useState(() => localStorage.getItem('sahayak_global_theme') || 'dark');
  const [currentLang, setCurrentLang] = useState('en');
  const [chatbotOpen, setChatbotOpen] = useState(false);

  useEffect(() => {
    // Sync language from cookie on mount
    const cookie = document.cookie.split('; ').find(r => r.trim().startsWith('googtrans='));
    if (cookie) {
      const lang = cookie.split('/').pop();
      if (lang) setCurrentLang(lang);
    }

    const handleLang = (e) => setCurrentLang(e.detail);
    window.addEventListener('languageChanged', handleLang);
    return () => window.removeEventListener('languageChanged', handleLang);
  }, []);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const heroRef = useRef(null);
  const tiltRef = useRef(null);

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

  // ── Auth check on mount ───────────────────────────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser({ ...data.user, userData: data.userData, token: data.token });
        }
      } catch (err) {
        console.warn('No active session.');
      } finally {
        setAuthLoading(false);
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
              const draftData = { jurisdiction: item.jurisdiction || 'Unknown', damageType: 'Offline Submission', severity: 'Unknown' };
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

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (_) { }
    setUser(null);
    setCaptures([]);
    setActiveView('dashboard');
    setSidebarOpen(false);
  };

  // ── Media pipeline (identical to original) ────────────────────────────────
  const handleMediaCapture = async (blob, type, additionalMetaData = {}) => {
    if (!blob) return;
    const previewUrl = URL.createObjectURL(blob);
    const timestamp = Date.now();
    setIsLocating(true);
    let locationData = null;
    let jurisdiction = null;
    try {
      locationData = await getDeviceLocation();
      const routeRes = await fetch(`${BACKEND_URL}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lat: locationData.lat, lng: locationData.lng }),
      });
      if (routeRes.ok) {
        const routeData = await routeRes.json();
        jurisdiction = {
          jurisdiction_level: routeData.routing?.portal_name === 'CPGRAMS' ? 'Central' : 'Local/State',
          portal_name: routeData.routing?.portal_name || 'Government Portal',
          portal_url: routeData.routing?.portal_url || '',
          ward_district: routeData.structured_address?.District || routeData.structured_address?.City || 'Unknown Ward',
          mapped_coordinates: { lat: locationData.lat, lng: locationData.lng },
        };
        locationData.address = routeData.structured_address?.Address || '';
      }
      await finalizeCapture({ blob, type, previewUrl, timestamp, jurisdiction, locationData, additionalMetaData });
    } catch (err) {
      console.warn('Location capture failed, requesting manual entry', err);
      setPendingCapture({ blob, type, previewUrl, timestamp, additionalMetaData });
      setLocationError("We couldn't reach your device GPS. Please enter the location manually.");
    } finally {
      setIsLocating(false);
    }
  };

  const submitManualLocation = async () => {
    if (!manualLocationInput.trim()) return;
    const manualJurisdiction = {
      jurisdiction_level: 'Municipal',
      portal_name: 'Manual Entry Jurisdiction',
      portal_url: 'https://mock.gov.in/report',
      ward_district: manualLocationInput,
      mapped_coordinates: { lat: 0, lng: 0 },
    };
    await finalizeCapture({ ...pendingCapture, jurisdiction: manualJurisdiction, locationData: { address: manualLocationInput } });
    setLocationError(null);
    setPendingCapture(null);
    setManualLocationInput('');
  };

  const finalizeCapture = async ({ blob, type, previewUrl, timestamp, jurisdiction, locationData, additionalMetaData }) => {
    const metadata = { previewUrl, jurisdiction, locationData, ...additionalMetaData };
    const id = await saveMediaLocally(blob, type, metadata);
    const newCapture = { id, blob, type, timestamp, synced: isOnline, ...metadata };
    setCaptures(prev => [newCapture, ...prev]);
    if (isOnline) {
      setTimeout(async () => { try { await markMediaAsSynced(id); } catch (_) { } }, 500);
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
    } catch (err) {
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
  return (
    <AppShell
      user={user} onLogout={handleLogout} activeView={activeView} setActiveView={setActiveView}
      sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} notification={notification}
      isOnline={isOnline} isSyncing={isSyncing}
      chatbotOpen={chatbotOpen} setChatbotOpen={setChatbotOpen}
      globalTheme={globalTheme} setGlobalTheme={setGlobalTheme}
    >
      {/* Hidden inputs for camera */}
      <input type="file" accept="image/*" capture="environment" ref={photoInputRef} onChange={onPhotoSelect} style={{ display: 'none' }} />
      <input type="file" accept="video/*" capture="environment" ref={videoInputRef} onChange={onVideoSelect} style={{ display: 'none' }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative' }}>

        {/* Welcome Header */}
        <div style={{ marginBottom: '3rem', animation: 'fadeUp 0.6s ease' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>
            Hello, <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.userData?.fullName || user?.userData?.name || user?.name || user?.email?.split('@')[0]}</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>What would you like to do today?</p>
        </div>

        {/* Services Flashcards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>

          {/* Card 1: Photo Report */}
          <div className="flashcard" onClick={() => photoInputRef.current.click()} style={{
            background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)',
            borderRadius: 32, padding: '2.25rem', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div className="card-glow" style={{ position: 'absolute', top: '-20%', right: '-20%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 10px 20px rgba(239,68,68,0.3)' }}>
              <Camera size={26} color="white" />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem' }}>Report a Problem</h3>
            <p style={{ color: 'var(--muted)', lineHeight: 1.5, fontSize: '0.88rem' }}>Capture a photo. Our AI identifies the issue and files it automatically.</p>
            <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>
              Photo Report <ArrowRight size={16} />
            </div>
          </div>

          {/* Card 2: Video Report */}
          <div className="flashcard" onClick={() => videoInputRef.current.click()} style={{
            background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)',
            borderRadius: 32, padding: '2.25rem', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div className="card-glow" style={{ position: 'absolute', top: '-10%', right: '10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 10px 20px rgba(16,185,129,0.3)' }}>
              <Video size={26} color="white" />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem' }}>Full Video Log</h3>
            <p style={{ color: 'var(--muted)', lineHeight: 1.5, fontSize: '0.88rem' }}>Record a detailed walkaround of the damage for large-scale civic issues.</p>
            <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--success)', fontSize: '0.85rem' }}>
              Record Video <ArrowRight size={16} />
            </div>
          </div>

          {/* Card 3: Voice Reporter */}
          <div
            className="flashcard"
            style={{
              background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)',
              borderRadius: 32, padding: '2.25rem', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              position: 'relative', overflow: 'hidden'
            }}>
            <div className={`card-glow`} style={{ position: 'absolute', top: '10%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 10px 20px rgba(245,158,11,0.3)' }}>
              <Phone size={26} color="white" />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem' }}>Voice Assistant</h3>
            <p style={{ color: 'var(--muted)', lineHeight: 1.5, fontSize: '0.88rem' }}>Tap below to record your voice. We automatically transcribe and file the complaint for you.</p>
            <div style={{ marginTop: '1.25rem' }}>
              <AudioRecorder onRecordingComplete={onAudioRecorded} />
            </div>
          </div>

          {/* Card 4: AI Sahayak */}
          <div className="flashcard" onClick={() => setChatbotOpen(v => !v)} style={{
            background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)',
            borderRadius: 32, padding: '2.25rem', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div className="card-glow" style={{ position: 'absolute', bottom: '-20%', left: '-20%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 10px 20px rgba(99,102,241,0.3)' }}>
              <Bot size={26} color="white" />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem' }}>Help & AI Chat</h3>
            <p style={{ color: 'var(--muted)', lineHeight: 1.5, fontSize: '0.88rem' }}>Ask our AI about government rules, portal status, or reporting tips.</p>
            <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--secondary)', fontSize: '0.85rem' }}>
              Open Support <ArrowRight size={16} />
            </div>
          </div>

          {/* Card 5: Track Reports */}
          <div className="flashcard" onClick={() => setActiveView('reports')} style={{
            background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.15)',
            borderRadius: 32, padding: '2.25rem', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div className="card-glow" style={{ position: 'absolute', top: '-20%', right: '-20%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 10px 20px rgba(52,211,153,0.3)' }}>
              <FileText size={26} color="white" />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem' }}>View History</h3>
            <p style={{ color: 'var(--muted)', lineHeight: 1.5, fontSize: '0.88rem' }}>Check status, portal tracking IDs, and AI analysis for your past reports.</p>
            <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--success)', fontSize: '0.85rem' }}>
              See My Impact <ArrowRight size={16} />
            </div>
          </div>
        </div>

        {/* Ongoing Evidence Section */}
        {captures.length > 0 && (
          <div style={{ animation: 'fadeUp 0.8s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.5rem' }}>Active Drafts</h2>
              {isSyncing && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                  <RefreshCw size={14} className="spin" /> Syncing to AWS…
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {captures.map(capture => (
                <CaptureCard key={capture.id} capture={capture} onDraft={() => setSelectedCaptureForDraft(capture)} />
              ))}
            </div>
          </div>
        )}

        {/* Processing Overlays */}
        {(isTranscribing || isRedacting || isAnalyzing || isLocating) && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              background: 'rgba(20,20,25,0.9)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 24, padding: '2rem', width: '90%', maxWidth: 400,
              boxShadow: '0 30px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 16
            }}>
              <h3 style={{ textAlign: 'center', marginBottom: 8, fontSize: '1.2rem', fontWeight: 800 }}>Processing Intelligence</h3>
              {isTranscribing && <StatusBadge color="var(--primary)" icon={<RefreshCw size={18} className="spin" />} text="Transcribing Audio..." />}
              {isRedacting && <StatusBadge color="var(--success)" icon={<Shield size={18} className="pulse" />} text="Rekognition Redaction..." />}
              {isAnalyzing && <StatusBadge color="var(--secondary)" icon={<RefreshCw size={18} className="spin" />} text="Bedrock Analysis..." />}
              {isLocating && <StatusBadge color="var(--muted)" icon={<MapPin size={18} className="pulse" />} text="Routing Jurisdiction..." />}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .flashcard {
          backdrop-filter: blur(20px);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.05);
        }
        .flashcard:hover {
          transform: translateY(-12px) scale(1.03);
          border-color: rgba(255,255,255,0.25) !important;
          background: rgba(255,255,255,0.08) !important;
          box-shadow: 0 60px 100px rgba(0,0,0,0.6);
        }
        .flashcard:active {
          transform: translateY(-4px) scale(0.98);
        }
        @keyframes floatMini {
            0%, 100% { transform: translateY(0) rotate(15deg); }
            50% { transform: translateY(-30px) rotate(20deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppShell>
  );
}

// ─────────────────────── App Shell (header + sidebar) ────────────────────────
function AppShell({
  children, user, onLogout, activeView, setActiveView, sidebarOpen, setSidebarOpen,
  notification, isOnline, isSyncing, chatbotOpen, setChatbotOpen, globalTheme, setGlobalTheme
}) {
  const displayName = user?.userData?.fullName || user?.userData?.name || user?.name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>

      {/* ── Premium Background Visuals ─── */}
      <div style={{ position: 'fixed', top: '10%', left: '-5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '5%', right: '-5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.01) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Floating 3D Icons in Dashboard ─── */}
      <div style={{ position: 'fixed', top: '20%', right: '10%', opacity: 0.1, transform: 'rotate(15deg)', zIndex: 0, animation: 'floatMini 10s ease-in-out infinite' }}><Shield size={60} color="var(--primary)" /></div>
      <div style={{ position: 'fixed', bottom: '20%', left: '5%', opacity: 0.1, transform: 'rotate(-10deg)', zIndex: 0, animation: 'floatMini 12s ease-in-out 2s infinite' }}><Bot size={50} color="var(--secondary)" /></div>

      {/* ── Top notification bar ─── */}
      {notification && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          background: notification.type === 'error' ? 'rgba(244,63,94,0.15)' : 'rgba(0,250,154,0.1)',
          border: `1px solid ${notification.type === 'error' ? 'rgba(244,63,94,0.4)' : 'rgba(0,250,154,0.3)'}`,
          borderRadius: 16, padding: '1rem 1.5rem', color: 'white',
          backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          fontSize: '0.88rem', fontWeight: 600, maxWidth: 380,
          animation: 'slideInRight 0.3s ease',
        }}>
          {notification.msg}
        </div>
      )}

      {/* ── Header ─── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-bright)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem', height: 64,
      }}>
        {/* Left: brand + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 6 }}>
            {sidebarOpen ? <XIcon size={20} /> : <Menu size={20} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,var(--primary),var(--secondary))', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 0 var(--primary-dark)' }}>
              <Shield size={16} color="white" />
            </div>
            <span style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.02em' }}>Sewa Sahayak</span>
          </div>
        </div>

        {/* Right: tools + online + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LanguageSelector />

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-bright)', borderRadius: 14, padding: 4, gap: 4 }}>
            <button
              onClick={() => setGlobalTheme(t => t === 'dark' ? 'light' : 'dark')}
              style={{ background: 'transparent', border: 'none', color: 'var(--muted)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
              title="Toggle Day/Night Mode"
            >
              {globalTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              onClick={() => setChatbotOpen(v => !v)}
              style={{ background: chatbotOpen ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent', border: 'none', color: chatbotOpen ? 'var(--primary)' : 'var(--muted)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
              title="Toggle AI Sahayak"
            >
              <Bot size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-bright)', borderRadius: 14, padding: '6px 14px' }}>
            <UserCircle size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
          </div>
        </div>
      </header>

      {/* ── Layout ─── */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>

        {/* Sidebar */}
        <aside style={{
          width: sidebarOpen ? 260 : 0,
          overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          background: 'rgba(8,8,10,0.95)', backdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 64, height: 'calc(100vh - 64px)',
        }}>
          <div style={{ padding: '1.5rem 1.25rem', flex: 1, overflowY: 'auto' }}>
            {/* User card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-bright)', borderRadius: 16, padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,var(--primary),var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontWeight: 900, fontSize: '1rem' }}>{displayName[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.2 }}>{displayName}</p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.7rem', opacity: 0.5 }}>{email}</p>
                </div>
              </div>
            </div>

            {/* Nav items */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { key: 'dashboard', icon: <Home size={18} />, label: 'Home' },
                { key: 'reports', icon: <History size={18} />, label: 'Reports' },
                { key: 'profile', icon: <UserCircle size={18} />, label: 'Profile' },
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => { setActiveView(item.key); setSidebarOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '0.9rem 1.25rem',
                    borderRadius: 18, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem',
                    background: activeView === item.key ? 'rgba(239,68,68,0.1)' : 'transparent',
                    color: activeView === item.key ? 'var(--primary)' : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    textAlign: 'left',
                    boxShadow: activeView === item.key ? 'inset 0 1px 1px rgba(255,255,255,0.05)' : 'none'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = activeView === item.key ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = activeView === item.key ? 'rgba(239,68,68,0.1)' : 'transparent'}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Logout */}
          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
            <button
              onClick={onLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '1rem', borderRadius: 20, border: '1px solid rgba(244,63,94,0.15)',
                cursor: 'pointer', background: 'rgba(244,63,94,0.05)', color: '#f43f5e',
                fontWeight: 800, fontSize: '0.9rem', transition: 'all 0.3s',
                boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f43f5e'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.05)'; e.currentTarget.style.color = '#f43f5e'; }}
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: 700, margin: '0 auto', width: '100%' }}>
          {children}
        </main>
      </div>

      {user && (
        <AIChatbot
          userAuthenticated={!!user}
          isOpen={chatbotOpen}
          onToggle={(val) => {
            if (typeof val === 'function') {
              setChatbotOpen(val);
            } else if (val !== undefined) {
              setChatbotOpen(val);
            } else {
              setChatbotOpen(!chatbotOpen);
            }
          }}
        />
      )}

      <style>{`
        .spin  { animation: spin  1s linear infinite; }
        .pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes slideInRight { from { opacity:0; transform: translateX(30px); } to { opacity:1; transform: translateX(0); } }
        .input-field {
          background: rgba(255,255,255,0.04); border: 1px solid var(--border-bright);
          color: var(--text); border-radius: 12px; padding: 0.75rem 1rem; font-size: 0.9rem;
          outline: none; transition: 0.2s; font-family: 'Outfit', sans-serif;
        }
        .input-field:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(229,9,20,0.1); }
      `}</style>
    </div>
  );
}

// ─────────────────────────── Status Badge ─────────────────────────────────────
function StatusBadge({ color, icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.85rem 1.25rem' }}>
      <span style={{ color, flexShrink: 0 }}>{icon}</span>
      <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--muted)' }}>{text}</p>
    </div>
  );
}

// ─────────────────────────── Capture Card ─────────────────────────────────────
function CaptureCard({ capture, onDraft }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
      {/* Thumbnail */}
      <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {capture.type === 'image' && <img src={capture.previewUrl} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        {capture.type === 'video' && <video src={capture.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />}
        {capture.type === 'audio' && <audio src={capture.previewUrl} controls style={{ width: 120, transform: 'scale(0.7)' }} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 700, textTransform: 'capitalize', fontSize: '0.9rem', marginBottom: 2 }}>{capture.type} Capture</p>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 8 }}>{new Date(capture.timestamp).toLocaleTimeString()}</p>

        {capture.analysis && (
          <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: '8px 10px', marginBottom: 8 }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4, fontStyle: 'italic' }}>{capture.analysis.suggested_description}</p>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Tag color="var(--secondary)">{capture.analysis.damage_type}</Tag>
              <Tag color="var(--danger)">Severity: {capture.analysis.severity}</Tag>
              <Tag color="var(--success)">AI: {(capture.analysis.confidence_score * 100).toFixed(0)}%</Tag>
            </div>
          </div>
        )}

        {capture.transcription && (
          <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: '8px 10px', marginBottom: 8 }}>
            <p style={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'var(--muted)' }}>"{capture.transcription.transcript}"</p>
          </div>
        )}

        {capture.redaction && (capture.redaction.faces > 0 || capture.redaction.plates > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Shield size={13} color="var(--success)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700 }}>
              PII Redacted: {capture.redaction.faces} faces, {capture.redaction.plates} plates
            </span>
          </div>
        )}

        {capture.jurisdiction && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <MapPin size={13} color="var(--muted)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
              {capture.jurisdiction.portal_name} · {capture.jurisdiction.ward_district}
            </span>
          </div>
        )}

        <button className="btn btn-primary" style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.85rem' }} onClick={onDraft}>
          <FileText size={15} /> Generate Official Report
        </button>
      </div>

      {/* Sync badge */}
      <div style={{ flexShrink: 0 }}>
        {capture.synced
          ? <CheckCircle size={18} color="var(--success)" />
          : <RefreshCw size={18} color="var(--muted)" />}
      </div>
    </div>
  );
}

function Tag({ color, children }) {
  return (
    <span style={{ fontSize: '0.68rem', background: `${color}22`, color, border: `1px solid ${color}44`, padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
      {children}
    </span>
  );
}

export default App;
