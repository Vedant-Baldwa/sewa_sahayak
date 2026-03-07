import React from 'react';
import { Video, Shield, RefreshCw, MapPin, Upload } from 'lucide-react';

const ReportPage = ({
    onVideoClick,
    isRedacting,
    isAnalyzing,
    isLocating
}) => {
    return (
        <div className="page-container glass-panel animate-fade-in text-center mx-auto" style={{ maxWidth: '600px' }}>
            <h2 className="heading-2 mb-2">Manual Upload</h2>
            <p className="text-muted mb-4 text-sm">
                Upload a previously recorded dashcam or road video.
                The AI pipeline will segment, detect potholes with YOLOv8, and route to the correct government portal.
            </p>

            <div className="action-grid mt-4">
                <button className="btn btn-primary btn-large w-full justify-center" onClick={onVideoClick}>
                    <Upload size={22} className="mr-2" /> Upload Road Video
                </button>

                {/* Status Indicators */}
                <div className="status-indicators mt-4">
                    {isRedacting && (
                        <div className="status-badge status-success">
                            <Shield size={18} className="animate-pulse mr-2" />
                            Redacting Personal Info...
                        </div>
                    )}
                    {isAnalyzing && (
                        <div className="status-badge status-secondary">
                            <RefreshCw size={18} className="animate-spin mr-2" />
                            Segmenting &amp; Analyzing with YOLOv8 on SageMaker...
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
