import React from 'react';
import Dashboard from '../components/Dashboard';

const MapPage = () => {
    return (
        <div className="page-container glass-panel animate-fade-in map-page-layout">
            <div className="map-page-body">
                <Dashboard />
            </div>
        </div>
    );
};

export default MapPage;
