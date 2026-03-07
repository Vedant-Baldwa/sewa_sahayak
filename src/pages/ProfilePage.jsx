import React from 'react';
import MyReports from '../components/MyReports';
import { User, Calendar } from 'lucide-react';

const ProfilePage = ({ user }) => {
    const memberSince = user?.created_at
        ? new Date(parseInt(user.created_at) * 1000).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        : null;

    return (
        <div className="page-container animate-fade-in max-w-lg mx-auto">

            {/* Profile Header */}
            <div className="glass-panel text-center mb-4 p-4">
                <div className="avatar-circle mx-auto mb-2 bg-gradient-brand flex-center text-white" style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', background: 'var(--gradient-primary)', color: 'white' }}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User size={30} />}
                </div>
                <h2 className="heading-3 mb-1">{user?.name || "Citizen Reporter"}</h2>
                <p className="text-sm text-muted">{user?.email}</p>

                {memberSince && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Calendar size={12} /> Member since {memberSince}
                    </p>
                )}

                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', opacity: 0.7 }}>
                    Your data syncs across all devices via your account.
                </p>
            </div>

            {/* Reports List */}
            <div className="reports-wrapper" style={{ minHeight: '400px' }}>
                <MyReports />
            </div>
        </div>
    );
};

export default ProfilePage;
