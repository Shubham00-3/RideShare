import { useState, useEffect } from 'react';
import './Header.css';

const Header = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setIsMobileMenuOpen(false);
    };

    return (
        <header className={`header ${isScrolled ? 'header--scrolled' : ''}`}>
            <div className="header__container">
                <a href="/" className="header__logo">
                    <span className="header__logo-icon">🚗</span>
                    RideShare Connect
                </a>

                <nav className={`header__nav ${isMobileMenuOpen ? 'header__nav--open' : ''}`}>
                    <button
                        className="header__nav-link"
                        onClick={() => scrollToSection('business-model')}
                    >
                        Our Business Model
                    </button>
                    <button
                        className="header__nav-link"
                        onClick={() => scrollToSection('team')}
                    >
                        About Us
                    </button>
                    <button
                        className="header__cta btn btn-primary"
                        onClick={() => scrollToSection('hero')}
                    >
                        Drive
                    </button>
                </nav>

                <button
                    className="header__mobile-toggle"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </header>
    );
};

export default Header;
