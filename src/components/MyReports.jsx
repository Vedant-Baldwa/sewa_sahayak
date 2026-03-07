import React, { useEffect, useState } from 'react';
import { Archive, Clock, MapPin, RefreshCw, Loader2 } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

export default function MyReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchReports = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BACKEND_URL}/api/reports/me`, {
                credentials: "include"
            });
            if (!res.ok) {
                if (res.status === 401) {
                    setError("Please log in to view your reports.");
                } else {
                    throw new Error(`Server error: ${res.status}`);
                }
                return;
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
        <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <h2 className="heading-2">My Reports</h2>
                <button
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={fetchReports}
                    disabled={loading}
                    title="Refresh reports"
                >
                    <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
                        <Loader2 size={32} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                        <p>Loading your reports...</p>
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-danger, #ef4444)' }}>
                        <p>{error}</p>
                        <button className="btn btn-primary" style={{ marginTop: '1rem', fontSize: '0.85rem' }} onClick={fetchReports}>
                            Try Again
                        </button>
                    </div>
                ) : reports.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
                        <Archive size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                        <p>You haven't submitted any reports yet.</p>
                        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Reports you submit will appear here across all your devices.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {reports.map((report) => (
                            <div key={report.ticketId} style={{ background: 'rgba(255,255,255,0.8)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-primary)', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: '4px' }}>
                                        {report.ticketId}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)', fontWeight: '600' }}>
                                        <Clock size={12} /> {report.status}
                                    </span>
                                </div>

                                <h4 style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.25rem' }}>{report.jurisdiction?.portal_name || report.damageType || 'Government Portal'}</h4>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                                    <MapPin size={12} /> {report.jurisdiction?.ward_district || 'Location unavailable'}
                                </div>

                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    Submitted on {new Date(report.timestamp).toLocaleDateString()} at {new Date(report.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        ))}
                    </div>
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
