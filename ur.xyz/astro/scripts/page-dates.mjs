#!/usr/bin/env node
// Per-URL content dates for the sitemap's <lastmod>.
//
// <lastmod> used to come from git: a page was dated by the last commit to the
// file it was built from, and that dated the wrong thing twice over. A section
// page's copy lives in a dictionary it shares with the home page and the other
// sections, so editing the miners copy re-dated operators, validators and
// research in every language; and a commit that only moved files (the
// 2026-09-18 reorganization) re-dated every page it moved. A crawler wants to
// know when the page it would fetch last changed. So the build fingerprints
// what a reader gets from each page (its <title>, its description and the text
// of <main>, image alt text included; markup, asset hashes and machine dates
// excluded) and keeps, per URL, that fingerprint and the day it last changed in
// astro/page-dates.json:
//
//   fingerprint unchanged   keep the recorded day
//   fingerprint changed     today
//   no record yet           the day git last changed the page's sources
//                           (today when they have uncommitted changes)
//
// Only indexable pages that are their own canonical are recorded, which is the
// set the sitemap lists (plus the files in SITEMAP_FILES, fingerprinted by
// their bytes). The record is committed with the content it dates: the build
// rewrites it (astro.config.mjs), and `--check` (make gates) fails when the
// file is not what the build would write, or when the rest of ur.xyz is
// committed but the record is not, which is how a change that shipped without
// its date would otherwise stay undated and be re-dated by every later build.
//
// Usage (from ur.xyz/astro):
//   node scripts/page-dates.mjs build/main                  update the record
//   node scripts/page-dates.mjs build/main --check          read-only check
//   node scripts/page-dates.mjs build/main --seed <build>   start the record over:
//        fingerprints from <build> (a build of the last commit) dated from git,
//        then updated from build/main as a normal build would

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugFor } from '../../react/src/lib/docs-shared.js';
import { LASTMOD_TOKEN } from '../src/lib/lastmod.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UR_XYZ_ROOT = path.resolve(__dirname, '../..');
export const RECORD_FILE = path.resolve(__dirname, '../page-dates.json');
const SITE = 'https://ur.xyz';

// Non-HTML files the sitemap lists. The investor documents' PDFs are not here:
// each is a printout of an HTML page and points its canonical at that page.
export const SITEMAP_FILES = Object.freeze(['/audits/masa-l2-2025.pdf']);

const LANGS = ['ru', 'ar', 'zh', 'de', 'es'];
const LANG_PREFIX = new RegExp(`^/(${LANGS.join('|')})(?=/|$)`);
const SECTIONS = ['operators', 'miners', 'validators', 'research'];

// ── what a page says ─────────────────────────────────────────────────────────

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
    String(s || '').replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (m, dec, hex, name) => {
        if (dec) return String.fromCodePoint(Number(dec));
        if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
        return ENTITIES[name.toLowerCase()] ?? m;
    });
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i')) || [])[1];

/**
 * The visible text of an HTML fragment, with images replaced by their alt
 * text. An element marked `data-volatile` (text that follows the clock rather
 * than an edit, like the research page's live/upcoming pill) is left out; it
 * must not nest an element of its own tag.
 */
function textOf(fragment) {
    return decode(
        fragment
            .replace(/<!--[\s\S]*?-->/g, ' ')
            .replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
            .replace(/<(\w+)\b[^>]*\sdata-volatile(?:="[^"]*")?[^>]*>[\s\S]*?<\/\1>/gi, ' ')
            .replace(/<img\b[^>]*>/gi, (tag) => ` ${attr(tag, 'alt') || ''} `)
            .replace(/<[^>]+>/g, ' '),
    );
}

/** Head facts and the fingerprint of one built HTML page. */
export function pageFacts(html) {
    const headEnd = html.indexOf('</head>');
    const head = headEnd === -1 ? html : html.slice(0, headEnd);
    const canonical = attr((head.match(/<link rel="canonical"[^>]*>/) || [''])[0], 'href') || null;
    const noindex = [...head.matchAll(/<meta name="robots"[^>]*>/g)].some((m) => /noindex/.test(attr(m[0], 'content') || ''));
    const redirectStub = /<meta http-equiv="refresh"/i.test(head);
    const title = decode((head.match(/<title>([^<]*)<\/title>/) || [])[1]);
    const description = decode(attr((head.match(/<meta name="description"[^>]*>/) || [''])[0], 'content'));

    const mains = [...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)].map((m) => m[1]);
    const body = mains.length ? mains.join(' ') : (html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [, ''])[1];
    const text = [title, description, textOf(body)]
        .join('\n')
        // machine-written dates and bundle names say nothing about the content
        .replace(/\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g, ' ')
        .replace(/\/_astro\/[\w.-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return { canonical, noindex, redirectStub, title, description, fingerprint: digest(text) };
}

const digest = (data) => createHash('sha256').update(data).digest('hex').slice(0, 16);

function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
}

const toPath = (href) => {
    try {
        const p = new URL(href, SITE).pathname;
        return p === '/' ? '/' : p.replace(/\/$/, '');
    } catch {
        return null;
    }
};

/** The public path a built HTML file is served at ("/", "/de/miners", …). */
const urlPathOf = (distDir, file) =>
    `/${path.relative(distDir, file).split(path.sep).join('/')}`.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';

/** url path → fingerprint for every page the sitemap lists, read from a build. */
export function fingerprints(distDir) {
    const out = new Map();
    for (const file of walk(distDir)) {
        if (!file.endsWith('.html')) continue;
        const urlPath = urlPathOf(distDir, file);
        const facts = pageFacts(readFileSync(file, 'utf8'));
        // the same test the seo-audit applies: an indexable page that is its own canonical
        if (facts.noindex || facts.redirectStub || !facts.canonical) continue;
        if (toPath(facts.canonical) !== urlPath) continue;
        out.set(urlPath, facts.fingerprint);
    }
    for (const urlPath of SITEMAP_FILES) {
        const file = path.join(distDir, urlPath);
        if (existsSync(file)) out.set(urlPath, digest(readFileSync(file)));
    }
    return out;
}

// ── when a page's sources last changed, for a URL with no record ─────────────

const git = (args) =>
    execFileSync('git', ['-C', UR_XYZ_ROOT, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: 64 << 20,
    });

/**
 * The day git last changed a file's bytes, following renames and skipping a
 * commit that only moved it (a pure rename keeps the blob), or null when the
 * file has no history.
 */
function gitContentDay(rel) {
    let log;
    try {
        log = git(['log', '--follow', '--format=%x00%cs', '--raw', '--no-abbrev', '--', rel]);
    } catch {
        return null;
    }
    for (const chunk of log.split('\0').slice(1)) {
        const [day, ...lines] = chunk.split('\n');
        const raw = lines.find((l) => l.startsWith(':'));
        if (!raw) continue;
        const [, , oldBlob, newBlob, status] = raw.split('\t')[0].slice(1).split(' ');
        if (status.startsWith('R') && oldBlob === newBlob) continue;
        return day.trim();
    }
    return null;
}

function hasUncommittedChanges(rel) {
    try {
        return git(['status', '--porcelain', '--', rel]).trim() !== '';
    } catch {
        return false;
    }
}

let DOC_FILES = null;
/** docs slug → its markdown file (relative to ur.xyz), the first file per slug wins as in lib/docs.js */
function docFiles() {
    if (DOC_FILES) return DOC_FILES;
    DOC_FILES = new Map();
    const docsDir = path.join(UR_XYZ_ROOT, 'docs');
    const files = existsSync(docsDir) ? walk(docsDir).filter((f) => f.endsWith('.md')) : [];
    for (const abs of files) {
        const rel = path.relative(docsDir, abs).split(path.sep).join('/');
        if (rel.split('/').some((part) => part.startsWith('.'))) continue;
        const slug = slugFor(rel);
        if (!DOC_FILES.has(slug)) DOC_FILES.set(slug, `docs/${rel}`);
    }
    return DOC_FILES;
}

const INVESTOR_DOCS = { deck: 'deck', 'our-letter-to-bittensor': 'letter', 'conviction-lock': 'convictionAnnouncement' };

/**
 * The sources a page is built from, for dating a URL the record has not seen.
 * Both the current locations and the ones they moved from are listed, so a
 * page that moved keeps the history of the file it moved from.
 */
function sourcesFor(urlPath) {
    const lang = urlPath.match(LANG_PREFIX)?.[1] || 'en';
    const base = urlPath.replace(LANG_PREFIX, '') || '/';
    const dict = `react/src/i18n/${lang}.js`;
    if (base === '/') return [dict, 'react/src/components/HomepageIntro.jsx', 'astro/src/components/RoleBlocks.astro'];
    const name = base.slice(1);
    if (SECTIONS.includes(name)) return [dict, `react/src/components/sections/${name[0].toUpperCase()}${name.slice(1)}.jsx`];
    if (['terms', 'privacy', 'vdp'].includes(name)) return [`docs/legal/${name}.md`];
    if (name === 'price') return [dict, 'react/src/components/PriceSection.jsx', 'price/price.yml', 'astro/src/pages/price.astro'];
    if (name === 'about') {
        return ['react/src/components/pages/About.jsx', 'react/src/data/contributors.js', 'astro/src/pages/about.astro', 'astro/src/lib/contributors.js'];
    }
    if (name === 'build') {
        return ['react/src/components/pages/Build.jsx', 'react/src/components/pages/BuildBrief.jsx', 'react/src/components/pages/BuildScenes.jsx', 'react/src/data/buildContent.js', 'astro/public/build.html'];
    }
    if (name === 'docs') return ['react/src/components/DocsExplorer.jsx', ...docFiles().values()];
    if (name.startsWith('docs/')) {
        const file = docFiles().get(name.slice('docs/'.length));
        return file ? [file] : [];
    }
    if (name === 'investors' || name.startsWith('investors/')) return ['react/src/data/investors.js', 'astro/src/lib/investors.js'];
    return [`astro/public${urlPath}`];
}

/** The investor documents are dated by their publication date, as they always were. */
async function investorDay(urlPath) {
    if (urlPath !== '/investors' && !urlPath.startsWith('/investors/')) return null;
    const { investorCentre } = await import('../../react/src/data/investors.js');
    if (urlPath === '/investors') return investorCentre.updatedIso || null;
    return investorCentre[INVESTOR_DOCS[urlPath.slice('/investors/'.length)]]?.dateIso || null;
}

/**
 * The day to record for a URL with no record: the newest content change among
 * its sources. With `committedOnly` (seeding from a build of the last commit)
 * uncommitted edits are ignored; otherwise they make the page new today.
 */
export async function fallbackDay(urlPath, { today, committedOnly = false } = {}) {
    const published = await investorDay(urlPath);
    if (published) return published;
    const days = [];
    for (const rel of sourcesFor(urlPath)) {
        const exists = existsSync(path.join(UR_XYZ_ROOT, rel));
        if (!committedOnly && exists && hasUncommittedChanges(rel)) return today;
        const day = gitContentDay(rel);
        if (day) days.push(day);
        else if (exists && !committedOnly) return today; // new, never committed
    }
    return days.sort().at(-1) || today;
}

// ── the record ───────────────────────────────────────────────────────────────

export function todayIso() {
    const forced = process.env.UR_PAGE_DATES_TODAY;
    if (forced && /^\d{4}-\d{2}-\d{2}$/.test(forced)) return forced;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function readRecord(file = RECORD_FILE) {
    if (!existsSync(file)) return new Map();
    const json = JSON.parse(readFileSync(file, 'utf8'));
    return new Map(Object.entries(json.pages || {}));
}

export function serializeRecord(record) {
    const keys = [...record.keys()].sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a < b ? -1 : a > b ? 1 : 0));
    const pages = Object.fromEntries(keys.map((k) => [k, record.get(k)]));
    return `${JSON.stringify({
        about: 'The day each ur.xyz page last changed, for the sitemap <lastmod>: a fingerprint of what the page says and the day it last changed. The build maintains this file (scripts/page-dates.mjs); commit it with the content it dates.',
        pages,
    }, null, 2)}\n`;
}

/**
 * Bring a record up to date with a build's fingerprints. Returns the new
 * record and what changed: `redated` (content changed → today), `added` (no
 * record → fallback day) and `dropped` (no longer a sitemap page).
 */
export async function updateRecord(record, current, { today = todayIso(), committedOnly = false } = {}) {
    const next = new Map();
    const changes = { redated: [], added: [], dropped: [] };
    for (const [urlPath, fingerprint] of current) {
        const prev = record.get(urlPath);
        if (prev && prev.fingerprint === fingerprint) {
            next.set(urlPath, prev);
        } else if (prev) {
            next.set(urlPath, { fingerprint, lastmod: today });
            changes.redated.push(urlPath);
        } else {
            next.set(urlPath, { fingerprint, lastmod: await fallbackDay(urlPath, { today, committedOnly }) });
            changes.added.push(urlPath);
        }
    }
    for (const urlPath of record.keys()) if (!current.has(urlPath)) changes.dropped.push(urlPath);
    return { next, changes };
}

const describe = ({ redated, added, dropped }, record) =>
    [
        redated.length && `re-dated to today: ${redated.join(', ')}`,
        added.length && `added: ${added.map((u) => `${u} (${record.get(u).lastmod})`).join(', ')}`,
        dropped.length && `dropped: ${dropped.join(', ')}`,
    ].filter(Boolean).join('\n  ');

/**
 * The build's step (astro.config.mjs): update the record from the build output
 * and write it unless `write` is false. Returns the record the sitemap uses.
 */
export async function refreshPageDates(distDir, { write = true, log = console } = {}) {
    const record = readRecord();
    const { next, changes } = await updateRecord(record, fingerprints(distDir));
    const before = existsSync(RECORD_FILE) ? readFileSync(RECORD_FILE, 'utf8') : '';
    const after = serializeRecord(next);
    // pages that state the day (src/lib/lastmod.js) get the recorded one
    for (const file of walk(distDir)) {
        if (!file.endsWith('.html')) continue;
        const html = readFileSync(file, 'utf8');
        if (!html.includes(LASTMOD_TOKEN)) continue;
        writeFileSync(file, html.split(LASTMOD_TOKEN).join(next.get(urlPathOf(distDir, file))?.lastmod || todayIso()));
    }
    if (after !== before) {
        if (write) {
            writeFileSync(RECORD_FILE, after);
            log.info?.(`page-dates: updated ${path.relative(UR_XYZ_ROOT, RECORD_FILE)} (commit it with the content)\n  ${describe(changes, next)}`);
        } else {
            log.warn?.(`page-dates: ${path.relative(UR_XYZ_ROOT, RECORD_FILE)} is stale and was not written (UR_PAGE_DATES=check)\n  ${describe(changes, next)}`);
        }
    }
    return next;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const seedAt = args.indexOf('--seed');
    const positional = args.filter((a, i) => !a.startsWith('--') && !(seedAt !== -1 && i === seedAt + 1));
    const distDir = path.resolve(positional[0] || 'build/main');
    if (!existsSync(distDir)) {
        console.error(`page-dates: no such build dir ${distDir}`);
        process.exit(2);
    }
    const rel = path.relative(UR_XYZ_ROOT, RECORD_FILE);
    const current = fingerprints(distDir);

    if (seedAt !== -1) {
        const seedDir = path.resolve(args[seedAt + 1] || '');
        if (!existsSync(seedDir)) {
            console.error(`page-dates: no such seed build ${seedDir}`);
            process.exit(2);
        }
        const today = todayIso();
        const { next: seeded } = await updateRecord(new Map(), fingerprints(seedDir), { today, committedOnly: true });
        const { next, changes } = await updateRecord(seeded, current, { today });
        writeFileSync(RECORD_FILE, serializeRecord(next));
        console.log(`page-dates: seeded ${rel} from ${seedDir} (${seeded.size} URLs dated from git)\n  ${describe(changes, next)}`);
        return;
    }

    const { next, changes } = await updateRecord(readRecord(), current);
    const onDisk = existsSync(RECORD_FILE) ? readFileSync(RECORD_FILE, 'utf8') : '';
    const wanted = serializeRecord(next);

    if (!args.includes('--check')) {
        if (wanted !== onDisk) writeFileSync(RECORD_FILE, wanted);
        console.log(wanted === onDisk ? `page-dates: ${rel} is current` : `page-dates: updated ${rel}\n  ${describe(changes, next)}`);
        return;
    }

    const problems = [];
    if (wanted !== onDisk) {
        problems.push(`${rel} is not what a build of ${path.relative(process.cwd(), distDir)} writes:\n  ${describe(changes, next) || 'formatting differs'}\n  rebuild (or run \`node scripts/page-dates.mjs ${path.relative(process.cwd(), distDir)}\`) and commit it`);
    } else {
        // With the rest of ur.xyz committed, the record must be committed too:
        // otherwise the content it dates shipped without it, and every later
        // build would date that content by its own day.
        try {
            const pending = git(['status', '--porcelain', '--', '.', `:(exclude)${rel}`]).trim();
            if (!pending) {
                let committed = null;
                try {
                    committed = git(['show', `HEAD:./${rel}`]);
                } catch {
                    /* not committed yet */
                }
                if (committed !== onDisk) problems.push(`${rel} dates content that is committed, but it is not: commit it`);
            }
        } catch {
            /* not a git checkout */
        }
    }
    if (problems.length) {
        console.error(`page-dates: ${problems.join('\n')}`);
        process.exit(1);
    }
    console.log(`page-dates: ${rel} is current (${next.size} URLs)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((e) => {
        console.error(`page-dates: ${e.stack || e.message}`);
        process.exit(1);
    });
}
