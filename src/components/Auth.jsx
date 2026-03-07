import React, { useState, useEffect } from 'react';
import { Shield, Lock, Zap, X, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function Auth({ mode, onToggleMode, onClose }) {
    const [consent, setConsent] = useState(false);
    const [shake, setShake] = useState(false);
    const [authError] = useState(() => new URLSearchParams(window.location.search).get('auth_error'));
    const isSignUp = mode === 'signup';

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleCognitoLogin = () => {
        if (!consent) {
            // Shake the consent box so user notices it
            setShake(true);
            setTimeout(() => setShake(false), 600);
            return;
        }
        const url = isSignUp
            ? `${BACKEND_URL}/login?mode=signup`
            : `${BACKEND_URL}/login`;
        window.location.href = url;
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
        >
            {/* Backdrop */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,2,10,0.88)', backdropFilter: 'blur(20px)', animation: 'fadeIn 0.25s ease' }} />

            {/* Glow orbs behind modal */}
            <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', top: '20%', left: '30%', pointerEvents: 'none' }} />

            {/* Modal Card */}
            <div style={{
                position: 'relative', width: '100%', maxWidth: 460, zIndex: 2,
                background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(40px)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 32, padding: '3rem 2.75rem',
                boxShadow: '0 80px 160px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07)',
                animation: 'modalIn 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}>
                {/* Close */}
                {onClose && (
                    <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: '0.2s' }}>
                        <X size={15} />
                    </button>
                )}

                {/* Top gradient strip */}
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.8), transparent)' }} />

                {/* Logo */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 22, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 0 rgba(29,27,90,0.9), 0 24px 60px rgba(99,102,241,0.55)' }}>
                            <Shield size={30} color="white" />
                        </div>
                        <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none', animation: 'pulsGlow 2s ease-in-out infinite' }} />
                    </div>
                </div>

                {/* Heading */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.6rem', background: 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.65) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {isSignUp ? 'Create Your Account' : 'Welcome Back'}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', lineHeight: 1.65 }}>
                        {isSignUp
                            ? 'Join for free — start filing complaints in minutes.'
                            : 'Sign in to resume your sessions and track your complaints.'}
                    </p>
                </div>

                {/* Auth error banner */}
                {authError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1.5rem' }}>
                        <AlertCircle size={16} color="#f43f5e" />
                        <p style={{ fontSize: '0.82rem', color: '#f43f5e', margin: 0 }}>Sign-in failed. Please try again.</p>
                    </div>
                )}

                {/* Consent Section (Modern) */}
                <div
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${shake ? 'rgba(239,68,68,0.5)' : (consent ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)')}`,
                        borderRadius: 16, padding: '1.1rem', marginBottom: '1.5rem', cursor: 'pointer',
                        transition: 'all 0.3s',
                        animation: shake ? 'shake 0.5s ease' : 'none',
                    }}
                    onClick={() => setConsent(v => !v)}
                >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        {/* Custom checkbox */}
                        <div style={{ width: 22, height: 22, minWidth: 22, borderRadius: 7, border: `2px solid ${consent ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`, background: consent ? 'linear-gradient(135deg,var(--primary),var(--primary-dark))' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', marginTop: 1, flexShrink: 0, boxShadow: consent ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none' }}>
                            {consent && <CheckCircle size={14} color="white" fill="white" />}
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: 0, userSelect: 'none' }}>
                            I agree Sewa Sahayak can use my <strong style={{ color: 'rgba(255,255,255,0.8)' }}>location, photos & voice</strong> to file civic complaints on my behalf. Data stays private under India's <span style={{ color: 'var(--primary)', fontWeight: 700 }}>DPDP Act 2023</span>.
                        </p>
                    </div>
                    {!consent && (
                        <p style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, marginTop: '0.75rem', paddingLeft: 34 }}>
                            ↑ Please tick this box to continue
                        </p>
                    )}
                </div>

                {/* CTA Button */}
                <button
                    onClick={handleCognitoLogin}
                    style={{
                        width: '100%', padding: '1.1rem', border: 'none', borderRadius: 16,
                        background: consent
                            ? 'linear-gradient(135deg,var(--primary),var(--primary-dark))'
                            : 'rgba(255,255,255,0.05)',
                        color: consent ? 'white' : 'rgba(255,255,255,0.3)',
                        fontWeight: 800, fontSize: '0.98rem',
                        cursor: 'pointer',   // always pointer — shakes when not consented
                        boxShadow: consent ? '0 8px 30px rgba(239, 68, 68, 0.4)' : 'none',
                        transition: 'all 0.3s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        marginBottom: '1.25rem',
                        position: 'relative', overflow: 'hidden',
                    }}
                    onMouseEnter={e => { if (consent) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(239, 68, 68, 0.5)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; if (consent) e.currentTarget.style.boxShadow = '0 8px 30px rgba(239, 68, 68, 0.4)'; }}
                >
                    {/* Shine sweep on hover */}
                    {consent && <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)', transform: 'skewX(-20deg)', animation: 'shine 3s ease-in-out infinite' }} />}
                    {isSignUp ? <Zap size={18} /> : <Lock size={18} />}
                    {isSignUp ? 'Create Free Account — Sign in with AWS' : 'Sign In Securely via AWS'}
                    {consent && <ArrowRight size={16} style={{ marginLeft: 'auto' }} />}
                </button>

                {/* Toggle */}
                <div style={{ textAlign: 'center' }}>
                    <button onClick={onToggleMode} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.84rem', transition: '0.2s', padding: '0.4rem' }}>
                        {isSignUp ? 'Already a member? ' : 'New here? '}
                        <span style={{ color: '#818cf8', fontWeight: 700 }}>{isSignUp ? 'Sign In' : 'Create a Free Account'}</span>
                    </button>
                </div>

                {/* Footer badges */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: '1.75rem', opacity: 0.25 }}>
                    {[['🔐', 'Cognito SSO'], ['🛡️', 'DPDP 2023'], ['🌏', 'India Region']].map(([icon, label]) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.6rem', fontWeight: 800, letterSpacing: 0.5 }}>
                            <span>{icon}</span>{label}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button onClick={handleLogin} className="btn btn-primary" style={{ width: '100%' }}>
                    <LogIn size={20} />
                    Login with Sewa Sahayak
                </button>
                <button
                    onClick={() => { window.location.href = `${BACKEND_URL}/login/google`; }}
                    className="btn"
                    style={{ width: '100%', backgroundColor: 'white', color: '#757575', border: '1px solid #ddd', fontWeight: 'bold' }}
                >
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}
