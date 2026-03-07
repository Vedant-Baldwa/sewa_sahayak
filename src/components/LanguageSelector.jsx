import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi (हिंदी)' },
    { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
    { code: 'bn', label: 'Bengali (বাংলা)' },
    { code: 'mr', label: 'Marathi (मराठी)' },
    { code: 'ta', label: 'Tamil (தமிழ்)' },
    { code: 'te', label: 'Telugu (తెలుగు)' },
    { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
    { code: 'ml', label: 'Malayalam (മലയാളം)' },
    { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
    { code: 'ur', label: 'Urdu (اردو)' }
];

export default function LanguageSelector({ inNavbar = false }) {
    const [currentL, setCurrentL] = useState('en');
    const [isDetecting, setIsDetecting] = useState(false);

    const detectLocalLanguage = () => {
        if (!navigator.geolocation) return;

        setIsDetecting(true);
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            let detected = 'en';

            // Simple Bounding Box Logic for Indian Regions
            if (latitude > 21.5 && latitude < 27.2 && longitude > 85.8 && longitude < 89.8) detected = 'bn';
            else if (latitude > 15.6 && latitude < 22.0 && longitude > 72.6 && longitude < 80.9) detected = 'mr';
            else if (latitude > 20.1 && latitude < 24.7 && longitude > 68.1 && longitude < 74.5) detected = 'gu';
            else if (latitude > 8.1 && latitude < 13.5 && longitude > 76.2 && longitude < 80.3) detected = 'ta';

            if (detected !== 'en') {
                changeLanguage(detected);
            }
            setIsDetecting(false);
        }, () => setIsDetecting(false));
    };

    useEffect(() => {
        // Init language from cookie
        const cookieValue = document.cookie.split('; ').find(row => row.startsWith('googtrans='));
        if (cookieValue) {
            const lang = cookieValue.split('/').pop();
            if (lang) setCurrentL(lang);
        } else {
            // If no language set, try GPS Auto-Detection
            detectLocalLanguage();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const changeLanguage = (langCode) => {
        setCurrentL(langCode);

        // 1. Set the translation cookie
        document.cookie = `googtrans=/en/${langCode}; path=/`;
        document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;

        // 2. Trigger Google Translate internal menu
        const select = document.querySelector('.goog-te-combo');
        if (select) {
            select.value = langCode;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 3. Notify moving components
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: langCode }));

        // 4. Reliable reload
        setTimeout(() => {
            window.location.reload();
        }, 300);
    };

    return (
        <div
            className="notranslate"
            translate="no"
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: inNavbar ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(12px)',
                border: inNavbar ? '2px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-bright)',
                borderRadius: 14,
                padding: '2px 10px',
                cursor: 'pointer',
                boxShadow: inNavbar ? '0 0 15px rgba(99, 102, 241, 0.2)' : 'none',
                transition: 'all 0.3s ease'
            }}
        >
            <Globe
                size={16}
                className={isDetecting ? "animate-spin" : ""}
                color={inNavbar ? "#818cf8" : "var(--primary)"}
                style={{ marginRight: 6, filter: 'drop-shadow(0 0 5px rgba(99,102,241,0.5))' }}
            />
            <select
                value={currentL}
                onChange={(e) => changeLanguage(e.target.value)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: inNavbar ? 'white' : 'var(--text)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                    padding: '6px 4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em'
                }}
            >
                {languages.map(lang => (
                    <option key={lang.code} value={lang.code} style={{ background: '#1e1e24', color: 'white' }}>
                        {lang.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
