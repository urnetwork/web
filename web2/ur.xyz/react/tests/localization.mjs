// Built-site localization regression coverage. Exercises observable browser
// behavior so URL, static content, metadata and hydrated controls must agree.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { routeAvailability } from '../../astro/src/lib/route-localization.js';
import ar from '../src/i18n/ar.js';
import de from '../src/i18n/de.js';
import en from '../src/i18n/en.js';
import es from '../src/i18n/es.js';
import ru from '../src/i18n/ru.js';
import zh from '../src/i18n/zh.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASTRO_DIR = path.resolve(__dirname, '../../astro');
const UR_ENV = process.env.UR_ENV || 'main';
const ROOT = path.join(ASTRO_DIR, 'build', UR_ENV);
const LANGS = ['en', 'ru', 'ar', 'zh', 'de', 'es'];
const COPY = { en, ru, ar, zh, de, es };
const TRANSLATED_ROUTES = ['/', '/operators', '/miners', '/validators', '/research'];
const ENGLISH_ONLY_ROUTES = [
  '/about',
  '/build',
  '/docs',
  '/investors',
  '/investors/deck',
  '/investors/our-letter-to-bittensor',
  '/terms',
  '/privacy',
  '/vdp',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function freePort() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function mimeType(file) {
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
  }[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function staticServer(root) {
  const resolvedRoot = path.resolve(root);
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const candidates = path.extname(relative)
      ? [relative]
      : [`${relative}.html`, path.join(relative, 'index.html'), relative];
    let status = 200;
    let file = candidates
      .map((candidate) => path.resolve(resolvedRoot, candidate))
      .find((candidate) => candidate.startsWith(resolvedRoot + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile());

    if (!file) {
      file = path.join(resolvedRoot, '404.html');
      status = 404;
    }
    if (!fs.existsSync(file)) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(status, { 'content-type': mimeType(file) });
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(file).pipe(response);
  });
}

function emittedHtmlRoutes(root) {
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name.endsWith('.html')) files.push(absolute);
    }
  };
  walk(root);
  return files.map((file) => {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (relative === 'index.html') return '/';
    return `/${relative.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`;
  });
}

async function stubNetwork(page) {
  await page.route(/bringyour\.com|ur\.network|geckoterminal\.com|grafana\.ur\.io/, (request) =>
    request.fulfill({ json: {} }).catch(() => request.abort()));
}

async function chooseDesktopLanguage(page, language) {
  await page.locator('.nav-lang-toggle').click();
  await page.locator(`.nav-lang-menu a[lang="${language}"]`).click();
  await page.waitForLoadState('domcontentloaded');
}

function localizedRoute(route, language) {
  if (language === 'en') return route;
  return route === '/' ? `/${language}` : `/${language}${route}`;
}

function expectedCopy(route, language) {
  const dictionary = COPY[language];
  if (route === '/') {
    return {
      heading: dictionary.nav.tagline,
      body: dictionary.homepage.intro,
      bodySelector: '.homepage-intro p',
    };
  }

  const section = route.slice(1);
  return {
    heading: dictionary[section].title,
    body: dictionary[section].intro,
    bodySelector: `#${section} .section-body > p`,
  };
}

async function main() {
  assert(fs.existsSync(path.join(ROOT, 'index.html')), `missing build output at ${ROOT}`);

  for (const route of emittedHtmlRoutes(ROOT)) {
    if (route === '/404') continue;
    assert(routeAvailability(route).kind !== 'unknown', `emitted route is absent from localization policy: ${route}`);
  }

  const port = await freePort();
  const server = staticServer(ROOT);
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {});

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await stubNetwork(page);

    // A saved choice must not override an explicit unprefixed English URL.
    await page.goto(base + '/');
    await page.evaluate(() => localStorage.setItem('ur.xyz.lang', 'de'));
    await page.goto(base + '/operators');
    assert(new URL(page.url()).pathname === '/operators', 'saved preference changed the explicit English URL');
    assert(await page.locator('html').getAttribute('lang') === 'en', 'explicit English URL did not remain English');

    const englishHeading = await page.locator('h1').innerText();
    for (const language of LANGS.slice(1)) {
      await page.goto(base + '/operators');
      await chooseDesktopLanguage(page, language);
      assert(new URL(page.url()).pathname === `/${language}/operators`,
        `desktop ${language} choice lost the Operators route`);
      assert(await page.locator('html').getAttribute('lang') === language,
        `desktop ${language} choice loaded the wrong document language`);
      assert(await page.locator('h1').innerText() === COPY[language].operators.title,
        `desktop ${language} choice loaded the wrong Operators content`);
    }

    await page.goto(base + '/de/operators');
    assert(await page.locator('h1').innerText() !== englishHeading, 'German destination retained the English heading');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert(new URL(page.url()).pathname === '/de/operators', 'refresh lost the localized route');
    assert(await page.locator('html').getAttribute('lang') === 'de', 'refresh changed the page language');

    await chooseDesktopLanguage(page, 'es');
    assert(new URL(page.url()).pathname === '/es/operators', 'non-English switch lost page identity');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    assert(new URL(page.url()).pathname === '/de/operators', 'Back did not restore the previous localized route');
    assert(await page.locator('html').getAttribute('lang') === 'de', 'Back restored stale language state');
    await page.goForward({ waitUntil: 'domcontentloaded' });
    assert(new URL(page.url()).pathname === '/es/operators', 'Forward did not restore the localized route');
    assert(await page.locator('html').getAttribute('lang') === 'es', 'Forward restored stale language state');

    await page.goto(base + '/operators?view=map#network');
    await chooseDesktopLanguage(page, 'ar');
    const statefulUrl = new URL(page.url());
    assert(statefulUrl.pathname === '/ar/operators', 'stateful switch lost page identity');
    assert(statefulUrl.search === '?view=map' && statefulUrl.hash === '#network', 'stateful switch lost query or fragment');

    await page.goto(base + '/de/operators');
    for (const language of LANGS) {
      const expected = language === 'en' ? '/operators' : `/${language}/operators`;
      assert(await page.locator(`.footer-langs a[lang="${language}"]`).getAttribute('href') === expected,
        `footer ${language} link did not preserve Operators`);
    }
    assert(await page.locator('a[href="/build"][aria-label*="available in English" i]').count() > 0,
      'localized navigation hides or fails to label Build as English-only');
    assert(await page.locator('.footer-legal a[href="/terms"]').count() === 1,
      'localized footer does not link to authoritative English legal URL');

    for (const language of LANGS) {
      const source = language === 'en' ? '/de/operators' : '/operators';
      const expectedPath = language === 'en' ? '/operators' : `/${language}/operators`;
      await page.goto(`${base}${source}?view=map#network`);
      assert(await page.locator(`.footer-langs a[lang="${language}"]`).getAttribute('href') === `${expectedPath}?view=map#network`,
        `footer ${language} new-tab target lost query or fragment`);
      await page.locator(`.footer-langs a[lang="${language}"]`).click();
      await page.waitForURL((url) => url.pathname === expectedPath && url.search === '?view=map' && url.hash === '#network');
      const footerStatefulUrl = new URL(page.url());
      assert(footerStatefulUrl.pathname === expectedPath, `footer ${language} switch lost page identity`);
      assert(footerStatefulUrl.search === '?view=map' && footerStatefulUrl.hash === '#network',
        `footer ${language} switch lost query or fragment`);
    }

    for (const route of TRANSLATED_ROUTES) {
      for (const language of LANGS) {
        await page.goto(base + localizedRoute(route, language));
        const expected = expectedCopy(route, language);
        assert(await page.locator('html').getAttribute('lang') === language,
          `${localizedRoute(route, language)} has the wrong document language`);
        assert((await page.locator('h1').innerText()).trim() === expected.heading,
          `${localizedRoute(route, language)} has the wrong translated heading`);
        assert((await page.locator(expected.bodySelector).first().innerText()).trim() === expected.body,
          `${localizedRoute(route, language)} has the wrong translated body copy`);
        assert(await page.locator('.nav-lang-toggle').count() === 1,
          `${localizedRoute(route, language)} has no desktop language selector`);
        assert(await page.locator('.nav-language-availability').count() === 0,
          `${localizedRoute(route, language)} is incorrectly labeled English-only`);
      }
    }

    await page.goto(base + '/es');
    await chooseDesktopLanguage(page, 'en');
    assert(new URL(page.url()).pathname === '/', 'homepage return-to-English did not preserve page identity');
    assert((await page.locator('h1').innerText()).trim() === en.nav.tagline,
      'homepage return-to-English loaded the wrong content');

    for (const route of ENGLISH_ONLY_ROUTES) {
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      assert(await page.locator('html').getAttribute('lang') === 'en', `${route} is not English/LTR`);
      assert(await page.locator('html').getAttribute('dir') === 'ltr', `${route} is not English/LTR`);
      assert(await page.locator('.nav-lang-toggle').count() === 0, `${route} advertises unavailable translations`);
      assert(await page.getByText('Available in English', { exact: true }).count() > 0, `${route} lacks an English-only indicator`);
      assert(await page.locator('link[rel="alternate"][hreflang]').count() === 0, `${route} advertises false hreflang alternates`);
    }

    for (const legal of ['terms', 'privacy', 'vdp']) {
      await page.goto(`${base}/de/${legal}`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(`${base}/${legal}`);
      assert(await page.locator(`link[rel="canonical"]`).getAttribute('href') === `https://ur.xyz/${legal}`,
        `/${legal} canonical metadata is incorrect`);
      const legalAvailability = (await page.locator('.legal-language-availability').innerText()).replace(/\s+/g, ' ').trim();
      assert(legalAvailability === 'EN Available in English', `/${legal} lacks legal language messaging`);
    }

    for (const [alias, target] of [
      ['/docs/whitepaper', '/docs/litepaper'],
      ['/investors/august-investment-letter', '/investors/our-letter-to-bittensor'],
    ]) {
      await page.goto(base + alias, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(base + target);
      assert(new URL(page.url()).pathname === target, `${alias} did not resolve to ${target}`);
    }

    const missingResponse = await page.goto(base + '/future-localization-route', { waitUntil: 'domcontentloaded' });
    assert(missingResponse?.status() === 404, 'unknown path did not retain a 404 response');
    assert(new URL(page.url()).pathname === '/future-localization-route', 'unknown path was rewritten');
    assert((await page.locator('h1').innerText()).includes('does not exist'), 'unknown path rendered the homepage');

    await page.close();

    const mobile = await browser.newPage({ viewport: { width: 393, height: 659 } });
    await stubNetwork(mobile);
    await mobile.goto(base + '/de/operators');
    await mobile.locator('header .nav-menu-toggle').click();
    assert(await mobile.locator('.nav-drawer-langs a[lang="es"]').getAttribute('href') === '/es/operators',
      'mobile selector lost page identity');
    await mobile.locator('.nav-drawer-langs a[lang="es"]').click();
    await mobile.waitForLoadState('domcontentloaded');
    assert(new URL(mobile.url()).pathname === '/es/operators', 'mobile language navigation failed');

    await mobile.goto(base + '/about');
    await mobile.locator('header .nav-menu-toggle').click();
    assert(await mobile.locator('.nav-drawer-langs').count() === 0, 'English-only mobile page advertises translations');
    assert(await mobile.getByText('Available in English', { exact: true }).count() > 0,
      'English-only mobile page lacks availability messaging');
    await mobile.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('localization: route inventory, switching, history, redirects and English-only boundaries passed');
}

main().catch((error) => {
  console.error(`localization: ${error.message}`);
  process.exit(1);
});
