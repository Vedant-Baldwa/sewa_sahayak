import React from 'react';
import { Camera, Bot, Shield, FileText, Globe, CheckCircle } from 'lucide-react';

const STEPS = [
    { n: '01', icon: <Camera size={22} />, color: '#818cf8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)', title: 'Upload Your Evidence', desc: 'Take a photo, record a video, or speak a voice note about what you saw. You can also just type it out. Works in 10+ Indian languages.' },
    { n: '02', icon: <Bot size={22} />, color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)', title: 'AI Reads It Automatically', desc: 'Our AI looks at your photo or listens to your voice. It figures out what the problem is — pothole, broken drainage, street light out — and how serious it is.' },
    { n: '03', icon: <Shield size={22} />, color: '#22d3ee', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.25)', title: 'Privacy Protected', desc: 'Any faces or vehicle number plates in your evidence are automatically blurred. Nothing identifiable is stored or shared.' },
    { n: '04', icon: <FileText size={22} />, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)', title: 'Review the Complaint Draft', desc: 'You see the complete complaint before anything is submitted — location, description, severity, the works. Edit if you want, then approve.' },
    { n: '05', icon: <Globe size={22} />, color: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)', title: 'AI Submits It for You', desc: 'Our AI opens the correct government website, fills every form field, and submits the complaint — without you touching a single webpage.' },
    { n: '✓', icon: <CheckCircle size={22} />, color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.25)', title: 'You Get Your Complaint Number', desc: 'You receive a unique acknowledgement number. Use it to check the status of your complaint anytime from your dashboard.' },
];

export default function HowItWorks({ onPageAction }) {
    return (
        <section id="how-it-works" style={{ padding: '8rem 5%', position: 'relative' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                    <div style={{ display: 'inline-block', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.25)', borderRadius: 99, padding: '5px 16px', fontSize: '0.7rem', color: '#c084fc', fontWeight: 800, letterSpacing: 1, marginBottom: '1.25rem' }}>
                        HOW IT WORKS
                    </div>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '1.25rem', lineHeight: 1.1 }}>
                        Photo in. Complaint filed.<br />
                        <span style={{ background: 'linear-gradient(135deg,#c084fc,#f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Under 3 minutes.</span>
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
                        Six steps, all handled by the platform. You only do two things: take a photo and click "Approve".
                    </p>
                </div>

                {/* Steps Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {STEPS.map((s) => (
                        <div key={s.n} style={{
                            background: 'rgba(10,10,18,0.6)', backdropFilter: 'blur(20px)',
                            border: `1px solid ${s.border}`, borderRadius: 24, padding: '2rem',
                            transition: 'all 0.3s', position: 'relative',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 20px 60px rgba(0,0,0,0.4)`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div style={{ width: 50, height: 50, borderRadius: 16, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                    {s.icon}
                                </div>
                                <span style={{ fontSize: '2.5rem', fontWeight: 900, color: s.color, opacity: 0.12, lineHeight: 1 }}>{s.n}</span>
                            </div>
                            <h3 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.75rem', lineHeight: 1.35 }}>{s.title}</h3>
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', lineHeight: 1.75 }}>{s.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Bottom CTA strip */}
                <div style={{ marginTop: '4rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(192,132,252,0.08))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: '2.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Ready to file your first complaint?</p>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', marginBottom: '2rem' }}>It takes less than 3 minutes. No paperwork, no websites, no queues.</p>
                    <button onClick={() => onPageAction('signup')} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 10,
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none',
                        padding: '1rem 2.5rem', borderRadius: 14, fontWeight: 800, fontSize: '1rem',
                        boxShadow: '0 8px 30px rgba(99,102,241,0.45)', transition: '0.2s', cursor: 'pointer',
                    }}>Get Started — Free</button>
                </div>
            </div>
        </section>
    );
}
