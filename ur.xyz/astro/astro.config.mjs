import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { basePathFor, hasLocalizedVersion } from './src/lib/route-localization.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REACT_SRC = path.resolve(PROJECT_ROOT, 'react/src');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const RESPONSIVE_PREVIEW = path.join(__dirname, 'dev', 'responsive-preview.html');

/** Walk a directory and return absolute paths of every file matching `ext`. */
function walk(dir, ext) {
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name.startsWith('.')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(p, ext));
        else if (e.name.endsWith(ext)) out.push(p);
    }
    return out;
}

/**
 * Vite plugin that exposes the same virtual module the React app uses:
 *   virtual:ur-docs — the docs/ markdown corpus
 * (virtual:ur-openapi was retired with the /api explorer.)
 */
function urXyzContent() {
    const DOCS_ID = 'virtual:ur-docs';
    const RESOLVED_DOCS_ID = '\0' + DOCS_ID;
    return {
        name: 'ur-xyz-content',
        resolveId(id) {
            if (id === DOCS_ID) return RESOLVED_DOCS_ID;
            return null;
        },
        load(id) {
            if (id === RESOLVED_DOCS_ID) {
                const files = walk(DOCS_DIR, '.md');
                const docs = files.map(abs => ({
                    path: path.relative(DOCS_DIR, abs).replace(/\\/g, '/'),
                    content: fs.readFileSync(abs, 'utf8')
                }));
                return `export default ${JSON.stringify(docs)};`;
            }
            return null;
        }
    };
}

/** Development-only route for the responsive preview tool. */
function urXyzDevRoutes() {
    return {
        name: 'ur-xyz-dev-routes',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (!req.url) return next();
                const queryIndex = req.url.indexOf('?');
                const pathname = queryIndex === -1 ? req.url : req.url.slice(0, queryIndex);
                if (pathname === '/responsive-preview' || pathname === '/responsive-preview/') {
                    if (!fs.existsSync(RESPONSIVE_PREVIEW)) return next();
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.setHeader('Cache-Control', 'no-store');
                    res.end(fs.readFileSync(RESPONSIVE_PREVIEW, 'utf8'));
                    return;
                }
                return next();
            });
        },
    };
}

// ── <lastmod>: the day each page's content last changed ──
// scripts/page-dates.mjs fingerprints every page the build writes and keeps
// the day each fingerprint last changed in page-dates.json (committed with the
// content). The integration below updates it once the pages are on disk, and
// the sitemap reads it. It replaced git dates, which dated a page by its source
// files: a shared dictionary re-dated every section when one changed, and a
// commit that only moved files re-dated everything it moved.
import { refreshPageDates, SITEMAP_FILES } from './scripts/page-dates.mjs';
// llms.txt / llms-full.txt are built from the finished pages (see the script)
import { writeLlmsFiles } from '../scripts/generate-agent-assets-llms.mjs';

// the record as of this build, keyed by public path ("/", "/de/miners", …)
let pageDates = null;
const pagePathOf = (url) => {
    const p = new URL(url).pathname;
    return p === '/' ? '/' : p.replace(/\/$/, '');
};

const ENV = process.env.UR_ENV || 'main';
const envPath = path.join(__dirname, 'env', `${ENV}.json`);
const envConfig = fs.existsSync(envPath)
    ? JSON.parse(fs.readFileSync(envPath, 'utf8'))
    : {};

export default defineConfig({
    site: 'https://ur.xyz',
    integrations: [
        // Streamed rendering in React 18.3 flushes its 2 KB buffer inside a
        // multibyte character and leaves NUL bytes in the zh and ar pages;
        // renderToString does not.
        react({ experimentalDisableStreaming: true }),
        // Runs before the sitemap (build:done hooks run in this order): update
        // page-dates.json from the pages just written, and hand the record to
        // the sitemap. UR_PAGE_DATES=check computes the dates without writing
        // the file, for a build that must not modify the checkout; the gate
        // (scripts/page-dates.mjs --check) then fails if the record is stale.
        {
            name: 'page-dates',
            hooks: {
                'astro:build:done': async ({ dir, logger }) => {
                    pageDates = await refreshPageDates(fileURLToPath(dir), {
                        write: process.env.UR_PAGE_DATES !== 'check',
                        log: logger,
                    });
                },
            },
        },
        // Sitemap with alternates only for routes backed by translated pages.
        sitemap({
            customPages: SITEMAP_FILES.map((p) => `https://ur.xyz${p}`),
            i18n: {
                defaultLocale: 'en',
                locales: { en: 'en', ru: 'ru', ar: 'ar', zh: 'zh', de: 'de', es: 'es' }
            },
            serialize(item) {
                const pathname = pagePathOf(item.url);
                // The record holds exactly the pages that belong in a sitemap:
                // indexable, their own canonical (redirect stubs, unlocalized
                // /<lang>/ aliases and retired paths are not in it).
                const record = pageDates?.get(pathname);
                if (!record) return undefined;
                item.lastmod = record.lastmod;

                // English-only pages have no hreflang cluster. This includes
                // future routes until they are explicitly added to the shared
                // localized-route list alongside real translated pages.
                if (!hasLocalizedVersion(basePathFor(pathname))) {
                    item.links = undefined;
                }

                // the head advertises an x-default alternate; the sitemap should agree
                if (item.links?.length) {
                    const en = item.links.find((l) => l.lang === 'en');
                    if (en && !item.links.some((l) => l.lang === 'x-default')) {
                        item.links.push({ lang: 'x-default', url: en.url });
                    }
                }
                return item;
            }
        }),
        // The llms.txt map and the single-fetch llms-full.txt, listing the
        // pages this build wrote (they were a hand-kept list that missed /build).
        {
            name: 'llms-txt',
            hooks: {
                'astro:build:done': async ({ dir, logger }) => {
                    writeLlmsFiles(fileURLToPath(dir), { log: logger });
                },
            },
        },
        // The sitemap lib normalizes the root <loc> to the origin without a
        // trailing slash while its own alternates (and the page canonical) use
        // "https://ur.xyz/". Patch the written file after build.
        {
            name: 'sitemap-root-slash',
            hooks: {
                'astro:build:done': async ({ dir }) => {
                    const { readFileSync, writeFileSync, existsSync } = await import('node:fs');
                    const file = new URL('./sitemap-0.xml', dir);
                    if (!existsSync(file)) return;
                    const xml = readFileSync(file, 'utf8');
                    const patched = xml.replace(/<loc>(https?:\/\/[^/<]+)<\/loc>/g, '<loc>$1/</loc>');
                    if (patched !== xml) writeFileSync(file, patched);
                },
            },
        },
    ],
    output: 'static',
    // flatten every route to a flat .html file (price.html, de/price.html),
    // matching the nginx `try_files $uri $uri.html` static routing
    build: { format: 'file' },
    outDir: path.resolve(__dirname, 'build', ENV),
    vite: {
        plugins: [urXyzContent(), urXyzDevRoutes()],
        resolve: {
            alias: {
                '@react': REACT_SRC
            }
        },
        define: {
            '__UR_ENV__': JSON.stringify(envConfig)
        },
        // Allow imports from the react/ source tree
        server: {
            fs: { allow: [PROJECT_ROOT] }
        },
        build: {
            // the i18n module top-level-awaits the page language's dictionary
            // so hydration cannot start with missing strings; TLA needs es2022
            target: 'es2022'
        }
    }
});
