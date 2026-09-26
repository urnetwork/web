// Responsive shell regression test for the English ur.xyz routes.
//
// Covers Astro-only pages that the React/Astro pixel-parity test cannot compare,
// and locks down the shared navigation contract at the two responsive boundaries.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASTRO_DIR = path.resolve(__dirname, '../../astro');
const UR_ENV = process.env.UR_ENV || 'main';
const ROOT = path.join(ASTRO_DIR, 'build', UR_ENV);

const ROUTES = ['/build', '/about', '/investors', '/', '/operators', '/miners', '/validators', '/research', '/docs'];
const PROFILES = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'desktop-edge', width: 1080, height: 800 },
  { name: 'desktop-boundary', width: 1021, height: 800 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'phone', width: 393, height: 659 },
  { name: 'narrow-phone', width: 320, height: 568 },
  { name: 'phone-landscape', width: 844, height: 390 },
];
const PRIMARY_ORDER = ['research', 'build', 'investors', 'about', 'docs'];
const MOBILE_ORDER = ['operators', 'miners', 'validators', ...PRIMARY_ORDER];
const LANGUAGE_ORDER = ['en', 'ru', 'ar', 'zh', 'de', 'es'];

function freePort() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function mimeType(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
  }[ext] || 'application/octet-stream';
}

function staticServer(root) {
  const resolvedRoot = path.resolve(root);
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const candidates = path.extname(relative)
      ? [relative]
      : [`${relative}.html`, path.join(relative, 'index.html'), relative];
    const file = candidates
      .map((candidate) => path.resolve(resolvedRoot, candidate))
      .find((candidate) => candidate.startsWith(resolvedRoot + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile());

    if (!file) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, { 'content-type': mimeType(file) });
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(file).pipe(response);
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function linkName(value) {
  return value.trim().toLowerCase();
}

async function visible(locator) {
  return locator.count().then((count) => count > 0 && locator.first().isVisible());
}

async function auditPage(browser, base, route, profile) {
  const page = await browser.newPage({ viewport: { width: profile.width, height: profile.height } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route(/bringyour\.com|ur\.network/, (request) => request.fulfill({ json: {} }).catch(() => request.abort()));
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto(base + route, { waitUntil: 'networkidle' });
  assert(response?.status() === 200, `${route} returned ${response?.status() || 'no response'}`);

  const shell = await page.evaluate(() => ({
    h1s: document.querySelectorAll('h1').length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
  }));
  assert(shell.h1s === 1, `${route} has ${shell.h1s} h1 elements`);
  assert(shell.overflow <= 1, `${route} overflows horizontally by ${shell.overflow}px at ${profile.width}px`);
  assert(shell.brokenImages.length === 0, `${route} has broken images: ${shell.brokenImages.join(', ')}`);
  assert(errors.length === 0, `${route} logged errors: ${errors.join(' | ')}`);
  assert(await page.locator('footer a[href="/about"]').count() > 0, `${route} footer has no About link`);

  const primary = page.locator('nav[aria-label="Primary navigation"]');
  const menuToggle = page.locator('header button[aria-label*="menu" i], header summary[aria-label*="menu" i]');
  const mobile = profile.width <= 1020;

  if (!mobile) {
    assert(await visible(primary), `${route} desktop navigation is hidden at ${profile.width}px`);
    assert(!(await visible(menuToggle)), `${route} mobile toggle is visible at ${profile.width}px`);
    const order = (await primary.locator(':scope > a').allTextContents()).map(linkName);
    assert(JSON.stringify(order) === JSON.stringify(PRIMARY_ORDER), `${route} desktop nav order is ${order.join(', ')}`);
  } else {
    assert(!(await visible(primary)), `${route} desktop navigation is visible at ${profile.width}px`);
    assert(await visible(menuToggle), `${route} has no mobile menu toggle at ${profile.width}px`);
    const toggle = menuToggle.first();
    const rect = await toggle.boundingBox();
    assert(rect && rect.width >= 44 && rect.height >= 44, `${route} menu toggle is smaller than 44px`);
    assert(await toggle.getAttribute('aria-expanded') === 'false', `${route} closed menu does not announce aria-expanded=false`);

    await toggle.click();
    // The drawer transitions in from visibility:hidden, so wait for the open
    // state itself rather than a fixed pause: on a loaded machine a pause
    // raced the transition and the check failed on a different route each run.
    const mobileNav = page.locator('nav[aria-label="Mobile navigation"]');
    await mobileNav.first().waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
    await page.waitForFunction(
      (selector) => document.querySelector(selector)?.getAttribute('aria-expanded') === 'true',
      'header button[aria-label*="menu" i], header summary[aria-label*="menu" i]',
      { timeout: 2000 },
    ).catch(() => {});
    assert(await toggle.getAttribute('aria-expanded') === 'true', `${route} open menu does not announce aria-expanded=true`);
    assert((await toggle.getAttribute('aria-label'))?.toLowerCase().includes('close'), `${route} open menu label does not announce Close`);

    assert(await visible(mobileNav), `${route} mobile navigation did not open`);
    const order = (await mobileNav.locator('a').allTextContents()).map(linkName).filter(Boolean);
    assert(JSON.stringify(order) === JSON.stringify(MOBILE_ORDER), `${route} mobile nav order is ${order.join(', ')}`);
    const linkGeometry = await mobileNav.locator('a').evaluateAll((links) => links.map((link) => {
      const rect = link.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top };
    }));
    assert(linkGeometry.every(({ left, right }) => left >= 0 && right <= profile.width + 1), `${route} mobile navigation clips outside the viewport`);
    assert(linkGeometry.every(({ top }, index) => index === 0 || top > linkGeometry[index - 1].top), `${route} mobile navigation links are not vertically stacked`);

    const networkSummary = mobileNav.locator('.nav-network > summary');
    if (await networkSummary.count()) {
      const networkRhythm = await page.evaluate(() => {
        const summary = document.querySelector('.nav-drawer-links .nav-network > summary');
        const links = [...document.querySelectorAll('.nav-drawer-links .nav-network-menu a')];
        const research = [...document.querySelectorAll('.nav-drawer-links > a')].find((link) => link.textContent.trim() === 'Research');
        const first = links[0]?.getBoundingClientRect();
        const last = links.at(-1)?.getBoundingClientRect();
        const active = links.find((link) => link.classList.contains('is-active'));
        return {
          underline: getComputedStyle(summary, '::after').display,
          firstGap: first.top - summary.getBoundingClientRect().bottom,
          nextGap: research.getBoundingClientRect().top - last.bottom,
          activeShadow: active ? getComputedStyle(active).boxShadow : 'none',
        };
      });
      assert(networkRhythm.underline === 'none', `${route} mobile Network label still renders a divider`);
      assert(networkRhythm.firstGap >= 3, `${route} Operators sits too close to the Network label`);
      assert(networkRhythm.nextGap <= 8, `${route} leaves too much space between Validators and Research`);
      assert(networkRhythm.activeShadow === 'none', `${route} active Network link still renders a table-like side rule`);
    }

    const languages = page.locator('[role="dialog"][aria-label="Site menu"] nav[aria-label="Languages"]');
    assert(await visible(languages), `${route} mobile menu has no language choices`);
    const languageOrder = (await languages.locator('a,button').allTextContents()).map(linkName);
    assert(JSON.stringify(languageOrder) === JSON.stringify(LANGUAGE_ORDER), `${route} language order is ${languageOrder.join(', ')}`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    assert(await toggle.getAttribute('aria-expanded') === 'false', `${route} menu does not close with Escape`);
    assert(!(await visible(mobileNav)), `${route} mobile navigation remains visible after Escape`);
  }

  const activeRoute = route === '/' ? null : route.slice(1);
  if (activeRoute && MOBILE_ORDER.includes(activeRoute)) {
    const active = page.locator(`a[href="${route}"][aria-current="page"]`);
    assert(await active.count() > 0, `${route} has no aria-current=page navigation link`);
  }

  if (profile.width <= 844 && route === '/about') {
    for (const link of await page.locator('.core-contributor__identity a').all()) {
      const box = await link.boundingBox();
      assert(box && box.width >= 44 && box.height >= 44, `/about contributor profile target is ${box?.width}×${box?.height}px`);
    }
  }
  if (route === '/about') {
    const sectionGaps = await page.evaluate(() => {
      const bottom = (selector) => document.querySelector(selector).getBoundingClientRect().bottom + scrollY;
      const top = (selector) => document.querySelector(selector).getBoundingClientRect().top + scrollY;
      return [
        top('#core-contributors .section-header') - bottom('#about-ur .section-body'),
        top('#contribute .section-header') - bottom('#core-contributors .section-body'),
      ];
    });
    const maxGap = profile.width <= 820 ? 110 : 150;
    assert(sectionGaps.every((gap) => gap <= maxGap), `/about section spacing is too large: ${sectionGaps.map(Math.round).join(', ')}px`);
  }
  if (profile.width <= 844 && route === '/investors') {
    for (const link of await page.locator('.resource-dl, .research-links a').all()) {
      const box = await link.boundingBox();
      assert(box && box.height >= 44, `/investors touch target is only ${box?.height}px high`);
    }
  }
  if (profile.width <= 844 && route === '/build') {
    const proofLink = page.locator('.proof-v12 a').first();
    const box = await proofLink.boundingBox();
    assert(box && box.height >= 44, `/build proof link is only ${box?.height}px high`);
  }

  await page.close();
}

async function main() {
  if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
    console.error(`responsive-shell: missing build output at ${ROOT}`);
    process.exit(1);
  }

  const port = await freePort();
  const server = staticServer(ROOT);
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {});

  let passed = 0;
  try {
    for (const profile of PROFILES) {
      console.log(`\n=== ${profile.name} (${profile.width}×${profile.height}) ===`);
      for (const route of ROUTES) {
        await auditPage(browser, base, route, profile);
        passed += 1;
        console.log(`PASS  ${route}`);
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  console.log(`\n${passed}/${ROUTES.length * PROFILES.length} responsive shell checks passed.`);
}

main().catch((error) => {
  console.error(`responsive-shell: ${error.message}`);
  process.exit(1);
});
