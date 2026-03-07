import React from 'react';
import { Shield, Map, Eye, ArrowRight, CloudRain, Car, RefreshCw, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = ({ user }) => {
    return (
        <div className="home-container">
            {/* Hero Section */}
            <section className="hero-section text-center">
                <div className="hero-content">
                    <div className="badge animate-fade-in"><Shield size={14} /> Empowering Citizens</div>
                    <h1 className="hero-title animate-slide-up">
                        AI-Driven <span className="text-gradient">Civic Intelligence</span>
                    </h1>
                    <p className="hero-subtitle animate-slide-up-delay">
                        Turn your daily commute into actionable data. Sewa Sahayak uses your dashcam to detect road hazards in real-time and automatically files complaints to the right government authority.
                    </p>
                    <div className="hero-actions animate-fade-in-delay">
                        {user ? (
                            <Link to="/dashcam" className="btn btn-primary btn-large">
                                <Eye size={20} /> Open AI Dashcam
                            </Link>
                        ) : (
                            <Link to="/login" className="btn btn-primary btn-large">
                                Join the Network <ArrowRight size={20} />
                            </Link>
                        )}
                        <Link to="/dashboard" className="btn btn-secondary btn-large">
                            <Map size={20} /> View Live Intelligence Map
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="features-section">
                <h2 className="section-title">How It Works</h2>
                <div className="features-grid">

                    <div className="feature-card glass-panel-light hover-lift">
                        <div className="feature-icon bg-primary-10"><Car className="text-primary" size={28} /></div>
                        <h3>1. Automatic Capture</h3>
                        <p>Our intelligent PWA runs in your browser as a dashcam. It records short bursts of video without eating up your storage.</p>
                    </div>

                    <div className="feature-card glass-panel-light hover-lift">
                        <div className="feature-icon bg-warning-10"><CloudRain className="text-warning" size={28} /></div>
                        <h3>2. AI Damage Detection</h3>
                        <p>Video chunks are processed securely in the cloud. Advanced vision models spot potholes, cracks, and road degradation instantly.</p>
                    </div>

                    <div className="feature-card glass-panel-light hover-lift">
                        <div className="feature-icon bg-secondary-10"><Layers className="text-secondary" size={28} /></div>
                        <h3>3. Spatial Intelligence</h3>
                        <p>Events are clustered geographically. We map coordinates to specific municipal wards and state jurisdictions automatically.</p>
                    </div>

                    <div className="feature-card glass-panel-light hover-lift">
                        <div className="feature-icon bg-success-10"><RefreshCw className="text-success" size={28} /></div>
                        <h3>4. Auto-Draft Complaints</h3>
                        <p>Amazon Bedrock drafts a highly structured, formal complaint letter and routes it to the correct government portal.</p>
                    </div>

                </div>
            </section>

            {/* Footer */}
            <footer className="home-footer text-center">
                <p className="text-muted text-sm">© {new Date().getFullYear()} Sewa Sahayak. Open Source Civic Tech Initiative.</p>
            </footer>
        </div>
    );
};

export default Home;
