/**
 * Re-export the React app's i18n data for Astro build-time use.
 * These are plain JS objects — no React context needed.
 */
import en from '@react/i18n/en.js';
import ru from '@react/i18n/ru.js';
import ar from '@react/i18n/ar.js';
import zh from '@react/i18n/zh.js';
import de from '@react/i18n/de.js';
import es from '@react/i18n/es.js';
import { SITE_LANG_CODES } from './route-localization.js';

export { en, ru, ar, zh, de, es };

export const LANGS = {
    en: { label: 'EN', name: 'English',  dir: 'ltr' },
    ru: { label: 'RU', name: 'Русский',  dir: 'ltr' },
    ar: { label: 'AR', name: 'العربية',  dir: 'rtl' },
    zh: { label: 'ZH', name: '中文',      dir: 'ltr' },
    de: { label: 'DE', name: 'Deutsch',  dir: 'ltr' },
    es: { label: 'ES', name: 'Español',  dir: 'ltr' },
};

export const LANG_CODES = [...SITE_LANG_CODES];
export const NON_EN_LANGS = LANG_CODES.filter(c => c !== 'en');
export const DEFAULT_LANG = 'en';

const DICTS = { en, ru, ar, zh, de, es };

// Astro consumes every dictionary while prerendering localized pages. Keep
// this async API for callers, but avoid ineffective dynamic imports of modules
// that are already statically loaded and re-exported above.
export async function getDict(code) {
    return DICTS[code];
}

/** Sections that have their own page route. */
export const SECTION_ROUTES = ['operators', 'miners', 'validators', 'research'];
