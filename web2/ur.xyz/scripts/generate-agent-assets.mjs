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
function slugFor(rel) {
  let s = rel.replace(/\.md$/i, "");
  s = s.replace(/\/README$/i, "");
  if (s === "README") s = "";
  return s;
}

const outDir = path.join(PUBLIC, "docs-md");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const seen = new Set();
const docIndex = [];
const HIDDEN_DOC_SLUGS = new Set([
  "edgeos",
  "routeros",
  "rpi",
  "economic-model/economic-model",
  "cli",
  "archive/whitepaper",
  "mcp/SKILL",
  "mcp/SKILL2",
  "router/testing-notes",
  "changelog/2024-10-31-inspect/inspect",
  "changelog/2024-10-31-tether/tether",
  "changelog/2024-10-31-update-1/update-1"
]);
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

## Docs

${docIndex.map((d) => `- [${d.title}](https://ur.xyz/docs-md/${d.slug}.md)`).join("\n")}

## Optional

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
