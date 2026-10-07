// The IndexNow submission script: what it selects from a sitemap, what it
// submits, and that it submits nothing unasked. No test reaches the network:
// the sitemap is a fixture file and fetch is a recorder.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ENDPOINT, HOST, KEY, SITE, changedSince, main, parseSitemap, submissions } from './indexnow-ping.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${SITE}/</loc><lastmod>2026-09-30</lastmod></url>
<url><loc>${SITE}/docs/miner</loc><lastmod>2026-10-06</lastmod></url>
<url><loc>${SITE}/price</loc><lastmod>2026-10-07T08:00:00.000Z</lastmod></url>
<url><loc>${SITE}/undated</loc></url>
<url><loc>https://other.example.invalid/page</loc><lastmod>2026-10-07</lastmod></url>
</urlset>`;

function withSitemap(run) {
    const dir = mkdtempSync(path.join(tmpdir(), 'ur-indexnow-'));
    const file = path.join(dir, 'sitemap-0.xml');
    writeFileSync(file, SITEMAP);
    return Promise.resolve(run(file)).finally(() => rmSync(dir, { recursive: true, force: true }));
}

function recorder(status = 202) {
    const calls = [];
    const fetchImpl = async (url, init) => {
        calls.push({ url, init });
        return { ok: status < 400, status, text: async () => '' };
    };
    const lines = [];
    const log = { log: (m) => lines.push(m), error: (m) => lines.push(m) };
    return { calls, fetchImpl, log, lines };
}

test('the published key file holds the key the script submits', () => {
    const keyFile = path.resolve(__dirname, `../public/${KEY}.txt`);
    assert.ok(existsSync(keyFile), `public/${KEY}.txt is missing`);
    assert.equal(readFileSync(keyFile, 'utf8').trim(), KEY);
});

test('changedSince keeps this host\'s URLs dated on or after the day', () => {
    const entries = parseSitemap(SITEMAP);
    assert.equal(entries.length, 5);
    assert.deepEqual(changedSince(entries, '2026-10-06'), [`${SITE}/docs/miner`, `${SITE}/price`]);
    assert.deepEqual(changedSince(entries, '2026-10-08'), []);
    assert.throws(() => changedSince(entries, 'yesterday'), /YYYY-MM-DD/);
});

test('a submission names the host, the key and where the key file is', () => {
    const [body, ...rest] = submissions([`${SITE}/docs/miner`]);
    assert.deepEqual(rest, []);
    assert.deepEqual(body, { host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: [`${SITE}/docs/miner`] });
    assert.equal(submissions(Array.from({ length: 10_001 }, (_, i) => `${SITE}/p${i}`)).length, 2);
});

test('--since submits the changed pages of the sitemap it is given', async () => {
    await withSitemap(async (file) => {
        const r = recorder();
        assert.equal(await main(['--since', '2026-10-06', '--sitemap', file], r), 0);
        assert.equal(r.calls.length, 1);
        assert.equal(r.calls[0].url, ENDPOINT);
        assert.equal(r.calls[0].init.method, 'POST');
        assert.deepEqual(JSON.parse(r.calls[0].init.body).urlList, [`${SITE}/docs/miner`, `${SITE}/price`]);
    });
});

test('--dry-run and an empty selection submit nothing', async () => {
    await withSitemap(async (file) => {
        const dry = recorder();
        assert.equal(await main(['--since', '2026-10-06', '--sitemap', file, '--dry-run'], dry), 0);
        assert.equal(dry.calls.length, 0);
        assert.match(dry.lines.join('\n'), /would submit 2 URL\(s\)/);

        const none = recorder();
        assert.equal(await main(['--since', '2026-12-01', '--sitemap', file], none), 0);
        assert.equal(none.calls.length, 0);
    });
});

test('without --since or paths, or with a foreign URL, it refuses', async () => {
    const bare = recorder();
    assert.equal(await main([], bare), 2);
    assert.equal(bare.calls.length, 0);

    const foreign = recorder();
    assert.equal(await main(['https://other.example.invalid/page'], foreign), 2);
    assert.equal(foreign.calls.length, 0);
});

test('a refused submission fails the run', async () => {
    const refused = recorder(403);
    assert.equal(await main(['/docs/miner'], refused), 1);
    assert.deepEqual(JSON.parse(refused.calls[0].init.body).urlList, [`${SITE}/docs/miner`]);
});
