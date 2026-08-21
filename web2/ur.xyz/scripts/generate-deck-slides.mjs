#!/usr/bin/env node
// Turn the investor deck PDF into the slide images the /investors/deck viewer
// serves, and place the PDF itself as the download.
//
// The deck is authored in Google Slides and exported as a PDF. That export
// keeps real vector text rather than flattening each slide to a bitmap, so we
// can rasterise at whatever resolution the viewer needs instead of being stuck
// with whatever Slides' own image export chose.
//
// Rendering runs pdf.js inside Chromium rather than node-canvas: pdf.js hands
// decoded images to the canvas as ImageBitmaps, which node-canvas cannot draw.
// A real browser canvas can. Chromium comes from playwright-core, the same one
// `make letter-pdf` uses, which is why this is NOT part of `make build` — the
// site build has to stay runnable on a host with no browser.
//
//   node ../scripts/generate-deck-slides.mjs <deck.pdf>
//
// Writes astro/public/investors/deck/NN.webp and copies the PDF to
// astro/public/investors/ur-investor-deck.pdf. Prints the slide count, which
// must match `deck.slideCount` in astro/src/lib/investors.js.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const REACT = path.join(ROOT, 'react');
const PUBLIC = path.join(ROOT, 'astro', 'public', 'investors');
const SLIDES = path.join(PUBLIC, 'deck');
const PDF_OUT = path.join(PUBLIC, 'ur-investor-deck.pdf');

// 2560 covers a 2x display at the viewer's 1180px stage and still looks clean
// stretched to a 1440p fullscreen. Above that the files grow faster than the
// visible detail does.
const WIDTH = 2560;
const QUALITY = 0.9;

const require = createRequire(path.join(REACT, 'package.json'));

function resolveOrDie(name, hint) {
    try {
        return require.resolve(name);
    } catch {
        console.error(`Missing ${name}. ${hint}`);
        process.exit(1);
    }
}

const pdfjsEntry = resolveOrDie('pdfjs-dist/build/pdf.mjs', 'Run `npm ci` in web2/ur.xyz/react.');
const pdfjsDir = path.dirname(pdfjsEntry);
const { chromium } = require('playwright-core');

const src = process.argv[2];
if (!src) {
    console.error('Usage: node generate-deck-slides.mjs <deck.pdf>');
    process.exit(1);
}
if (!fs.existsSync(src)) {
    console.error(`No such file: ${src}`);
    process.exit(1);
}

// pdf.js is an ES module, so it has to be imported over http: a module fetched
// from file:// is blocked as a cross-origin request.
const HOST_PAGE = `<!doctype html><meta charset="utf-8">
<script type="module">
import * as pdfjs from './pdfjs/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = './pdfjs/pdf.worker.mjs';
window.renderAll = async ({ b64, width, quality }) => {
    const doc = await pdfjs.getDocument({
        data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)),
    }).promise;
    const out = [];
    for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / base.width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        // Slides that use transparency would otherwise composite onto nothing
        // and encode as black; the deck's own dark background paints over this.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        out.push({
            n,
            w: canvas.width,
            h: canvas.height,
            ratio: (base.width / base.height).toFixed(3),
            data: canvas.toDataURL('image/webp', quality).split(',')[1],
        });
    }
    return out;
};
window.__ready = true;
</script>`;

const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript' };

const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/' || url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(HOST_PAGE);
    }
    if (url.startsWith('/pdfjs/')) {
        const file = path.join(pdfjsDir, url.slice('/pdfjs/'.length));
        if (file.startsWith(pdfjsDir) && fs.existsSync(file)) {
            res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
            return fs.createReadStream(file).pipe(res);
        }
    }
    res.writeHead(404);
    res.end();
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

const browser = await chromium.launch();
let slides;
try {
    const page = await browser.newPage();
    page.on('console', m => {
        if (m.type() === 'error') console.error('  [browser]', m.text());
    });
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForFunction('window.__ready === true', null, { timeout: 30_000 });
    slides = await page.evaluate(args => window.renderAll(args), {
        b64: fs.readFileSync(src).toString('base64'),
        width: WIDTH,
        quality: QUALITY,
    });
} finally {
    await browser.close();
    server.close();
}

// Stale slides from a longer previous deck would keep being served, because the
// viewer only asks for 01..slideCount and nothing ever deletes the rest.
fs.rmSync(SLIDES, { recursive: true, force: true });
fs.mkdirSync(SLIDES, { recursive: true });

let bytes = 0;
for (const slide of slides) {
    const file = path.join(SLIDES, `${String(slide.n).padStart(2, '0')}.webp`);
    fs.writeFileSync(file, Buffer.from(slide.data, 'base64'));
    const size = fs.statSync(file).size;
    bytes += size;
    console.log(
        `${String(slide.n).padStart(2, '0')}  ${slide.w}x${slide.h}  ${(size / 1024).toFixed(0)} KB`,
    );
}

fs.copyFileSync(src, PDF_OUT);

const ratios = [...new Set(slides.map(s => s.ratio))];
if (ratios.length > 1) {
    console.warn(`\nWarning: mixed page aspect ratios (${ratios.join(', ')}). The viewer's`);
    console.warn('stage is a fixed 16:9, so off-ratio slides will letterbox inside it.');
} else if (ratios[0] !== '1.778') {
    console.warn(`\nWarning: pages are ${ratios[0]}:1, not 16:9 (1.778). Slides will letterbox.`);
}

console.log(`\n${slides.length} slides, ${(bytes / 1024 / 1024).toFixed(2)} MB total`);
console.log(`PDF  ${(fs.statSync(PDF_OUT).size / 1024 / 1024).toFixed(2)} MB -> ${path.relative(ROOT, PDF_OUT)}`);
console.log(`\nSet deck.slideCount = ${slides.length} in astro/src/lib/investors.js`);
