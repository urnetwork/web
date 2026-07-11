import React, { useEffect, useRef, useState } from 'react';
import './Nav.css';
import { useLanguage, LANG_ORDER } from '../i18n';
import { buildPath, navigate, useRoute, SECTION_ROUTES } from '../router';
import { useAlphaPrice, usePriceDenom } from '../lib/usePrice';

// Header sections that appear as nav links — each maps to its own page.
const NAV_SECTIONS = SECTION_ROUTES;

const SPARK_W = 78;
const SPARK_H = 14;

// Plausible-looking baselines for the seeded fake history. The first real
// sample from the simulation will simply slide in from the right, dropping
// the oldest seeded value off the left.
const SEED_BASE = { gb: 0.0008, user: 0.025 };

// Display the price rounded to at most 2 decimal places. A "<" or ">"
// prefix indicates that the actual value is below or above the rounded
// display, so a fixed-width slot can communicate sub-cent movement
// without ever lengthening the string.
const fmtCost = (n) => {
    if (!isFinite(n)) return '0';
    const rounded = Math.round(n * 100) / 100;
    const str = rounded.toFixed(2).replace(/\.?0+$/, '') || '0';
    const eps = 1e-9;
    let prefix = '';
    if (n < rounded - eps) prefix = '<';
    else if (n > rounded + eps) prefix = '>';
    return prefix + str;
};

function Sparkline({ series, width = SPARK_W, height = SPARK_H }) {
    if (series.length < 2) {
        return (
            <svg
                className="nav-spark-svg"
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
            />
        );
    }

    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = Math.max(max - min, 1e-9);
    // A constant series (the α price is fixed until the sheet changes)
    // draws as a centered flat line rather than hugging the bottom edge.
    const flat = max - min < 1e-12;
    const padY = 1.5;

    const points = series
        .map((v, i) => {
            const x = (i / (series.length - 1)) * width;
            const y = flat
                ? height / 2
                : height - padY - ((v - min) / range) * (height - 2 * padY);
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');

    return (
        <svg
            className="nav-spark-svg"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
        >
            <polyline
                fill="none"
                stroke="#F8F8F8"
                strokeWidth="1"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
            />
        </svg>
    );
}

/**
 * Compact language switcher — a button labeled with the current code
 * that opens a small dropdown listing every supported language.
 */
function LanguageSelector() {
    const { code, setLang, langs, order } = useLanguage();
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onPointer = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div className="nav-lang" ref={ref}>
            <button
                type="button"
                className="nav-lang-toggle"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={t.nav.languageMenu}
            >
                {langs[code].label}
                <span className="nav-lang-caret" aria-hidden="true">▾</span>
            </button>

            {open && (
                <ul className="nav-lang-menu" role="listbox" aria-label={t.nav.languageMenu}>
                    {(order || LANG_ORDER).map(c => (
                        <li key={c}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={c === code}
                                lang={c}
                                className={`nav-lang-item ${c === code ? 'is-active' : ''}`}
                                onClick={() => { setLang(c); setOpen(false); }}
                            >
                                <span className="nav-lang-item-code">{langs[c].label}</span>
                                <span className="nav-lang-item-name">{langs[c].name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * Nav
 *
 * Fixed top navigation. Contains the URnetwork logo, the brand tagline,
 * route links to each section page, a language selector, and the Price
 * pill with the published network price on the far right.
 *
 * The nav sits below the Disclaimer bar. When the disclaimer is visible
 * (at the top of the page) the nav shifts down by --nav-height via the
 * `nav-below-disclaimer` class passed in from the parent.
 */
export default function Nav({ disclaimerVisible, activeRoute }) {
    const { t, code, setLang, langs } = useLanguage();
    const route = activeRoute ? { name: activeRoute, slug: null } : useRoute();
    const onHome = route.name === 'home';
    const [scrolled, setScrolled] = useState(false);
    const [whitepaperActive, setWhitepaperActive] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuBtnRef = useRef(null);
    const drawerRef = useRef(null);
    // One shared feed + denomination for the desktop pill and the drawer
    // copy, so they can't drift apart or double-poll.
    const price = useAlphaPrice({ series: true });
    const [denom, setDenom] = usePriceDenom();

    // While the mobile drawer is open: lock background scroll, wire
    // Escape-to-close, trap Tab within the drawer, and restore focus to the
    // control that opened it once it closes.
    useEffect(() => {
        if (!menuOpen) return undefined;
        const drawer = drawerRef.current;
        const opener = menuBtnRef.current;

        // Visible, focusable controls inside the drawer, in DOM order.
        const focusable = () =>
            drawer
                ? Array.from(drawer.querySelectorAll(
                      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
                  )).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0)
                : [];

        // Move focus into the drawer — its close button.
        const closeBtn = drawer && drawer.querySelector('.nav-drawer-bar .nav-menu-toggle');
        (closeBtn || focusable()[0] || drawer)?.focus();

        const onKey = (e) => {
            if (e.key === 'Escape') { setMenuOpen(false); return; }
            if (e.key !== 'Tab') return;
            const list = focusable();
            if (list.length === 0) return;
            const first = list[0];
            const last = list[list.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            // Return focus to the opener, if it is still in the document.
            if (opener && document.contains(opener)) opener.focus();
        };
    }, [menuOpen]);

    // Any route change (a followed link, or browser back/forward) closes it.
    useEffect(() => { setMenuOpen(false); }, [route.name]);

    useEffect(() => {
        if (!onHome) {
            setScrolled(true);
            setWhitepaperActive(false);
            return undefined;
        }

        let raf = 0;
        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                setScrolled(window.scrollY > 8);

                // Track when the whitepaper section is in view.
                const el = document.getElementById('whitepaper');
                if (el) {
                    const rect = el.getBoundingClientRect();
                    setWhitepaperActive(rect.top - 120 <= 0);
                }
            });
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [onHome]);

    /** Navigate to a section route page. */
    const handleLinkClick = (e, name) => {
        e.preventDefault();
        setMenuOpen(false);
        navigate(buildPath({ name, slug: null }, code));
    };

    /**
     * Whitepaper lives on the home page — scroll to it. If we are on
     * another page, navigate home first and defer the scroll.
     */
    const handleWhitepaperClick = (e) => {
        e.preventDefault();
        setMenuOpen(false);
        if (!onHome) {
            navigate(buildPath({ name: 'home' }, code));
            requestAnimationFrame(() => {
                const el = document.getElementById('whitepaper');
                if (el) {
                    const top = el.getBoundingClientRect().top + window.scrollY - 64;
                    window.scrollTo({ top });
                }
            });
            return;
        }
        const el = document.getElementById('whitepaper');
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 64;
        window.scrollTo({ top, behavior: 'smooth' });
    };

    const handleBrandClick = (e) => {
        e.preventDefault();
        setMenuOpen(false);
        if (onHome) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            navigate(buildPath({ name: 'home' }, code));
        }
    };

    const navClass = [
        'nav',
        scrolled ? 'nav-scrolled' : '',
        disclaimerVisible ? 'nav-below-disclaimer' : ''
    ].filter(Boolean).join(' ');

    return (
        <>
        <header className={navClass}>
            <div className="nav-inner">
                <a
                    href={buildPath({ name: 'home' }, code)}
                    className="nav-brand"
                    onClick={handleBrandClick}
                >
                    <img src="/ur.svg" alt="URnetwork" className="nav-logo" />
                    <span className="nav-tagline">{t.nav.tagline}</span>
                </a>

                <nav className="nav-links" aria-label="Primary">
                    <PrimaryLinks
                        t={t} code={code} route={route} onHome={onHome}
                        whitepaperActive={whitepaperActive}
                        onWhitepaper={handleWhitepaperClick} onLink={handleLinkClick}
                    />
                </nav>

                <LanguageSelector />

                <PriceTicker t={t} code={code} price={price} denom={denom} setDenom={setDenom} />

                {/* Hamburger — only shown ≤900px (see Nav.css). */}
                <button
                    type="button"
                    ref={menuBtnRef}
                    className={`nav-menu-toggle ${menuOpen ? 'is-open' : ''}`}
                    aria-label={menuOpen ? t.nav.closeMenu : t.nav.menu}
                    aria-expanded={menuOpen}
                    aria-controls="nav-drawer"
                    onClick={() => setMenuOpen(o => !o)}
                >
                    <span className="nav-menu-icon" aria-hidden="true"><span /><span /><span /></span>
                </button>
            </div>
        </header>

            {/* Mobile navigation drawer (≤900px). Rendered as a sibling of the
                header — NOT inside it — because the nav's backdrop-filter makes
                it the containing block for fixed descendants, which would pin
                the drawer to the 64px bar instead of the viewport. Always in the
                DOM; the is-open class drives the transition and, when closed,
                removes it from the tab order via visibility:hidden. */}
            <div
                id="nav-drawer"
                ref={drawerRef}
                className={`nav-drawer ${menuOpen ? 'is-open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label={t.nav.menu}
            >
                <div className="nav-drawer-bar">
                    <a
                        href={buildPath({ name: 'home' }, code)}
                        className="nav-brand"
                        onClick={handleBrandClick}
                    >
                        <img src="/ur.svg" alt="URnetwork" className="nav-logo" />
                    </a>
                    <button
                        type="button"
                        className="nav-menu-toggle is-open"
                        aria-label={t.nav.closeMenu}
                        onClick={() => setMenuOpen(false)}
                    >
                        <span className="nav-menu-icon" aria-hidden="true"><span /><span /><span /></span>
                    </button>
                </div>

                <nav className="nav-drawer-links" aria-label="Primary">
                    <PrimaryLinks
                        t={t} code={code} route={route} onHome={onHome}
                        whitepaperActive={whitepaperActive}
                        onWhitepaper={handleWhitepaperClick} onLink={handleLinkClick}
                    />
                </nav>

                <div className="nav-drawer-foot">
                    <PriceTicker t={t} code={code} price={price} denom={denom} setDenom={setDenom} />
                    <nav className="nav-drawer-langs" aria-label={t.nav.languageMenu}>
                        {LANG_ORDER.map(c => (
                            <button
                                key={c}
                                type="button"
                                lang={c}
                                className={`nav-drawer-lang ${c === code ? 'is-active' : ''}`}
                                onClick={() => { setLang(c); setMenuOpen(false); }}
                            >
                                {langs[c].label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
        </>
    );
}

/**
 * Primary section links. Shared verbatim by the desktop bar (.nav-links)
 * and the mobile drawer (.nav-drawer-links); the two contexts restyle the
 * same .nav-link markup via their parent selector.
 */
function PrimaryLinks({ t, code, route, onHome, whitepaperActive, onWhitepaper, onLink }) {
    return (
        <>
            <a
                href={`${buildPath({ name: 'home' }, code)}#whitepaper`}
                className={`nav-link ${onHome && whitepaperActive ? 'is-active' : ''}`}
                onClick={onWhitepaper}
            >
                {t.nav.whitepaper}
            </a>
            {NAV_SECTIONS.map(name => (
                <a
                    key={name}
                    href={buildPath({ name, slug: null }, code)}
                    className={`nav-link ${route.name === name ? 'is-active' : ''}`}
                    onClick={(e) => onLink(e, name)}
                >
                    {t.nav[name]}
                </a>
            ))}
            <a
                href={buildPath({ name: 'docs', slug: null }, code)}
                className={`nav-link ${route.name === 'docs' || route.name === 'api' ? 'is-active' : ''}`}
                onClick={(e) => onLink(e, 'docs')}
            >
                {t.nav.docs}
            </a>
        </>
    );
}

/**
 * The Price pill — the published 0-tier price from /price.yml, shown in
 * USD (default; resolved against the network's price feeds) or in α via
 * the denomination toggle, with a real 24h sparkline. Tapping anywhere
 * on the pill except the toggle opens the price page: a stretched link
 * covers the pill, the passive spans let clicks fall through to it, and
 * the toggle sits above it with its own hit area.
 */
function PriceTicker({ t, code, price, denom, setDenom }) {
    const { sheet, alphaUsd, closes } = price;
    const tier0 = sheet?.tiers?.[0] || null;

    const value = (alphaPer) => {
        if (alphaPer == null) return null;
        if (denom === 'alpha') return alphaPer;
        return alphaUsd == null ? null : alphaPer * alphaUsd;
    };

    const series = (alphaPer) => {
        if (alphaPer == null) return [];
        if (denom === 'usd' && closes && closes.length >= 2) {
            return closes.map(usd => usd * alphaPer);
        }
        // In α the price is fixed until the sheet changes — a flat line.
        return [alphaPer, alphaPer];
    };

    const unit = denom === 'alpha' ? 'α' : 'USD';
    const priceHref = buildPath({ name: 'price', slug: null }, code);
    const handleOpen = (e) => {
        e.preventDefault();
        navigate(priceHref);
    };

    return (
        <div className="nav-cta">
            <a
                className="nav-cta-hit"
                href={priceHref}
                onClick={handleOpen}
                aria-label={t.nav.ctaAria}
            />

            <span className="nav-cta-label">{t.nav.price}</span>

            <div className="nav-denom" role="group" aria-label={t.nav.denomAria}>
                <button
                    type="button"
                    className={denom === 'usd' ? 'is-active' : ''}
                    aria-pressed={denom === 'usd'}
                    onClick={() => setDenom('usd')}
                >
                    USD
                </button>
                <button
                    type="button"
                    className={denom === 'alpha' ? 'is-active' : ''}
                    aria-pressed={denom === 'alpha'}
                    onClick={() => setDenom('alpha')}
                >
                    α
                </button>
            </div>

            <div className="nav-cta-sparks">
                <div className="nav-spark">
                    <div className="nav-spark-meta">
                        <span className="nav-spark-label">{unit}/GiB</span>
                        <span className="nav-spark-value">
                            {value(tier0?.alphaPerGib) == null ? '—' : fmtCost(value(tier0?.alphaPerGib))}
                        </span>
                    </div>
                    <Sparkline series={series(tier0?.alphaPerGib)} />
                </div>
                <div className="nav-spark">
                    <div className="nav-spark-meta">
                        <span className="nav-spark-label">{unit}/user</span>
                        <span className="nav-spark-value">
                            {value(tier0?.alphaPerUser) == null ? '—' : fmtCost(value(tier0?.alphaPerUser))}
                        </span>
                    </div>
                    <Sparkline series={series(tier0?.alphaPerUser)} />
                </div>
            </div>
        </div>
    );
}
