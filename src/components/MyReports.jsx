import React, { useEffect, useState } from 'react';
import { openDB } from 'idb';
import { Archive, Clock, MapPin } from 'lucide-react';

export default function MyReports({ onClose }) {
    const [reports, setReports] = useState([]);

    useEffect(() => {
        async function loadReports() {
            const db = await openDB('SewaSahayakDB', 2);
            if (db.objectStoreNames.contains('reports')) {
                const tx = db.transaction('reports', 'readonly');
                const store = tx.objectStore('reports');
                const allReports = await store.getAll();
                // Sort by timestamp desc
                allReports.sort((a, b) => b.timestamp - a.timestamp);
                setReports(allReports);
            }
        }
        loadReports();
    }, []);

    return (
        <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <h2 className="heading-2">My Reports</h2>
                <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={onClose}>
                    New Report
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                {reports.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
                        <Archive size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                        <p>You haven't submitted any reports yet.</p>
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

                                <h4 style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.25rem' }}>{report.jurisdiction?.portal_name || 'Government Portal'}</h4>

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
        </div>
    );
}
