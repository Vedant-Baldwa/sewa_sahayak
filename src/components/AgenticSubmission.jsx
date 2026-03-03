import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldAlert, CheckCircle, Globe, Bot, AlertCircle, Wifi, Key, User, Send, ExternalLink, Zap } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const STATUS_ICON = {
    step: (active) => active
        ? <Loader2 size={20} className="animate-spin" color="var(--color-primary)" />
        : <CheckCircle size={20} color="var(--color-text-muted)" />,
    field_filling: () => <Loader2 size={18} className="animate-spin" color="var(--color-secondary)" />,
    field_filled: () => <CheckCircle size={18} color="var(--color-success)" />,
    field_skipped: () => <AlertCircle size={18} color="var(--color-warning)" />,
    captcha: () => <ShieldAlert size={20} color="var(--color-warning)" className="animate-pulse" />,
    captcha_solving: () => <Zap size={20} color="var(--color-secondary)" className="animate-pulse" />,
    captcha_solved: () => <CheckCircle size={20} color="var(--color-success)" />,
    interactive_request: () => <User size={20} color="var(--color-primary)" />,
    done: () => <CheckCircle size={20} color="var(--color-success)" />,
    error: () => <AlertCircle size={20} color="var(--color-danger)" />,
};

export default function AgenticSubmission({ draft, onComplete }) {
    const [sessionId, setSessionId] = useState(null);
    const [events, setEvents] = useState([]);
    const [status, setStatus] = useState('starting');
    const [activeRequest, setActiveRequest] = useState(null); // { type, message, fields }
    const [responses, setResponses] = useState({});
    const [submittingResponse, setSubmittingResponse] = useState(false);
    const [ticketId, setTicketId] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const esRef = useRef(null);
    const bottomRef = useRef(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [events]);

    // ── Create Session ──────────────────────────────────────────────────────
    useEffect(() => {
        async function startSession() {
            try {
                const res = await fetch(`${BACKEND_URL}/api/agentic/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        draft: draft,
                        form_schema: {}, // Schema handled internally now
                        portal_url: draft.portal_url || '',
                        portal_name: draft.portal_name || 'Government Portal',
                    }),
                });

                if (!res.ok) throw new Error(`Failed to start session: ${res.statusText}`);
                const data = await res.json();
                setSessionId(data.session_id);
                setEvents([{
                    type: 'step', step: 'init',
                    message: `Synchronizing with ${data.portal_name}... Launching Autonomous Web Bridge.`
                }]);
            } catch (err) {
                setErrorMsg(err.message);
                setStatus('error');
            }
        }
        startSession();
    }, []);

    // ── SSE Handler ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!sessionId) return;

        const es = new EventSource(`${BACKEND_URL}/api/agentic/${sessionId}/status`);
        esRef.current = es;

        es.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setEvents(prev => [...prev, data]);

            if (data.type === 'interactive_request') {
                setActiveRequest(data);
                setStatus('hitl_waiting');
            } else if (data.type === 'done') {
                setStatus('done');
                setTicketId(data.ticket_id);
                setActiveRequest(null);
                es.close();
            } else if (data.type === 'error') {
                setStatus('error');
                setErrorMsg(data.message);
                setActiveRequest(null);
                es.close();
            } else if (data.type === 'step' && data.step === 'resuming') {
                setStatus('active');
                setActiveRequest(null);
            }
        };

        es.onerror = () => {
            if (!['done', 'error'].includes(status)) {
                setErrorMsg('Web Bridge connection lost.');
                setStatus('error');
            }
            es.close();
        };

        return () => es.close();
    }, [sessionId]);

    // ── Respond to Agent ────────────────────────────────────────────────────
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
            if (!res.ok) throw new Error('Response failed to send');
            setActiveRequest(null);
            setResponses({});
            setStatus('active');
        } catch (err) {
            alert('Error replying to agent: ' + err.message);
        } finally {
            setSubmittingResponse(false);
        }
    };

    const updateResponse = (field, val) => {
        setResponses(prev => ({ ...prev, [field]: val }));
    };

    return (
        <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1.5rem', minHeight: '500px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <Bot size={40} color="var(--color-primary)" style={{ margin: '0 auto 0.5rem' }} />
                <h2 className="heading-2 text-gradient" style={{ fontSize: '1.4rem' }}>Autonomous Web Bridge</h2>
                <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>Citizen Report Automation for <strong>{draft.portal_name}</strong></p>
            </div>

            {/* Event Log */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', paddingRight: '4px' }}>
                {events.map((ev, idx) => (
                    <div
                        key={idx}
                        className="fade-in"
                        style={{
                            display: 'flex', gap: '0.75rem',
                            background: ev.type === 'interactive_request' ? 'rgba(139, 92, 246, 0.08)' :
                                ev.step === 'captcha_solved' ? 'rgba(16,185,129,0.08)' :
                                    'rgba(255,255,255,0.4)',
                            padding: '0.6rem 0.8rem', borderRadius: '12px', fontSize: '0.85rem',
                            border: ev.type === 'interactive_request' ? '1px solid var(--color-primary)' : '1px solid transparent'
                        }}
                    >
                        <div style={{ marginTop: '2px' }}>
                            {STATUS_ICON[ev.step] ? STATUS_ICON[ev.step](events.indexOf(ev) === events.length - 1) :
                                STATUS_ICON[ev.type] ? STATUS_ICON[ev.type](events.indexOf(ev) === events.length - 1) :
                                    STATUS_ICON.step(false)}
                        </div>
                        <p style={{ margin: 0, fontWeight: ev.type === 'interactive_request' ? '600' : '400' }}>{ev.message}</p>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Interactive HITL Panel */}
            {activeRequest && (
                <div style={{ background: 'white', border: '2.5px solid var(--color-primary)', borderRadius: '18px', padding: '1.25rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} className="bounce-in">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                        <div style={{ background: 'var(--color-primary)', p: '8px', borderRadius: '8px', display: 'flex' }}>
                            {activeRequest.request_type === 'credentials' ? <Key size={18} color="white" /> : <Globe size={18} color="white" />}
                        </div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: '700', m: 0 }}>Human-in-the-Loop Required</h3>
                    </div>

                    <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#4b5563' }}>{activeRequest.message}</p>

                    {activeRequest.fields.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            {activeRequest.fields.map(f => (
                                <div key={f} className="input-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{f}</label>
                                    <input
                                        className="input-field"
                                        placeholder={`Enter ${f}...`}
                                        type={f.toLowerCase().includes('password') ? 'password' : 'text'}
                                        onChange={(e) => updateResponse(f, e.target.value)}
                                        value={responses[f] || ''}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={handleResponse}
                        disabled={submittingResponse || (activeRequest.fields.length > 0 && Object.keys(responses).length < activeRequest.fields.length)}
                    >
                        {submittingResponse ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                        &nbsp; {activeRequest.request_type === 'confirmation' ? 'Confirm & Finalize' : 'Submit to Agent'}
                    </button>
                </div>
            )}

            {/* Outcome States */}
            {status === 'done' && (
                <div style={{ textAlign: 'center' }} className="fade-in">
                    <div className="glass-panel" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid var(--color-success)', p: '1.5rem', mb: '1rem' }}>
                        <CheckCircle size={40} color="var(--color-success)" style={{ margin: '0 auto 0.5rem' }} />
                        <h3 style={{ fontWeight: 800 }}>Reporting Complete</h3>
                        <p style={{ fontSize: '0.85rem' }}>The damage has been successfully registered. Acknowledgement ID: <strong>{ticketId}</strong></p>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onComplete(ticketId)}>
                        Close Session
                    </button>
                </div>
            )}

            {errorMsg && (
                <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', p: '1rem', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', gap: '8px' }}>
                    <AlertCircle size={18} />
                    <span>{errorMsg}</span>
                </div>
            )}
        </div>
    );
}
