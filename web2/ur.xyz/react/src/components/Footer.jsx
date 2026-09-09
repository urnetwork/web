import React from 'react';
import './Footer.css';
import { useLanguage, LANG_ORDER } from '../i18n';
import { buildPath, pathForRoute, useRoute } from '../router';
import { resolveLanguageDestination, routeAvailability } from '../../../astro/src/lib/route-localization.js';
import { LAUNCH_VIDEO_HASH } from './LaunchVideo';

const GENERAL_DISCORD = 'https://discord.gg/urnetwork';
const TELEGRAM_URL = 'https://t.me/ursn25';
const X_URL = 'https://x.com/urnetwork';
const GITHUB_URL = 'https://github.com/urfoundation/sn';
const PRODUCT_URL = 'https://ur.io';
const BRAND_KIT = 'https://drive.google.com/drive/folders/1086NAso9dA9ytMC0Dg5LoKZ4RSxgcXD8?usp=sharing';

function SocialIcon({ name }) {
    if (name === 'discord') return (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.317 4.3698A19.791 19.791 0 0 0 15.885 3a13.77 13.77 0 0 0-.567 1.17 18.27 18.27 0 0 0-5.632 0A12.64 12.64 0 0 0 9.112 3a19.736 19.736 0 0 0-4.434 1.372C1.874 8.54 1.114 12.6 1.494 16.603a17.76 17.76 0 0 0 5.43 2.743 13.37 13.37 0 0 0 1.3-1.78 11.36 11.36 0 0 1-2.047-.98c.172-.126.34-.256.504-.389a14.2 14.2 0 0 0 12.624 0c.165.134.332.264.504.389-.65.385-1.336.714-2.047.98.38.627.815 1.224 1.3 1.78a17.72 17.72 0 0 0 5.43-2.743c.445-4.64-.76-8.665-4.175-12.233ZM8.02 14.17c-1.23 0-2.24-1.12-2.24-2.49s.99-2.5 2.24-2.5c1.26 0 2.26 1.13 2.24 2.5 0 1.37-.99 2.49-2.24 2.49Zm7.96 0c-1.23 0-2.24-1.12-2.24-2.49s.99-2.5 2.24-2.5c1.26 0 2.26 1.13 2.24 2.5 0 1.37-.98 2.49-2.24 2.49Z" /></svg>
    );
    if (name === 'x') return (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25h6.826l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" /></svg>
    );
    if (name === 'telegram') return (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.91 3.79 20.3 20.84c-.25 1.21-.99 1.5-2.01.93l-5.5-4.05-2.65 2.55c-.29.29-.54.54-1.1.54l.39-5.6 10.2-9.22c.44-.39-.1-.61-.69-.22L6.33 13.71.9 12.01c-1.18-.37-1.2-1.18.25-1.75L22.36 2.1c.98-.36 1.84.24 1.55 1.69Z" /></svg>
    );
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.28-5.27-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.97 10.97 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.71 5.38-5.29 5.67.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" /></svg>
    );
}

export default function Footer({ currentPath: currentPathProp = null }) {
    const { code, setLang, langs, t } = useLanguage();
    const route = useRoute();
    const currentPath = currentPathProp || pathForRoute(route);
    const translated = routeAvailability(currentPath).kind === 'translated';
    const year = new Date().getFullYear();
    const path = (name, slug = null) => buildPath({ name, slug }, code);

    return (
        <footer className="footer">
            <div className="footer-directory">
                <nav className="footer-column" aria-label={t.footer.learn}>
                    <h2>{t.footer.learn}</h2>
                    <a href="/docs" aria-label={`${t.nav.docs} — available in English`}>{t.nav.docs} <span className="english-only-mark" lang="en">EN</span></a>
                    <a href="/build" aria-label="Build on UR — available in English">Build on UR <span className="english-only-mark" lang="en">EN</span></a>
                    <a href={path('research')}>{t.nav.research}</a>
                    <a href="/about" aria-label="About — available in English">About <span className="english-only-mark" lang="en">EN</span></a>
                    <a href="/docs/litepaper" aria-label={`${t.nav.whitepaper} — available in English`}>{t.nav.whitepaper} <span className="english-only-mark" lang="en">EN</span></a>
                </nav>

                <nav className="footer-column" aria-label={t.nav.network}>
                    <h2>{t.nav.network}</h2>
                    <a href={path('operators')}>{t.nav.operators}</a>
                    <a href={path('miners')}>{t.nav.miners}</a>
                    <a href={path('validators')}>{t.nav.validators}</a>
                </nav>

                <nav className="footer-column" aria-label={t.footer.resources}>
                    <h2>{t.footer.resources}</h2>
                    <a href={`${path('home')}${LAUNCH_VIDEO_HASH}`}>{t.footer.launchVideo}</a>
                    <a href={BRAND_KIT} target="_blank" rel="noopener noreferrer">{t.footer.brandKit}</a>
                    <a href="/investors" aria-label="Investor Centre — available in English">Investor Centre <span className="english-only-mark" lang="en">EN</span></a>
                    <a href="/llms.txt">llms.txt</a>
                </nav>
            </div>

            <nav className="footer-socials" aria-label="Community and social links">
                <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="URnetwork on X" title="X"><SocialIcon name="x" /></a>
                <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="UR subnet on Telegram" title="Telegram"><SocialIcon name="telegram" /></a>
                <a href={GENERAL_DISCORD} target="_blank" rel="noopener noreferrer" aria-label="URnetwork Discord" title="Discord"><SocialIcon name="discord" /></a>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="UR subnet on GitHub" title="GitHub"><SocialIcon name="github" /></a>
                <a className="footer-product-link" href={PRODUCT_URL} target="_blank" rel="noopener noreferrer" aria-label="URnetwork products at ur.io">ur.io <span aria-hidden="true">↗</span></a>
            </nav>

            <div className="footer-utility">
                <p>© {year} UR Foundation</p>
                <nav className="footer-legal" aria-label={t.footer.legal}>
                    <a href="/terms" aria-label={`${t.footer.terms} — available in English`}>{t.footer.terms} <span className="english-only-mark" lang="en">EN</span></a>
                    <a href="/privacy" aria-label={`${t.footer.privacy} — available in English`}>{t.footer.privacy} <span className="english-only-mark" lang="en">EN</span></a>
                    <a href="/vdp" aria-label={`${t.footer.vdp} — available in English`}>{t.footer.vdp} <span className="english-only-mark" lang="en">EN</span></a>
                </nav>
                {translated ? (
                    <nav className="footer-langs" aria-label={t.footer.languagesAria}>
                        {LANG_ORDER.map(language => (
                            <a
                                key={language}
                                href={resolveLanguageDestination(currentPath, language).href}
                                lang={language}
                                className={`footer-lang ${language === code ? 'is-active' : ''}`}
                                aria-current={language === code ? 'page' : undefined}
                                onClick={(event) => { event.preventDefault(); setLang(language); }}
                            >
                                {langs[language].label}
                            </a>
                        ))}
                    </nav>
                ) : (
                    <p className="footer-language-availability" lang="en"><strong>EN</strong> Available in English</p>
                )}
            </div>
        </footer>
    );
}
