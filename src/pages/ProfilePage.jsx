import React from 'react';
import MyReports from '../components/MyReports';
import { User, Calendar, Shield } from 'lucide-react';

const ProfilePage = ({ user }) => {
    const memberSince = user?.created_at
        ? new Date(parseInt(user.created_at) * 1000).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        : "March 2026";

    return (
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                {/* Profile Card */}
                <div className="card-3d reveal" style={{ height: 'fit-content' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            margin: '0 auto 1.5rem',
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            boxShadow: '0 0 30px var(--color-primary-glow)'
                        }}>
                            {user?.name ? user.name.charAt(0).toUpperCase() : <User size={40} />}
                        </div>

                        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{user?.name || "Citizen Reporter"}</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{user?.email}</p>

                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0.5rem 1rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '100px',
                            fontSize: '0.85rem'
                        }}>
                            <Calendar size={14} className="text-primary" /> Member Since {memberSince}
                        </div>
                    </div>

                    <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                            <Shield className="text-success" size={20} />
                            <div>
                                <h4 style={{ fontSize: '0.9rem' }}>Civic Identity Verified</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Your reports are prioritized for review.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reports History */}
                <div className="card-3d reveal delay-1" style={{ minHeight: '500px' }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.25rem' }}>Recent Reports</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>Sync Active</span>
                    </div>
                    <MyReports />
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
