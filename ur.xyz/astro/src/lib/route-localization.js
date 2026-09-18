// Routes with real, translated static pages. Keep this as a positive list:
// an English-only page added under src/pages must not silently advertise
// unserved /<lang>/... variants in its head or sitemap.
export const SITE_LANG_CODES = Object.freeze(['en', 'ru', 'ar', 'zh', 'de', 'es']);
export const NON_EN_SITE_LANG_CODES = Object.freeze(SITE_LANG_CODES.filter(code => code !== 'en'));

const LANG_PREFIX = new RegExp(`^/(${NON_EN_SITE_LANG_CODES.join('|')})(?=/|$)`);
const LOCALIZED_BASE_PATHS = new Set([
    '/',
    '/operators',
    '/miners',
    '/validators',
    '/research',
    '/terms',
    '/privacy',
    '/vdp',
]);

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
    return LOCALIZED_BASE_PATHS.has(basePathFor(pathname));
}
