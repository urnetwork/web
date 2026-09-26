#!/usr/bin/env node
/**
 * Writes llms.txt and llms-full.txt into a finished ur.xyz build.
 *
 *   llms.txt       the llms.txt-convention map of the site: every English page
 *                  the build publishes (title and description from its own
 *                  <head>), every document's markdown twin, and the optional
 *                  extras. It was a hand-written list, which is how /build was
 *                  missing from it; generating it from the build output lists
 *                  whatever the site actually serves.
 *   llms-full.txt  single fetch: llms.txt, the litepaper, the three role
 *                  guides, and the investor materials (the letter and the
 *                  announcement as published, and the deck's outline).
 *
 * Both are written after the pages exist, by the `llms-txt` integration in
 * astro/astro.config.mjs (so every build path has them); standalone:
 *
 *   node ../scripts/generate-agent-assets-llms.mjs build/main   (from astro/)
 *
 * The files stay small on purpose: one line per page, and llms-full.txt only
 * carries documents an agent would otherwise fetch one by one.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOC_ORDER, DOC_PAGE_PATHS, HIDDEN_DOC_SLUGS, UNLISTED_DOC_SLUGS, slugFor, splitFrontMatter } from '../react/src/lib/docs-shared.js';
import { investorCentre } from '../react/src/data/investors.js';
import { pageFacts, SITEMAP_FILES } from '../astro/scripts/page-dates.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const SITE = 'https://ur.xyz';

// The pages in the order an agent should meet them; anything the list does
// not name follows, alphabetically, so a new page is never left out.
const PAGE_ORDER = [
    '/', '/operators', '/miners', '/validators', '/research', '/build',
    '/investors', '/investors/letter-to-tokenholders-september-2026', '/investors/our-letter-to-bittensor', '/investors/conviction-lock', '/investors/deck',
    '/about',
];
const LEGAL = ['/terms', '/privacy', '/vdp'];
const FILE_LABELS = { '/audits/masa-l2-2025.pdf': 'MASA L2 2025 audit (PDF): third-party peer audit' };

function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
    String(s || '').replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (m, dec, hex, name) => {
        if (dec) return String.fromCodePoint(Number(dec));
        if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
        return ENTITIES[name.toLowerCase()] ?? m;
    });
// inline markup joins its text to what follows; any other tag separates words
const INLINE_TAG = /<\/?(?:a|abbr|b|code|em|i|kbd|mark|q|s|small|span|strong|sub|sup|time|u)\b[^>]*>/gi;
const oneLine = (html) => decode(html.replace(INLINE_TAG, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const shortTitle = (title) => title.replace(/\s+[—–|-]\s+UR(?:\s+Docs)?\s*$/u, '');

/** The page's own name: the last step of its breadcrumb trail (Base.astro), else its title. */
function pageName(html, title) {
    const json = (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
    try {
        const crumbs = JSON.parse(json)['@graph'].find((n) => n['@type'] === 'BreadcrumbList');
        const last = crumbs?.itemListElement?.at(-1)?.name;
        if (last) return last;
    } catch {
        /* no structured data: fall back to the title */
    }
    return shortTitle(title);
}

/** Every page the build publishes as its own canonical: path → { title, description, lang, html }. */
function builtPages(distDir) {
    const pages = new Map();
    for (const file of walk(distDir)) {
        if (!file.endsWith('.html')) continue;
        const urlPath = `/${path.relative(distDir, file).split(path.sep).join('/')}`.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
        const html = readFileSync(file, 'utf8');
        const facts = pageFacts(html);
        if (facts.noindex || facts.redirectStub || !facts.canonical) continue;
        if (new URL(facts.canonical).pathname.replace(/(.)\/$/, '$1') !== urlPath) continue;
        const lang = (html.match(/<html[^>]*\slang="([^"]+)"/) || [])[1] || 'en';
        pages.set(urlPath, { ...facts, lang, html });
    }
    return pages;
}

/** The prose of one element of a built page (by class), as plain markdown. */
function proseOf(html, className) {
    const open = html.search(new RegExp(`<(article|section|div)\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"`));
    if (open === -1) return '';
    const tag = html.slice(open + 1).match(/^\w+/)[0];
    // the element ends at the matching close tag (these containers do not nest their own tag name)
    const close = html.indexOf(`</${tag}>`, open);
    const fragment = html.slice(open, close === -1 ? undefined : close);
    const text = fragment
        .replace(/<!--[\s\S]*?-->/g, '')
        // letterheads, exhibits and scripts are not prose
        .replace(/<(script|style|template|svg|figure|noscript|address)\b[\s\S]*?<\/\1>/gi, '')
        .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (m, level, t) => `\n\n${'#'.repeat(Math.max(2, Number(level)))} ${oneLine(t)}\n\n`)
        .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (m, t) => `\n- ${oneLine(t)}`)
        .replace(/<hr\b[^>]*>/gi, '\n\n* * *\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|section|article|header|ul|ol|blockquote|aside)>/gi, '\n\n')
        .replace(INLINE_TAG, '')
        .replace(/<[^>]+>/g, ' ');
    return decode(text)
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function docsIndex() {
    const out = [];
    const seen = new Set();
    for (const abs of walk(DOCS_DIR).filter((f) => f.endsWith('.md')).sort()) {
        const rel = path.relative(DOCS_DIR, abs).split(path.sep).join('/');
        if (rel.split('/').some((part) => part.startsWith('.'))) continue;
        const slug = slugFor(rel);
        if (!slug || seen.has(slug) || HIDDEN_DOC_SLUGS.has(slug) || UNLISTED_DOC_SLUGS.has(slug) || DOC_PAGE_PATHS[slug]) continue;
        seen.add(slug);
        out.push({ slug, body: splitFrontMatter(readFileSync(abs, 'utf8')).body });
    }
    return out;
}

export function buildLlms(distDir) {
    const pages = builtPages(distDir);
    const en = [...pages.entries()].filter(([, p]) => p.lang === 'en');
    const rank = (u) => (PAGE_ORDER.includes(u) ? PAGE_ORDER.indexOf(u) : PAGE_ORDER.length);
    const pdfFor = Object.fromEntries(
        ['deck', 'letter', 'convictionAnnouncement']
            .map((key) => investorCentre[key])
            .filter((d) => d?.href && d?.pdfHref)
            .map((d) => [d.href, d.pdfHref]),
    );

    const siteLines = en
        .filter(([u]) => !u.startsWith('/docs') && !LEGAL.includes(u))
        .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
        .map(([u, p]) => {
            const label = u === '/' ? 'Home' : pageName(p.html, p.title);
            const pdf = pdfFor[u] ? ` ([PDF](${SITE}${pdfFor[u]}))` : '';
            return `- [${label}](${SITE}${u === '/' ? '/' : u})${pdf}: ${p.description}`;
        });
    // the documents in the sidebar's order (DOC_ORDER, then any other alphabetically);
    // an unlisted document is served but listed nowhere, this file included
    const docSlug = (u) => u.slice('/docs/'.length);
    const docRank = (u) => (DOC_ORDER.includes(docSlug(u)) ? DOC_ORDER.indexOf(docSlug(u)) : DOC_ORDER.length);
    const docLines = en
        .filter(([u]) => u.startsWith('/docs/') && !UNLISTED_DOC_SLUGS.has(docSlug(u)))
        .sort(([a], [b]) => docRank(a) - docRank(b) || a.localeCompare(b))
        .map(([u, p]) => `- [${shortTitle(p.title)}](${SITE}/docs-md/${docSlug(u)}.md): ${p.description}`);
    const optionalLines = [
        ...SITEMAP_FILES.filter((f) => existsSync(path.join(distDir, f))).map((f) => `- [${FILE_LABELS[f] || f}](${SITE}${f})`),
        ...LEGAL.filter((u) => pages.has(u)).map((u) => `- [${shortTitle(pages.get(u).title)}](${SITE}${u})`),
    ];

    const llms = `# UR

> UR is an open-source, decentralized privacy network: user traffic distributed
> across independent miners with multi-hop routing and layered encryption,
> coordinated on Bittensor (SN25). ur.xyz is the protocol's information site,
> hosted by UR Foundation. The commercial network built on it lives at https://ur.io.

## Machine-readable

- [Litepaper](${SITE}/docs/litepaper)
- [Litepaper (raw markdown)](${SITE}/litepaper.md)
- [Everything in one file](${SITE}/llms-full.txt): this file, the litepaper, the three role guides and the investor materials
- For connecting an agent to the network itself (MCP server, x402): [ur.io agents guide](https://ur.io/agents.md)

## Pages

${siteLines.join('\n')}

## Docs

- [Documentation index](${SITE}/docs)
${docLines.join('\n')}

## Optional

${optionalLines.join('\n')}
`;

    // llms-full: the map, the litepaper (the mechanism), the role guides in
    // their order, then the investor materials as published
    const docs = docsIndex();
    const litepaper = docs.find((d) => d.slug === 'litepaper')?.body.trim() || '';
    const keyDocs = DOC_ORDER
        .filter((slug) => slug !== 'litepaper')
        .map((slug) => docs.find((d) => d.slug === slug)?.body.trim())
        .filter(Boolean);

    const { letter, convictionAnnouncement: announcement, tokenholderLetter, deck } = investorCentre;
    const investor = [];
    // newest first: the September letter to tokenholders, then the letter to
    // Bittensor, the conviction announcement and the deck's outline
    const tokenholderPage = pages.get(tokenholderLetter.href);
    if (tokenholderPage) {
        // the letter runs over two .announcement-paper sheets; the stage holds both
        investor.push(`# ${tokenholderLetter.title}\n\nPublished ${tokenholderLetter.date} at ${SITE}${tokenholderLetter.href} (PDF: ${SITE}${tokenholderLetter.pdfHref})\n\n${proseOf(tokenholderPage.html, 'announcement-stage')}`);
    }
    const letterPage = pages.get(letter.href);
    if (letterPage) {
        investor.push(`# ${letter.title}\n\nPublished ${letter.date} at ${SITE}${letter.href} (PDF: ${SITE}${letter.pdfHref})\n\n${proseOf(letterPage.html, 'letter-body')}`);
    }
    const announcementPage = pages.get(announcement.href);
    if (announcementPage) {
        investor.push(`# ${announcement.headline}\n\nPublished ${announcement.date} at ${SITE}${announcement.href} (PDF: ${SITE}${announcement.pdfHref})\n\n${proseOf(announcementPage.html, 'announcement-paper')}`);
    }
    if (deck.slides?.length) {
        const slides = deck.slides.map((s, i) => `${i + 1}. **${s.title}: ${s.headline}.** ${s.summary}`).join('\n');
        investor.push(`# ${deck.title} (the investor deck)\n\n${deck.date}, ${deck.slideCount} slides, at ${SITE}${deck.href} (PDF: ${SITE}${deck.pdfHref})\n\n${deck.summary}\n\n${slides}`);
    }

    const full = [llms.trimEnd(), litepaper, ...keyDocs, ...investor].filter(Boolean).join('\n\n---\n\n') + '\n';
    return { llms, full };
}

export function writeLlmsFiles(distDir, { log = console } = {}) {
    const { llms, full } = buildLlms(distDir);
    writeFileSync(path.join(distDir, 'llms.txt'), llms);
    writeFileSync(path.join(distDir, 'llms-full.txt'), full);
    log.info?.(`llms: wrote llms.txt (${(llms.length / 1024).toFixed(1)} KB) and llms-full.txt (${(full.length / 1024).toFixed(1)} KB)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const distDir = path.resolve(process.argv[2] || 'build/main');
    if (!existsSync(distDir)) {
        console.error(`llms: no such build dir ${distDir}`);
        process.exit(2);
    }
    writeLlmsFiles(distDir);
}
