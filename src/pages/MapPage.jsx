import React from 'react';
import Dashboard from '../components/Dashboard';

const MapPage = () => {
    return (
        <div style={{ padding: '1rem', height: 'calc(100vh - 80px)', display: 'flex' }}>
            <div className="card-3d reveal" style={{
                flex: 1,
                padding: '0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h2 style={{ fontSize: '1.5rem' }}>Intelligence Map</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Real-time road hazard detection across the city</p>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Dashboard />
                </div>
            </div>
        </div>
    );
};

export default MapPage;
