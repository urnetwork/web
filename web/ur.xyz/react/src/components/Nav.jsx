import React, { useEffect, useRef, useState } from 'react';
import './Nav.css';
import { useLanguage, LANG_ORDER } from '../i18n';
import { buildPath, navigate, useRoute, SECTION_ROUTES } from '../router';

// Header sections that appear as nav links — each maps to its own page.
const NAV_SECTIONS = SECTION_ROUTES;

// 24 samples = 24 conceptual "hours" of cost history. The wall-clock
// sample interval is short so the bar feels alive while the visitor is
// on the page; this is illustrative data, not a real market feed.
const SAMPLE_INTERVAL_MS = 2500;
const SERIES_LEN = 24;
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

/**
 * Generate `count` plausible-looking samples around `base` using a
 * mean-reverting random walk. The series ends at the baseline so the
 * eventual handoff to real data isn't a hard step.
 */
function seedSeries(base, count = SERIES_LEN, volatility = 0.18) {
    const out = [];
    let v = base * (1 + (Math.random() - 0.5) * volatility);
    for (let i = 0; i < count - 1; i++) {
        v = v + (base - v) * 0.18 + (Math.random() - 0.5) * base * volatility;
        v = Math.max(v, base * 0.1);
        out.push(v);
    }
    out.push(base);
    return out;
}

/**
 * Maintains a 24-sample rolling window of per-interval costs derived
 * from the simulation stats. Pre-seeded with synthetic 24h history; on
 * each subsequent tick the cost-per-GB and cost-per-user that accrued
 * during the elapsed sample interval are appended (and the oldest entry
 * falls off the front).
 */
function useCostHistory(stats) {
    const [series, setSeries] = useState(() => ({
        gb:   seedSeries(SEED_BASE.gb),
        user: seedSeries(SEED_BASE.user)
    }));
    const lastRef = useRef(null);
    const statsRef = useRef(stats);

    useEffect(() => { statsRef.current = stats; }, [stats]);

    useEffect(() => {
        // Seed lastRef immediately so the first real sample is a delta
        // from the page-load state, not from zero.
        const seed = statsRef.current;
        if (seed) {
            lastRef.current = {
                fees: seed.totalFeesUr,
                data: seed.dataPB,
                users: Math.max(seed.displayedNetworks || 0, 1)
            };
        }

        const sample = () => {
            const s = statsRef.current;
            if (!s) return;
            const users = Math.max(s.displayedNetworks || 0, 1);

            if (lastRef.current === null) {
                lastRef.current = { fees: s.totalFeesUr, data: s.dataPB, users };
                return;
            }

            const dFees = s.totalFeesUr - lastRef.current.fees;
            const dData = s.dataPB - lastRef.current.data;

            // dataPB is in petabytes; convert to GB so the unit label fits.
            const dGB = dData * 1e6;
            const gbCost = dGB > 1e-9 ? dFees / dGB : 0;
            const userCost = dFees / users;

            lastRef.current = { fees: s.totalFeesUr, data: s.dataPB, users };

            setSeries(prev => ({
                gb:   [...prev.gb,   gbCost  ].slice(-SERIES_LEN),
                user: [...prev.user, userCost].slice(-SERIES_LEN)
            }));
        };

        const id = setInterval(sample, SAMPLE_INTERVAL_MS);
        return () => clearInterval(id);
    }, []);

    const current = {
        gb:   series.gb[series.gb.length - 1]   || 0,
        user: series.user[series.user.length - 1] || 0
    };

    return { series, current };
}

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
    const padY = 1.5;

    const points = series
        .map((v, i) => {
            const x = (i / (series.length - 1)) * width;
            const y = height - padY - ((v - min) / range) * (height - 2 * padY);
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
 * route links to each section page, a language selector, and a Usage
 * CTA pill with sparkline cost data on the far right.
 *
 * The nav sits below the Disclaimer bar. When the disclaimer is visible
 * (at the top of the page) the nav shifts down by --nav-height via the
 * `nav-below-disclaimer` class passed in from the parent.
 */
export default function Nav({ stats, disclaimerVisible, activeRoute }) {
    const { t, code } = useLanguage();
    const route = activeRoute ? { name: activeRoute, slug: null } : useRoute();
    const onHome = route.name === 'home';
    const [scrolled, setScrolled] = useState(false);
    const [whitepaperActive, setWhitepaperActive] = useState(false);
    const { series, current } = useCostHistory(stats);

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
        navigate(buildPath({ name, slug: null }, code));
    };

    /**
     * Whitepaper lives on the home page — scroll to it. If we are on
     * another page, navigate home first and defer the scroll.
     */
    const handleWhitepaperClick = (e) => {
        e.preventDefault();
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
                    <a
                        href={`${buildPath({ name: 'home' }, code)}#whitepaper`}
                        className={`nav-link ${onHome && whitepaperActive ? 'is-active' : ''}`}
                        onClick={handleWhitepaperClick}
                    >
                        {t.nav.whitepaper}
                    </a>
                    {NAV_SECTIONS.map(name => (
                        <a
                            key={name}
                            href={buildPath({ name, slug: null }, code)}
                            className={`nav-link ${route.name === name ? 'is-active' : ''}`}
                            onClick={(e) => handleLinkClick(e, name)}
                        >
                            {t.nav[name]}
                        </a>
                    ))}
                    <a
                        href={buildPath({ name: 'docs', slug: null }, code)}
                        className={`nav-link ${route.name === 'docs' || route.name === 'api' ? 'is-active' : ''}`}
                        onClick={(e) => handleLinkClick(e, 'docs')}
                    >
                        {t.nav.docs}
                    </a>
                </nav>

                <LanguageSelector />

                <div
                    className="nav-cta"
                    aria-label={t.nav.ctaAria}
                >
                    <span className="nav-cta-label">{t.nav.usage}</span>
                    <div className="nav-cta-sparks">
                        <div className="nav-spark">
                            <div className="nav-spark-meta">
                                <span className="nav-spark-label">$UR/GB</span>
                                <span className="nav-spark-value">{fmtCost(current.gb)}</span>
                            </div>
                            <Sparkline series={series.gb} />
                        </div>
                        <div className="nav-spark">
                            <div className="nav-spark-meta">
                                <span className="nav-spark-label">$UR/user</span>
                                <span className="nav-spark-value">{fmtCost(current.user)}</span>
                            </div>
                            <Sparkline series={series.user} />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
