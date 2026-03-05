import React from 'react';
import { Bot, Shield, Globe, Mic, Users, Lock, ArrowRight } from 'lucide-react';

const FEATURES = [
    {
        icon: <Bot size={26} />, color: '#818cf8', glow: 'rgba(99,102,241,0.25)',
        tag: 'AI Agent',
        title: 'We Handle the Forms for You',
        desc: 'After you approve your complaint, our AI opens the government website, fills every field, and submits it — you never touch a form.',
    },
    {
        icon: <Shield size={26} />, color: '#c084fc', glow: 'rgba(139,92,246,0.25)',
        tag: 'Bedrock AI',
        title: 'AI Reads Your Evidence',
        desc: 'Upload a photo or video. Bedrock AI identifies the problem, estimates how serious it is, and prepares all the details needed for the complaint.',
    },
    {
        icon: <Globe size={26} />, color: '#22d3ee', glow: 'rgba(6,182,212,0.25)',
        tag: 'Location',
        title: 'Files to the Right Office',
        desc: 'Your GPS location is matched to the correct government office — city, state, or central — so your complaint always reaches the right people.',
    },
    {
        icon: <Mic size={26} />, color: '#fbbf24', glow: 'rgba(245,158,11,0.25)',
        tag: 'Voice & Text',
        title: 'Speak or Type, Any Language',
        desc: 'Record a voice note in Hindi, Tamil, Telugu, Bengali, or 7 other languages. Or just type. We convert it into a proper written complaint.',
    },
    {
        icon: <Users size={26} />, color: '#4ade80', glow: 'rgba(34,197,94,0.25)',
        tag: 'You Approve First',
        title: 'Nothing Submitted Without You',
        desc: 'Before anything is sent, you see the full draft complaint and confirm it. You are always in control — the AI only acts after your go-ahead.',
    },
    {
        icon: <Lock size={26} />, color: '#f87171', glow: 'rgba(244,63,94,0.25)',
        tag: 'Privacy',
        title: 'Faces & Plates Are Hidden',
        desc: 'Any faces or vehicle number plates in your photos are automatically blurred before your evidence is stored or shared with anyone.',
    },
];

export default function FeatureGrid({ onPageAction }) {
    return (
        <section id="features" style={{ padding: '8rem 5%', position: 'relative', overflow: 'hidden' }}>
            {/* Section background gradient */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 10% 20%, rgba(99,102,241,0.05) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(192,132,252,0.05) 0%, transparent 50%)', pointerEvents: 'none' }} />

            <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
                    <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, padding: '6px 18px', fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 800, letterSpacing: 1.5, marginBottom: '1.5rem', textTransform: 'uppercase' }}>
                        Platform Capabilities
                    </div>
                    <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '1.5rem', lineHeight: 1.05 }}>
                        Engineered for Indians.<br />
                        <span style={{ background: 'linear-gradient(135deg,#818cf8 0%,#c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Powered by Amazon Web Services.</span>
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                        Sewa Sahayak replaces slow manual reporting with high-speed AI automation, ensuring your voice reaches the right government portal.
                    </p>
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
                    {FEATURES.map((f, i) => (
                        <div key={i}
                            onClick={() => onPageAction && onPageAction('signup')}
                            style={{
                                background: 'rgba(15,15,25,0.4)', backdropFilter: 'blur(30px)',
                                border: '1px solid rgba(255,255,255,0.06)', borderRadius: 32, padding: '3rem 2.5rem',
                                transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                display: 'flex', flexDirection: 'column'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = `${f.color}33`;
                                e.currentTarget.style.transform = 'translateY(-12px) scale(1.02)';
                                e.currentTarget.style.boxShadow = `0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px ${f.color}22`;
                                e.currentTarget.querySelector('.feature-icon').style.transform = 'scale(1.1) rotate(5deg)';
                                e.currentTarget.querySelector('.feature-icon').style.boxShadow = `0 15px 30px ${f.color}44`;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                                e.currentTarget.querySelector('.feature-icon').style.transform = 'scale(1) rotate(0deg)';
                                e.currentTarget.querySelector('.feature-icon').style.boxShadow = 'none';
                            }}
                        >
                            {/* Ambient Glow */}
                            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '150px', height: '150px', borderRadius: '50%', background: f.glow, filter: 'blur(50px)', opacity: 0.1, pointerEvents: 'none' }} />

                            {/* Icon Wrapper */}
                            <div className="feature-icon" style={{
                                width: 68, height: 68, borderRadius: 22, background: `${f.color}12`,
                                border: `1px solid ${f.color}25`, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', color: f.color, marginBottom: '2.5rem',
                                transition: 'all 0.4s ease'
                            }}>
                                {React.cloneElement(f.icon, { size: 30 })}
                            </div>

                            {/* Tag */}
                            <div style={{ alignSelf: 'flex-start', fontSize: '0.65rem', fontWeight: 900, letterSpacing: 1.2, color: f.color, background: `${f.color}10`, border: `1px solid ${f.color}20`, padding: '5px 12px', borderRadius: 99, marginBottom: '1.2rem', textTransform: 'uppercase' }}>
                                {f.tag}
                            </div>

                            <h3 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '1rem', lineHeight: 1.3, color: 'white' }}>{f.title}</h3>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', lineHeight: 1.8, marginBottom: 'auto' }}>{f.desc}</p>

                            {/* Learn More hint */}
                            <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: 8, color: f.color, fontSize: '0.85rem', fontWeight: 800, opacity: 0, transition: '0.3s' }} className="learn-more">
                                Get Started <ArrowRight size={16} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .feature-card:hover .learn-more {
                    opacity: 1 !important;
                }
            `}</style>
        </section>
    );
}
