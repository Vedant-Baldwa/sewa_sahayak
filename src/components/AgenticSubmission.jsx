import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldAlert, CheckCircle, Globe, Bot, AlertCircle, Key, Send, Zap } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function AgenticSubmission({ draft, onComplete }) {
    const [sessionId, setSessionId] = useState(null);
    const [events, setEvents] = useState([]);
    const [status, setStatus] = useState('starting');
    const [activeRequest, setActiveRequest] = useState(null);
    const [responses, setResponses] = useState({});
    const [submittingResponse, setSubmittingResponse] = useState(false);
    const [ticketId, setTicketId] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const esRef = useRef(null);
    const bottomRef = useRef(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [events]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/agentic/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ draft, form_schema: {}, portal_url: draft.portal_url || '', portal_name: draft.portal_name || 'Government Portal' }),
                });
                if (!res.ok) throw new Error(res.statusText);
                const data = await res.json();
                setSessionId(data.session_id);
                setEvents([{ type: 'step', phase: 'init', message: `Connecting to ${data.portal_name}… Autonomous Web Bridge calibrated.` }]);
            } catch (e) {
                setErrorMsg(e.message);
                setStatus('error');
            }
        })();
    }, []);

    useEffect(() => {
        if (!sessionId) return;
        const es = new EventSource(`${BACKEND_URL}/api/agentic/${sessionId}/status`);
        esRef.current = es;
        es.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setEvents(prev => [...prev, data]);
            if (data.type === 'interactive_request') { setActiveRequest(data); setStatus('hitl_waiting'); }
            else if (data.type === 'done') { setStatus('done'); setTicketId(data.ticket_id); setActiveRequest(null); es.close(); }
            else if (data.type === 'error') { setStatus('error'); setErrorMsg(data.message); setActiveRequest(null); es.close(); }
            else if (data.type === 'step' && data.phase === 'resuming') { setStatus('active'); setActiveRequest(null); }
        };
        es.onerror = () => { if (!['done', 'error'].includes(status)) { setErrorMsg('Connection lost.'); setStatus('error'); } es.close(); };
        return () => es.close();
    }, [sessionId]);

    const handleResponse = async () => {
        if (!sessionId || !activeRequest) return;
        setSubmittingResponse(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/agentic/${sessionId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(responses),
            });
            if (!res.ok) throw new Error('Response failed');
            setActiveRequest(null); setResponses({}); setStatus('active');
        } catch (e) { alert(e.message); } finally { setSubmittingResponse(false); }
    };

    const getIcon = (ev, isLast) => {
        if (ev.type === 'done') return <CheckCircle size={18} color="var(--success)" />;
        if (ev.type === 'error') return <AlertCircle size={18} color="var(--danger)" />;
        if (ev.type === 'interactive_request') return <Key size={18} color="var(--primary)" />;
        if (ev.phase === 'captcha') return <ShieldAlert size={18} color="var(--warning)" />;
        if (isLast && status === 'active') return <Loader2 size={18} className="animate-spin" color="var(--primary)" />;
        return <CheckCircle size={18} color="var(--muted)" />;
    };

    return (
        <div className="glass-panel animate-scale-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 500 }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', position: 'relative' }}>
                {draft.capturePreview && (
                    <div style={{
                        position: 'absolute', top: 0, right: 0, width: 60, height: 60,
                        borderRadius: 12, overflow: 'hidden', border: '2px solid var(--primary)',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.5)', transform: 'rotate(5deg)'
                    }}>
                        <img src={draft.capturePreview} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                )}
                <Bot size={48} color="var(--primary)" style={{ margin: '0 auto 1rem', filter: 'drop-shadow(0 0 20px var(--primary))' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Autonomous Web Bridge</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 6 }}>Filing with <strong style={{ color: 'var(--text)' }}>{draft.portal_name}</strong></p>
            </div>

            {/* Event log */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem', paddingRight: 4 }}>
                {events.map((ev, i) => (
                    <div key={i} style={{
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                        background: ev.type === 'interactive_request' ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.025)',
                        padding: '0.8rem 1rem', borderRadius: 14, fontSize: '0.85rem',
                        border: ev.type === 'interactive_request' ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                    }}>
                        <div style={{ marginTop: 2, flexShrink: 0 }}>{getIcon(ev, i === events.length - 1)}</div>
                        <p style={{ color: 'var(--text)', fontWeight: ev.type === 'interactive_request' ? 600 : 400, lineHeight: 1.5 }}>{ev.message}</p>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* HITL Panel */}
            {activeRequest && (
                <div style={{ background: 'rgba(59,130,246,0.06)', border: '2px solid rgba(59,130,246,0.35)', borderRadius: 20, padding: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ background: 'var(--primary)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {activeRequest.request_type === 'credentials' ? <Key size={18} color="white" /> : <Globe size={18} color="white" />}
                        </div>
                        <div>
                            <h3 style={{ fontWeight: 800, fontSize: '1rem' }}>Human-in-the-Loop Authorization</h3>
                            <p style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Agent requires your confirmation to proceed</p>
                        </div>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>{activeRequest.message}</p>
                    {activeRequest.fields?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.25rem' }}>
                            {activeRequest.fields.map(f => (
                                <div key={f}>
                                    <label style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{f}</label>
                                    <input
                                        className="input-field"
                                        placeholder={`Enter ${f}…`}
                                        type={f.toLowerCase().includes('password') ? 'password' : 'text'}
                                        value={responses[f] || ''}
                                        onChange={(e) => setResponses(prev => ({ ...prev, [f]: e.target.value }))}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                    <button
                        className="btn-3d"
                        style={{ width: '100%' }}
                        onClick={handleResponse}
                        disabled={submittingResponse || (activeRequest.fields?.length > 0 && Object.keys(responses).length < activeRequest.fields.length)}
                    >
                        {submittingResponse ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        {activeRequest.request_type === 'confirmation' ? 'Confirm & Authorize Submission' : 'Submit Response'}
                    </button>
                </div>
            )}

            {/* Done State */}
            {status === 'done' && (
                <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(16,185,129,0.06)', borderRadius: 20, border: '1px solid rgba(16,185,129,0.25)', marginTop: '1rem' }}>
                    <CheckCircle size={40} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
                    <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Report Filed Successfully</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        Acknowledgement ID: <strong style={{ color: 'var(--accent)' }}>{ticketId}</strong>
                    </p>
                    <button className="btn-3d" style={{ width: '100%' }} onClick={() => onComplete(ticketId)}>
                        Close Session
                    </button>
                </div>
            )}

            {/* Error State */}
            {errorMsg && (
                <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 14, padding: '1rem', display: 'flex', gap: 10, marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--danger)' }}>
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{errorMsg}</span>
                </div>
            )}
        </div>
    );
}
