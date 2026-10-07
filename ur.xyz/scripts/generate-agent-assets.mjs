/**
 * Generates ur.xyz's machine-readable agent assets into astro/public/ before
 * the build:
 *
 *   litepaper.md       docs/litepaper.md, which is the single source for the
 *                      litepaper: /docs/litepaper renders that same file, so the
 *                      page a person reads and the file an agent fetches cannot
 *                      drift apart
 *   docs-md/<slug>.md  the markdown of every docs page (each docs page links
 *                      its own via <link rel="alternate" type="text/markdown">)
 *   <page>.md          the markdown of each document published as its own page
 *                      (the legal documents: /terms.md, /privacy.md, /vdp.md),
 *                      beside the page it mirrors, which links it the same way
 *   docs/<path>        the images the published documents show (only those)
 *
 * Front matter (a document's <title>/description overrides) is not part of
 * the published markdown, and every link in it is absolute (agent-markdown.mjs):
 * a twin is read away from the page whose paths its links were written
 * against. llms.txt and llms-full.txt are generated from the
 * finished build instead (generate-agent-assets-llms.mjs, run by the astro
 * build), so they list the pages the site actually serves.
 *
 * Slug logic is shared with react/src/lib/docs.js through docs-shared.js
 * (that module imports a vite virtual module and cannot run under plain node).
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOC_PAGE_PATHS, HIDDEN_DOC_SLUGS, slugFor, splitFrontMatter } from "../react/src/lib/docs-shared.js";
import { absoluteLinks, publishedImages } from "./agent-markdown.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const PUBLIC = path.join(ROOT, "astro", "public");

// ─ the litepaper, copied straight from the canonical markdown ─────────────
// docs/litepaper.md is what /docs/litepaper renders, so it is the one source.
// Anything appended here (the living-document notice, for one) is already in
// that file and comes along for free.
const litepaperMd = absoluteLinks(splitFrontMatter(readFileSync(path.join(DOCS_DIR, "litepaper.md"), "utf8")).body.trimEnd() + "\n", "/docs/litepaper.md");
rmSync(path.join(PUBLIC, "whitepaper.md"), { force: true });
writeFileSync(path.join(PUBLIC, "litepaper.md"), litepaperMd);
console.log("wrote litepaper.md");

// ── the published documents (same slug scheme as react/src/lib/docs.js) ──
function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

const published = [];
{
  const seen = new Set();
  for (const abs of walk(DOCS_DIR)) {
    const rel = path.relative(DOCS_DIR, abs).replace(/\\/g, "/");
    const slug = slugFor(rel);
    if (!slug || seen.has(slug) || HIDDEN_DOC_SLUGS.has(slug)) continue; // root README + first-wins dedupe, like the lib
    seen.add(slug);
    published.push({ rel, slug, body: splitFrontMatter(readFileSync(abs, "utf8")).body });
  }
}

// The images the published documents show (relative paths like
// "DeleteAccountAndroid.webp" in support/delete.md) resolve against the
// rendered page's /docs/<dir>/ URL: mirror them there, or the page ships
// broken <img>s (it did: the delete-account walkthrough's two screenshots
// 404'd in production). Only what a document shows is mirrored; every image
// in docs/ was, which published a 3.3 MB picture no page used.
{
  const imgOut = path.join(PUBLIC, "docs");
  rmSync(imgOut, { recursive: true, force: true });
  const images = publishedImages(published);
  for (const rel of images) {
    const src = path.join(DOCS_DIR, rel);
    if (!existsSync(src)) {
      console.error(`generate-agent-assets: a document shows docs/${rel}, which does not exist`);
      process.exit(1);
    }
    const dest = path.join(imgOut, rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  console.log(`mirrored ${images.length} docs image(s) into public/docs/`);
}

// ── the markdown twins ──
const outDir = path.join(PUBLIC, "docs-md");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const docIndex = [];
const pageTwins = [];
for (const { rel, slug, body } of published) {
  // a document published as its own page (the legal documents) has no /docs
  // page: its twin sits beside the page it mirrors, /terms.md for /terms
  if (DOC_PAGE_PATHS[slug]) {
    writeFileSync(path.join(PUBLIC, `${DOC_PAGE_PATHS[slug].slice(1)}.md`), absoluteLinks(body, DOC_PAGE_PATHS[slug]));
    pageTwins.push(`${DOC_PAGE_PATHS[slug]}.md`);
    continue;
  }
  const target = path.join(outDir, `${slug}.md`);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, absoluteLinks(body, `/docs/${rel}`));
  docIndex.push(slug);
}
console.log(`mirrored ${docIndex.length} docs into docs-md/ and wrote ${pageTwins.join(", ")}`);

// The retired API explorer and its stale public specification remain in the
// source history, but are not part of the published ur.xyz surface.
rmSync(path.join(PUBLIC, "openapi.yml"), { force: true });

// llms.txt and llms-full.txt are written into the build output after the
// pages exist (generate-agent-assets-llms.mjs); copies left here would be
// published by the build first and only then replaced.
rmSync(path.join(PUBLIC, "llms.txt"), { force: true });
rmSync(path.join(PUBLIC, "llms-full.txt"), { force: true });
