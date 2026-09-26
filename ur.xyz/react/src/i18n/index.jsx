import React, { createContext, useContext, useEffect, useState } from 'react';

import { parseRoute, buildPath, isTranslatedRoute } from '../router';
import {
    LANG_STORAGE_KEY,
    localizedPathFor,
    publicPathFor,
} from '../../../astro/src/lib/route-localization.js';

// Dictionaries load per language. The old shape imported all six statically,
// which put ~147 KB of dictionary text in the JS of every page.
// - On the server / at build every language loads eagerly: each page renders
//   once per language.
// - On the client only the page's language (plus English, the fallback)
//   loads before hydration — top-level await at the end of this module, so
//   hydration cannot start with missing strings.
// - A client-side language switch (the SPA) loads the missing dictionary
//   before switching; the static pages switch with a full page load.
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
// The visitor's explicit choice from a language switch. The SPA reads it in
// resolveInitialLang; the static pages in their <head> redirect
// (storedLanguageRedirectScript in astro/src/lib/route-localization.js).
export const LANG_KEY = LANG_STORAGE_KEY;

/**
 * Build the canonical URL path for a given language. English lives at
 * the root, every other language at /<code>.
 */
export function pathForLang(code) {
    return code === DEFAULT_LANG ? '/' : `/${code}`;
}

/**
 * The locale to hand Intl for a page language — numbers and dates follow
 * the page, never the browser. Arabic keeps Western digits: its copy writes
 * figures that way (10–20%, 200, N≥2) and the block number and countdown sit
 * in the same lines.
 */
export function intlLocale(code) {
    return code === 'ar' ? 'ar-u-nu-latn' : (LANGS[code] ? code : DEFAULT_LANG);
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

function storedLang() {
    try {
        const stored = window.localStorage.getItem(LANG_KEY);
        return LANGS[stored] ? stored : null;
    } catch (e) {
        return null; // private mode / blocked storage
    }
}

/**
 * Decide the SPA's language and URL on initial load.
 *
 *   1. A route without translations (docs, legal, about, …) is English at
 *      its bare path: /de/about becomes /about, as the static host
 *      redirects it.
 *   2. URL — if /xx is a supported code, that wins (lets people share
 *      a direct link to a specific language).
 *   3. localStorage — if the visitor has previously made an explicit
 *      choice via the switcher, honour it.
 *   4. Browser language — `navigator.language` slice; only used if it
 *      maps to a language we ship.
 *   5. Default — English.
 *
 * Returns `{ code, path }`: when `path` differs from the current pathname
 * the caller replaces the URL (history.replaceState), keeping the page.
 */
export function resolveInitialLang(pathname) {
    if (typeof window === 'undefined') {
        return { code: DEFAULT_LANG, path: pathname || '/' };
    }
    const path = pathname || window.location.pathname;
    const route = parseRoute(path);
    const urlLang = parseLangFromPath(path);

    if (!isTranslatedRoute(route)) {
        return { code: DEFAULT_LANG, path: urlLang ? buildPath(route, DEFAULT_LANG) : path };
    }
    if (urlLang) return { code: urlLang, path };

    const nav = (window.navigator && (window.navigator.language || window.navigator.userLanguage)) || '';
    const browser = nav.slice(0, 2).toLowerCase();
    const code = storedLang() || (LANGS[browser] ? browser : DEFAULT_LANG);
    return { code, path: code === DEFAULT_LANG ? path : buildPath(route, code) };
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
    // accidental out-of-provider use (the static page's standalone islands
    // take their strings as props instead)
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
        if (!LANGS[newCode]) return;
        // Every switch is an explicit choice, recorded even when it keeps the
        // current language so the next visit honours it.
        try { window.localStorage.setItem(LANG_KEY, newCode); } catch (e) { /* private mode */ }
        // Already reading it: nothing moves (an English-only page stays put).
        if (newCode === code) return;

        // The same page in the new language when it is translated, otherwise
        // that language's home: a visitor reading /miners in German stays on
        // the miners page, one on the English-only /docs lands on /de.
        const current = window.location.pathname;
        const target = localizedPathFor(current, newCode);
        const samePage = isTranslatedRoute(parseRoute(current));

        if (window.__ASTRO_STATIC__) {
            // A static page is prerendered in one language, and its islands
            // each hold their own copy of the language: only loading the
            // target's HTML shows the whole page in the new language.
            if (target !== publicPathFor(current)) {
                window.location.assign(target + (samePage ? window.location.search + window.location.hash : ''));
            }
            return;
        }

        // The SPA renders every surface from this provider: switch the
        // dictionary, then the URL, then re-render the whole page.
        loadDict(newCode).then(() => {
            if (window.location.pathname !== target) {
                window.history.pushState(null, '', target + (samePage ? window.location.hash : ''));
                // the router re-reads the URL (an English-only page lands on home)
                window.dispatchEvent(new PopStateEvent('popstate'));
                if (!samePage) window.scrollTo(0, 0);
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

// Load the dictionaries this page needs before anything renders (see top).
if (import.meta.env.SSR) {
    const eager = import.meta.glob('./{en,ru,ar,zh,de,es}.js', { eager: true });
    for (const [file, mod] of Object.entries(eager)) {
        dicts[langOfFile(file)] = mod.default;
    }
} else {
    // A static page states its language in <html lang>. The SPA's index.html
    // always says "en": its language comes from the URL, a stored choice or
    // the browser (resolveInitialLang, which main.jsx applies next).
    const docLang = (document.documentElement.lang || DEFAULT_LANG).slice(0, 2).toLowerCase();
    const pageLang = window.__ASTRO_STATIC__ ? docLang : resolveInitialLang().code;
    await Promise.all(
        [...new Set([DEFAULT_LANG, docLang, pageLang])].map((code) => loadDict(code))
    );
}
