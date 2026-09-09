import React, { createContext, useContext, useEffect, useState } from 'react';

import { resolveLanguageDestination } from '../../../astro/src/lib/route-localization.js';

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
 * An unprefixed URL is an explicit English URL. Saved preferences never
 * override it or silently change page identity.
 */
export function resolveInitialLang() {
    if (typeof window === 'undefined') {
        return { code: DEFAULT_LANG, fromUrl: true };
    }

    const urlLang = parseLangFromPath();
    if (urlLang) return { code: urlLang, fromUrl: true };

    return { code: DEFAULT_LANG, fromUrl: true };
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
        const destination = resolveLanguageDestination(window.location.href, newCode);

        // Astro pages are separate static documents. Loading the resolved URL
        // keeps their content, metadata and hydrated islands in agreement.
        if (window.__ASTRO_STATIC__) {
            window.location.assign(destination.href);
            return;
        }

        // The development SPA follows the same policy but can update in place.
        loadDict(newCode).then(() => {
            if (window.location.pathname + window.location.search + window.location.hash !== destination.href) {
                window.history.pushState(null, '', destination.href);
            }
            setCode(newCode);
            window.dispatchEvent(new PopStateEvent('popstate'));
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
