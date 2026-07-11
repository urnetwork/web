#!/usr/bin/env node
/**
 * sync-price — publish the subnet price sheet.
 *
 * Copies price.yml from the sn repo into the site, records each change in
 * price/price-history.json, regenerates the price.rss change feed, and fans
 * the published artifacts out to both app public/ directories:
 *
 *   sn/price.yml ──▶ price/price.yml           (canonical tracked copy)
 *                    price/price-history.json  (one entry per published change)
 *                    astro/public/price.yml + price.rss
 *                    react/public/price.yml + price.rss
 *
 * The sn checkout is located via $SN_DIR (default: ../../../sn — the
 * urnetwork monorepo layout). When the sn repo is not present (e.g. a CI
 * build of the site alone), the checked-in copy is kept and only the derived
 * artifacts are regenerated, so the build stays reproducible.
 *
 * A history entry is appended only when the sheet's content changes, dated
 * at the moment the change is first synced — that is the "published" time
 * the RSS feed reports. Re-running the script without a change is a no-op,
 * so build output is deterministic.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from '../react/src/lib/yaml.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SN_DIR = process.env.SN_DIR || path.resolve(ROOT, '../../../sn');

const SITE_ORIGIN = 'https://ur.xyz';
const PRICE_PAGE = `${SITE_ORIGIN}/price`;
const FEED_URL = `${SITE_ORIGIN}/price.rss`;

const CANONICAL = path.join(ROOT, 'price', 'price.yml');
const HISTORY = path.join(ROOT, 'price', 'price-history.json');
const PUBLIC_DIRS = [
    path.join(ROOT, 'astro', 'public'),
    path.join(ROOT, 'react', 'public')
];

function log(msg) {
    console.log(`[sync-price] ${msg}`);
}

/** The current sheet: prefer the sn repo, fall back to the tracked copy. */
function loadSheet() {
    const snFile = path.join(SN_DIR, 'price.yml');
    if (fs.existsSync(snFile)) {
        log(`reading ${snFile}`);
        return fs.readFileSync(snFile, 'utf8');
    }
    if (fs.existsSync(CANONICAL)) {
        log(`sn repo not found at ${SN_DIR}; keeping checked-in price/price.yml`);
        return fs.readFileSync(CANONICAL, 'utf8');
    }
    console.error(`[sync-price] no price.yml at ${snFile} and no checked-in copy at ${CANONICAL}`);
    process.exit(1);
}

/** Normalized tier list from the sheet: ascending staked-α thresholds. */
function tiersOf(sheet) {
    const raw = sheet.tiered_per_block_demand_deposits || {};
    return Object.keys(raw)
        .map(k => ({
            minStakeAlpha: Number(k),
            alphaPerGib: Number(raw[k]?.alpha_per_gib ?? 0),
            alphaPerUser: Number(raw[k]?.alpha_per_user ?? 0)
        }))
        .sort((a, b) => a.minStakeAlpha - b.minStakeAlpha);
}

function escapeHtml(s) {
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

/** RSS item body: the sheet rendered as a small table plus the raw yaml. */
function entryHtml(entry) {
    let sheet;
    try {
        sheet = parseYaml(entry.yaml);
    } catch {
        sheet = {};
    }
    const tiers = tiersOf(sheet);
    const rows = tiers.map((t, i) => `<tr><td>${i}</td><td>${
        t.minStakeAlpha === 0 ? '0 (everyone)' : `&#8805; ${t.minStakeAlpha}`
    }</td><td>${t.alphaPerGib}</td><td>${t.alphaPerUser}</td></tr>`).join('');

    return [
        `<p>UR subnet ${sheet.sn ?? '?'} — demand deposit price per block (7 days).`,
        ` An operator pays the best tier whose staked-&#945; threshold it meets;`,
        ` tier 0 applies to everyone.</p>`,
        `<table border="1" cellpadding="4" cellspacing="0">`,
        `<tr><th>Tier</th><th>Staked &#945; threshold</th><th>&#945; / GiB</th><th>&#945; / user</th></tr>`,
        rows,
        `</table>`,
        `<pre>${escapeHtml(entry.yaml)}</pre>`
    ].join('');
}

function buildRss(history) {
    const newestFirst = [...history].reverse();
    const items = newestFirst.map(entry => {
        const d = new Date(entry.date);
        const day = entry.date.slice(0, 10);
        // CDATA keeps the HTML readable; a literal "]]>" inside would end
        // the section early, so split it if it ever appears.
        const body = entryHtml(entry).replaceAll(']]>', ']]]]><![CDATA[>');
        return [
            '        <item>',
            `            <title>UR usage cost update — ${day}</title>`,
            `            <link>${PRICE_PAGE}</link>`,
            `            <guid isPermaLink="false">urn:ur-xyz:price:${entry.date}</guid>`,
            `            <pubDate>${d.toUTCString()}</pubDate>`,
            `            <description><![CDATA[${body}]]></description>`,
            '        </item>'
        ].join('\n');
    }).join('\n');

    const latest = newestFirst[0];
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        '    <channel>',
        '        <title>UR usage cost</title>',
        `        <link>${PRICE_PAGE}</link>`,
        `        <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />`,
        '        <description>Published price sheet changes for the UR subnet — the alpha demand deposit required per GiB and per user in each 7-day block, by staked-alpha tier.</description>',
        '        <language>en</language>',
        latest ? `        <lastBuildDate>${new Date(latest.date).toUTCString()}</lastBuildDate>` : null,
        items,
        '    </channel>',
        '</rss>',
        ''
    ].filter(l => l !== null).join('\n');
}

function main() {
    let content = loadSheet();
    if (!content.endsWith('\n')) content += '\n';

    // Fail loudly on an unparsable or empty sheet rather than publishing it.
    const sheet = parseYaml(content);
    if (typeof sheet.sn !== 'number' || tiersOf(sheet).length === 0) {
        console.error('[sync-price] price.yml is missing "sn" or "tiered_per_block_demand_deposits" — not publishing');
        process.exit(1);
    }

    let history = [];
    if (fs.existsSync(HISTORY)) {
        history = JSON.parse(fs.readFileSync(HISTORY, 'utf8'));
    }

    const last = history[history.length - 1];
    if (!last || last.yaml !== content) {
        history.push({ date: new Date().toISOString(), yaml: content });
        log(`price change recorded (${history.length} ${history.length === 1 ? 'entry' : 'entries'})`);
    } else {
        log('no price change');
    }

    fs.mkdirSync(path.dirname(CANONICAL), { recursive: true });
    fs.writeFileSync(CANONICAL, content);
    fs.writeFileSync(HISTORY, JSON.stringify(history, null, 2) + '\n');

    const rss = buildRss(history);
    for (const dir of PUBLIC_DIRS) {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'price.yml'), content);
        fs.writeFileSync(path.join(dir, 'price.rss'), rss);
        log(`published ${path.relative(ROOT, dir)}/price.yml + price.rss`);
    }
}

main();
