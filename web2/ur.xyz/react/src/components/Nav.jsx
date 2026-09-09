import React, { useEffect, useRef, useState } from 'react';
import './Nav.css';
import { useLanguage, LANG_ORDER } from '../i18n';
import { buildPath, navigate, pathForRoute, useRoute } from '../router';
import { resolveLanguageDestination, routeAvailability } from '../../../astro/src/lib/route-localization.js';
import { useAlphaPrice } from '../lib/usePrice';

const NETWORK_LINKS = [
    'operators',
    'miners',
    'validators',
];

function EnglishAvailability({ compact = false }) {
    return (
        <div className={`nav-language-availability ${compact ? 'is-compact' : ''}`} lang="en">
            <strong>EN</strong>
            <span>Available in English</span>
        </div>
    );
}

function LanguageSelector({ currentPath }) {
    const { code, setLang, langs, order, t } = useLanguage();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const closeOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                ref.current?.querySelector('.nav-lang-toggle')?.focus();
            }
        };
        document.addEventListener('mousedown', closeOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [open]);

    if (routeAvailability(currentPath).kind !== 'translated') {
        return <EnglishAvailability />;
    }

    return (
        <div className="nav-lang" ref={ref}>
            <button
                type="button"
                className="nav-lang-toggle"
                onClick={() => setOpen(value => !value)}
                aria-expanded={open}
                aria-controls="nav-language-menu"
                aria-label={t.nav.languageMenu || 'Choose language'}
            >
                {langs[code].label}
                <span aria-hidden="true">{'\u25BE'}</span>
            </button>
            {open && (
                <ul id="nav-language-menu" className="nav-lang-menu" aria-label={t.nav.languageMenu || 'Choose language'}>
                    {(order || LANG_ORDER).map(language => (
                        <li key={language}>
                            <a
                                href={resolveLanguageDestination(currentPath, language).href}
                                lang={language}
                                aria-current={language === code ? 'page' : undefined}
                                className={language === code ? 'is-active' : ''}
                                onClick={(event) => {
                                    event.preventDefault();
                                    setLang(language);
                                    setOpen(false);
                                }}
                            >
                                <span>{langs[language].label}</span>
                                <small>{langs[language].name}</small>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function EnglishOnlyLink({ href, active, children }) {
    const label = `${children} — available in English`;
    return (
        <a href={href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined} aria-label={label}>
            {children} <span className="english-only-mark" lang="en">EN</span>
        </a>
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
                        aria-current={route.name === name ? 'page' : undefined}
                    >
                        {t.nav[name]}
                    </a>
                ))}
            </div>
        </details>
    );
}


export default function Nav({ disclaimerVisible, activeRoute, aboutHref }) {
    const { code, setLang, langs, t } = useLanguage();
    const detectedRoute = useRoute();
    const route = activeRoute ? { name: activeRoute, slug: null } : detectedRoute;
    const currentPath = pathForRoute(route);
    const resolvedAboutHref = aboutHref ?? (code === 'en' ? '/about' : null);
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

        const previousRootOverflow = document.documentElement.style.overflow;
        const previousOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);
        return () => {
            document.documentElement.style.overflow = previousRootOverflow;
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
                        <a href={buildPath({ name: 'research', slug: null }, code)} className={route.name === 'research' ? 'is-active' : ''} aria-current={route.name === 'research' ? 'page' : undefined}>{t.nav.research}</a>
                        <EnglishOnlyLink href="/build" active={route.name === 'build'}>Build</EnglishOnlyLink>
                        <EnglishOnlyLink href="/investors" active={route.name === 'investors'}>Investors</EnglishOnlyLink>
                        <EnglishOnlyLink href={resolvedAboutHref || '/about'} active={route.name === 'about'}>About</EnglishOnlyLink>
                        <EnglishOnlyLink href="/docs" active={route.name === 'docs' || route.name === 'api'}>{t.nav.docs}</EnglishOnlyLink>
                    </nav>

                    <div className="nav-actions">
                        <LanguageSelector currentPath={currentPath} />
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
                    <a href={buildPath({ name: 'research', slug: null }, code)} className={route.name === 'research' ? 'is-active' : ''} aria-current={route.name === 'research' ? 'page' : undefined}>{t.nav.research}</a>
                    <EnglishOnlyLink href="/build" active={route.name === 'build'}>Build</EnglishOnlyLink>
                    <EnglishOnlyLink href="/investors" active={route.name === 'investors'}>Investors</EnglishOnlyLink>
                    <EnglishOnlyLink href={resolvedAboutHref || '/about'} active={route.name === 'about'}>About</EnglishOnlyLink>
                    <EnglishOnlyLink href="/docs" active={route.name === 'docs' || route.name === 'api'}>{t.nav.docs}</EnglishOnlyLink>
                </nav>
                <div className="nav-drawer-foot">
                    {routeAvailability(currentPath).kind === 'translated' ? (
                        <nav className="nav-drawer-langs" aria-label={t.footer.languagesAria}>
                            {LANG_ORDER.map(language => (
                                <a
                                    key={language}
                                    href={resolveLanguageDestination(currentPath, language).href}
                                    lang={language}
                                    className={language === code ? 'is-active' : ''}
                                    aria-current={language === code ? 'page' : undefined}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        setLang(language);
                                        setMenuOpen(false);
                                    }}
                                >
                                    {langs[language].label}
                                </a>
                            ))}
                        </nav>
                    ) : <EnglishAvailability compact />}
                </div>
            </div>
        </>
    );
}
