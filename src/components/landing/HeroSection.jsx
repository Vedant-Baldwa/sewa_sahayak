import React, { useEffect, useRef } from 'react';
import { Camera, Shield, Globe, Bot, CheckCircle, ArrowRight, Zap, FileText, Cpu, Lock, Terminal } from 'lucide-react';

// 6-step workflow matching the architecture
const WORKFLOW_STEPS = [
    { icon: <Camera size={13} />, text: 'Take photo or record voice', done: true },
    { icon: <Bot size={13} />, text: 'AI reads damage & severity', done: true },
    { icon: <Shield size={13} />, text: 'Faces & plates auto-blurred', done: true },
    { icon: <FileText size={13} />, text: 'Complaint drafted for your review', active: true },
    { icon: <Globe size={13} />, text: 'AI files on gov portal for you', done: false },
    { icon: <CheckCircle size={13} />, text: 'You get your complaint number', done: false },
];

const AWS_PILLS = [
    { label: 'Amazon Bedrock', color: '#818cf8' },
    { label: 'Nova Act', color: '#c084fc' },
    { label: 'Rekognition', color: '#22d3ee' },
    { label: 'Transcribe', color: '#fbbf24' },
    { label: 'AWS Cognito', color: '#4ade80' },
    { label: 'DynamoDB', color: '#f87171' },
];

export default function HeroSection({ heroRef, onGetStarted, onToggleChat }) {
    const floatingRef = useRef(null);

    // Parallax on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (floatingRef.current) {
                const s = window.scrollY;
                floatingRef.current.style.transform = `translateY(${s * 0.08}px)`;
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section ref={heroRef} id="home" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', paddingTop: 70 }}>

            {/* ── Deep gradient background */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 15% 50%, rgba(239, 68, 68, 0.15) 0%, transparent 55%), radial-gradient(ellipse 55% 50% at 85% 40%, rgba(99,102,241,0.12) 0%, transparent 55%), radial-gradient(ellipse 40% 40% at 50% 100%, rgba(244,114,182,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* ── Grid dots */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

            {/* ── Floating decorative icons (same as original but purple palette) */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '18%', left: '3%', animation: 'floatIcon 9s ease-in-out infinite', opacity: 0.15 }}><Cpu size={44} color="#818cf8" /></div>
                <div style={{ position: 'absolute', top: '68%', left: '12%', animation: 'floatIcon 12s ease-in-out 2s infinite', opacity: 0.1 }}><Lock size={36} color="#c084fc" /></div>
                <div style={{ position: 'absolute', top: '25%', right: '7%', animation: 'floatIcon 11s ease-in-out 4s infinite', opacity: 0.1 }}><Terminal size={40} color="#22d3ee" /></div>
                <div style={{ position: 'absolute', top: '62%', right: '3%', animation: 'floatIcon 8s ease-in-out 6s infinite', opacity: 0.12 }}><Zap size={50} color="#fbbf24" /></div>
            </div>

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 5%', width: '100%', display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '5rem', alignItems: 'center', zIndex: 2, position: 'relative' }} className="hero-grid">

                {/* ── LEFT: Text */}
                <div style={{ animation: 'heroFadeUp 0.9s cubic-bezier(0.16,1,0.3,1) both' }}>

                    {/* Badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 99, padding: '6px 16px', marginBottom: '2rem' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 10px #6366f1', animation: 'dotPulse 2s infinite' }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a5b4fc', letterSpacing: 1 }}>BUILT ON AWS · LIVE NOW</span>
                    </div>

                    {/* Headline — plain English, not jargon */}
                    <h1 style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.04em', marginBottom: '1.75rem' }}>
                        Report Road Damage
                        <br />
                        <span style={{ background: 'linear-gradient(135deg,var(--primary) 0%,var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            in Under 3 Minutes.
                        </span>
                    </h1>

                    <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.78, marginBottom: '3rem', maxWidth: 500 }}>
                        Take a photo or record a voice note. Our AI reads it, writes the complaint, routes it to the right government office, and submits it — <strong style={{ color: 'white', fontWeight: 800 }}>all automatically.</strong> No forms, no websites, no queues.
                    </p>

                    {/* CTA Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
                        <button
                            onClick={() => onGetStarted('signup')}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', color: 'white', border: 'none', padding: '1.1rem 2.2rem', borderRadius: 16, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 0 var(--primary-dark), 0 20px 50px rgba(239, 68, 68, 0.4)', transition: '0.1s', transform: 'translateY(0)' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 0 var(--primary-dark), 0 28px 60px rgba(239, 68, 68, 0.5)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 0 var(--primary-dark), 0 20px 50px rgba(239, 68, 68, 0.4)'; }}
                            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(7px)'; e.currentTarget.style.boxShadow = '0 3px 0 var(--primary-dark), 0 10px 20px rgba(239, 68, 68, 0.3)'; }}
                            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                        >
                            <Zap size={18} fill="white" /> Start Reporting — It's Free
                        </button>
                        <button
                            onClick={() => onToggleChat()}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)', padding: '1.1rem 1.8rem', borderRadius: 16, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: '0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                        >
                            <Bot size={18} /> Ask AI Assistant
                        </button>
                    </div>

                    {/* AWS Pills */}
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', opacity: 0.65 }}>
                        {AWS_PILLS.map(({ label, color }) => (
                            <span key={label} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color, transition: '0.2s' }}>
                                {label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ── RIGHT: 3D Stacked Card Mockup (original layout, new copy) */}
                <div ref={floatingRef} style={{ position: 'relative', height: 520, animation: 'heroFadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s both' }} className="hero-visual">

                    {/* ── Main agent card */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: 340,
                        background: 'rgba(10,10,22,0.75)', backdropFilter: 'blur(30px)',
                        border: '1px solid rgba(99,102,241,0.25)', borderRadius: 28, padding: '1.6rem',
                        boxShadow: '0 50px 120px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)',
                        transform: 'perspective(1000px) rotateY(-16deg) rotateX(7deg) translateZ(40px)',
                        animation: 'floatMain 6s ease-in-out infinite',
                        zIndex: 5,
                    }}>
                        {/* Card header */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: '1.4rem', paddingBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.55)', position: 'relative' }}>
                                <Bot size={22} color="white" />
                                <div style={{ position: 'absolute', inset: -4, borderRadius: 17, border: '2px solid rgba(99,102,241,0.4)', animation: 'pingRing 2.5s ease-in-out infinite' }} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 2 }}>Sahayak AI</div>
                                <div style={{ fontSize: '0.6rem', color: '#818cf8', fontWeight: 800, letterSpacing: 1 }}>● WORKING ON YOUR COMPLAINT</div>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                                {['#f43f5e', '#fbbf24', '#22c55e'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
                            </div>
                        </div>

                        {/* Steps */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {WORKFLOW_STEPS.map((step, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 11,
                                    background: step.active ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${step.active ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                                    opacity: step.done && !step.active ? 0.45 : 1,
                                    position: 'relative', overflow: 'hidden',
                                }}>
                                    <span style={{ color: step.done ? '#4ade80' : step.active ? '#818cf8' : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                                        {step.done ? <CheckCircle size={13} /> : step.icon}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: step.active ? '#e0e7ff' : 'rgba(255,255,255,0.5)' }}>{step.text}</span>
                                    {step.active && <div style={{ position: 'absolute', bottom: 0, left: 0, height: 2, background: 'linear-gradient(90deg,#6366f1,#a78bfa)', animation: 'barFill 2.5s ease-in-out infinite' }} />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Mini stats card (bottom right) */}
                    <div style={{
                        position: 'absolute', bottom: 10, right: -10, width: 200,
                        background: 'rgba(10,10,22,0.8)', backdropFilter: 'blur(25px)',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 22, padding: '1.25rem',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)',
                        transform: 'perspective(1000px) rotateY(-10deg) rotateX(-5deg) translateZ(80px)',
                        animation: 'floatMini 7s ease-in-out 1.2s infinite',
                        zIndex: 6,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            {[['50+', 'Portals'], ['99%', 'Success']].map(([v, l]) => (
                                <div key={l}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#818cf8' }}>{v}</div>
                                    <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 0.5 }}>{l}</div>
                                </div>
                            ))}
                        </div>
                        {/* Mini bar chart */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36, marginTop: 8 }}>
                            {[40, 65, 45, 85, 60, 90, 100].map((h, i) => (
                                <div key={i} style={{ flex: 1, height: `${h}%`, background: `rgba(99,102,241,${0.3 + i * 0.1})`, borderRadius: '3px 3px 0 0', transition: '0.3s' }} />
                            ))}
                        </div>
                    </div>

                    {/* ── Security badge card (mid-right overlap) */}
                    <div style={{
                        position: 'absolute', top: 155, right: -25,
                        background: 'rgba(10,10,22,0.8)', backdropFilter: 'blur(25px)',
                        border: '1px solid rgba(74,222,128,0.25)', borderRadius: 16,
                        padding: '0.7rem 1.1rem',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(74,222,128,0.1)',
                        transform: 'perspective(1000px) rotateY(-20deg) translateZ(-30px)',
                        animation: 'floatBadge 9s ease-in-out 2s infinite',
                        zIndex: 4, display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <Shield size={16} color="#4ade80" />
                        <div>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#4ade80', letterSpacing: 0.5 }}>PRIVACY PROTECTED</div>
                            <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>DPDP 2023 · AES-256</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom fade */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to bottom, transparent, var(--bg))', pointerEvents: 'none' }} />

            <style>{`
                @keyframes heroFadeUp { from { opacity:0; transform: translateY(50px); } to { opacity:1; transform: translateY(0); } }
                @keyframes floatIcon { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(15px,-25px) rotate(180deg); } }
                @keyframes dotPulse { 0%,100% { box-shadow: 0 0 6px #6366f1; } 50% { box-shadow: 0 0 16px #6366f1; } }
                @keyframes pingRing { 0% { transform: scale(1); opacity:.6; } 100% { transform: scale(1.55); opacity:0; } }
                @keyframes barFill { 0% { width:0; } 100% { width:100%; } }
                @keyframes floatMain { 0%,100% { transform: perspective(1000px) rotateY(-16deg) rotateX(7deg) translateZ(40px) translateY(0); } 50% { transform: perspective(1000px) rotateY(-14deg) rotateX(5deg) translateZ(40px) translateY(-16px); } }
                @keyframes floatMini { 0%,100% { transform: perspective(1000px) rotateY(-10deg) rotateX(-5deg) translateZ(80px) translateY(0); } 50% { transform: perspective(1000px) rotateY(-8deg) rotateX(-3deg) translateZ(80px) translateY(12px); } }
                @keyframes floatBadge { 0%,100% { transform: perspective(1000px) rotateY(-20deg) translateZ(-30px) translateY(0); } 50% { transform: perspective(1000px) rotateY(-18deg) translateZ(-30px) translateY(-10px); } }
                @media (max-width: 960px) {
                    .hero-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
                    .hero-visual { display: none !important; }
                }
            `}</style>
        </section>
    );
}
