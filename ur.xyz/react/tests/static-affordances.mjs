// What the built ur.xyz offers a reader, or an agent, at a stable address and
// without running the page: checked in a browser against the Astro build, with
// JavaScript on and off.
//
//   /build#brief-<slug>   each opportunity brief has its own address; it shows
//                         that brief before (or without) hydration, and the
//                         hydrated page opens it and keeps the address while a
//                         brief is open
//   /reserve              the page says, in its HTML, where its live figures
//                         come from and where to check them
//   /docs, /docs/<slug>   static HTML (the document and its sidebar need no
//                         script); the search box fetches /docs-search.json on
//                         first use; the phone sidebar toggle and the code
//                         blocks' Copy buttons work without React
//
// Usage (from astro/, after a build):  node ../react/tests/static-affordances.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UR_ENV = process.env.UR_ENV || 'main';
const ROOT = path.resolve(__dirname, '../../astro/build', UR_ENV);

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };

function staticServer(root) {
    return http.createServer((request, response) => {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
        const candidates = path.extname(relative) ? [relative] : [`${relative}.html`, path.join(relative, 'index.html')];
        const file = candidates.map((c) => path.resolve(root, c)).find((c) => c.startsWith(root + path.sep) && fs.existsSync(c) && fs.statSync(c).isFile());
        if (!file) {
            response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
            response.end('Not found');
            return;
        }
        response.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(response);
    });
}

const freePort = () => new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, () => {
        const { port } = server.address();
        server.close(() => resolve(port));
    });
});

const failures = [];
const check = (condition, message) => {
    if (!condition) failures.push(message);
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${message}`);
};

async function open(browser, url, javaScriptEnabled) {
    const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    // the reserve reads Bittensor mainnet; an empty answer keeps this offline
    await page.route(/opentensor\.ai|bringyour\.com|ur\.network/, (r) => r.fulfill({ json: {} }).catch(() => r.abort()));
    await page.goto(url, { waitUntil: 'networkidle' });
    return { page, close: () => context.close() };
}

const visibleBriefs = (page) => page.$$eval('section.brief-panel', (els) => els.filter((el) => el.getClientRects().length > 0).map((el) => el.id));

async function main() {
    if (!fs.existsSync(path.join(ROOT, 'build.html'))) {
        console.error(`static-affordances: no build at ${ROOT}`);
        process.exit(1);
    }
    const port = await freePort();
    const server = staticServer(ROOT);
    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${port}`;
    const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {});
    try {
        {
            const { page, close } = await open(browser, `${base}/build#brief-agent-access`, false);
            check(JSON.stringify(await visibleBriefs(page)) === '["brief-agent-access"]', '/build#brief-agent-access without JavaScript shows that brief, and only it');
            await close();
        }
        {
            const { page, close } = await open(browser, `${base}/build`, false);
            check((await visibleBriefs(page)).length === 0, '/build without JavaScript draws no brief, as the hydrated page does');
            await close();
        }
        {
            const { page, close } = await open(browser, `${base}/build#brief-agent-access`, true);
            await page.waitForSelector('.build-page[data-hydrated]', { timeout: 5000 }).catch(() => {});
            check(JSON.stringify(await visibleBriefs(page)) === '["brief-agent-access"]', '/build#brief-agent-access, hydrated, opens that brief');
            check(await page.getAttribute('#op-tab-agent-access', 'aria-selected') === 'true', '/build#brief-agent-access, hydrated, selects its opportunity');
            await close();
        }
        {
            const { page, close } = await open(browser, `${base}/build`, true);
            await page.waitForSelector('.build-page[data-hydrated]', { timeout: 5000 }).catch(() => {});
            await page.click('#opportunity-readout-white-label-vpn .readout-brief').catch(() => {});
            check(await page.evaluate(() => location.hash) === '#brief-white-label-vpn', '/build: opening a brief puts its address in the location');
            await close();
        }
        {
            // the docs pages are static HTML: the document and its sidebar need no script
            const { page, close } = await open(browser, `${base}/docs/miner`, false);
            check(Boolean((await page.textContent('main.explorer-main h1').catch(() => '')).trim()), '/docs/miner without JavaScript shows the document');
            check(await page.isVisible('nav.explorer-nav a[href="/docs/validator"]').catch(() => false), '/docs/miner without JavaScript shows the sidebar links');
            await close();
        }
        {
            // the search box fetches its index on first use, then searches it
            const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
            const page = await context.newPage();
            const indexFetches = [];
            page.on('request', (r) => { if (new URL(r.url()).pathname === '/docs-search.json') indexFetches.push(r.url()); });
            await page.goto(`${base}/docs`, { waitUntil: 'networkidle' });
            await page.waitForSelector('astro-island:not([ssr]) .explorer-search-input', { timeout: 5000 }).catch(() => {});
            check(indexFetches.length === 0, '/docs loads no search index until the search box is used');
            await page.fill('.explorer-search-input', 'validator');
            await page.waitForSelector('.explorer-results .explorer-result', { timeout: 5000 }).catch(() => {});
            const titles = await page.$$eval('.explorer-result-title', (els) => els.map((el) => el.textContent));
            check(indexFetches.length === 1 && titles.some((t) => /validator/i.test(t)), '/docs search finds the validator guide from /docs-search.json');
            check(!(await page.isVisible('nav.explorer-nav').catch(() => true)), '/docs search results take the place of the sidebar list');
            await page.click('.explorer-result:has-text("validator")').catch(() => {});
            await page.waitForURL(/\/docs\/validator$/, { timeout: 5000 }).catch(() => {});
            check(new URL(page.url()).pathname === '/docs/validator', '/docs search result opens the document');
            await context.close();
        }
        {
            // the phone sidebar toggle and the code blocks' Copy buttons, without React
            const context = await browser.newContext({ viewport: { width: 393, height: 659 } });
            await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
            const page = await context.newPage();
            await page.goto(`${base}/docs/miner`, { waitUntil: 'networkidle' });
            await page.click('.explorer-sidebar-toggle');
            const sidebarOpen = await page.$eval('#docs-explorer', (el) => el.classList.contains('sidebar-open')).catch(() => false);
            check(await page.getAttribute('.explorer-sidebar-toggle', 'aria-expanded') === 'true' && sidebarOpen, '/docs/miner phone sidebar toggle opens the sidebar');
            await page.click('.explorer-sidebar-toggle');
            const block = page.locator('.md-codeblock').first();
            await block.locator('.md-codeblock-copy').click();
            const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
            const source = await block.locator('.md-pre > code').textContent();
            check(await block.locator('.md-codeblock-copy').getAttribute('data-state') === 'copied' && copied === source, '/docs/miner Copy puts the code block\'s text on the clipboard and says so');
            await context.close();
        }
        {
            const { page, close } = await open(browser, `${base}/reserve`, false);
            const line = await page.textContent('.reserve-verify').catch(() => '');
            const href = await page.getAttribute('.reserve-verify a', 'href').catch(() => '');
            check(/Verify it yourself/.test(line || '') && /5[1-9A-HJ-NP-Za-km-z]{47}/.test(line || '') && /taostats\.io\/account\//.test(href || ''), '/reserve without JavaScript says where its figures come from and where to check them');
            await close();
        }
    } finally {
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
    if (failures.length) {
        console.error(`\nstatic-affordances: ${failures.length} failure(s)`);
        process.exit(1);
    }
    console.log('\nstatic-affordances: OK');
}

main().catch((error) => {
    console.error(`static-affordances: ${error.message}`);
    process.exit(1);
});
