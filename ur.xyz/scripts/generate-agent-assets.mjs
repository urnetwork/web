/**
 * Generates ur.xyz's machine-readable agent assets into astro/public/:
 *
 *   litepaper.md       — a verbatim copy of docs/litepaper.md, which is the
 *                        single source for the litepaper: /docs/litepaper
 *                        renders that same file, so the page a person reads and
 *                        the file an agent fetches cannot drift apart
 *   docs-md/<slug>.md  — the raw markdown of every docs page (the docs
 *                        explorer is a client island; these give crawlers and
 *                        agents the actual documents, and each docs page links
 *                        its own via <link rel="alternate" type="text/markdown">)
 *   llms.txt           — the llms.txt-convention map of the site
 *   llms-full.txt      — single-fetch: llms.txt + the whitepaper + key docs
 *
 * Slug logic mirrors react/src/lib/docs.js exactly (that module imports a
 * vite virtual module and cannot run under plain node).
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { HIDDEN_DOC_SLUGS, slugFor } from "../react/src/lib/docs-shared.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const PUBLIC = path.join(ROOT, "astro", "public");

// ─ the litepaper, copied straight from the canonical markdown ─────────────
// docs/litepaper.md is what /docs/litepaper renders, so it is the one source.
// Anything appended here (the living-document notice, for one) is already in
// that file and comes along for free.
const litepaperMd = readFileSync(path.join(DOCS_DIR, "litepaper.md"), "utf8").trimEnd() + "\n";
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
  const target = path.join(outDir, `${slug}.md`);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(abs, target);
  const title = (readFileSync(abs, "utf8").match(/^#\s+(.+)$/m) || [null, slug])[1];
  docIndex.push({ slug, title });
}
docIndex.sort((a, b) => a.slug.localeCompare(b.slug));
console.log(`mirrored ${docIndex.length} docs into docs-md/`);

// The retired API explorer and its stale public specification remain in the
// source history, but are not part of the published ur.xyz surface.
rmSync(path.join(PUBLIC, "openapi.yml"), { force: true });

// ── llms.txt ──
const llms = `# UR protocol

> UR is an open-source, decentralized privacy network: user traffic distributed
> across independent miners with multi-hop routing and layered encryption,
> coordinated on Bittensor. ur.xyz is the protocol's information site, hosted
> by UR Foundation. The commercial network built on it lives at https://ur.io.

## Machine-readable

- [Litepaper](https://ur.xyz/docs/litepaper)
- [Litepaper (raw markdown)](https://ur.xyz/litepaper.md)
- [Everything in one file](https://ur.xyz/llms-full.txt)
- For connecting an agent to the network itself (MCP server, x402): [ur.io agents guide](https://ur.io/agents.md)

## Pages

- [Home](https://ur.xyz/)
- [Operators](https://ur.xyz/operators)
- [Miners](https://ur.xyz/miners)
- [Validators](https://ur.xyz/validators)
- [Research](https://ur.xyz/research)
- [Investor Centre](https://ur.xyz/investors): letters, materials, and public research
- [Our Letter to Bittensor](https://ur.xyz/investors/our-letter-to-bittensor) ([PDF](https://ur.xyz/investors/our-letter-to-bittensor.pdf)): the August 2026 launch letter

## Docs

- [Documentation index](https://ur.xyz/docs)
${docIndex.map((d) => `- [${d.title}](https://ur.xyz/docs-md/${d.slug}.md)`).join("\n")}

## Optional

- [MASA L2 2025 audit (PDF)](https://ur.xyz/audits/masa-l2-2025.pdf): third-party peer audit
- [Terms of Service](https://ur.xyz/terms)
- [Privacy Policy](https://ur.xyz/privacy)
- [Vulnerability Disclosure](https://ur.xyz/vdp)
`;
writeFileSync(path.join(PUBLIC, "llms.txt"), llms);
console.log("wrote llms.txt");

// llms-full: the map + litepaper + the highest-signal docs inline
const KEY_DOCS = ["protocol", "provider"];
const inlined = docIndex
  .filter((d) => KEY_DOCS.some((k) => d.slug === k || d.slug.startsWith(`${k}/`)))
  .slice(0, 8)
  .map((d) => readFileSync(path.join(outDir, `${d.slug}.md`), "utf8"))
  .join("\n\n---\n\n");
writeFileSync(path.join(PUBLIC, "llms-full.txt"), `${llms}\n---\n\n${litepaperMd}\n---\n\n${inlined}`);
console.log("wrote llms-full.txt");
