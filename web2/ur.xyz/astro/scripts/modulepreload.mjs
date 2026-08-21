#!/usr/bin/env node
// Inject <link rel="modulepreload"> for the hydration graph of client:load
// islands into every built page.
//
// Astro discovers an island's component-url only after the HTML is parsed and
// its hydration bootstrap runs, so the entry chunk — and the chunks it imports
// — load as a 2–3 hop waterfall AFTER the framework chunk. Preloading them
// from the <head> flattens the waterfall and lets the browser compile the
// modules off-thread while the HTML streams. Only client:load islands are
// preloaded: a client:visible island may never hydrate at all.
//
// The i18n module loads the page language's dictionary with a dynamic import
// before hydration (top-level await), which a static scan cannot see — so the
// page's locale chunks (from src/i18n/locale/<lang>.js, plus English, the
// fallback) are preloaded too, found by their emitted chunk names.
//
// Links are inserted AFTER the last stylesheet: render-blocking CSS keeps
// first claim on bandwidth (capo head order).
//
// Usage: node scripts/modulepreload.mjs [distDir]   (default: dist)

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve(process.argv[2] || "dist");
if (!existsSync(DIST)) {
  console.error(`modulepreload: no such dir ${DIST}`);
  process.exit(2);
}

// depth of static-import expansion below the island entry. 1 level covers the
// shared chunks (framework runtime arrives via renderer-url) without turning
// the head into a manifest of the whole graph.
const IMPORT_DEPTH = 2;
const MAX_LINKS = 12;

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

// locale chunk lookup: src/i18n/locale/<lang>.js emits "<lang>.<hash>.js"
const LANGS = ["en", "es", "de", "zh", "ru", "ar"];
const localeChunks = new Map();
const astroDir = path.join(DIST, "_astro");
if (existsSync(astroDir)) {
  for (const f of readdirSync(astroDir)) {
    const m = f.match(/^([a-z]{2})\.[A-Za-z0-9_-]+\.js$/);
    if (m && LANGS.includes(m[1])) localeChunks.set(m[1], `/_astro/${f}`);
  }
}

const importCache = new Map();
function directImports(url) {
  if (importCache.has(url)) return importCache.get(url);
  const p = path.join(DIST, url);
  const out = [];
  if (existsSync(p)) {
    const src = readFileSync(p, "utf8");
    for (const m of src.matchAll(/(?:import|from)\s*["']([^"']+\.js)["']/g)) {
      if (m[1].startsWith(".")) out.push(path.posix.join(path.posix.dirname(url), m[1]));
    }
  }
  importCache.set(url, out);
  return out;
}

let pages = 0;
let skipped = 0;
for (const file of walk(DIST)) {
  if (!file.endsWith(".html")) continue;
  const html = readFileSync(file, "utf8");

  // client:load islands only. The island tag carries all attrs on one element.
  const urls = new Set();
  for (const island of html.matchAll(/<astro-island\b[^>]*>/g)) {
    const tag = island[0];
    if (!/client="load"/.test(tag)) continue;
    for (const m of tag.matchAll(/(?:component-url|renderer-url)="([^"]+)"/g)) {
      if (m[1].startsWith("/_astro/")) urls.add(m[1]);
    }
  }
  if (!urls.size) { skipped++; continue; }

  // expand static imports a bounded number of levels
  let frontier = [...urls];
  for (let depth = 0; depth < IMPORT_DEPTH; depth++) {
    const next = [];
    for (const u of frontier) {
      for (const dep of directImports(u)) {
        if (!urls.has(dep)) { urls.add(dep); next.push(dep); }
      }
    }
    frontier = next;
  }

  // the page language's dictionary (+ English, the t()/ta() fallback)
  const lang = (html.match(/<html[^>]*\blang="([a-z]{2})/i)?.[1] || "en").toLowerCase();
  for (const l of new Set(["en", lang])) {
    const chunk = localeChunks.get(l);
    if (chunk) urls.add(chunk);
  }

  const links = [...urls]
    .slice(0, MAX_LINKS)
    .map((u) => `<link rel="modulepreload" href="${u}">`)
    .join("");

  // after the LAST stylesheet so CSS keeps bandwidth priority
  const lastCss = html.lastIndexOf('rel="stylesheet"');
  let out;
  if (lastCss >= 0) {
    const end = html.indexOf(">", lastCss) + 1;
    out = html.slice(0, end) + links + html.slice(end);
  } else {
    out = html.replace("</head>", `${links}</head>`);
  }
  if (out !== html) {
    writeFileSync(file, out);
    pages++;
  }
}

console.log(`modulepreload: injected on ${pages} pages (${skipped} without load islands)`);
