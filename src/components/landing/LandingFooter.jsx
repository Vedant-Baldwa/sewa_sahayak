import React from 'react';
import { Shield } from 'lucide-react';

export default function LandingFooter({ onPageAction }) {
    return (
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '5rem 5% 3rem', background: 'rgba(3,3,6,0.8)' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '4rem' }} className="footer-grid">
                    {/* Brand */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.1rem', marginBottom: 16 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                                <Shield size={17} color="white" />
                            </div>
                            Sewa Sahayak
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.86rem', lineHeight: 1.75, maxWidth: 260 }}>
                            File civic complaints in under 3 minutes using AI. Built for citizens of India, powered by AWS.
                        </p>
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                            {['Bedrock', 'Rekognition', 'Transcribe', 'Nova Act', 'Cognito'].map(s => (
                                <span key={s} style={{ fontSize: '0.6rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>AWS {s}</span>
                            ))}
                        </div>
                    </div>

                    {[
                        { title: 'Platform', links: ['Dashboard', 'My Reports', 'Settings'], actions: ['signup', 'signup', 'signin'] },
                        { title: 'Legal', links: ['Privacy Policy', 'DPDP Act 2023', 'Terms of Use'], actions: [null, null, null] },
                        { title: 'Support', links: ['FAQ', 'Contact Us', 'Report a Bug'], actions: [null, null, null] },
                    ].map(col => (
                        <div key={col.title}>
                            <h4 style={{ fontWeight: 800, fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginBottom: 16, letterSpacing: 0.5 }}>{col.title}</h4>
                            {col.links.map((l, i) => (
                                <a key={l} href="#" onClick={(e) => {
                                    if (col.actions[i] && onPageAction) {
                                        e.preventDefault();
                                        onPageAction(col.actions[i]);
                                    }
                                }} style={{ display: 'block', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: 10, transition: '0.2s' }}
                                    onMouseEnter={e => e.target.style.color = 'white'}
                                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
                                >{l}</a>
                            ))}
                        </div>
                    ))}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>© 2025 Sewa Sahayak · Government portal trademarks belong to their respective owners.</p>
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>Made with ❤️ for Indian citizens · AWS Hackathon 2025</p>
                </div>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .footer-grid { grid-template-columns: 1fr 1fr !important; }
                    .footer-grid > div:first-child { grid-column: 1 / -1; }
                }
                @media (max-width: 480px) {
                    .footer-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </footer>
    );
}
