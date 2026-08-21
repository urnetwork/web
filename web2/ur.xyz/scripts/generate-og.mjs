#!/usr/bin/env node
// Render the social cards: astro/public/og.png (site-wide, 1200×630) and
// astro/public/investors/og-letter.png (the Bittensor letter). The old card
// was ur.png at 474×265 — under the 600×315 large-card floor, so every share
// on X/Telegram/LinkedIn rendered as a small thumbnail.
//
// Committed outputs (like the letter PDF): the build must not need a
// Chromium. Re-run when the tagline or the letter title changes:
//   node scripts/generate-og.mjs

import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
// playwright-core is a devDep of react/ (the parity suite); resolve from there
const require = createRequire(path.join(ROOT, "react/package.json"));
const pw = await import(pathToFileURL(require.resolve("playwright-core")).href);
const { chromium } = pw.default ?? pw;
const PUB = path.join(ROOT, "astro/public");
// data URIs: file:// @font-face inside setContent pages is unreliable
import { readFileSync } from "node:fs";
const fontUrl = (f) =>
  `data:font/woff2;base64,${readFileSync(path.join(PUB, f)).toString("base64")}`;

function cardHtml({ kicker, title, footer }) {
  return `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: 'PPNeueBit'; src: url('${fontUrl("PPNeueBit-Bold.woff2")}') format('woff2'); font-weight: 700; }
  @font-face { font-family: 'PPNeueMontreal'; src: url('${fontUrl("PPNeueMontreal-Regular.woff2")}') format('woff2'); }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #101010; color: #f4f4f0;
         font-family: 'PPNeueMontreal', sans-serif; display: flex; }
  .card { display: flex; flex-direction: column; justify-content: space-between;
          padding: 72px 80px; width: 100%; }
  .mark { font-family: 'PPNeueBit', monospace; font-size: 140px; line-height: 1; letter-spacing: 0.02em; }
  .kicker { font-size: 26px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.55; margin-bottom: 26px; }
  .title { font-size: ${title.length > 40 ? 56 : 68}px; line-height: 1.08; letter-spacing: -0.01em; max-width: 980px; }
  .foot { display: flex; justify-content: space-between; align-items: flex-end;
          font-size: 26px; opacity: 0.65; }
  .rule { width: 72px; height: 2px; background: #f4f4f0; opacity: 0.4; margin: 34px 0 0; }
  </style><body><div class="card">
    <div class="mark">UR</div>
    <div>
      ${kicker ? `<div class="kicker">${kicker}</div>` : ""}
      <div class="title">${title}</div>
      <div class="rule"></div>
    </div>
    <div class="foot"><span>ur.xyz</span><span>${footer || ""}</span></div>
  </div></body>`;
}

const CARDS = [
  {
    out: path.join(PUB, "og.png"),
    html: cardHtml({ kicker: "The UR protocol", title: "Own ur privacy. Own the network.", footer: "coordinated on Bittensor" }),
  },
  {
    out: path.join(PUB, "investors/og-letter.png"),
    html: cardHtml({ kicker: "Investor letter", title: "Our Letter to Bittensor", footer: "August 18, 2026" }),
  },
];

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : { channel: "chrome" },
);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const c of CARDS) {
  mkdirSync(path.dirname(c.out), { recursive: true });
  await page.setContent(c.html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: c.out });
  console.log("wrote", c.out);
}
await browser.close();
