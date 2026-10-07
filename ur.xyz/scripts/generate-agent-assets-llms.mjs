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
 *                  announcement as published, and the deck's outline). Each
 *                  document follows a `<!-- source: <url> -->` line naming
 *                  its page; a document's own horizontal rules cannot be
 *                  mistaken for that boundary, as the `---` it used to be
 *                  could. A docs document's H1 is followed by where it lives
 *                  (page, markdown twin, the day it last changed), and every
 *                  link in it is absolute (agent-markdown.mjs).
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
import { absoluteLinks } from './agent-markdown.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const SITE = 'https://ur.xyz';

// The pages in the order an agent should meet them; anything the list does
// not name follows, alphabetically, so a new page is never left out.
const PAGE_ORDER = [
    '/', '/operators', '/miners', '/validators', '/research', '/build', '/reserve',
    '/investors', '/investors/funding-network-capacity', '/investors/letter-to-tokenholders-september-2026', '/investors/our-letter-to-bittensor', '/investors/conviction-lock', '/investors/deck',
    '/about',
];
const LEGAL = ['/terms', '/privacy', '/vdp'];
const FILE_LABELS = { '/audits/masa-l2-2025.pdf': 'MASA L2 2025 audit (PDF): third-party peer audit' };
// The machine-readable files the site publishes for programs, listed when the
// build has them: the protocol repository's published operator list and the
// price sheet with its change feed.
const MACHINE_FILES = [
    ['/operators.yml', 'Network operator list (YAML)', 'the network operators miners and validators serve; they refresh it hourly'],
    ['/price.yml', 'Price sheet (YAML)', 'the published demand deposits, in alpha per GiB and per user for each 7-day block, by staked-alpha tier'],
    ['/price.rss', 'Price sheet changes (RSS)', 'a feed of changes to the published price sheet'],
];
const SOURCE_REPO = 'https://github.com/urfoundation/sn';
// the section boundary in llms-full.txt; no embedded document may contain it
const SECTION_MARK = '<!-- source:';

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

/** The day a built docs page says its content last changed: its TechArticle dateModified, the sitemap's lastmod. */
function updatedOf(html) {
    const json = (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
    try {
        const article = JSON.parse(json)['@graph'].find((n) => n['@type'] === 'TechArticle');
        return /^\d{4}-\d{2}-\d{2}$/.test(article?.dateModified || '') ? article.dateModified : null;
    } catch {
        return null;
    }
}

/** The preferred (first) contact in the build's security.txt when it is an email address, else null. */
function securityMailto(distDir) {
    const file = path.join(distDir, '.well-known', 'security.txt');
    if (!existsSync(file)) return null;
    const first = (readFileSync(file, 'utf8').match(/^Contact:\s*(\S+)/m) || [])[1];
    return first?.startsWith('mailto:') ? first : null;
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
        out.push({ slug, rel, body: splitFrontMatter(readFileSync(abs, 'utf8')).body });
    }
    return out;
}

export function buildLlms(distDir) {
    const pages = builtPages(distDir);
    const en = [...pages.entries()].filter(([, p]) => p.lang === 'en');
    const rank = (u) => (PAGE_ORDER.includes(u) ? PAGE_ORDER.indexOf(u) : PAGE_ORDER.length);
    const pdfFor = Object.fromEntries(
        ['deck', 'letter', 'convictionAnnouncement', 'tokenholderLetter', 'capacityLetter']
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
    // a legal page with its markdown twin (/terms.md beside /terms), when the build has it
    const twinOf = (u) => (existsSync(path.join(distDir, `${u.slice(1)}.md`)) ? ` ([markdown](${SITE}${u}.md))` : '');
    const optionalLines = [
        ...SITEMAP_FILES.filter((f) => existsSync(path.join(distDir, f))).map((f) => `- [${FILE_LABELS[f] || f}](${SITE}${f})`),
        ...LEGAL.filter((u) => pages.has(u)).map((u) => `- [${shortTitle(pages.get(u).title)}](${SITE}${u})${twinOf(u)}: ${pages.get(u).description}`),
    ];

    const machineLines = MACHINE_FILES
        .filter(([f]) => existsSync(path.join(distDir, f)))
        .map(([f, label, about]) => `- [${label}](${SITE}${f}): ${about}`);
    const mailto = securityMailto(distDir);
    const securityLine = existsSync(path.join(distDir, '.well-known', 'security.txt'))
        ? `- [Security contact](${SITE}/.well-known/security.txt): ${mailto ? `report vulnerabilities to [${mailto.slice('mailto:'.length)}](${mailto}) under` : 'see'} the [disclosure policy](${SITE}/vdp)`
        : null;

    const llms = `# UR

> UR is an open-source, decentralized privacy network: user traffic distributed
> across independent miners with multi-hop routing and layered encryption,
> coordinated on Bittensor (SN25). ur.xyz is the protocol's information site,
> hosted by UR Foundation. The commercial network built on it lives at https://ur.io.

## Machine-readable

- [Litepaper](${SITE}/docs/litepaper)
- [Litepaper (raw markdown)](${SITE}/litepaper.md)
- [Whitepaper](${SOURCE_REPO}/blob/main/WHITEPAPER.md): the full subnet whitepaper, in the source repository
- [Source code](${SOURCE_REPO}): the UR subnet repository, with the miner, the validator and the mainnet runbooks
- [Everything in one file](${SITE}/llms-full.txt): this file, the litepaper, the three role guides and the investor materials
${[...machineLines, securityLine].filter(Boolean).join('\n')}
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
    const embedded = ['litepaper', ...DOC_ORDER.filter((slug) => slug !== 'litepaper')]
        .map((slug) => docs.find((d) => d.slug === slug))
        .filter(Boolean)
        .map((doc) => {
            // under the H1: the page, the markdown twin and the day the page last changed
            const url = `${SITE}/docs/${doc.slug}`;
            const page = pages.get(`/docs/${doc.slug}`);
            const updated = page ? updatedOf(page.html) : null;
            const where = [`Source: ${url}`, `Markdown: ${SITE}/docs-md/${doc.slug}.md`, ...(updated ? [`Updated: ${updated}`] : [])].join(' · ');
            const body = absoluteLinks(doc.body.trim(), `/docs/${doc.rel}`);
            const h1 = body.match(/^# [^\n]*/);
            return { url, text: h1 ? `${h1[0]}\n\n${where}${body.slice(h1[0].length)}` : `${where}\n\n${body}` };
        });

    const { letter, convictionAnnouncement: announcement, tokenholderLetter, capacityLetter, deck } = investorCentre;
    const investor = [];
    const capacityPage = pages.get(capacityLetter.href);
    if (capacityPage) {
        const publication = capacityLetter.dateIso ? `Published ${capacityLetter.date}` : 'Draft; publication date to confirm';
        investor.push({ url: `${SITE}${capacityLetter.href}`, text: `# ${capacityLetter.headline}\n\n${publication} at ${SITE}${capacityLetter.href} (PDF: ${SITE}${capacityLetter.pdfHref})\n\n${proseOf(capacityPage.html, 'announcement-stage')}` });
    }
    const tokenholderPage = pages.get(tokenholderLetter.href);
    if (tokenholderPage) {
        // the letter runs over two .announcement-paper sheets; the stage holds both
        investor.push({ url: `${SITE}${tokenholderLetter.href}`, text: `# ${tokenholderLetter.title}\n\nPublished ${tokenholderLetter.date} at ${SITE}${tokenholderLetter.href} (PDF: ${SITE}${tokenholderLetter.pdfHref})\n\n${proseOf(tokenholderPage.html, 'announcement-stage')}` });
    }
    const letterPage = pages.get(letter.href);
    if (letterPage) {
        investor.push({ url: `${SITE}${letter.href}`, text: `# ${letter.title}\n\nPublished ${letter.date} at ${SITE}${letter.href} (PDF: ${SITE}${letter.pdfHref})\n\n${proseOf(letterPage.html, 'letter-body')}` });
    }
    const announcementPage = pages.get(announcement.href);
    if (announcementPage) {
        investor.push({ url: `${SITE}${announcement.href}`, text: `# ${announcement.headline}\n\nPublished ${announcement.date} at ${SITE}${announcement.href} (PDF: ${SITE}${announcement.pdfHref})\n\n${proseOf(announcementPage.html, 'announcement-paper')}` });
    }
    if (deck.slides?.length) {
        const slides = deck.slides.map((s, i) => `${i + 1}. **${s.title}: ${s.headline}.** ${s.summary}`).join('\n');
        investor.push({ url: `${SITE}${deck.href}`, text: `# ${deck.title} (the investor deck)\n\n${deck.date}, ${deck.slideCount} slides, at ${SITE}${deck.href} (PDF: ${SITE}${deck.pdfHref})\n\n${deck.summary}\n\n${slides}` });
    }

    const sections = [...embedded, ...investor];
    for (const s of sections) {
        if (s.text.includes(SECTION_MARK)) throw new Error(`llms: ${s.url} contains "${SECTION_MARK}", the llms-full.txt section boundary`);
    }
    const full = [llms.trimEnd(), ...sections.map((s) => `${SECTION_MARK} ${s.url} -->\n\n${s.text}`)].join('\n\n') + '\n';
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
