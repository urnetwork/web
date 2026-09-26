import { useEffect, useState } from 'react';

import { LOCALIZED_BASE_PATHS } from '../../astro/src/lib/route-localization.js';

/**
 * Tiny client-side router for ur.xyz.
 *
 * Each content section (research, providers, extenders, community) lives
 * at its own top-level path. The whitepaper section remains on the home
 * page below the simulation hero. The docs explorer and
 * OpenAPI explorer also have their own routes. The optional `/<lang>`
 * prefix used by the i18n layer is stripped before route detection so
 * a Chinese visitor at `/zh/providers` still resolves correctly.
 *
 * Only the home page and the sections are translated (the same list the
 * static build publishes hreflang for, LOCALIZED_BASE_PATHS). Every other
 * route is English-only: buildPath never gives it a language prefix, and a
 * prefixed URL still resolves to it (/de/about is /about, as /de/docs is
 * /docs), which is where the static host redirects those URLs.
 *
 * State is just `window.location.pathname`. We push it with
 * pushState/popstate so back/forward work, and re-emit a popstate
 * synthetic event from `navigate` so subscribers (this router and the
 * LanguageProvider) re-read the URL on the same tick.
 */

export const SUPPORTED_LANGS = ['en', 'ru', 'ar', 'zh', 'de', 'es'];

const SUPPORTED_LANG_SET = new Set(SUPPORTED_LANGS);
const LANG_RE = /^\/([a-z]{2})(?=\/|$)/i;

export function splitPath(pathname) {
    const p = pathname || '/';
    const m = p.match(LANG_RE);
    if (m && SUPPORTED_LANG_SET.has(m[1].toLowerCase())) {
        const rest = p.slice(m[0].length);
        return { lang: m[1].toLowerCase(), rest: rest || '/' };
    }
    return { lang: 'en', rest: p };
}

/** Section names that map 1:1 to top-level paths (e.g. /providers). */
export const SECTION_ROUTES = ['operators', 'miners', 'validators', 'research'];

/**
 * Legal documents — top-level paths, linked from the footer only. English
 * only by design: a translated contract would be a different contract.
 */
export const LEGAL_ROUTES = ['terms', 'privacy', 'vdp'];

/**
 * The English-only pages (components/pages): each routes 1:1 to its path,
 * and the Investor Centre's documents live under /investors/<slug>. They
 * have no translations, so they exist at the bare path only.
 */
export const PAGE_ROUTES = ['about', 'investors', 'build'];

const SECTION_SET = new Set(SECTION_ROUTES);
const LEGAL_SET = new Set(LEGAL_ROUTES);
const PAGE_SET = new Set(PAGE_ROUTES);
// route names with translated pages: '/' is home, '/miners' is miners, …
const TRANSLATED_SET = new Set(LOCALIZED_BASE_PATHS.map(path => (path === '/' ? 'home' : path.slice(1))));

/** Whether a route has translated pages (a `/<lang>/…` URL of its own). */
export function isTranslatedRoute(route) {
    return TRANSLATED_SET.has(route?.name || 'home');
}

export function parseRoute(pathname) {
    const { rest } = splitPath(pathname);
    if (rest === '/' || rest === '') return { name: 'home', slug: null };

    // Strip leading slash and trailing slash for matching.
    const bare = rest.replace(/^\//, '').replace(/\/$/, '');
    if (SECTION_SET.has(bare)) return { name: bare, slug: null };

    // English-only pages resolve under a language prefix too, like the docs:
    // /de/about is the English /about.
    if (PAGE_SET.has(bare)) return { name: bare, slug: null };
    if (bare.startsWith('investors/')) {
        return { name: 'investors', slug: bare.slice('investors/'.length) };
    }

    if (bare === 'docs') return { name: 'docs', slug: null };
    if (bare.startsWith('docs/')) {
        return { name: 'docs', slug: bare.slice('docs/'.length) };
    }
    if (bare === 'api') return { name: 'api', slug: null };
    if (bare === 'price') return { name: 'price', slug: null };
    if (LEGAL_SET.has(bare)) return { name: bare, slug: null };
    return { name: 'home', slug: null };
}

/**
 * Build a URL for a given route under a given language. English lives
 * at the bare path; a translated route (home, the sections) carries the
 * `/<lang>` prefix of any other language. An English-only route is always
 * its bare path: a prefixed link to it would only bounce through a redirect.
 */
export function buildPath(route, lang) {
    const prefix = lang && lang !== 'en' && isTranslatedRoute(route) ? `/${lang}` : '';
    if (!route || route.name === 'home') return prefix || '/';
    if (SECTION_SET.has(route.name)) return `${prefix}/${route.name}`;
    if (route.name === 'docs') {
        return route.slug ? `/docs/${route.slug}` : '/docs';
    }
    if (route.name === 'api') return '/api';
    if (route.name === 'price') return '/price';
    if (LEGAL_SET.has(route.name)) return `/${route.name}`;
    if (PAGE_SET.has(route.name)) {
        return route.slug ? `/${route.name}/${route.slug}` : `/${route.name}`;
    }
    return prefix || '/';
}

export function useRoute() {
    const [route, setRoute] = useState(() =>
        parseRoute(typeof window !== 'undefined' ? window.location.pathname : '/')
    );
    useEffect(() => {
        // Sync with the real pathname on mount — during SSR the initial
        // state falls back to '/' so hydration may carry a stale value.
        setRoute(parseRoute(window.location.pathname));
        const onPop = () => setRoute(parseRoute(window.location.pathname));
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);
    return route;
}

/**
 * Navigate to a path. Pushes onto history (so back works), then fires a
 * synthetic popstate so every subscriber that listens for URL changes —
 * this router *and* the LanguageProvider — picks the change up on the
 * same tick.
 */
export function navigate(to) {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === to) return;

    // In the Astro static build, do a full page load instead of pushState
    // so the browser fetches the pre-rendered HTML for the target route.
    if (window.__ASTRO_STATIC__) {
        window.location.href = to;
        return;
    }

    window.history.pushState(null, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
    // Routes outside the home page should always start at the top.
    window.scrollTo(0, 0);
}
