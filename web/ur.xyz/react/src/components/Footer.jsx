import React from 'react';
import './Footer.css';
import { useLanguage, LANG_ORDER, pathForLang } from '../i18n';

/**
 * Footer
 *
 * Minimal footer with the brand mark, a couple of links, copyright,
 * a language selector row, and a short disclaimer clarifying that this
 * site is an independent open source utility protocol — not the network
 * operator that sells access.
 */
export default function Footer() {
    const { t, code, setLang, langs } = useLanguage();

    return (
        <footer className="footer">
            <div className="footer-inner">
                <div className="footer-row">
                    <div className="footer-brand">
                        <img src="/ur.svg" alt="URnetwork" className="footer-logo" />
                        <span className="footer-tagline">{t.nav.tagline}</span>
                    </div>

                    <nav className="footer-links" aria-label="Footer">
                        <a
                            href="https://github.com/urnetwork"
                            className="footer-link"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t.footer.github}
                        </a>
                        <a href="#contact" className="footer-link">{t.footer.contact}</a>
                    </nav>

                    <div className="footer-meta">
                        {t.footer.copyright}
                    </div>
                </div>

                <nav className="footer-langs" aria-label={t.footer.languagesAria}>
                    {LANG_ORDER.map(c => (
                        <a
                            key={c}
                            href={pathForLang(c)}
                            lang={c}
                            className={`footer-lang ${c === code ? 'is-active' : ''}`}
                            onClick={(e) => { e.preventDefault(); setLang(c); }}
                        >
                            {langs[c].label}
                        </a>
                    ))}
                </nav>

                <p className="footer-disclaimer">
                    {t.footer.disclaimer}
                </p>
            </div>
        </footer>
    );
}
