import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FileText, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';

// Fix for default Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
        case 'severe': return 'var(--color-danger)';
        case 'moderate': return 'var(--color-warning)';
        default: return 'var(--color-success)';
    }
};

const Dashboard = () => {
    const [clusters, setClusters] = useState([]);
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [draftRequestStatus, setDraftRequestStatus] = useState(null); // 'idle' | 'generating' | 'done'
    const [generatedDraft, setGeneratedDraft] = useState(null);

    useEffect(() => {
        fetchClusters();
    }, []);

    const fetchClusters = async () => {
        try {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
            const res = await fetch(`${BACKEND_URL}/api/clusters`);
            const data = await res.json();
            setClusters(data.clusters || []);
        } catch (error) {
            console.error("Failed to fetch clusters:", error);
        }
    };

    const handleGenerateComplaint = async () => {
        if (!selectedCluster) return;

        setDraftRequestStatus('generating');
        try {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
            const res = await fetch(`${BACKEND_URL}/api/reports/generate_complaint`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedCluster)
            });
            const data = await res.json();
            setGeneratedDraft(data);
            setDraftRequestStatus('done');
        } catch (error) {
            console.error("Draft generation failed", error);
            setDraftRequestStatus('idle');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
            <div style={{ padding: '0 1rem' }}>
                <h2 className="heading-3" style={{ marginBottom: '0.2rem' }}>Damage Intelligence Map</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Aggregated AI insights from crowdsourced dashcams.
                </p>
            </div>

            <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden', margin: '0 1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <MapContainer center={[23.0225, 72.5714]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />

                    {clusters.map((cluster) => {
                        const customMarker = L.divIcon({
                            className: 'custom-marker',
                            html: `<div style="background-color: ${getSeverityColor(cluster.severity)}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                        });

                        return (
                            <Marker
                                key={cluster.cluster_id}
                                position={[cluster.latitude, cluster.longitude]}
                                icon={customMarker}
                                eventHandlers={{
                                    click: () => {
                                        setSelectedCluster(cluster);
                                        setGeneratedDraft(null);
                                        setDraftRequestStatus('idle');
                                    }
                                }}
                            >
                                <Popup>
                                    <div style={{ padding: '4px', textAlign: 'center' }}>
                                        <b style={{ textTransform: 'capitalize', color: getSeverityColor(cluster.severity) }}>
                                            {cluster.severity} Damage
                                        </b><br />
                                        {cluster.event_count} reports clustered
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>

            {/* Cluster Details Panel */}
            {selectedCluster && (
                <div className="glass-panel" style={{ margin: '0 1rem 1rem', padding: '1rem', animation: 'slideUp 0.3s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={18} />
                                {selectedCluster.road_name}
                            </h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                Hotspot ID: {selectedCluster.cluster_id.split('_')[1]}
                            </p>
                        </div>
                        <span style={{
                            background: getSeverityColor(selectedCluster.severity),
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                        }}>
                            {selectedCluster.severity}
                        </span>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '600' }}>Aggregated Reports</p>
                            <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{selectedCluster.event_count}</p>
                        </div>
                        <div style={{ width: '1px', background: 'rgba(0,0,0,0.1)' }} />
                        <div style={{ flex: 2 }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '600' }}>Representative Clip</p>
                            <a href={selectedCluster.representative_clip} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                View Evidence
                            </a>
                        </div>
                    </div>

                    {!generatedDraft ? (
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                            onClick={handleGenerateComplaint}
                            disabled={draftRequestStatus === 'generating'}
                        >
                            {draftRequestStatus === 'generating' ? (
                                <>Processing with Bedrock Nova Pro...</>
                            ) : (
                                <><FileText size={18} /> Auto-Draft Complaint</>
                            )}
                        </button>
                    ) : (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', marginBottom: '0.5rem' }}>
                                <ShieldCheck size={18} />
                                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Draft Ready for {generatedDraft.suggested_authority}</span>
                            </div>
                            <pre style={{
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'inherit',
                                fontSize: '0.85rem',
                                color: 'var(--color-text-main)',
                                margin: 0,
                                maxHeight: '150px',
                                overflowY: 'auto',
                                padding: '0.5rem',
                                background: 'white',
                                borderRadius: '4px',
                                border: '1px solid #eee'
                            }}>
                                {generatedDraft.generated_draft}
                            </pre>
                            <button className="btn btn-success" style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem' }}>
                                Submit to Portal
                            </button>
                        </div>
                    )}
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .leaflet-container { z-index: 1; }
                `
            }} />
        </div>
    );
};

export default Dashboard;
