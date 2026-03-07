import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, Camera, MapPin, UserCircle, LogOut, Home, Video } from 'lucide-react';

const Navbar = ({ user, onLogout }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout();
        navigate('/');
    };

    return (
        <header className="app-navbar glass-panel-dark">
            <div className="navbar-container">
                <NavLink to="/" className="navbar-brand">
                    <Shield className="brand-icon" size={24} />
                    <span className="text-gradient font-bold" style={{ fontSize: '1.25rem' }}>Sewa Sahayak</span>
                </NavLink>

                <nav className="navbar-links">
                    {user ? (
                        <>
                            <NavLink to="/dashcam" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                                <Video size={18} /> Dashcam
                            </NavLink>
                            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                                <MapPin size={18} /> Intelligence Map
                            </NavLink>
                            <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                                <UserCircle size={18} /> My Reports
                            </NavLink>
                            <button className="btn btn-secondary nav-btn" onClick={handleLogout} title="Log out">
                                <LogOut size={16} /> Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                                <Home size={18} /> Home
                            </NavLink>
                            <NavLink to="/login" className="btn btn-primary nav-btn login-btn">
                                <UserCircle size={18} /> Portal Login
                            </NavLink>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Navbar;
