import React, { useState } from 'react';
import { Smartphone, KeyRound, Loader2 } from 'lucide-react';

export default function Auth({ onLogin }) {
    const [step, setStep] = useState('phone'); // phone, otp
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (phone.length < 10) return;
        setIsLoading(true);
        // Simulate AWS Cognito SMS trigger
        await new Promise(res => setTimeout(res, 1000));
        setIsLoading(false);
        setStep('otp');
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length < 4) return;
        setIsLoading(true);
        // Simulate AWS Cognito verification
        await new Promise(res => setTimeout(res, 1000));
        setIsLoading(false);
        onLogin({ phone, token: 'mock-jwt-token-xyz-123' });
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '360px', width: '100%', margin: 'auto', marginTop: '4rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 className="heading-2 text-gradient">Sewa Sahayak</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Citizen civic reporting portal</p>
            </div>

            {step === 'phone' ? (
                <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="input-group">
                        <label className="input-label">Mobile Number</label>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)', padding: '0 1rem' }}>
                            <span style={{ color: 'var(--color-text-muted)', paddingRight: '0.5rem', borderRight: '1px solid #eee' }}>+91</span>
                            <input
                                className="input-field"
                                style={{ border: 'none', background: 'transparent' }}
                                placeholder="10-digit number"
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Smartphone size={20} />}
                        Get OTP
                    </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textAlign: 'center', marginBottom: '0.5rem' }}>
                        OTP sent to +91 {phone}
                    </p>
                    <div className="input-group">
                        <label className="input-label">Enter 6-digit OTP</label>
                        <input
                            className="input-field"
                            style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.25rem', fontWeight: '600' }}
                            placeholder="••••••"
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={e => setOtp(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <KeyRound size={20} />}
                        Verify & Secure Login
                    </button>
                </form>
            )}
        </div>
    );
}
