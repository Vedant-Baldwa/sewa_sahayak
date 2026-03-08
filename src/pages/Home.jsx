import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Map, ChevronRight, Zap, Shield, Server, ArrowUpRight } from 'lucide-react';

const InteractiveScene = () => {
    const sceneRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!sceneRef.current) return;
            // Native DOM calculation for performance
            const x = (e.clientX / window.innerWidth - 0.5) * 20; // Max 20deg tilt
            const y = (e.clientY / window.innerHeight - 0.5) * -20;

            sceneRef.current.style.transform = `rotateX(${y}deg) rotateY(${x}deg)`;
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="scene-3d reveal delay-2">
            <div ref={sceneRef} className="object-3d">
                <div className="layer layer-1"></div>
                <div className="layer layer-2">
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(129,140,248,0.15)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ width: '12px', height: '12px', background: 'rgba(129,140,248,0.4)', borderRadius: '50%' }}></div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', letterSpacing: '2px' }}>VISION_CORE</div>
                        </div>
                        <div style={{ width: '40px', height: '16px', borderRadius: '8px', background: 'rgba(129,140,248,0.15)' }}></div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1, background: 'rgba(129,140,248,0.05)', borderRadius: '8px', border: '1px dashed rgba(129,140,248,0.2)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(90deg, #818cf8, #c084fc)', boxShadow: '0 0 15px rgba(129,140,248,0.5)', animation: 'scan 2s infinite linear' }}></div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ width: '100%', height: '30px', borderRadius: '6px', background: 'linear-gradient(90deg, rgba(129,140,248,0.15), rgba(168,85,247,0.1))' }}></div>
                            <div style={{ width: '80%', height: '20px', borderRadius: '4px', background: 'rgba(129,140,248,0.08)' }}></div>
                            <div style={{ width: '60%', height: '20px', borderRadius: '4px', background: 'rgba(129,140,248,0.04)' }}></div>
                        </div>
                    </div>
                </div>
                <div className="layer layer-3">
                    <div className="glass-panel" style={{
                        padding: '1rem 1.5rem',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff',
                        borderRadius: '100px',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 10px 40px rgba(99,102,241,0.4), 0 0 30px rgba(139,92,246,0.3)'
                    }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }}></div>
                        Live Redaction Active
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }` }}></style>
        </div>
    );
};

const FeatureFeature = ({ icon, title, description, delay }) => (
    <div className={`card-3d reveal`} style={{ animationDelay: `${delay}s`, flex: '1 1 300px' }}>
        <div style={{
            width: '40px', height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))',
            border: '1px solid rgba(129,140,248,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.5rem',
            color: 'var(--color-primary)'
        }}>
            {icon}
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 600 }}>{title}</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>{description}</p>
    </div>
);

const Home = ({ user }) => {
    return (
        <div style={{ color: 'var(--color-text-main)', background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}>

            {/* Top Atmospheric Glow */}
            <div style={{
                position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)',
                width: '800px', height: '500px',
                background: 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.08) 40%, transparent 70%)',
                pointerEvents: 'none', zIndex: 0
            }}></div>

            <main className="app-container" style={{ flex: 1, paddingBottom: '6rem' }}>

                {/* Spacer to push content below fixed navbar */}
                <div style={{ height: '120px' }}></div>

                {/* 1. Typography Heavy Hero Section */}
                <section style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    maxWidth: '800px',
                    margin: '0 auto 6rem auto',
                    position: 'relative',
                    zIndex: 1
                }}>
                    <div className="reveal" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        border: '1px solid rgba(129,140,248,0.25)',
                        background: 'rgba(129,140,248,0.08)',
                        padding: '6px 16px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '500',
                        marginBottom: '2rem',
                        color: 'var(--color-primary)',
                        alignSelf: 'center',
                        maxWidth: '90vw',
                        whiteSpace: 'nowrap'
                    }}>
                        Sahayak System 2.0
                        <ArrowUpRight size={14} color="#818cf8" />
                    </div>

                    <h1 className="reveal delay-1" style={{
                        fontSize: 'clamp(2.5rem, 8vw, 6.5rem)',
                        lineHeight: 1.05,
                        fontWeight: 700,
                        letterSpacing: '-0.04em',
                        marginBottom: '1.5rem',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word'
                    }}>
                        Infrastructure.<br />
                        <span style={{ background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Automated.</span>
                    </h1>

                    <p className="reveal delay-2" style={{
                        color: 'var(--color-text-muted)',
                        fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
                        maxWidth: '560px',
                        marginBottom: '3rem',
                        lineHeight: 1.6
                    }}>
                        A high-performance neural engine that detects road damage, redacts civic privacy data, and routes official infrastructure tickets automatically.
                    </p>

                    <div className="reveal delay-3" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {user ? (
                            <Link to="/dashcam" className="btn-premium">
                                Launch Dashcam <Camera size={16} />
                            </Link>
                        ) : (
                            <Link to="/login" className="btn-premium">
                                Get Started <ChevronRight size={16} />
                            </Link>
                        )}
                        <Link to="/dashboard" className="btn-premium btn-outline">
                            <Map size={16} /> View Network
                        </Link>
                    </div>
                </section>

                {/* 2. Abstract WebGL-style 3D Component */}
                <InteractiveScene />

                {/* 3. High-Contrast Feature Grid */}
                <section style={{ width: '100%', margin: '8rem 0' }}>
                    <div className="reveal" style={{ marginBottom: '4rem' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1rem' }}>Built for scale.</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', maxWidth: '500px' }}>
                            Enterprise-grade components designed to silently bridge the gap between civic problems and automated solutions.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <FeatureFeature
                            icon={<Zap size={20} />}
                            title="Real-time Processing"
                            description="Computer vision algorithms process 60 frames per second on the edge, identifying surface hazards with mathematical precision."
                            delay={0.1}
                        />
                        <FeatureFeature
                            icon={<Shield size={20} />}
                            title="Zero-Latency Privacy"
                            description="Personal data never leaves the device. Faces and license plates are permanently redacted before network transmission."
                            delay={0.2}
                        />
                        <FeatureFeature
                            icon={<Server size={20} />}
                            title="Agentic Routing"
                            description="Autonomous LLMs dynamically scrape, map, and submit JSON payloads into archaic government web portals effortlessly."
                            delay={0.3}
                        />
                    </div>
                </section>

                {/* 4. CTA Section */}
                <section className="reveal" style={{
                    width: '100%',
                    padding: '8rem 2rem',
                    borderRadius: '24px',
                    border: '1px solid rgba(129,140,248,0.15)',
                    background: 'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.03) 50%, transparent 100%)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '300px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.5), transparent)' }}></div>
                    <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>Ready to deploy?</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginBottom: '3rem', maxWidth: '500px' }}>
                        Join thousands of autonomous nodes improving the city grid. Setup takes less than a minute.
                    </p>
                    <Link to="/login" className="btn-premium" style={{ padding: '1rem 3rem', fontSize: '1rem' }}>
                        Initialize Session <ChevronRight size={16} />
                    </Link>
                </section>

            </main>

            <footer style={{
                borderTop: '1px solid rgba(129,140,248,0.1)',
                padding: '3rem 2rem',
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem'
            }}>
                <div className="app-container flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main)' }}>
                        <div style={{ width: '12px', height: '12px', background: 'var(--gradient-btn)', borderRadius: '3px' }}></div>
                        <span style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>Sewa Sahayak Platform</span>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <span style={{ cursor: 'pointer' }}>Documentation</span>
                        <span style={{ cursor: 'pointer' }}>Security</span>
                        <span style={{ cursor: 'pointer' }}>Terms</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
