import React, { useEffect, useState } from 'react';
import { openDB } from 'idb';
import { initDB } from '../utils/db';
import { Archive, Clock, MapPin, ArrowLeft, ChevronRight, FileText } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export default function MyReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadReports() {
            try {
                const db = await initDB();
                if (db?.objectStoreNames?.contains('reports')) {
                    const tx = db.transaction('reports', 'readonly');
                    const store = tx.objectStore('reports');
                    const allReports = await store.getAll();
                    allReports.sort((a, b) => b.timestamp - a.timestamp);
                    setReports(allReports);
                }
            } catch (err) {
                console.error("Failed to load reports from IndexedDB", err);
            }
            const data = await res.json();
            setReports(data.reports || []);
        } catch (err) {
            console.error("Failed to load reports from server", err);
            setError("Could not load reports. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    return (
        <div style={{ animation: 'fadeUp 0.6s ease', maxWidth: 800, margin: '0 auto', width: '100%' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem' }}>
                <div>
                    <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.85rem' }}>
                        <ArrowLeft size={16} /> Back to Home
                    </button>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Track Reports</h1>
                    <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Keep an eye on everything you've reported.</p>
                </div>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <Archive size={32} />
                </div>
            </div>

            {/* Reports List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {reports.length === 0 ? (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: 32 }}>
                        <Archive size={64} style={{ opacity: 0.1, margin: '0 auto 1.5rem' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>No Reports Yet</h3>
                        <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Start reporting civic problems to see them listed here.</p>
                        <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '2rem', padding: '0.9rem 2rem' }}>Report My First Issue</button>
                    </div>
                ) : (
                    reports.map((report) => (
                        <div key={report.ticketId} className="flashcard" style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 24,
                            cursor: 'default', transition: 'all 0.3s',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'row'
                        }}>
                            {/* Media Column */}
                            {report.capturePreview && (
                                <div style={{ width: 180, minWidth: 180, background: 'rgba(0,0,0,0.2)', position: 'relative', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                    {report.captureType === 'image' ? (
                                        <img src={report.capturePreview} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : report.captureType === 'video' ? (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                                            <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
                                                <video src={report.capturePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <Clock size={24} color="white" style={{ position: 'relative' }} />
                                        </div>
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)' }}>
                                            <FileText size={24} color="var(--primary)" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Content Column */}
                            <div style={{ padding: '1.75rem', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <h4 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 2 }}>{report.ticketId}</h4>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: '0.8rem' }}>
                                                <MapPin size={12} /> {report.jurisdiction?.ward_district || report.jurisdiction || 'Location Saved'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        background: report.status?.toLowerCase() === 'submitted'
                                            ? 'rgba(52, 211, 153, 0.1)'
                                            : report.status?.toLowerCase() === 'draft'
                                                ? 'rgba(245, 158, 11, 0.1)'
                                                : 'rgba(239, 68, 68, 0.1)',
                                        padding: '6px 12px', borderRadius: 10,
                                        color: report.status?.toLowerCase() === 'submitted'
                                            ? '#10b981'
                                            : report.status?.toLowerCase() === 'draft'
                                                ? '#f59e0b'
                                                : '#ef4444',
                                        fontSize: '0.7rem', fontWeight: 800, letterSpacing: 0.5,
                                        border: `1px solid ${report.status?.toLowerCase() === 'submitted'
                                            ? 'rgba(52, 211, 153, 0.2)'
                                            : report.status?.toLowerCase() === 'draft'
                                                ? 'rgba(245, 158, 11, 0.2)'
                                                : 'rgba(239, 68, 68, 0.2)'}`
                                    }}>
                                        {report.status?.toUpperCase() || 'PROCESSING'}
                                    </div>
                                </div>

                                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: '1.25rem' }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', opacity: 0.6 }}>
                                        {report.department || 'Road & Pothole Dept.'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 800, fontSize: '0.8rem' }}>
                                        {report.damageType || 'Civic Issue'} <ChevronRight size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
                `
            }} />
        </div>
    );
}
