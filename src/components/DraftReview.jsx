import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Send, Bot, Shield, Globe } from 'lucide-react';

import { saveReportDraft } from '../services/tracking';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function DraftReview({ capture, onClose, onSubmit }) {
    const [draft, setDraft] = useState(null);
    const [isGenerating, setIsGenerating] = useState(true);
    const [statusMsg, setStatusMsg] = useState('Initializing Portal Router and Web Bridge Agent…');

    useEffect(() => {
        async function fetchRouteAndDraft() {
            try {
                setStatusMsg('Analyzing location for jurisdiction mapping…');
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
                        address: locationData.Address || locationData.address || jurisdiction.ward_district || null,
                    }),
                });

                let schema = {};
                let routing = {};
                if (routeRes.ok) {
                    const routeData = await routeRes.json();
                    schema = routeData.form_schema || {};
                    routing = routeData.routing || {};
                    setStatusMsg(`Mapped to ${routing.portal_name}. Compiling evidence via Bedrock…`);
                }

                const draftRes = await fetch(`${BACKEND_URL}/api/draft`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        ...capture,
                        form_schema: {
                            ...schema,
                            portal_url: routing.portal_url || jurisdiction.portal_url || '',
                            portal_name: routing.portal_name || jurisdiction.portal_name || '',
                        },
                    }),
                });

                if (!draftRes.ok) throw new Error('Draft generation failed');
                const generatedDraft = await draftRes.json();
                generatedDraft.portal_url = generatedDraft.portal_url || routing.portal_url || '';
                generatedDraft.portal_name = generatedDraft.portal_name || routing.portal_name || '';
                generatedDraft.form_schema = schema;

                // Default damage type to Pothole if unspecified or generic
                if (!generatedDraft.damageType || generatedDraft.damageType.toLowerCase().includes('unknown')) {
                    generatedDraft.damageType = 'Pothole / Road Infrastructure';
                }

                setDraft(generatedDraft);

                // Initial save to history as DRAFT
                await saveReportDraft(generatedDraft, capture);
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
        const updatedDraft = { ...draft, [name]: value };
        setDraft(updatedDraft);
        // Save changes to local history
        saveReportDraft(updatedDraft, capture);
    };

    if (isGenerating) {
        return (
            <div className="glass-panel animate-scale-in" style={{ padding: '4rem', textAlign: 'center' }}>
                <Loader2 size={48} className="animate-spin" color="var(--color-primary)" style={{ marginBottom: '1.5rem' }} />
                <h2 className="text-gradient" style={{ fontSize: '1.8rem' }}>Synthesizing Formal Report</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{statusMsg}</p>
            </div>
        );
    }

    if (!draft) return null;

    return (
        <div className="glass-panel animate-scale-in" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', borderBottom: 'var(--glass-border)' }}>
                <button onClick={onClose} className="secondary-btn-3d" style={{ padding: '0.5rem', borderRadius: '10px' }}>
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>Review Agent Proposal</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '2rem', padding: '2rem' }}>
                {/* Left Column: Media Preview & Basic Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Media Preview */}
                    <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                        {capture.type === 'image' ? (
                            <img src={capture.previewUrl} alt="Captured Evidence" style={{ width: '100%', height: 'auto', display: 'block' }} />
                        ) : capture.type === 'video' ? (
                            <video src={capture.previewUrl} controls style={{ width: '100%', height: 'auto', display: 'block' }} />
                        ) : (
                            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                <Globe size={48} style={{ opacity: 0.1 }} />
                                <span style={{ marginLeft: 10 }}>Audio Evidence Captured</span>
                            </div>
                        )}
                        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '4px 12px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                            LIVE EVIDENCE
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                        <div className="input-group">
                            <label className="input-label">Jurisdiction (Auto-Mapped)</label>
                            <input className="input-field" disabled value={`${capture.jurisdiction?.portal_name || draft.jurisdiction || 'Unknown'} - ${capture.jurisdiction?.ward_district || draft.ward || 'Unknown'}`} />
                        </div>

                        {Object.entries(draft).map(([key, value]) => {
                            // Skip nested objects or internal mapping keys if they are redundant with the jurisdiction header
                            if (key === 'jurisdiction' || key === 'ward' || typeof value === 'object') return null;

                            const isTextArea = typeof value === 'string' && (value.length > 60 || key.toLowerCase().includes('desc') || key.toLowerCase().includes('detail') || key.toLowerCase().includes('address'));

                            return (
                                <div className="input-group" key={key}>
                                    <label className="input-label" style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}</label>
                                    {isTextArea ? (
                                        <textarea
                                            className="input-field"
                                            name={key}
                                            value={value || ''}
                                            onChange={handleChange}
                                            rows={4}
                                            style={{ resize: 'vertical' }}
                                        />
                                    ) : (
                                        <input
                                            className="input-field"
                                            name={key}
                                            value={value || ''}
                                            onChange={handleChange}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Column: Portal Credentials & Submission */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group">
                            <label className="input-label">Portal Username (If needed)</label>
                            <input className="input-field" name="portalUsername" value={draft.portalUsername || ''} onChange={handleChange} placeholder="Optional" />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Portal Password</label>
                            <input className="input-field" name="portalPassword" type="password" value={draft.portalPassword || ''} onChange={handleChange} placeholder="Optional" />
                        </div>
                    </div>

                    <div style={{ marginTop: 'auto', background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                            <Bot size={20} color="var(--color-primary)" />
                            <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Autonomous Web Agent</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Launching the agent will automatically handle portal navigation, field mapping, and secure submission.
                        </p>
                        <button className="btn-3d" style={{ width: '100%' }} onClick={() => onSubmit(draft)}>
                            Authorize Agent Deployment
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
}
