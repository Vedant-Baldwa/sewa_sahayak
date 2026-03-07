import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Shield, MapPin, UserCircle, LogOut, Home, Video } from 'lucide-react';

const Navbar = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        onLogout();
        navigate('/');
    };

    // Special behavior for Home page transparent nav
    const isHome = location.pathname === '/';

    return (
        <header className={`nav-premium ${scrolled || !isHome ? 'scrolled' : ''}`}>
            <div className="app-container flex-between">
                <NavLink to="/" className="navbar-brand" style={{ transition: '0.3s' }}>
                    <Shield className="text-primary" size={28} />
                    <span className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-1px' }}>
                        Sewa Sahayak
                    </span>
                </NavLink>

                <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    {user ? (
                        <>
                            <NavLink to="/dashcam" className="nav-link" style={{ color: location.pathname === '/dashcam' ? 'var(--color-primary)' : 'white' }}>
                                <Video size={18} /> <span className="hide-mobile">Dashcam</span>
                            </NavLink>
                            <NavLink to="/dashboard" className="nav-link" style={{ color: location.pathname === '/dashboard' ? 'var(--color-primary)' : 'white' }}>
                                <MapPin size={18} /> <span className="hide-mobile">Intelligence</span>
                            </NavLink>
                            <NavLink to="/profile" className="nav-link" style={{ color: location.pathname === '/profile' ? 'var(--color-primary)' : 'white' }}>
                                <UserCircle size={18} /> <span className="hide-mobile">My Reports</span>
                            </NavLink>
                            <button
                                onClick={handleLogout}
                                className="btn-premium btn-outline"
                                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                            >
                                <LogOut size={16} /> <span className="hide-mobile">Logout</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <NavLink to="/" className="nav-link hide-mobile" style={{ color: location.pathname === '/' ? 'var(--color-primary)' : 'white' }}>
                                <Home size={18} /> Home
                            </NavLink>
                            <NavLink
                                to="/login"
                                className="btn-premium"
                                style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}
                            >
                                Portal Login
                            </NavLink>
                        </>
                    )}
                </nav>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .nav-link {
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 0.95rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: 0.3s;
                }
                .nav-link:hover {
                    opacity: 0.8;
                }
                @media (max-width: 600px) {
                    .hide-mobile { display: none; }
                }
            `}} />
        </header>
    );
};

export default Navbar;
