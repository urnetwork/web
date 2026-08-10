/**
 * Generates ur.xyz's machine-readable agent assets into astro/public/:
 *
 *   whitepaper.md      — the home page's whitepaper, from the SAME i18n source
 *                        the page renders (no drift)
 *   docs-md/<slug>.md  — the raw markdown of every docs page (the docs
 *                        explorer is a client island; these give crawlers and
 *                        agents the actual documents, and each docs page links
 *                        its own via <link rel="alternate" type="text/markdown">)
 *   openapi.yml        — the OpenAPI document the /api explorer renders
 *                        (copied from build/bringyour.yml when present)
 *   llms.txt           — the llms.txt-convention map of the site
 *   llms-full.txt      — single-fetch: llms.txt + the whitepaper + key docs
 *
 * Slug logic mirrors react/src/lib/docs.js exactly (that module imports a
 * vite virtual module and cannot run under plain node).
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const PUBLIC = path.join(ROOT, "astro", "public");
const OPENAPI = path.join(ROOT, "build", "bringyour.yml");

// ── the whitepaper, from the i18n english dictionary (the page's own source) ──
const en = (await import(path.join(ROOT, "react/src/i18n/en.js"))).default;
const w = en.whitepaper;

const whitepaperMd = `# ${w.title}

> ${en.nav?.tagline || "Own your privacy. Own your network."}

${w.clauses
  .map((c) => `## ${c.numeral} ${c.title}\n\n${(Array.isArray(c.body) ? c.body : [c.body]).join("\n\n")}`)
  .join("\n\n")}

Full whitepaper: ${w.source?.href || "https://github.com/urfoundation/sn/"}
`;
writeFileSync(path.join(PUBLIC, "whitepaper.md"), whitepaperMd);
console.log("wrote whitepaper.md");

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
for (const abs of walk(DOCS_DIR)) {
  const rel = path.relative(DOCS_DIR, abs).replace(/\\/g, "/");
  const slug = slugFor(rel);
  if (!slug || seen.has(slug)) continue; // root README + first-wins dedupe, like the lib
  seen.add(slug);
  const target = path.join(outDir, `${slug}.md`);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(abs, target);
  const title = (readFileSync(abs, "utf8").match(/^#\s+(.+)$/m) || [null, slug])[1];
  docIndex.push({ slug, title });
}
docIndex.sort((a, b) => a.slug.localeCompare(b.slug));
console.log(`mirrored ${docIndex.length} docs into docs-md/`);

// ── openapi ──
let hasOpenapi = false;
if (existsSync(OPENAPI)) {
  copyFileSync(OPENAPI, path.join(PUBLIC, "openapi.yml"));
  hasOpenapi = true;
  console.log("copied openapi.yml");
} else {
  console.log("openapi source absent (build/bringyour.yml) — skipped");
}

// ── llms.txt ──
const llms = `# UR protocol

> UR is an open-source, decentralized privacy network: user traffic distributed
> across independent miners with multi-hop routing and layered encryption,
> coordinated on Bittensor. ur.xyz is the protocol's information site, hosted
> by BringYour, Inc. The commercial network built on it lives at https://ur.io.

## Machine-readable

- [Whitepaper (markdown)](https://ur.xyz/whitepaper.md)
- [Published usage-cost sheet (yaml)](https://ur.xyz/price.yml) — updates: [RSS](https://ur.xyz/price.rss)
${hasOpenapi ? "- [OpenAPI reference (yaml)](https://ur.xyz/openapi.yml)\n" : ""}- [Everything in one file](https://ur.xyz/llms-full.txt)
- For connecting an agent to the network itself (MCP server, x402): [ur.io agents guide](https://ur.io/agents.md)

## Pages

- [Home + whitepaper](https://ur.xyz/)
- [Operators](https://ur.xyz/operators)
- [Miners](https://ur.xyz/miners)
- [Validators](https://ur.xyz/validators)
- [Research](https://ur.xyz/research)
- [Community](https://ur.xyz/community)
- [Usage cost](https://ur.xyz/price)
- [Roadmap](https://ur.xyz/roadmap)
- [API reference](https://ur.xyz/api)

## Docs

${docIndex.map((d) => `- [${d.title}](https://ur.xyz/docs-md/${d.slug}.md)`).join("\n")}

## Optional

- [Terms of Service](https://ur.xyz/terms)
- [Privacy Policy](https://ur.xyz/privacy)
- [Vulnerability Disclosure](https://ur.xyz/vdp)
`;
writeFileSync(path.join(PUBLIC, "llms.txt"), llms);
console.log("wrote llms.txt");

// llms-full: the map + whitepaper + the highest-signal docs inline
const KEY_DOCS = ["economic-model", "protocol", "cli", "provider"];
const inlined = docIndex
  .filter((d) => KEY_DOCS.some((k) => d.slug === k || d.slug.startsWith(`${k}/`)))
  .slice(0, 8)
  .map((d) => readFileSync(path.join(outDir, `${d.slug}.md`), "utf8"))
  .join("\n\n---\n\n");
writeFileSync(path.join(PUBLIC, "llms-full.txt"), `${llms}\n---\n\n${whitepaperMd}\n---\n\n${inlined}`);
console.log("wrote llms-full.txt");
