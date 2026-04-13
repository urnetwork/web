/**
 * Re-export the React app's i18n data for Astro build-time use.
 * These are plain JS objects — no React context needed.
 */
export { default as en } from '@react/i18n/en.js';
export { default as ru } from '@react/i18n/ru.js';
export { default as ar } from '@react/i18n/ar.js';
export { default as zh } from '@react/i18n/zh.js';
export { default as de } from '@react/i18n/de.js';
export { default as es } from '@react/i18n/es.js';

export const LANGS = {
    en: { label: 'EN', name: 'English',  dir: 'ltr' },
    ru: { label: 'RU', name: 'Русский',  dir: 'ltr' },
    ar: { label: 'AR', name: 'العربية',  dir: 'rtl' },
    zh: { label: 'ZH', name: '中文',      dir: 'ltr' },
    de: { label: 'DE', name: 'Deutsch',  dir: 'ltr' },
    es: { label: 'ES', name: 'Español',  dir: 'ltr' },
};

export const LANG_CODES = Object.keys(LANGS);
export const NON_EN_LANGS = LANG_CODES.filter(c => c !== 'en');
export const DEFAULT_LANG = 'en';

const DICTS = { en: undefined, ru: undefined, ar: undefined, zh: undefined, de: undefined, es: undefined };

// Lazy-load to avoid circular import at module top-level.
export async function getDict(code) {
    if (!DICTS[code]) {
        const mod = await import(`@react/i18n/${code}.js`);
        DICTS[code] = mod.default;
    }
    return DICTS[code];
}

/** Sections that have their own page route. */
export const SECTION_ROUTES = ['research', 'providers', 'extenders', 'community'];
