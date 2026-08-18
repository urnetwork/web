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
const OPENAPI_PATH = path.join(PROJECT_ROOT, 'build', 'bringyour.yml');

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
 * Vite plugin that exposes the same virtual modules the React app uses:
 *   virtual:ur-docs    — the docs/ markdown corpus
 *   virtual:ur-openapi — the build/bringyour.yml OpenAPI document
 */
function urXyzContent() {
    const DOCS_ID = 'virtual:ur-docs';
    const RESOLVED_DOCS_ID = '\0' + DOCS_ID;
    const API_ID = 'virtual:ur-openapi';
    const RESOLVED_API_ID = '\0' + API_ID;

    return {
        name: 'ur-xyz-content',
        resolveId(id) {
            if (id === DOCS_ID) return RESOLVED_DOCS_ID;
            if (id === API_ID) return RESOLVED_API_ID;
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
            if (id === RESOLVED_API_ID) {
                const yml = fs.existsSync(OPENAPI_PATH)
                    ? fs.readFileSync(OPENAPI_PATH, 'utf8')
                    : '';
                return `export default ${JSON.stringify(yml)};`;
            }
            return null;
        }
    };
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
            i18n: {
                defaultLocale: 'en',
                locales: { en: 'en', ru: 'ru', ar: 'ar', zh: 'zh', de: 'de', es: 'es' }
            },
            serialize(item) {
                const pathname = new URL(item.url).pathname;
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
        }
    }
});
