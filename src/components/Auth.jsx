import React from 'react';
import { LogIn } from 'lucide-react';

export default function Auth() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const handleLogin = () => {
        window.location.href = `${BACKEND_URL}/login`;
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '360px', width: '100%', margin: 'auto', marginTop: '4rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 className="heading-2 text-gradient">Sewa Sahayak</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Citizen civic reporting portal</p>
            </div>

            <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
                Please log in to submit or view civic issues in your area.
            </p>

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
