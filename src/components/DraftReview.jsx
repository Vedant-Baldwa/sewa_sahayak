import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Send, Bot } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function DraftReview({ capture, onClose, onSubmit }) {
    const [draft, setDraft] = useState(null);
    const [formSchema, setFormSchema] = useState({});
    const [isGenerating, setIsGenerating] = useState(true);
    const [statusMsg, setStatusMsg] = useState('Initializing Portal Router and Web Bridge Agent…');

    useEffect(() => {
        async function fetchRouteAndDraft() {
            try {
                // ── Step 1: Get portal routing + Web Bridge Agent form schema ────────
                setStatusMsg('Portal Router is analyzing location to identify the correct jurisdiction…');

                const locationData = capture.locationData || {};
                const jurisdiction = capture.jurisdiction || {};

                const routeRes = await fetch(`${BACKEND_URL}/api/route`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        lat: locationData.lat || null,
                        lng: locationData.lng || null,
                        state: locationData.State || locationData.state || null,
                        city: locationData.City || locationData.city || null,
                        address: locationData.Address || locationData.address ||
                            jurisdiction.ward_district || null,
                    }),
                });

                let schema = {};
                let routing = {};
                if (routeRes.ok) {
                    const routeData = await routeRes.json();
                    schema = routeData.form_schema || {};
                    routing = routeData.routing || {};
                    setFormSchema(schema);

                    // Check if Nova Act actually scraped form fields
                    if (schema.fields && schema.fields.length > 0) {
                        setStatusMsg(`Portal Router identified ${routing.portal_name}. Web Bridge Agent extracted ${schema.fields.length} form fields.`);
                    } else {
                        setStatusMsg(`Portal Router identified ${routing.portal_name}. Generating complaint via Bedrock Analysis Agent…`);
                    }
                } else {
                    setStatusMsg('Bedrock Analysis Agent is synthesizing your complaint draft…');
                }

                // ── Step 2: Generate formal draft via Bedrock ────────────────
                setStatusMsg(prev => prev.includes('Bedrock') ? prev : 'Bedrock Analysis Agent is drafting a formal complaint…');

                const draftPayload = {
                    ...capture,
                    form_schema: {
                        ...schema,
                        portal_url: routing.portal_url || jurisdiction.portal_url || '',
                        portal_name: routing.portal_name || jurisdiction.portal_name || '',
                    },
                };

                const draftRes = await fetch(`${BACKEND_URL}/api/draft`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(draftPayload),
                });

                if (!draftRes.ok) throw new Error('Draft generation API failed');
                const generatedDraft = await draftRes.json();

                // Carry portal + form metadata into the draft for submission
                generatedDraft.portal_url = generatedDraft.portal_url || routing.portal_url || '';
                generatedDraft.portal_name = generatedDraft.portal_name || routing.portal_name || '';
                generatedDraft.form_schema = schema;

                setDraft(generatedDraft);
            } catch (err) {
                console.error('Draft generation failed', err);
            } finally {
                setIsGenerating(false);
            }
        }
        fetchRouteAndDraft();
    }, [capture]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDraft(prev => ({ ...prev, [name]: value }));
    };

    if (isGenerating) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Loader2 size={48} className="animate-spin" color="var(--color-primary)" style={{ marginBottom: '1rem' }} />
                <h2 className="heading-2">Preparing Application…</h2>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>{statusMsg}</p>
            </div>
        );
    }

    if (!draft) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Failed to generate draft. Please try again.</p>
                <button className="btn btn-secondary" onClick={onClose}>Go Back</button>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <ArrowLeft size={24} color="var(--color-text-main)" />
                </button>
                <h2 className="heading-2" style={{ fontSize: '1.25rem', margin: 0 }}>Review Application</h2>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                {draft.portal_name && (
                    <div style={{ background: 'rgba(59,130,246,0.08)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🏛️ Submitting to: <strong>{draft.portal_name}</strong></span>
                        {draft.detected_language && (
                            <span style={{ fontSize: '0.7rem', background: 'var(--color-primary)', color: 'white', padding: '2px 8px', borderRadius: '20px' }}>
                                Translated from {draft.detected_language}
                            </span>
                        )}
                    </div>
                )}

                <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    Bedrock compiled your evidence into the formal complaint below. You can edit any field before submission.
                </p>

                <div className="input-group">
                    <label className="input-label">Jurisdiction (Auto-Mapped)</label>
                    <input className="input-field" disabled value={`${draft.jurisdiction} — ${draft.ward}`} />
                </div>

                <div className="input-group">
                    <label className="input-label">Issue Type</label>
                    <input className="input-field" name="damageType" value={draft.damageType} onChange={handleChange} />
                </div>

                <div className="input-group">
                    <label className="input-label">Severity</label>
                    <select className="input-field" name="severity" value={draft.severity} onChange={handleChange} style={{ appearance: 'none' }}>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                    </select>
                </div>

                <div className="input-group">
                    <label className="input-label">Detailed Description</label>
                    <textarea className="input-field" name="description" value={draft.description} onChange={handleChange} rows={6} style={{ resize: 'vertical' }} />
                </div>

                <div className="input-group">
                    <label className="input-label">Applicant Name</label>
                    <input className="input-field" name="applicantName" value={draft.applicantName} onChange={handleChange} />
                </div>

                <div className="input-group">
                    <label className="input-label">Phone Number</label>
                    <input className="input-field" name="phoneNumber" value={draft.phoneNumber} onChange={handleChange} />
                </div>
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.8)' }}>
                <button
                    className="btn btn-primary"
                    style={{ width: '100%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', border: 'none', height: '52px', fontWeight: 'bold' }}
                    onClick={() => onSubmit(draft, formSchema)}
                >
                    <Bot size={22} />
                    Launch Web Bridge Agent for Autofill
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                    The <strong>Web Bridge Agent</strong> will automatically navigate the portal as part of the <strong>Human-in-the-Loop Interface</strong>.
                </p>
            </div>
        </div>
    );
}
