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


  // Main UI
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
