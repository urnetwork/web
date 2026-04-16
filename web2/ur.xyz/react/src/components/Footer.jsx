import React from 'react';
import './Footer.css';
import { useLanguage, LANG_ORDER, pathForLang } from '../i18n';
import { buildPath, navigate, SECTION_ROUTES } from '../router';

/**
 * Footer
 *
 * Minimal footer with the brand mark, section links, external links,
 * copyright, a language selector row, and a short disclaimer.
 * Per the sitemap, all sections should be linked in the footer.
 */
export default function Footer() {
    const { t, code, setLang, langs } = useLanguage();

    const handleSectionClick = (e, name) => {
        e.preventDefault();
        navigate(buildPath({ name, slug: null }, code));
    };

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
                            href={`${buildPath({ name: 'home' }, code)}#whitepaper`}
                            className="footer-link"
                            onClick={(e) => handleSectionClick(e, 'home')}
                        >
                            {t.nav.whitepaper}
                        </a>
                        {SECTION_ROUTES.map(name => (
                            <a
                                key={name}
                                href={buildPath({ name, slug: null }, code)}
                                className="footer-link"
                                onClick={(e) => handleSectionClick(e, name)}
                            >
                                {t.nav[name]}
                            </a>
                        ))}
                        <a
                            href={buildPath({ name: 'docs', slug: null }, code)}
                            className="footer-link"
                            onClick={(e) => handleSectionClick(e, 'docs')}
                        >
                            {t.nav.docs}
                        </a>
                        <a
                            href="https://github.com/urnetwork"
                            className="footer-link"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t.footer.github}
                        </a>
                        <a href="mailto:info@ur.xyz" className="footer-link">
                            {t.footer.contact}
                        </a>
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

            </div>
        </footer>
    );
}
