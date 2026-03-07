import React, { useState, useRef, useEffect } from 'react';
import {
    Bot, X, Send, Loader2, Minimize2, PlusSquare, History, Trash2,
    Edit2, Check, Camera, Zap, Mic, Square, ShieldCheck, MessageSquare
} from 'lucide-react';
import { redactMediaWithRekognition } from '../services/rekognition';
import { analyzeMediaWithBedrock } from '../services/bedrock';
import { transcribeAudioWithAWS } from '../services/transcribe';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function AIChatbot({ userAuthenticated, isOpen, onToggle }) {
    const [internalOpen, setInternalOpen] = useState(false);

    // Use prop if provided, otherwise use internal state
    const open = isOpen !== undefined ? isOpen : internalOpen;
    const setOpen = onToggle || setInternalOpen;

    const [showHistory, setShowHistory] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('sahayak_chat_theme') || 'dark');

    // Multi-session state with LocalStorage fallback
    const [chatSessions, setChatSessions] = useState(() => {
        const local = localStorage.getItem('sahayak_chat_sessions');
        if (local) {
            try {
                const parsed = JSON.parse(local);
                if (parsed.length > 0) return parsed;
            } catch (e) { console.error("Chatbot: Local load failed", e); }
        }
        return [
            { id: 'initial', title: 'Start a Conversation', messages: [{ role: 'assistant', content: "Hi! I'm Sahayak. I'm here to help you navigate the platform and handle civic reporting. How can I assist you today?" }], updatedAt: Date.now() }
        ];
    });
    const [activeChatId, setActiveChatId] = useState(() => localStorage.getItem('sahayak_active_chat_id') || 'initial');

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [unread, setUnread] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [currentLang, setCurrentLang] = useState('en');
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    const activeSession = chatSessions.find(s => s.id === activeChatId) || chatSessions[0];
    const messages = activeSession.messages;

    // Fetch sessions from backend on load 
    useEffect(() => {
        if (userAuthenticated) {
            (async () => {
                try {
                    const res = await fetch(`${BACKEND_URL}/api/user/state`, { credentials: 'include' });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.chat_sessions?.length > 0) {
                            setChatSessions(data.chat_sessions);
                            if (data.activeChatId) setActiveChatId(data.activeChatId);
                            else setActiveChatId(data.chat_sessions[0].id);
                        }
                    }
                } catch (e) { console.error("Chatbot: Failed to sync history", e); }
            })();
        }
    }, [userAuthenticated]);

    // Save sessions to backend when they change
    useEffect(() => {
        if (userAuthenticated) {
            const save = async () => {
                try {
                    await fetch(`${BACKEND_URL}/api/user/state/chats`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ sessions: chatSessions, activeChatId })
                    });
                } catch (e) { console.error("Chatbot: Save failed", e); }
            };
            const timer = setTimeout(save, 1500); // Debounce
            return () => clearTimeout(timer);
        }
    }, [chatSessions, activeChatId, userAuthenticated]);

    // Local Persistence
    useEffect(() => {
        localStorage.setItem('sahayak_chat_sessions', JSON.stringify(chatSessions));
        localStorage.setItem('sahayak_active_chat_id', activeChatId);
    }, [chatSessions, activeChatId]);

    useEffect(() => {
        localStorage.setItem('sahayak_chat_theme', theme);
        // Apply class to chatbot container for styling
    }, [theme]);

    useEffect(() => {
        if (open) {
            setUnread(0);
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [open]);

    useEffect(() => {
        // Init language from cookie
        const cookie = document.cookie.split('; ').find(r => r.trim().startsWith('googtrans='));
        if (cookie) {
            const lang = cookie.split('/').pop();
            if (lang) setCurrentLang(lang);
        }

        const handleLang = (e) => setCurrentLang(e.detail);
        window.addEventListener('languageChanged', handleLang);
        return () => window.removeEventListener('languageChanged', handleLang);
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, mediaLoading]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setMediaLoading(true);
        const previewUrl = URL.createObjectURL(file);

        // Add user message with image immediately
        const userMsg = {
            role: 'user',
            content: "Attached media for analysis.",
            media: { type: file.type.startsWith('image') ? 'image' : 'video', url: previewUrl, name: file.name }
        };
        updateMessages(userMsg);

        try {
            // Step 1: PII Redaction
            console.log("[Chatbot] Triggering Rekognition Redaction...");
            const redactRes = await redactMediaWithRekognition(file);
            const finalFile = redactRes.redactedFile || file;

            // Update preview to redacted version
            const redactedUrl = URL.createObjectURL(finalFile);
            setChatSessions(prev => prev.map(s => s.id === activeChatId ? {
                ...s,
                messages: s.messages.map(m => m === userMsg ? { ...m, media: { ...m.media, url: redactedUrl, redacted: true } } : m)
            } : s));

            // Step 2: Bedrock Analysis
            console.log("[Chatbot] Triggering Bedrock analysis...");
            const analysis = await analyzeMediaWithBedrock(finalFile, file.type.startsWith('image') ? 'image' : 'video');

            const assistReply = {
                role: 'assistant',
                content: `I've analyzed your media using Bedrock Nova Pro. \n\n**Incident Type:** ${analysis.damageType} \n**Severity:** ${analysis.severity} \n**AI Summary:** ${analysis.description}`,
                analysis: analysis,
                redactionInfo: { faces: redactRes.facesRedacted, plates: redactRes.platesRedacted }
            };
            updateMessages(assistReply);
        } catch {
            updateMessages({ role: 'assistant', content: "Failed to process media. Please ensure Bedrock and Rekognition services are active in your region." });
        } finally {
            setMediaLoading(false);
            e.target.value = null; // Reset input
        }
    };

    const updateMessages = (newMsg) => {
        setChatSessions(prev => prev.map(s =>
            s.id === activeChatId
                ? {
                    ...s,
                    messages: [...s.messages, newMsg],
                    updatedAt: Date.now(),
                    title: s.title === 'New Conversation' ? "Media Intel Report" : s.title
                }
                : s
        ));
    };

    const send = async () => {
        const msg = input.trim();
        if (!msg || loading) return;
        setInput('');

        const newMsgs = [...messages, { role: 'user', content: msg }];

        setChatSessions(prev => prev.map(s =>
            s.id === activeChatId
                ? {
                    ...s,
                    messages: newMsgs,
                    updatedAt: Date.now(),
                    title: s.title === 'New Conversation' ? (msg.length > 25 ? msg.slice(0, 25) + "..." : msg) : s.title
                }
                : s
        ));

        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/chatbot/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message: msg, history: newMsgs.slice(-6), lang: currentLang }),
            });
            const data = await res.json();

            setChatSessions(prev => prev.map(s =>
                s.id === activeChatId
                    ? { ...s, messages: [...newMsgs, { role: 'assistant', content: data.reply }] }
                    : s
            ));

            if (!open) setUnread(u => u + 1);
        } catch {
            setChatSessions(prev => prev.map(s =>
                s.id === activeChatId
                    ? { ...s, messages: [...newMsgs, { role: 'assistant', content: "I'm having connectivity issues with the AI cluster. Please check your network and try again!" }] }
                    : s
            ));
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        const newId = `chat_${Date.now()}`;
        const newSession = {
            id: newId,
            title: 'New Conversation',
            messages: [{ role: 'assistant', content: "New session started. How can Sahayak help you today?" }],
            updatedAt: Date.now()
        };
        setChatSessions([newSession, ...chatSessions]);
        setActiveChatId(newId);
        setShowHistory(false);
    };

    const deleteSession = (id, e) => {
        e.stopPropagation();
        if (chatSessions.length === 1) {
            handleNewChat();
            setChatSessions(prev => prev.filter(s => s.id !== id));
            return;
        }
        const remaining = chatSessions.filter(s => s.id !== id);
        setChatSessions(remaining);
        if (activeChatId === id) setActiveChatId(remaining[0].id);
    };

    const startAudioMode = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => {
                console.log(`[ChatbotAudio] Received ${e.data.size} bytes`);
                audioChunksRef.current.push(e.data);
            };
            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                console.log(`[ChatbotAudio] Processing total ${blob.size} bytes`);
                stream.getTracks().forEach(t => t.stop());

                setMediaLoading(true);
                try {
                    // Start true transcription with current language context
                    const result = await transcribeAudioWithAWS(blob, currentLang);
                    const transcribedText = result.transcript || result.text || "Audio processed (no speech detected)";

                    // Add user message
                    const userMsg = { role: 'user', content: transcribedText };
                    const newMsgs = [...messages, userMsg];
                    updateMessages(userMsg);

                    // Actually call Bedrock AI
                    try {
                        const res = await fetch(`${BACKEND_URL}/api/chatbot/message`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ message: transcribedText, history: newMsgs.slice(-6), lang: currentLang }),
                        });
                        const data = await res.json();
                        setChatSessions(prev => prev.map(s =>
                            s.id === activeChatId
                                ? { ...s, messages: [...newMsgs, { role: 'assistant', content: data.reply }] }
                                : s
                        ));
                    } catch {
                        updateMessages({ role: 'assistant', content: "I heard you, but I'm having trouble connecting to the AI cluster. Try again!" });
                    }
                } catch {
                    const failMsg = { role: 'user', content: "Shared a voice report (Transcription Failed)." };
                    updateMessages(failMsg);
                    updateMessages({ role: 'assistant', content: "Sorry, I couldn't properly transcribe that audio. Could you try speaking again or typing?" });
                } finally {
                    setMediaLoading(false);
                }
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch {
            alert("Microphone access denied. Please enable audio permissions.");
        }
    };

    const stopAudioMode = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    const toggleTheme = () => {
        const modes = ['dark', 'light', 'neon', 'auto'];
        const next = modes[(modes.indexOf(theme) + 1) % modes.length];
        setTheme(next);
    };

    const getThemeClass = () => {
        if (theme === 'auto') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light';
        }
        return `theme-${theme}`;
    };

    // Chatbot is now available for both landing and app
    // if (!userAuthenticated) return null; // Removed this line

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    position: 'fixed', bottom: '2.5rem', right: '2.5rem', zIndex: 1000,
                    width: 72, height: 72, borderRadius: 24,
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 12px 0 var(--primary-dark), 0 20px 40px rgba(59,130,246,0.35)',
                    transition: 'all 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67)',
                }}
                className="chatbot-trigger animate-pop"
            >
                {open ? <X size={28} color="white" /> : <Bot size={34} color="white" />}
                {!open && unread > 0 && (
                    <div className="unread-badge">{unread}</div>
                )}
            </button>

            {/* Chat Panel */}
            {open && (
                <div style={{
                    position: 'fixed', bottom: '2.5rem', right: '2.5rem', zIndex: 999,
                    width: 440, height: 720, maxHeight: 'calc(100vh - 6rem)',
                    background: 'rgba(24, 24, 30, 0.8)', backdropFilter: 'blur(32px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 36, display: 'flex', overflow: 'hidden',
                    boxShadow: '0 50px 100px rgba(0,0,0,0.9), 0 0 60px rgba(59,130,246,0.15)',
                    animation: 'chatIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                    {/* History Sidebar */}
                    {showHistory && (
                        <div style={{ width: 260, background: 'rgba(0,0,0,0.45)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--primary)', letterSpacing: '0.15em' }}>MISSION HISTORY</span>
                                <PlusSquare size={18} style={{ color: 'var(--text)', cursor: 'pointer' }} onClick={handleNewChat} />
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                                {chatSessions.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => { setActiveChatId(s.id); setShowHistory(false); }}
                                        className={`chat-session-pill ${s.id === activeChatId ? 'active' : ''}`}
                                    >
                                        <MessageSquare size={15} style={{ opacity: 0.6 }} />
                                        <span style={{ flex: 1, fontSize: '0.85rem' }}>{s.title}</span>
                                        <Trash2 size={13} onClick={(e) => deleteSession(s.id, e)} className="delete-icon" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main Interface */}
                    <div className={`chatbot-main ${getThemeClass()}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg-card)', color: 'var(--text)', transition: '0.3s' }}>
                        {/* Header */}
                        <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button onClick={() => setShowHistory(!showHistory)} style={{ background: showHistory ? 'rgba(239, 68, 68, 0.15)' : 'transparent', color: showHistory ? 'var(--primary)' : 'var(--muted)', borderRadius: 12, border: 'none', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <History size={20} />
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 800, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeSession.title}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                                    <div className="online-dot" />
                                    <span style={{ color: 'var(--success)', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assistant Online</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={toggleTheme} style={{ background: theme !== 'dark' ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent', border: 'none', color: 'var(--muted)', borderRadius: 12, padding: '0 8px', height: 44, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                    <Zap size={18} className={theme === 'neon' ? 'neon-active' : ''} />
                                    <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>{theme.toUpperCase()}</span>
                                </button>
                                <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={22} />
                                </button>
                            </div>
                        </div>

                        {/* Message Feed */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 24 }} className="advanced-scroll">
                            {messages.map((m, i) => (
                                <div key={i} className={`message-bubble-row ${m.role === 'user' ? 'user' : 'ai'}`}>
                                    <div className="message-bubble">
                                        {m.media && (
                                            <div className="media-preview-bubble">
                                                {m.media.type === 'image' ? (
                                                    <img src={m.media.url} alt="Uploaded" />
                                                ) : (
                                                    <div className="video-thumb"><Bot size={32} /></div>
                                                )}
                                                {m.media.redacted && (
                                                    <div className="redaction-badge">
                                                        <ShieldCheck size={12} /> PII SECURED
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="message-text">{m.content}</div>
                                        {m.analysis && (
                                            <div className="analysis-summary-card">
                                                <div className="analysis-tag">BEDROCK ANALYSIS</div>
                                                <div className="analysis-item"><strong>Damage:</strong> {m.analysis.damageType}</div>
                                                <div className="analysis-item"><strong>Severity:</strong> {m.analysis.severity}</div>
                                                <div className="analysis-item"><strong>Faces Redacted:</strong> {m.redactionInfo?.faces}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {(loading || mediaLoading) && (
                                <div className="message-bubble-row ai">
                                    <div className="message-bubble loading-state">
                                        <div className="ai-status-text">
                                            {mediaLoading ? "Processing through Rekognition & Bedrock Nova Pro..." : "Sahayak is thinking..."}
                                        </div>
                                        <div className="loading-beam" />
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input System */}
                        <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 24, padding: '4px' }}>
                                <button onClick={() => fileInputRef.current?.click()} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', width: 40, height: 40, borderRadius: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Camera size={20} />
                                </button>
                                <button
                                    onClick={isRecording ? stopAudioMode : startAudioMode}
                                    style={{
                                        background: isRecording ? 'var(--danger)' : 'transparent',
                                        color: isRecording ? 'white' : 'var(--muted)',
                                        width: 40, height: 40, borderRadius: 20, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                                    }}
                                >
                                    {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
                                </button>
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && send()}
                                    placeholder={isRecording ? "Recording audio..." : "Type or share proof..."}
                                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', padding: '10px 4px', fontSize: '0.9rem', outline: 'none' }}
                                    disabled={loading || mediaLoading || isRecording}
                                />
                                <button
                                    onClick={send}
                                    disabled={!input.trim() || loading || mediaLoading || isRecording}
                                    style={{
                                        background: input.trim() ? 'var(--primary)' : 'transparent',
                                        color: input.trim() ? 'white' : 'rgba(255,255,255,0.1)',
                                        width: 40, height: 40, borderRadius: 16, border: 'none',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: '0.3s'
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,video/*"
                onChange={handleFileUpload}
            />

            <style>{`
                @keyframes chatIn { from { opacity: 0; transform: translateY(50px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .chatbot-trigger:hover { transform: scale(1.05) translateY(-5px); filter: brightness(1.1); }
                .unread-badge { position: absolute; top: -5px; right: -5px; background: var(--danger); color: white; width: 28px; height: 28px; border-radius: 50%; border: 4px solid var(--bg); font-weight: 900; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; }
                
                .header-tool { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.4); padding: 10px; border-radius: 12px; transition: 0.2s; }
                .header-tool:hover { background: rgba(255,255,255,0.1); color: white; }
                .header-tool.active { color: var(--primary); background: rgba(59,130,246,0.1); }
                
                .online-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); box-shadow: 0 0 10px var(--success); animation: pulse 2s infinite; }
                
                .chat-session-pill { display: flex; align-items: center; gap: 12px; padding: 1rem; border-radius: 16px; cursor: pointer; margin-bottom: 8px; color: rgba(255,255,255,0.5); transition: 0.2s; }
                .chat-session-pill:hover { background: rgba(255,255,255,0.05); color: white; }
                .chat-session-pill.active { background: rgba(59,130,246,0.15); color: white; border: 1px solid rgba(59,130,246,0.25); }
                .delete-icon { opacity: 0; transition: 0.2s; color: var(--muted); }
                .chat-session-pill:hover .delete-icon { opacity: 0.6; }
                .delete-icon:hover { color: var(--danger); opacity: 1 !important; }

                .message-bubble-row { display: flex; width: 100%; }
                .message-bubble-row.user { justify-content: flex-end; }
                .message-bubble { 
                    max-width: 85%; padding: 1.25rem 1.5rem; border-radius: 24px; position: relative;
                    font-size: 0.95rem; line-height: 1.6; border: 1px solid rgba(255,255,255,0.08); 
                }
                .ai .message-bubble { background: rgba(255,255,255,0.03); border-bottom-left-radius: 4px; }
                .user .message-bubble { background: var(--primary); color: white; border: none; border-bottom-right-radius: 4px; box-shadow: 0 10px 30px rgba(59,130,246,0.25); }
                
                .media-preview-bubble { position: relative; margin-bottom: 12px; border-radius: 16px; overflow: hidden; border: 2px solid rgba(255,255,255,0.1); }
                .media-preview-bubble img { width: 100%; height: auto; display: block; }
                .redaction-badge { position: absolute; bottom: 8px; right: 8px; background: var(--success); color: white; padding: 4px 10px; border-radius: 6px; font-size: 0.6rem; font-weight: 800; display: flex; align-items: center; gap: 5px; }

                .analysis-summary-card { margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 14px; border: 1px solid rgba(59,130,246,0.2); }
                .analysis-tag { font-size: 0.55rem; font-weight: 900; color: var(--primary); letter-spacing: 1px; margin-bottom: 8px; }
                .analysis-item { font-size: 0.8rem; margin-bottom: 4px; }
                
                .input-system-wrap { display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 6px; }
                .advanced-chat-input { flex: 1; background: transparent; border: none; color: white; padding: 12px; outline: none; font-family: inherit; font-size: 0.95rem; }
                .input-tool { background: transparent; border: none; color: rgba(255,255,255,0.5); width: 44px; height: 44px; border-radius: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
                .input-tool:hover { background: rgba(255,255,255,0.05); color: white; }
                .chat-send-trigger { background: transparent; border: none; color: rgba(255,255,255,0.2); width: 44px; height: 44px; border-radius: 16px; transition: 0.3s; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                .chat-send-trigger.active { background: var(--primary); color: white; box-shadow: 0 4px 15px rgba(59,130,246,0.3); }

                .loading-state { padding: 1.5rem; display: flex; flex-direction: column; gap: 10px; }
                .ai-status-text { font-size: 0.8rem; color: var(--muted); font-weight: 600; }
                .loading-beam { height: 3px; background: var(--primary); border-radius: 2px; position: relative; overflow: hidden; }
                .loading-beam::after { content: ''; position: absolute; inset: 0; background: white; width: 40%; animation: beam-slide 1.5s infinite; }
                @keyframes beam-slide { from { left: -40%; } to { left: 100%; } }
                @keyframes pulse { 0% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.4; transform: scale(1); } }
                .neon-active { color: var(--secondary); filter: drop-shadow(0 0 8px var(--secondary)); animation: neon-zap 1.5s infinite; }
                @keyframes neon-zap { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; transform: scale(1.2); } }
            `}</style>
        </>
    );
}
