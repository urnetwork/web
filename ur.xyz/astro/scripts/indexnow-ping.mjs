#!/usr/bin/env node
// Tell IndexNow engines (Bing, Yandex, Seznam, Naver, …) which ur.xyz pages
// changed. One submission to the shared endpoint reaches every engine in the
// IndexNow group; Google does not take part and reads the sitemap's lastmod.
// Modelled on mmm ur.io/astro/scripts/indexnow-ping.mjs.
//
// Run it AFTER a web deploy has put the new pages live, never from a build:
// a submission for pages that are not served yet sends the engines to the old
// content, and they will not come back for it soon.
//
//   node scripts/indexnow-ping.mjs --since 2026-10-07            pages whose lastmod is that day or later
//   node scripts/indexnow-ping.mjs --since 2026-10-07 --dry-run  list them, submit nothing
//   node scripts/indexnow-ping.mjs /docs/miner /price             these pages
//
// --since reads the live sitemap (https://ur.xyz/sitemap-0.xml), whose lastmod
// values come from astro/page-dates.json; --sitemap <file|url> reads another
// one instead (a local build's, to preview a submission). Pass the deploy's
// day, or the day of the last submission, so only what changed is sent.
//
// The key file public/<KEY>.txt, served at https://ur.xyz/<KEY>.txt, proves
// the submitter controls the host; IndexNow accepts URLs of that host only.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://ur.xyz';
export const HOST = 'ur.xyz';
export const KEY = '498553fd070e3992dda38266c4a8907e';
export const ENDPOINT = 'https://api.indexnow.org/indexnow';
// the protocol's cap on one submission
const MAX_URLS = 10_000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The <url> entries of a sitemap: { loc, lastmod } (lastmod null when absent). */
export function parseSitemap(xml) {
    return [...String(xml).matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
        loc: ((m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/) || [])[1] || '').replace(/&amp;/g, '&'),
        lastmod: (m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/) || [])[1] || null,
    })).filter((e) => e.loc);
}

/**
 * The URLs of this host whose lastmod is on `since` (YYYY-MM-DD) or later. An
 * entry without a lastmod cannot be dated and is left out; a full timestamp
 * is compared by its day.
 */
export function changedSince(entries, since) {
    if (!DAY.test(since || '')) throw new Error(`--since takes a day as YYYY-MM-DD, not ${since}`);
    return entries.filter((e) => e.lastmod && e.lastmod.slice(0, 10) >= since && isOwnUrl(e.loc)).map((e) => e.loc);
}

/** True for an https URL of this host (IndexNow rejects a submission with any other). */
export function isOwnUrl(url) {
    try {
        const u = new URL(url);
        return u.protocol === 'https:' && u.host === HOST;
    } catch {
        return false;
    }
}

/** The request bodies that submit `urls`, at most MAX_URLS each. */
export function submissions(urls) {
    const out = [];
    for (let i = 0; i < urls.length; i += MAX_URLS) {
        out.push({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls.slice(i, i + MAX_URLS) });
    }
    return out;
}

async function readSitemap(source, fetchImpl) {
    if (/^https?:\/\//.test(source)) {
        const res = await fetchImpl(source);
        if (!res.ok) throw new Error(`sitemap fetch failed: ${source} answered ${res.status}`);
        return res.text();
    }
    return readFileSync(source, 'utf8');
}

/**
 * The command: the URLs to submit, then the submissions (or, with --dry-run,
 * only the list). `fetchImpl` and `log` are injected by the test. Returns the
 * exit code: 0 submitted (or nothing to submit), 1 an engine refused, 2 usage.
 */
export async function main(argv, { fetchImpl = fetch, log = console } = {}) {
    const flag = (name) => {
        const at = argv.indexOf(name);
        return at === -1 ? null : argv[at + 1] ?? '';
    };
    const since = flag('--since');
    const sitemap = flag('--sitemap') || `${SITE}/sitemap-0.xml`;
    const dryRun = argv.includes('--dry-run');
    const valued = new Set([argv.indexOf('--since') + 1, argv.indexOf('--sitemap') + 1].filter((i) => i > 0));
    const paths = argv.filter((a, i) => !a.startsWith('--') && !valued.has(i));

    if (since === null && !paths.length) {
        log.error('indexnow: pass --since <YYYY-MM-DD> (pages changed since a deploy) or the paths to submit');
        return 2;
    }
    let urls;
    try {
        urls = since !== null
            ? changedSince(parseSitemap(await readSitemap(sitemap, fetchImpl)), since)
            : paths.map((p) => (/^https?:\/\//.test(p) ? p : `${SITE}${p.startsWith('/') ? '' : '/'}${p}`));
    } catch (e) {
        log.error(`indexnow: ${e.message}`);
        return 2;
    }
    const foreign = urls.filter((u) => !isOwnUrl(u));
    if (foreign.length) {
        log.error(`indexnow: not ${SITE} URLs: ${foreign.join(', ')}`);
        return 2;
    }
    if (!urls.length) {
        log.log(`indexnow: nothing to submit${since !== null ? ` (no lastmod on or after ${since} in ${sitemap})` : ''}`);
        return 0;
    }
    if (dryRun) {
        log.log(`indexnow: would submit ${urls.length} URL(s):\n${urls.join('\n')}`);
        return 0;
    }
    let code = 0;
    for (const body of submissions(urls)) {
        const res = await fetchImpl(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(body),
        });
        log.log(`indexnow: submitted ${body.urlList.length} URL(s): HTTP ${res.status}`);
        // 200 and 202 (accepted, key not yet verified) are success
        if (res.status !== 200 && res.status !== 202) code = 1;
    }
    return code;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = await main(process.argv.slice(2));
}
