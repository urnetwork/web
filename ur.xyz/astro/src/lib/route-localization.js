// Routes with real, translated static pages. Keep this as a positive list:
// an English-only page added under src/pages must not silently advertise
// unserved /<lang>/... variants in its head or sitemap.
//
// Everything else is English-only and exists at its bare path alone: the docs,
// /about, /build, /investors and the legal documents (a translated contract
// would be a different contract, so /terms, /privacy and /vdp are not built
// per language). Their /<lang>/... URLs redirect to the English page (nginx),
// and the SPA router maps them the same way.
//
// This module is plain data + functions with no imports: it is read by the
// Astro config and layout at build time, by the React i18n layer in the
// browser, and by node tests.
export const SITE_LANG_CODES = Object.freeze(['en', 'ru', 'ar', 'zh', 'de', 'es']);
export const NON_EN_SITE_LANG_CODES = Object.freeze(SITE_LANG_CODES.filter(code => code !== 'en'));
export const LOCALIZED_BASE_PATHS = Object.freeze([
    '/',
    '/operators',
    '/miners',
    '/validators',
    '/research',
]);

// The visitor's explicit language choice, written by the language switcher.
export const LANG_STORAGE_KEY = 'ur.xyz.lang';

const LANG_PREFIX = new RegExp(`^/(${NON_EN_SITE_LANG_CODES.join('|')})(?=/|$)`);
const LOCALIZED = new Set(LOCALIZED_BASE_PATHS);

export function publicPathFor(pathname) {
    const path = String(pathname || '/')
        .split('#', 1)[0]
        .split('?', 1)[0]
        .replace(/\/index\.html$/, '/')
        .replace(/\.html$/, '')
        .replace(/\/$/, '');
    return path || '/';
}

export function langForPath(pathname) {
    return publicPathFor(pathname).match(LANG_PREFIX)?.[1] || 'en';
}

export function basePathFor(pathname) {
    return publicPathFor(pathname).replace(LANG_PREFIX, '') || '/';
}

export function hasLocalizedVersion(pathname) {
    return LOCALIZED.has(basePathFor(pathname));
}

/**
 * The URL of `pathname`'s page in `lang` when the page has a translation,
 * otherwise `lang`'s home page. English lives at the bare path.
 */
export function localizedPathFor(pathname, lang) {
    const base = hasLocalizedVersion(pathname) ? basePathFor(pathname) : '/';
    if (!NON_EN_SITE_LANG_CODES.includes(lang)) return base;
    return base === '/' ? `/${lang}` : `/${lang}${base}`;
}

/**
 * Where a visitor who explicitly chose `stored` belongs when they land on
 * `pathname`, or null to stay. Only a bare (English) URL of a page that has
 * translations moves: a /<lang>/ URL names its language and wins, a page
 * without translations stays English, and English itself never redirects. The
 * target always carries a language prefix, so it can never redirect again.
 */
export function storedLanguageTarget(pathname, stored) {
    if (!NON_EN_SITE_LANG_CODES.includes(stored)) return null;
    const path = publicPathFor(pathname);
    if (langForPath(path) !== 'en' || !hasLocalizedVersion(path)) return null;
    return localizedPathFor(path, stored);
}

/**
 * storedLanguageTarget as a self-contained inline <head> script for the
 * static pages: it has to run before the first paint, so it cannot wait for a
 * module. The route data is embedded; a storage failure (private mode, blocked
 * cookies) leaves the page alone.
 */
export function storedLanguageRedirectScript() {
    const langs = JSON.stringify(NON_EN_SITE_LANG_CODES);
    const paths = JSON.stringify(LOCALIZED_BASE_PATHS);
    return [
        '(function(){try{',
        `var l=localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)});`,
        `if(${langs}.indexOf(l)<0)return;`,
        "var p=location.pathname.replace(/\\/index\\.html$/,'/').replace(/\\.html$/,'').replace(/\\/$/,'')||'/';",
        `if(${paths}.indexOf(p)<0)return;`,
        "location.replace('/'+l+(p==='/'?'':p)+location.search+location.hash);",
        '}catch(e){}})();',
    ].join('');
}
