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
 *   docs/<path>        the images the documents reference
 *
 * Front matter (a document's <title>/description overrides) is not part of
 * the published markdown. llms.txt and llms-full.txt are generated from the
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const PUBLIC = path.join(ROOT, "astro", "public");

// ─ the litepaper, copied straight from the canonical markdown ─────────────
// docs/litepaper.md is what /docs/litepaper renders, so it is the one source.
// Anything appended here (the living-document notice, for one) is already in
// that file and comes along for free.
const litepaperMd = splitFrontMatter(readFileSync(path.join(DOCS_DIR, "litepaper.md"), "utf8")).body.trimEnd() + "\n";
rmSync(path.join(PUBLIC, "whitepaper.md"), { force: true });
writeFileSync(path.join(PUBLIC, "litepaper.md"), litepaperMd);
console.log("wrote litepaper.md");

// ── docs markdown mirror (same slug scheme as react/src/lib/docs.js) ──
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


// Images referenced by the documents (relative paths like
// "DeleteAccountAndroid.png" in support/delete.md) resolve against the
// rendered page's /docs/<dir>/ URL — mirror them there, or the page ships
// broken <img>s (it did: the delete-account walkthrough's two screenshots
// 404'd in production).
{
  const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);
  const imgOut = path.join(PUBLIC, "docs");
  rmSync(imgOut, { recursive: true, force: true });
  let n = 0;
  // walk() above only returns .md files — a raw walk finds the assets
  const rawWalk = (dir, out = []) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const q = path.join(dir, e.name);
      if (e.isDirectory()) rawWalk(q, out);
      else out.push(q);
    }
    return out;
  };
  for (const abs of rawWalk(DOCS_DIR)) {
    if (!IMG_EXT.has(path.extname(abs).toLowerCase())) continue;
    const rel = path.relative(DOCS_DIR, abs).replace(/\\/g, "/");
    const dest = path.join(imgOut, rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(abs, dest);
    n++;
  }
  console.log(`mirrored ${n} docs image(s) into public/docs/`);
}

const outDir = path.join(PUBLIC, "docs-md");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const seen = new Set();
const docIndex = [];

for (const abs of walk(DOCS_DIR)) {
  const rel = path.relative(DOCS_DIR, abs).replace(/\\/g, "/");
  const slug = slugFor(rel);
  if (!slug || seen.has(slug) || HIDDEN_DOC_SLUGS.has(slug)) continue; // root README + first-wins dedupe, like the lib
  seen.add(slug);
  // a document published as its own page (the legal documents) has no /docs page to be the twin of
  if (DOC_PAGE_PATHS[slug]) continue;
  const target = path.join(outDir, `${slug}.md`);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, splitFrontMatter(readFileSync(abs, "utf8")).body);
  docIndex.push(slug);
}
console.log(`mirrored ${docIndex.length} docs into docs-md/`);

// The retired API explorer and its stale public specification remain in the
// source history, but are not part of the published ur.xyz surface.
rmSync(path.join(PUBLIC, "openapi.yml"), { force: true });

// llms.txt and llms-full.txt are written into the build output after the
// pages exist (generate-agent-assets-llms.mjs); copies left here would be
// published by the build first and only then replaced.
rmSync(path.join(PUBLIC, "llms.txt"), { force: true });
rmSync(path.join(PUBLIC, "llms-full.txt"), { force: true });
