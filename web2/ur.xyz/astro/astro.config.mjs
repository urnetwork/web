import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REACT_SRC = path.resolve(PROJECT_ROOT, 'react/src');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');

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

// ── real <lastmod> values (the sitemap carried none at all) ──
import { execFileSync } from 'node:child_process';
import { slugFor, HIDDEN_DOC_SLUGS } from '../react/src/lib/docs-shared.js';
import { investorCentre } from './src/lib/investors.js';

function lastCommitted(cwd, rel) {
    try {
        const out = execFileSync('git', ['-C', cwd, 'log', '-1', '--pretty=format:%cs', '--', rel], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        return out || null;
    } catch {
        return null;
    }
}

// docs: each document's own last change
const DOC_DATES = new Map();
for (const abs of walk(DOCS_DIR, '.md')) {
    const rel = path.relative(DOCS_DIR, abs).replace(/\\/g, '/');
    const slug = slugFor(rel);
    if (!slug || HIDDEN_DOC_SLUGS.has(slug) || DOC_DATES.has(slug)) continue;
    const d = lastCommitted(DOCS_DIR, rel);
    if (d) DOC_DATES.set(slug, d);
}
const DOCS_UPDATED = [...DOC_DATES.values()].sort().at(-1) || null;

// sections + homepages: the language's dictionary is the content source
const LANG_DATES = {};
for (const l of ['en', 'ru', 'ar', 'zh', 'de', 'es']) {
    const d = lastCommitted(path.join(REACT_SRC, 'i18n'), `${l}.js`);
    if (d) LANG_DATES[l] = d;
}

const LETTER_DATE = investorCentre?.featured?.dateIso || null;
const LEGAL_DATES = {};
for (const doc of ['terms', 'privacy', 'vdp']) {
    const d = lastCommitted(path.join(PROJECT_ROOT, 'docs', 'legal'), `${doc}.md`);
    if (d) LEGAL_DATES[doc] = d;
}

const ENV = process.env.UR_ENV || 'main';
const envPath = path.join(__dirname, 'env', `${ENV}.json`);
const envConfig = fs.existsSync(envPath)
    ? JSON.parse(fs.readFileSync(envPath, 'utf8'))
    : {};

export default defineConfig({
    site: 'https://ur.xyz',
    integrations: [
        react(),
        // Sitemap with per-page hreflang alternates — every page exists in
        // all six languages at the same path under its /<lang> prefix.
        sitemap({
            customPages: [
                'https://ur.xyz/investors/our-letter-to-bittensor.pdf',
                'https://ur.xyz/audits/masa-l2-2025.pdf',
            ],
            i18n: {
                defaultLocale: 'en',
                locales: { en: 'en', ru: 'ru', ar: 'ar', zh: 'zh', de: 'de', es: 'es' }
            },
            serialize(item) {
                const pathname = new URL(item.url).pathname;
                const langMatch = pathname.match(/^\/(ru|ar|zh|de|es)(?=\/|$)/);
                const lang = langMatch ? langMatch[1] : 'en';
                const basePath = pathname.replace(/^\/(?:ru|ar|zh|de|es)(?=\/|$)/, '') || '/';
                const docMatch = basePath.match(/^\/docs\/(.+)$/);
                const legalMatch = basePath.match(/^\/(terms|privacy|vdp)$/);
                if (docMatch || basePath === '/docs' || legalMatch) {
                    // docs/legal dates come from the corpus git history ONLY —
                    // when the docs submodule gitlink is broken (this checkout's
                    // is; see SEO3.md I-items) they get NO lastmod rather than
                    // a mislabeled dictionary date.
                    const d = docMatch
                        ? DOC_DATES.get(docMatch[1])
                        : legalMatch
                          ? LEGAL_DATES[legalMatch[1]]
                          : DOCS_UPDATED;
                    if (d) item.lastmod = d;
                } else if (basePath.startsWith('/investors') && LETTER_DATE) {
                    item.lastmod = LETTER_DATE;
                } else if (LANG_DATES[lang]) {
                    // home + sections: the language dictionary is the copy source
                    item.lastmod = LANG_DATES[lang];
                }
                const isEnglishOnlyDocsRedirect = /^\/(ru|ar|zh|de|es)\/docs(?:\/|$)/.test(pathname);
                const isRetiredAlias = pathname === '/docs/whitepaper' || pathname === '/investors/august-investment-letter';
                if (isEnglishOnlyDocsRedirect || isRetiredAlias) return undefined;

                // Docs and investor content are English-only. Do not advertise
                // nonexistent or redirecting locale versions of those pages.
                if (
                    pathname === '/docs' || pathname.startsWith('/docs/') ||
                    pathname === '/investors' || pathname.startsWith('/investors/')
                ) {
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
        plugins: [urXyzContent()],
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
