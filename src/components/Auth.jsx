import React from 'react';
import { LogIn } from 'lucide-react';

export default function Auth() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const [consent, setConsent] = React.useState(false);

    const handleLogin = () => {
        if (!consent) {
            alert("Please accept the terms to proceed.");
            return;
        }
        window.location.href = `${BACKEND_URL}/login`;
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '90%', margin: 'auto', marginTop: '10vh', textAlign: 'center' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="heading-2 text-gradient" style={{ fontSize: '2.5rem' }}>Sewa Sahayak</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Intelligent Civic Reporting Assistant</p>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <input
                        type="checkbox"
                        id="dpdp-consent"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        style={{ marginTop: '4px' }}
                    />
                    <label htmlFor="dpdp-consent" style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', lineHeight: '1.4' }}>
                        I consent to the collection and processing of my location, media, and voice data as per <strong>DPDP Act 2023</strong> for the purpose of civic reporting.
                    </label>
                </div>
            </div>

            <button
                onClick={handleLogin}
                className="btn btn-primary"
                style={{ width: '100%', opacity: consent ? 1 : 0.6 }}
                disabled={!consent}
            >
                <LogIn size={20} />
                Sign In to Platform
            </button>
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Powered by Amazon Bedrock & Nova Act
            </p>
        </div>
    );
}
