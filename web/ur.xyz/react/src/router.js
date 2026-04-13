import { useEffect, useState } from 'react';

/**
 * Tiny client-side router for ur.xyz.
 *
 * The site is single-page but exposes three top-level views — the
 * landing simulation (`home`), the docs explorer (`docs` and
 * `docs/<slug>`), and the OpenAPI explorer (`api`). The optional
 * `/<lang>` prefix used by the i18n layer is stripped before route
 * detection so a Chinese visitor at `/zh/docs/protocol-research` still
 * resolves to the same `docs` route.
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

export function parseRoute(pathname) {
    const { rest } = splitPath(pathname);
    if (rest === '/' || rest === '') return { name: 'home', slug: null };
    if (rest === '/docs' || rest === '/docs/') return { name: 'docs', slug: null };
    if (rest.startsWith('/docs/')) {
        return { name: 'docs', slug: rest.slice('/docs/'.length).replace(/\/$/, '') };
    }
    if (rest === '/api' || rest === '/api/') return { name: 'api', slug: null };
    return { name: 'home', slug: null };
}

/**
 * Build a URL for a given route under a given language. English lives
 * at the bare path, every other language carries its `/<lang>` prefix.
 */
export function buildPath(route, lang) {
    const prefix = lang && lang !== 'en' ? `/${lang}` : '';
    if (!route || route.name === 'home') return prefix || '/';
    if (route.name === 'docs') {
        return route.slug ? `${prefix}/docs/${route.slug}` : `${prefix}/docs`;
    }
    if (route.name === 'api') return `${prefix}/api`;
    return prefix || '/';
}

export function useRoute() {
    const [route, setRoute] = useState(() =>
        parseRoute(typeof window !== 'undefined' ? window.location.pathname : '/')
    );
    useEffect(() => {
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
    window.history.pushState(null, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
    // Routes outside the home page should always start at the top.
    window.scrollTo(0, 0);
}
