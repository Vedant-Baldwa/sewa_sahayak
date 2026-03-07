import React from 'react';
import { Camera, Video, Shield, RefreshCw, MapPin } from 'lucide-react';
import AudioRecorder from '../components/AudioRecorder';

// Note: the App.jsx context manages captures list, we will lift state to an App level or pass it down

const ReportPage = ({
    onPhotoClick,
    onVideoClick,
    onAudioRecorded,
    isTranscribing,
    isRedacting,
    isAnalyzing,
    isLocating
}) => {
    return (
        <div className="page-container glass-panel animate-fade-in text-center mx-auto" style={{ maxWidth: '600px' }}>
            <h2 className="heading-2 mb-2">Manual Report</h2>
            <p className="text-muted mb-4 text-sm">
                Safely pull over to manually report a civic issue. Use photo, video, or voice to capture the local infrastructure problem.
            </p>

            <div className="action-grid mt-4">
                <button className="btn btn-primary btn-large w-full justify-center" onClick={onPhotoClick}>
                    <Camera size={22} className="mr-2" /> Take Photo
                </button>
                <button className="btn btn-secondary btn-large w-full justify-center" onClick={onVideoClick}>
                    <Video size={22} className="mr-2" /> Record Video
                </button>

                <div className="audio-wrapper w-full mt-2">
                    <AudioRecorder onRecordingComplete={onAudioRecorded} />
                </div>

                {/* Status Indicators */}
                <div className="status-indicators mt-4">
                    {isTranscribing && (
                        <div className="status-badge status-primary">
                            <RefreshCw size={18} className="animate-spin mr-2" />
                            Processing Regional Voice...
                        </div>
                    )}
                    {isRedacting && (
                        <div className="status-badge status-success">
                            <Shield size={18} className="animate-pulse mr-2" />
                            Redacting Personal Info...
                        </div>
                    )}
                    {isAnalyzing && (
                        <div className="status-badge status-secondary">
                            <RefreshCw size={18} className="animate-spin mr-2" />
                            Analyzing Geometry via DB & Bedrock...
                        </div>
                    )}
                    {isLocating && (
                        <div className="status-badge status-neutral">
                            <MapPin size={18} className="animate-pulse mr-2" />
                            Reverse Geocoding GPS...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportPage;
