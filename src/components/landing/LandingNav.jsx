import React, { useState, useEffect } from 'react';
import { Shield, Menu, X, Sun, Moon, Bot } from 'lucide-react';
import LanguageSelector from '../LanguageSelector';

export default function LandingNav({ onGetStarted, onToggleChat, onToggleTheme, currentTheme, isChatOpen }) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
            transition: 'all 0.3s ease',
            background: scrolled ? 'rgba(5,5,8,0.92)' : 'transparent',
            backdropFilter: scrolled ? 'blur(24px)' : 'none',
            borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
            padding: '0 5%',
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', height: 70, display: 'flex', alignItems: 'center', gap: 32 }}>
                {/* Logo */}
                <a href="#home" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'white', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(99,102,241,0.5)' }}>
                        <Shield size={18} color="white" />
                    </div>
                    Sewa Sahayak
                </a>

                {/* Desktop Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginLeft: 'auto' }} className="nav-desktop">
                    {/* Theme, Language & Chat Tools */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 15, paddingRight: 20, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                        <LanguageSelector inNavbar={true} />
                        <button
                            onClick={onToggleTheme}
                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Switch Theme"
                        >
                            {currentTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        <button
                            onClick={onToggleChat}
                            style={{ background: isChatOpen ? 'rgba(99,102,241,0.1)' : 'transparent', border: 'none', color: isChatOpen ? '#6366f1' : 'rgba(255,255,255,0.5)', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Talk to AI Sahayak"
                        >
                            <Bot size={18} />
                        </button>
                    </div>

                    {[['#features', 'Features'], ['#how-it-works', 'How It Works'], ['#about', 'About']].map(([href, label]) => (
                        <a key={href} href={href} style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500, transition: '0.2s' }}
                            onMouseEnter={e => e.target.style.color = 'white'}
                            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.55)'}
                        >{label}</a>
                    ))}

                    <button onClick={() => onGetStarted('signin')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', padding: '0.5rem 1rem', borderRadius: 10, transition: '0.2s' }}
                        onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                    >Sign In</button>

                    <button onClick={() => onGetStarted('signup')} style={{
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none',
                        padding: '0.6rem 1.5rem', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
                        boxShadow: '0 4px 20px rgba(99,102,241,0.4)', transition: '0.2s',
                    }}
                        onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
                    >Get Started Free</button>
                </div>

                {/* Mobile hamburger */}
                <button onClick={() => setMobileOpen(v => !v)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'none' }} className="nav-hamburger">
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div style={{ background: 'rgba(8,8,14,0.98)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem 5%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <LanguageSelector inNavbar={true} />
                        <button
                            onClick={onToggleTheme}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: 44, height: 44, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            {currentTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                    </div>
                    {[['#features', 'Features'], ['#how-it-works', 'How It Works']].map(([href, label]) => (
                        <a key={href} href={href} onClick={() => setMobileOpen(false)} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '1rem', fontWeight: 500 }}>{label}</a>
                    ))}
                    <button onClick={() => { onGetStarted('signin'); setMobileOpen(false); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.9rem', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>Sign In</button>
                    <button onClick={() => { onGetStarted('signup'); setMobileOpen(false); }} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', padding: '0.9rem', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>Get Started Free</button>
                </div>
            )}

            <style>{`
                @media (max-width: 768px) {
                    .nav-desktop { display: none !important; }
                    .nav-hamburger { display: flex !important; }
                }
            `}</style>
        </nav>
    );
}
