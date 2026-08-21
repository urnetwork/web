import React, { createContext, useContext, useEffect, useState } from 'react';

import { parseRoute, buildPath } from '../router';

// Dictionaries load per language. The old shape imported all six statically,
// which put ~147 KB of dictionary text in the JS of every page.
// - On the server / at build every language loads eagerly: each page renders
//   once per language.
// - On the client only the document's language (plus English, the fallback)
//   loads before hydration — top-level await, so hydration cannot start with
//   missing strings.
// - A client-side language switch (the SPA, or the astro switcher's pushState
//   path) loads the missing dictionary before switching.
const dictLoaders = import.meta.glob('./{en,ru,ar,zh,de,es}.js');
const dicts = {};

function langOfFile(file) {
    return file.slice('./'.length, -'.js'.length);
}

async function loadDict(code) {
    if (dicts[code]) return dicts[code];
    const loader = dictLoaders[`./${code}.js`];
    if (!loader) return null;
    dicts[code] = (await loader()).default;
    return dicts[code];
}

if (import.meta.env.SSR) {
    const eager = import.meta.glob('./{en,ru,ar,zh,de,es}.js', { eager: true });
    for (const [file, mod] of Object.entries(eager)) {
        dicts[langOfFile(file)] = mod.default;
    }
} else {
    const docLang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    await Promise.all(
        [...new Set(['en', docLang])].map((code) => loadDict(code))
    );
}

/**
 * Catalog of supported languages. Each entry carries the BCP-47 code,
 * the short label rendered in the switcher, the autonym (so RU shows up
 * as "Русский" in dropdowns), the translation dictionary, and the text
 * direction for `<html dir>`.
 */
export const LANGS = {
    en: { code: 'en', label: 'EN', name: 'English', dir: 'ltr' },
    ru: { code: 'ru', label: 'RU', name: 'Русский', dir: 'ltr' },
    ar: { code: 'ar', label: 'AR', name: 'العربية', dir: 'rtl' },
    zh: { code: 'zh', label: 'ZH', name: '中文', dir: 'ltr' },
    de: { code: 'de', label: 'DE', name: 'Deutsch', dir: 'ltr' },
    es: { code: 'es', label: 'ES', name: 'Español', dir: 'ltr' }
};

// Display order in the switcher matches the order requested by product.
export const LANG_ORDER = ['en', 'ru', 'ar', 'zh', 'de', 'es'];

export const DEFAULT_LANG = 'en';
export const LANG_KEY = 'ur.xyz.lang';

/**
 * Build the canonical URL path for a given language. English lives at
 * the root, every other language at /<code>.
 */
export function pathForLang(code) {
    return code === DEFAULT_LANG ? '/' : `/${code}`;
}

/**
 * Parse the leading /xx out of `pathname`. Returns the language code if
 * it matches a supported language, otherwise null.
 */
export function parseLangFromPath(pathname) {
    const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');
    const match = path.match(/^\/([a-z]{2})(?:\/|$)/i);
    if (!match) return null;
    const code = match[1].toLowerCase();
    return LANGS[code] ? code : null;
}

/**
 * Decide which language the visitor should see on initial load.
 *
 *   1. URL — if /xx is a supported code, that wins (lets people share
 *      a direct link to a specific language).
 *   2. localStorage — if the visitor has previously made an explicit
 *      choice via the switcher, honour it.
 *   3. Browser language — `navigator.language` slice; only used if it
 *      maps to a language we ship.
 *   4. Default — English.
 *
 * The returned `fromUrl` flag tells the caller whether the URL already
 * agrees with the chosen language; if not, the caller is responsible
 * for syncing the URL via history.replaceState.
 */
export function resolveInitialLang() {
    if (typeof window === 'undefined') {
        return { code: DEFAULT_LANG, fromUrl: true };
    }

    const urlLang = parseLangFromPath();
    if (urlLang) return { code: urlLang, fromUrl: true };

    let stored = null;
    try { stored = window.localStorage.getItem(LANG_KEY); } catch (e) { /* private mode */ }
    if (stored && LANGS[stored]) return { code: stored, fromUrl: false };

    const nav = (window.navigator && (window.navigator.language || window.navigator.userLanguage)) || '';
    const browser = nav.slice(0, 2).toLowerCase();
    if (LANGS[browser]) return { code: browser, fromUrl: false };

    return { code: DEFAULT_LANG, fromUrl: false };
}

/**
 * Apply `<html lang>` and `<html dir>` for the given language. Called
 * synchronously from main.jsx before React mounts so the page never
 * renders with the wrong direction (matters for Arabic).
 */
export function applyHtmlAttributes(code) {
    if (typeof document === 'undefined') return;
    const lang = LANGS[code] || LANGS[DEFAULT_LANG];
    document.documentElement.lang = lang.code;
    document.documentElement.dir = lang.dir;
}

const LanguageContext = createContext({
    code: DEFAULT_LANG,
    // every surface renders inside LanguageProvider; this default only guards
    // accidental out-of-provider use
    t: {},
    setLang: () => {}
});

export function LanguageProvider({ children, initialLang }) {
    const [code, setCode] = useState(() => {
        // An explicit initialLang (passed by the Astro islands, which know the
        // page's language at build time) wins, so the server render and the
        // first client render agree. Without it, SSR defaults to English while
        // the client reads a localized URL — a hydration mismatch. In the React
        // SPA no initialLang is passed and we read the URL back, exactly as
        // before (main.jsx has already aligned the URL with the language).
        return initialLang || parseLangFromPath() || DEFAULT_LANG;
    });

    // Keep <html lang> / <html dir> in sync on every change.
    useEffect(() => {
        applyHtmlAttributes(code);
    }, [code]);

    // Browser back/forward navigation between language URLs.
    useEffect(() => {
        const onPopState = () => {
            const urlLang = parseLangFromPath() || DEFAULT_LANG;
            loadDict(urlLang).then(() => setCode(urlLang));
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const setLang = (newCode) => {
        if (!LANGS[newCode] || newCode === code) {
            // No-op for unsupported codes; for same-language taps, still
            // record the explicit choice so the visitor's next visit
            // honours it even if their browser language has shifted.
            if (LANGS[newCode]) {
                try { window.localStorage.setItem(LANG_KEY, newCode); } catch (e) {}
            }
            return;
        }
        try { window.localStorage.setItem(LANG_KEY, newCode); } catch (e) {}
        // Preserve the current route (home / docs / api) when switching
        // languages so a visitor reading /docs/protocol-research in
        // English doesn't get bounced to the localised home page. The
        // dictionary loads before the switch so no frame renders with
        // missing strings.
        loadDict(newCode).then(() => {
            const route = parseRoute(window.location.pathname);
            const path = buildPath(route, newCode);
            if (window.location.pathname !== path) {
                window.history.pushState(null, '', path);
            }
            setCode(newCode);
        });
    };

    const value = {
        code,
        t: dicts[code] || dicts[DEFAULT_LANG] || {},
        setLang,
        langs: LANGS,
        order: LANG_ORDER
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
