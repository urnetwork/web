import React, { useEffect, useRef, useState } from 'react';
import './Nav.css';
import { useLanguage, LANG_ORDER } from '../i18n';
import { buildPath, navigate, useRoute } from '../router';
import { useAlphaPrice } from '../lib/usePrice';

const NETWORK_LINKS = [
    'operators',
    'miners',
    'validators',
];

function LanguageSelector() {
    const { code, setLang, langs, order, t } = useLanguage();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const closeOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', closeOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [open]);

    return (
        <div className="nav-lang" ref={ref}>
            <button
                type="button"
                className="nav-lang-toggle"
                onClick={() => setOpen(value => !value)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={t.nav.languageMenu || 'Choose language'}
            >
                {langs[code].label}
                <span aria-hidden="true">{'\u25BE'}</span>
            </button>
            {open && (
                <ul className="nav-lang-menu" role="listbox" aria-label={t.nav.languageMenu || 'Choose language'}>
                    {(order || LANG_ORDER).map(language => (
                        <li key={language}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={language === code}
                                className={language === code ? 'is-active' : ''}
                                onClick={() => { setLang(language); setOpen(false); }}
                            >
                                <span>{langs[language].label}</span>
                                <small>{langs[language].name}</small>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function NetworkMenu({ code, route, t, mobile = false }) {
    const detailsRef = useRef(null);
    const closeTimerRef = useRef(0);
    const active = NETWORK_LINKS.includes(route.name);

    const openOnHover = () => {
        if (mobile || !window.matchMedia('(hover: hover)').matches) return;
        window.clearTimeout(closeTimerRef.current);
        detailsRef.current?.setAttribute('open', '');
    };

    const closeAfterHover = () => {
        if (mobile || !window.matchMedia('(hover: hover)').matches) return;
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = window.setTimeout(() => {
            if (!detailsRef.current?.matches(':focus-within')) {
                detailsRef.current?.removeAttribute('open');
            }
        }, 140);
    };

    useEffect(() => {
        if (mobile) return undefined;
        const closeOutside = (event) => {
            if (detailsRef.current && !detailsRef.current.contains(event.target)) {
                detailsRef.current.removeAttribute('open');
            }
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape' && detailsRef.current) detailsRef.current.removeAttribute('open');
        };
        document.addEventListener('mousedown', closeOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOutside);
            document.removeEventListener('keydown', closeOnEscape);
            window.clearTimeout(closeTimerRef.current);
        };
    }, [mobile]);

    return (
        <details
            className={`nav-network ${active ? 'is-active' : ''}`}
            ref={detailsRef}
            open={mobile || undefined}
            onMouseEnter={openOnHover}
            onMouseLeave={closeAfterHover}
        >
            <summary>{t.nav.network} <span aria-hidden="true">{'\u25BE'}</span></summary>
            <div className="nav-network-menu">
                {NETWORK_LINKS.map(name => (
                    <a
                        key={name}
                        href={buildPath({ name, slug: null }, code)}
                        className={route.name === name ? 'is-active' : ''}
                    >
                        {t.nav[name]}
                    </a>
                ))}
            </div>
        </details>
    );
}


export default function Nav({ disclaimerVisible, activeRoute }) {
    const { code, setLang, langs, t } = useLanguage();
    const detectedRoute = useRoute();
    const route = activeRoute ? { name: activeRoute, slug: null } : detectedRoute;
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButtonRef = useRef(null);
    const drawerRef = useRef(null);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                setScrolled(window.scrollY > 8);
            });
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
        return () => {
            window.removeEventListener('scroll', update);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    useEffect(() => {
        if (!menuOpen) return undefined;
        const drawer = drawerRef.current;
        const opener = menuButtonRef.current;
        const focusable = () => drawer
            ? Array.from(drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
                .filter(element => element.offsetWidth > 0 || element.offsetHeight > 0)
            : [];
        const closeButton = drawer?.querySelector('.nav-menu-toggle');
        (closeButton || focusable()[0] || drawer)?.focus();

        const onKey = (event) => {
            if (event.key === 'Escape') {
                setMenuOpen(false);
                return;
            }
            if (event.key !== 'Tab') return;
            const list = focusable();
            if (!list.length) return;
            const first = list[0];
            const last = list[list.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKey);
            if (opener && document.contains(opener)) opener.focus();
        };
    }, [menuOpen]);

    const homeHref = buildPath({ name: 'home' }, code);
    const goHome = (event) => {
        event.preventDefault();
        setMenuOpen(false);
        if (route.name === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
        else navigate(homeHref);
    };

    const navClass = [
        'nav',
        scrolled ? 'nav-scrolled' : '',
        disclaimerVisible ? 'nav-below-disclaimer' : '',
    ].filter(Boolean).join(' ');

    return (
        <>
            <header className={navClass}>
                <div className="nav-inner">
                    <a className="nav-brand" href={homeHref} onClick={goHome}>
                        <img src="/ur.svg" alt="UR" className="nav-logo" />
                    </a>

                    <nav className="nav-links" aria-label="Primary navigation">
                        <NetworkMenu code={code} route={route} t={t} />
                        <a href={buildPath({ name: 'research', slug: null }, code)} className={route.name === 'research' ? 'is-active' : ''}>{t.nav.research}</a>
                        {code === 'en' && <a href="/investors" className={route.name === 'investors' ? 'is-active' : ''}>Investors</a>}
                        <a href={"/docs"} className={route.name === 'docs' || route.name === 'api' ? 'is-active' : ''}>{t.nav.docs}</a>
                    </nav>

                    <div className="nav-actions">
                        <LanguageSelector />
                        <button
                            type="button"
                            ref={menuButtonRef}
                            className={`nav-menu-toggle ${menuOpen ? 'is-open' : ''}`}
                            aria-label={menuOpen ? (t.nav.closeMenu || 'Close menu') : (t.nav.menu || 'Open menu')}
                            aria-expanded={menuOpen}
                            aria-controls="nav-drawer"
                            onClick={() => setMenuOpen(value => !value)}
                        >
                            <span /><span /><span />
                        </button>
                    </div>
                </div>
            </header>

            <div
                id="nav-drawer"
                ref={drawerRef}
                className={`nav-drawer ${menuOpen ? 'is-open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label="Site menu"
            >
                <div className="nav-drawer-bar">
                    <a className="nav-brand" href={homeHref} onClick={goHome}><img src="/ur.svg" alt="UR" className="nav-logo" /></a>
                    <button type="button" className="nav-menu-toggle is-open" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                        <span /><span /><span />
                    </button>
                </div>
                <nav className="nav-drawer-links" aria-label="Mobile navigation">
                    <NetworkMenu code={code} route={route} t={t} mobile />
                    <a href={buildPath({ name: 'research', slug: null }, code)}>{t.nav.research}</a>
                    {code === 'en' && <a href="/investors">Investors</a>}
                    <a href={"/docs"}>{t.nav.docs}</a>
                </nav>
                <div className="nav-drawer-foot">
                    <nav className="nav-drawer-langs" aria-label={t.footer.languagesAria}>
                        {LANG_ORDER.map(language => (
                            <button
                                key={language}
                                type="button"
                                className={language === code ? 'is-active' : ''}
                                onClick={() => { setLang(language); setMenuOpen(false); }}
                            >
                                {langs[language].label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
        </>
    );
}
