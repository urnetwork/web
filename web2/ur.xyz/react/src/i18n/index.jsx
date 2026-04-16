import React, { createContext, useContext, useEffect, useState } from 'react';

import en from './en';
import ru from './ru';
import ar from './ar';
import zh from './zh';
import de from './de';
import es from './es';

import { parseRoute, buildPath } from '../router';

/**
 * Catalog of supported languages. Each entry carries the BCP-47 code,
 * the short label rendered in the switcher, the autonym (so RU shows up
 * as "Русский" in dropdowns), the translation dictionary, and the text
 * direction for `<html dir>`.
 */
export const LANGS = {
    en: { code: 'en', label: 'EN', name: 'English',  dict: en, dir: 'ltr' },
    ru: { code: 'ru', label: 'RU', name: 'Русский',  dict: ru, dir: 'ltr' },
    ar: { code: 'ar', label: 'AR', name: 'العربية',  dict: ar, dir: 'rtl' },
    zh: { code: 'zh', label: 'ZH', name: '中文',      dict: zh, dir: 'ltr' },
    de: { code: 'de', label: 'DE', name: 'Deutsch',  dict: de, dir: 'ltr' },
    es: { code: 'es', label: 'ES', name: 'Español',  dict: es, dir: 'ltr' }
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
    t: en,
    setLang: () => {}
});

export function LanguageProvider({ children }) {
    const [code, setCode] = useState(() => {
        // main.jsx has already aligned the URL with the resolved language;
        // we just need to read the URL back here so the provider's initial
        // state matches what's in the address bar.
        const urlLang = parseLangFromPath();
        return urlLang || DEFAULT_LANG;
    });

    // Keep <html lang> / <html dir> in sync on every change.
    useEffect(() => {
        applyHtmlAttributes(code);
    }, [code]);

    // Browser back/forward navigation between language URLs.
    useEffect(() => {
        const onPopState = () => {
            const urlLang = parseLangFromPath();
            setCode(urlLang || DEFAULT_LANG);
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
        // English doesn't get bounced to the localised home page.
        const route = parseRoute(window.location.pathname);
        const path = buildPath(route, newCode);
        if (window.location.pathname !== path) {
            window.history.pushState(null, '', path);
        }
        setCode(newCode);
    };

    const value = {
        code,
        t: (LANGS[code] && LANGS[code].dict) || en,
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
