import React, { useState } from 'react';
import { User, Phone, MapPin, Zap, ShieldCheck, X } from 'lucide-react';

export default function UserProfileForm({ onComplete, onCancel, backendUrl, initialData = {} }) {
    const [formData, setFormData] = useState({
        fullName: initialData.fullName || '',
        phoneNumber: initialData.phoneNumber || '',
        address: initialData.address || '',
        age: initialData.age || '',
        gender: initialData.gender || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.fullName || !formData.phoneNumber || !formData.address) {
            setError('Please fill all mandatory fields to continue.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${backendUrl}/api/auth/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                onComplete(formData);
            } else {
                setError('Failed to save profile. Please try again.');
            }
        } catch {
            setError('Connection error. Check your network.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(5, 5, 8, 0.95)', backdropFilter: 'blur(30px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }}>
            <div style={{
                width: '100%', maxWidth: 500, background: 'rgba(20, 20, 30, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 40,
                padding: '3rem', boxShadow: '0 50px 100px rgba(0,0,0,0.8)',
                animation: 'formIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 24, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#ef4444' }}>
                        <ShieldCheck size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.75rem' }}>Complete Your Profile</h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>We need a few details to verify your identity before you can file reports.</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 16, padding: '1rem', color: '#f43f5e', fontSize: '0.85rem', marginBottom: '2rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="input-group">
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Full Name (Real Identity)</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                            <input
                                placeholder="e.g. Rahul Sharma"
                                className="onboarding-input"
                                value={formData.fullName}
                                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Phone Number</label>
                        <div style={{ position: 'relative' }}>
                            <Phone size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                            <input
                                placeholder="+91 98765 43210"
                                className="onboarding-input"
                                value={formData.phoneNumber}
                                onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Residential Address</label>
                        <div style={{ position: 'relative' }}>
                            <MapPin size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                            <input
                                placeholder="House no, Area, Pincode"
                                className="onboarding-input"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Age</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                            <input
                                placeholder="Age"
                                type="number"
                                className="onboarding-input"
                                value={formData.age}
                                onChange={e => setFormData({ ...formData, age: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Gender</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                            <select
                                className="onboarding-input"
                                style={{ appearance: 'none' }}
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                            >
                                <option value="" disabled>Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        {onCancel && (
                            <button
                                type="button"
                                disabled={loading}
                                onClick={onCancel}
                                style={{
                                    flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 20, padding: '1.2rem', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', transition: '0.3s'
                                }}
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 2, background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                color: 'white', border: 'none', borderRadius: 20, padding: '1.2rem',
                                fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)', transition: '0.3s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {loading ? 'Saving Secret Details...' : <><Zap size={18} fill="white" /> {onCancel ? 'Update Profile' : 'Complete Registration'}</>}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .onboarding-input {
                    width: 100%;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 18px;
                    padding: 1.1rem 1.1rem 1.1rem 3rem;
                    color: white;
                    outline: none;
                    font-size: 1rem;
                    font-family: 'Outfit', sans-serif;
                    transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .onboarding-input:focus {
                    border-color: #ef4444;
                    background: rgba(255,255,255,0.07);
                    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
                }
                @keyframes formIn {
                    from { opacity: 0; transform: translateY(40px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
