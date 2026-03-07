import React from 'react';
import DashcamRecorder from '../components/DashcamRecorder';

const DashcamPage = () => {
    return (
        <div className="page-container glass-panel animate-fade-in text-center">
            <h2 className="heading-2 text-primary">Sewa Sahayak Dashcam</h2>
            <p className="text-muted text-sm mb-4">
                Mount your phone on the dashboard safely. The PWA will record continuously in 5-second chunks, analyze video frames in the background, and drop location pins automatically.
            </p>

            <div className="dashcam-wrapper">
                <DashcamRecorder />
            </div>

        </div>
    );
};

export default DashcamPage;
