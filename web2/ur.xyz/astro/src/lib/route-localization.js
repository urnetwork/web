// The route-localization policy is the shared seam for Astro, React and the
// build/test tooling. Keep translated routes as a positive list: a newly added
// English page must not silently advertise unserved /<lang>/... variants.
export const SITE_LANG_CODES = Object.freeze(['en', 'ru', 'ar', 'zh', 'de', 'es']);
export const NON_EN_SITE_LANG_CODES = Object.freeze(SITE_LANG_CODES.filter(code => code !== 'en'));

const LANG_PREFIX = new RegExp(`^/(${NON_EN_SITE_LANG_CODES.join('|')})(?=/|$)`);
const LOCALIZED_BASE_PATHS = new Set([
    '/',
    '/operators',
    '/miners',
    '/validators',
    '/research',
]);

export const LEGAL_BASE_PATHS = Object.freeze(['/terms', '/privacy', '/vdp']);

const ENGLISH_ONLY_BASE_PATHS = new Set([
    '/about',
    '/build',
    '/docs',
    '/investors',
    '/investors/deck',
    '/investors/our-letter-to-bittensor',
    ...LEGAL_BASE_PATHS,
]);

// Public aliases remain known routes, but their canonical destination is the
// corresponding English document.
const LEGACY_ALIASES = new Map([
    ['/docs/whitepaper', '/docs/litepaper'],
    ['/investors/august-investment-letter', '/investors/our-letter-to-bittensor'],
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

function urlPartsFor(value) {
    const input = String(value || '/');
    try {
        const absolute = new URL(input);
        return { pathname: absolute.pathname, suffix: `${absolute.search}${absolute.hash}` };
    } catch {
        // Relative/public URL; split it without requiring an arbitrary origin.
    }
    const hashAt = input.indexOf('#');
    const queryAt = input.indexOf('?');
    const suffixAt = [hashAt, queryAt].filter(index => index >= 0).sort((a, b) => a - b)[0];
    return {
        pathname: suffixAt === undefined ? input : input.slice(0, suffixAt),
        suffix: suffixAt === undefined ? '' : input.slice(suffixAt),
    };
}

function isEnglishOnlyBasePath(basePath) {
    return ENGLISH_ONLY_BASE_PATHS.has(basePath) || basePath.startsWith('/docs/');
}

/**
 * Classify a public route independently of the requested language.
 *
 * translated: a real document exists in every SITE_LANG_CODES language
 * english-only: a known page whose authoritative document is unprefixed
 * alias: a known legacy URL with an authoritative English destination
 * unknown: never manufacture a destination for it
 */
export function routeAvailability(pathname) {
    const publicPath = publicPathFor(pathname);
    const basePath = basePathFor(publicPath);
    if (LOCALIZED_BASE_PATHS.has(basePath)) {
        return { kind: 'translated', basePath, canonicalPath: basePath };
    }
    if (LEGACY_ALIASES.has(basePath)) {
        return { kind: 'alias', basePath, canonicalPath: LEGACY_ALIASES.get(basePath) };
    }
    if (isEnglishOnlyBasePath(basePath)) {
        return { kind: 'english-only', basePath, canonicalPath: basePath };
    }
    return { kind: 'unknown', basePath, canonicalPath: publicPath };
}

/**
 * Resolve a language choice without losing page identity or URL state.
 * Query strings and fragments are preserved; metadata callers continue to use
 * publicPathFor(), which intentionally strips both.
 */
export function resolveLanguageDestination(currentUrl, targetLang) {
    const requestedLang = SITE_LANG_CODES.includes(targetLang) ? targetLang : 'en';
    const { pathname, suffix } = urlPartsFor(currentUrl);
    const currentPath = publicPathFor(pathname);
    const availability = routeAvailability(currentPath);

    if (availability.kind === 'translated') {
        const prefix = requestedLang === 'en' ? '' : `/${requestedLang}`;
        const localizedPath = availability.basePath === '/'
            ? (prefix || '/')
            : `${prefix}${availability.basePath}`;
        return { ...availability, requestedLang, href: `${localizedPath}${suffix}` };
    }

    if (availability.kind === 'english-only' || availability.kind === 'alias') {
        return {
            ...availability,
            requestedLang,
            href: `${availability.canonicalPath}${suffix}`,
        };
    }

    // Unknown routes stay exactly where they are. In particular, they never
    // become a localized homepage.
    return { ...availability, requestedLang, href: `${currentPath}${suffix}` };
}
