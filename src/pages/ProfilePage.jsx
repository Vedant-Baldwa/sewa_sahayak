import React, { useEffect, useState } from 'react';
import MyReports from '../components/MyReports';
import { User, Activity, MapPin, Shield, Calendar, Loader2 } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const ProfilePage = ({ user }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/profile/stats`, {
                    credentials: "include"
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.warn("Could not load profile stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const reportCount = stats?.report_count || 0;
    const areasMapped = stats?.areas_mapped || 0;
    const contributorLevel = stats?.contributor_level || 1;
    const memberSince = stats?.member_since
        ? new Date(parseInt(stats.member_since) * 1000).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        : null;

    return (
        <div className="page-container animate-fade-in max-w-lg mx-auto">

            {/* Profile Header */}
            <div className="glass-panel text-center mb-4 p-4">
                <div className="avatar-circle mx-auto mb-2 bg-gradient-brand flex-center text-white" style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User size={30} />}
                </div>
                <h2 className="heading-3 mb-1">{user?.name || stats?.name || "Citizen Reporter"}</h2>
                <p className="text-sm text-muted">{user?.email || stats?.email}</p>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-text-muted)' }} />
                    </div>
                ) : (
                    <>
                        <div className="flex justify-center gap-4 mt-4" style={{ flexWrap: 'wrap' }}>
                            <div className="stat-badge flex items-center gap-2 bg-primary-10 p-2 rounded text-sm text-primary">
                                <Shield size={16} /> Level {contributorLevel} Contributor
                            </div>
                            <div className="stat-badge flex items-center gap-2 bg-success-10 p-2 rounded text-sm text-success">
                                <MapPin size={16} /> {areasMapped} Areas Mapped
                            </div>
                            <div className="stat-badge flex items-center gap-2 p-2 rounded text-sm" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--color-secondary, #8b5cf6)' }}>
                                <Activity size={16} /> {reportCount} Reports Filed
                            </div>
                        </div>
                        {memberSince && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <Calendar size={12} /> Member since {memberSince}
                            </p>
                        )}
                    </>
                )}

                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', opacity: 0.7 }}>
                    Your data syncs across all devices via your account.
                </p>
            </div>

            {/* Reports List */}
            <div className="reports-wrapper" style={{ minHeight: '400px' }}>
                <MyReports onClose={() => { }} hideHeader={true} />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `
            }} />
        </div>
    );
};

export default ProfilePage;
