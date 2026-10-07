#!/usr/bin/env node
// SEO/indexing/agent-surface invariants, asserted against the BUILT site.
// Everything here was a real defect found in the 2026-08-20 audit (SEO3.md):
// heads and sitemap claiming different hreflang sets, English titles over
// translated bodies, audio tags pointing at empty directories, a {link}
// template placeholder published in products.md, sitemap URLs for pages that
// canonicalize elsewhere. The generators fixed them; this gate keeps them
// fixed. Wired into `make gates` and the npm postbuild.
//
// Usage: node scripts/seo-audit.mjs [distDir]   (default: dist)

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DOC_ORDER, DOC_PAGE_PATHS, UNLISTED_DOC_SLUGS } from "../../react/src/lib/docs-shared.js";
import { contentDay, investorLetterMetadata } from "./pdf-freshness.mjs";

const DIST = path.resolve(process.argv[2] || "dist");
if (!existsSync(DIST)) {
  console.error(`seo-audit: no such dir ${DIST}`);
  process.exit(2);
}

const errors = [];
const err = (msg) => errors.push(msg);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith(".html"));
const relOf = (f) => "/" + path.relative(DIST, f).split(path.sep).join("/");

// how the static host resolves a clean URL
const served = new Set();
for (const f of files) {
  const rel = relOf(f);
  served.add(rel);
  if (rel.endsWith("/index.html")) served.add(rel.slice(0, -"index.html".length));
  if (rel.endsWith(".html")) served.add(rel.slice(0, -".html".length));
}
const resolves = (p) => {
  const clean = p.split("#")[0].split("?")[0];
  if (served.has(clean)) return true;
  if (clean.endsWith("/") && served.has(clean.slice(0, -1))) return true;
  return false;
};

// ── parse every page head ──
const attr = (tag, name) => (tag.match(new RegExp(`${name}="([^"]*)"`)) || [])[1];
// Attribute values in built HTML are entity-escaped. SEO limits apply to the
// text a browser/search engine decodes, not the serialized source (`&quot;` is
// one visible character, not six).
const decodeHtmlEntities = (value) => String(value || "").replace(
  /&(?:#(\d+)|#x([\da-f]+)|amp|quot|apos|lt|gt);/gi,
  (entity, decimal, hex) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    return {
      "&amp;": "&",
      "&quot;": '"',
      "&apos;": "'",
      "&lt;": "<",
      "&gt;": ">",
    }[entity.toLowerCase()];
  },
);
const pages = new Map(); // urlPath -> record
let siteOrigin = null;

const VIDEO_DATETIME_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function collectVideoObjects(value, out = []) {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    for (const child of value) collectVideoObjects(child, out);
    return out;
  }
  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.includes("VideoObject")) out.push(value);
  for (const child of Object.values(value)) collectVideoObjects(child, out);
  return out;
}

for (const f of htmlFiles) {
  const html = readFileSync(f, "utf8");
  // redirect stubs have no <head> element at all — their whole body is head-ish
  const headEnd = html.indexOf("</head>");
  const head = headEnd === -1 ? html : html.slice(0, headEnd + 7);
  const urlPath = relOf(f).replace(/\.html$/, "").replace(/\/index$/, "/") || "/";

  const canonicalTag = (head.match(/<link rel="canonical"[^>]*>/) || [])[0] || null;
  const canonical = canonicalTag ? attr(canonicalTag, "href") : null;
  const robotsContents = [...head.matchAll(/<meta name="robots"[^>]*>/g)].map(
    (m) => attr(m[0], "content") || "",
  );
  const noindex = robotsContents.some((c) => /noindex/.test(c));
  // Astro writes its own stub for a configured redirect: a meta refresh and a
  // bare noindex. That is correct for a page whose only job is to bounce, and
  // it is not the layout's to make consistent.
  const redirectStub = /<meta http-equiv="refresh"/i.test(head);
  const title = (head.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const description = decodeHtmlEntities(
    attr((head.match(/<meta name="description"[^>]*>/) || [])[0] || "", "content"),
  );
  const lang = attr((html.match(/<html[^>]*>/) || [])[0] || "", "lang") || "";
  const hreflangs = new Map(
    [...head.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]),
  );
  const ogImage = attr((head.match(/<meta property="og:image"[^>]*>/) || [])[0] || "", "content");
  const videoObjects = [];

  if (canonical && !siteOrigin) {
    try {
      siteOrigin = new URL(canonical).origin;
    } catch {
      /* checked below */
    }
  }

  // JSON-LD must parse on every page that carries it
  for (const m of head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]);
      collectVideoObjects(data, videoObjects);
    } catch (e) {
      err(`${urlPath}: JSON-LD does not parse (${e.message})`);
    }
  }

  for (const video of videoObjects) {
    for (const field of ["name", "thumbnailUrl", "uploadDate"]) {
      if (!video[field] || (Array.isArray(video[field]) && !video[field].length)) {
        err(`${urlPath}: VideoObject is missing required ${field}`);
      }
    }
    if (video.uploadDate && !VIDEO_DATETIME_WITH_ZONE.test(video.uploadDate)) {
      err(`${urlPath}: VideoObject uploadDate is not a full datetime with timezone (${video.uploadDate})`);
    }
  }

  pages.set(urlPath, { f, urlPath, canonical, noindex, robotsContents, redirectStub, title, description, lang, hreflangs, ogImage, videoObjects, html });
}

// ── robots directives ──
// An indexable page that states no preview limits leaves them to the engine's
// defaults, which is what keeps its image out of a large result card; and a
// noindex page should say nofollow the way the layout does. Redirect stubs are
// Astro's own and are exempt.
function auditRobots() {
  for (const p of pages.values()) {
    if (p.redirectStub) continue;
    if (p.noindex) {
      if (!p.robotsContents.some((c) => /\bnofollow\b/.test(c))) {
        err(`${p.urlPath}: noindex page does not also say nofollow (${p.robotsContents.join(" | ")})`);
      }
      continue;
    }
    if (!p.robotsContents.some((c) => /max-image-preview:large/.test(c))) {
      err(`${p.urlPath}: indexable page states no max-image-preview:large`);
    }
  }
}

const toPath = (u) => {
  try {
    const url = new URL(u);
    return url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
  } catch {
    return null;
  }
};

// ── canonical / robots rules ──
for (const p of pages.values()) {
  if (p.noindex) {
    // a redirect stub legitimately pairs noindex with a canonical pointing at
    // its TARGET; only a SELF-canonical on a noindex page is contradictory
    const cPath = p.canonical && toPath(p.canonical);
    const selfPath = p.urlPath === "/" ? "/" : p.urlPath;
    if (cPath && cPath === selfPath) err(`${p.urlPath}: noindex page carries a self-canonical`);
    if (p.hreflangs.size) err(`${p.urlPath}: noindex page carries hreflang alternates`);
    continue;
  }
  if (!p.canonical) {
    err(`${p.urlPath}: indexable page has no canonical`);
    continue;
  }
  const origin = (() => {
    try {
      return new URL(p.canonical).origin;
    } catch {
      return null;
    }
  })();
  if (!origin) err(`${p.urlPath}: canonical is not a valid URL (${p.canonical})`);
  else if (origin !== siteOrigin) err(`${p.urlPath}: canonical origin ${origin} ≠ ${siteOrigin}`);
  if (origin && origin.startsWith("http://") && !origin.includes("localhost"))
    err(`${p.urlPath}: canonical is plain http (${p.canonical})`);
  const cPath = toPath(p.canonical);
  if (cPath !== null && !resolves(cPath)) err(`${p.urlPath}: canonical target ${cPath} is not served`);
  if (!p.title) err(`${p.urlPath}: no <title>`);
  if (!p.description) err(`${p.urlPath}: no meta description`);
  if (p.description.length > 175) err(`${p.urlPath}: description ${p.description.length} chars (cap 175)`);
}

// canonical-self pages are "the" indexable set
const canonicalSelf = [...pages.values()].filter(
  (p) => !p.noindex && p.canonical && toPath(p.canonical) === (p.urlPath === "/" ? "/" : p.urlPath),
);

// ── title length ──
// A result shows about 60 characters of a title before cutting it, and the
// translated section titles ran to 71 (/ru/miners). Counted in graphemes, as a
// reader sees them: an Arabic vowel mark adds no width.
const TITLE_MAX = 60;
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
for (const p of canonicalSelf) {
  const title = decodeHtmlEntities(p.title);
  const length = [...graphemes.segment(title)].length;
  if (length > TITLE_MAX) err(`${p.urlPath}: title ${length} characters (cap ${TITLE_MAX}): ${title}`);
}

// ── unique titles/descriptions per language among canonical-self pages ──
for (const key of ["title", "description"]) {
  const seen = new Map();
  for (const p of canonicalSelf) {
    const k = `${p.lang}\u0000${p[key]}`;
    if (seen.has(k)) err(`${p.urlPath}: duplicate ${key} (lang=${p.lang}) with ${seen.get(k)}`);
    else seen.set(k, p.urlPath);
  }
}

// ── hreflang truthfulness: self-reference + reciprocity + served targets ──
for (const p of canonicalSelf) {
  if (!p.hreflangs.size) continue;
  const self = [...p.hreflangs.values()].some((u) => toPath(u) === (p.urlPath === "/" ? "/" : p.urlPath));
  if (!self) err(`${p.urlPath}: hreflang cluster omits the page itself`);
  for (const [lang, u] of p.hreflangs) {
    const target = toPath(u);
    if (target === null || !resolves(target)) {
      err(`${p.urlPath}: hreflang ${lang} points at unserved ${u}`);
      continue;
    }
    const targetPage = pages.get(target === "/" ? "/" : target);
    if (!targetPage) continue;
    if (lang === "x-default") continue;
    const targetSet = new Set([...targetPage.hreflangs.keys()]);
    const mySet = new Set([...p.hreflangs.keys()]);
    if (targetSet.size && (targetSet.size !== mySet.size || [...mySet].some((l) => !targetSet.has(l)))) {
      err(`${p.urlPath}: hreflang set differs from ${target} (${[...mySet]} vs ${[...targetSet]})`);
    }
  }
}

// ── sitemap ↔ files ↔ heads ──
const sitemapFile = path.join(DIST, "sitemap-0.xml");
if (!existsSync(sitemapFile)) err("sitemap-0.xml missing");
else {
  const xml = readFileSync(sitemapFile, "utf8");
  const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  const sitemapPaths = new Set();
  for (const block of urlBlocks) {
    const loc = (block.match(/<loc>([^<]+)<\/loc>/) || [])[1];
    const locPath = toPath(loc);
    sitemapPaths.add(locPath);
    if (!resolves(locPath)) err(`sitemap: ${loc} is not served`);
    const page = pages.get(locPath === "/" ? "/" : locPath);
    if (page) {
      if (page.noindex) err(`sitemap: ${loc} is noindex`);
      const cPath = page.canonical && toPath(page.canonical);
      const selfPath = page.urlPath === "/" ? "/" : page.urlPath;
      if (cPath && cPath !== selfPath) err(`sitemap: ${loc} canonicalizes to ${cPath} — drop it`);
      // sitemap alternates must equal the head's cluster
      const links = new Set([...block.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]));
      const headSet = new Set([...page.hreflangs.keys()]);
      if (links.size || headSet.size) {
        const diff = [...links].filter((l) => !headSet.has(l)).concat([...headSet].filter((l) => !links.has(l)));
        // a sitemap entry with NO links for a single-language page is fine even
        // though the head self-references en + x-default
        const singleLang = headSet.size <= 2 && links.size === 0;
        if (diff.length && !singleLang) err(`sitemap: ${loc} alternates ≠ head (${diff.join(",")})`);
      }
    }
  }
  // every canonical-self page belongs in the sitemap
  for (const p of canonicalSelf) {
    const selfPath = p.urlPath === "/" ? "/" : p.urlPath;
    if (!sitemapPaths.has(selfPath)) err(`${p.urlPath}: canonical-self page missing from sitemap`);
  }
}

// ── heading outline: one h1, no skipped levels (indexable pages) ──
// The docs pages printed the document title as an h1 over the markdown's own
// "# Title", the legal pages hid a second h1 with CSS, and card grids jumped
// from the page h1 to h3s. Headings are read in document order, hidden
// alternatives (the Build page's unselected opportunities) included, since a
// crawler reads those too.
for (const p of pages.values()) {
  if (p.noindex || p.redirectStub) continue;
  const levels = [...p.html.slice(p.html.indexOf("<body")).matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  const h1s = levels.filter((l) => l === 1).length;
  if (h1s !== 1) err(`${p.urlPath}: ${h1s} <h1> elements (want exactly one)`);
  const skips = [...new Set(levels.slice(1).map((l, i) => (l > levels[i] + 1 ? `h${levels[i]}→h${l}` : null)).filter(Boolean))];
  if (skips.length) err(`${p.urlPath}: heading levels skip (${skips.join(", ")})`);
}

// an unlisted document's page (docs-shared.js UNLISTED_DOC_SLUGS)
const unlistedDocPage = (p) => p.startsWith("/docs/") && UNLISTED_DOC_SLUGS.has(p.slice("/docs/".length));

// ── unlisted documents and document images ──
// An unlisted document (docs-shared.js) is published for links from outside
// the site, but is no page of this site's own: it was indexable and in the
// sitemap (the 41-word account-deletion walkthrough for ur.io's apps). And a
// document's images carry their size, so the page reserves their box before
// they load (the walkthrough's two tall screenshots shifted the page).
for (const p of pages.values()) {
  if (p.redirectStub) continue;
  if (unlistedDocPage(p.urlPath) && !p.noindex) err(`${p.urlPath}: unlisted document is indexable`);
  for (const m of p.html.matchAll(/<img\b[^>]*\bclass="md-img"[^>]*>/g)) {
    if (!/\swidth="\d+"/.test(m[0]) || !/\sheight="\d+"/.test(m[0])) {
      err(`${p.urlPath}: document image without width and height (${attr(m[0], "src")})`);
    }
  }
}

// ── media + og resolution across all pages ──
for (const p of pages.values()) {
  for (const m of p.html.matchAll(/<(?:img|audio|video|source)[^>]*\ssrc="(\/[^"]+)"/g)) {
    if (!resolves(m[1])) err(`${p.urlPath}: media src ${m[1]} is not served`);
  }
  for (const m of p.html.matchAll(/<video[^>]*\sposter="(\/[^"]+)"/g)) {
    if (!resolves(m[1])) err(`${p.urlPath}: video poster ${m[1]} is not served`);
  }
  if (p.ogImage) {
    const ogPath = toPath(p.ogImage);
    if (ogPath && !resolves(ogPath)) err(`${p.urlPath}: og:image ${p.ogImage} is not served`);
  }
}

// ── internal links + orphans (canonical-self pages need an inbound link) ──
// A redirect stub's only link is to its own target (every /<lang>/docs/<slug>
// stub links /docs/<slug>), so counting stubs made every document look linked
// while the sidebar that should link them rendered buttons. Only real pages
// count as an inbound link. An unlisted document (docs-shared.js) is linked
// from outside the site, by the app-store listings, and is exempt.
const inbound = new Map();
for (const p of pages.values()) {
  if (p.redirectStub) continue;
  for (const m of p.html.matchAll(/<a[^>]*\shref="(\/[^"]*)"/g)) {
    const target = m[1].split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
    if (!inbound.has(target)) inbound.set(target, new Set());
    const selfPath = p.urlPath === "/" ? "/" : p.urlPath;
    if (target !== selfPath) inbound.get(target).add(selfPath);
  }
}
for (const p of canonicalSelf) {
  const selfPath = p.urlPath === "/" ? "/" : p.urlPath;
  if (selfPath === "/" || unlistedDocPage(selfPath)) continue;
  if (!(inbound.get(selfPath)?.size > 0)) err(`${selfPath}: orphan — zero inbound internal links`);
}

// ── the publisher entity ──
// The Organization the site-wide graph declares is the publisher the footer
// names (© <year> UR Foundation), and its sameAs lists only that publisher's
// profiles. It was named "UR" and claimed the urnetwork GitHub and X
// accounts, which are URnetwork's: the product at ur.io, a different company.
{
  const PRODUCT_PROFILES = /^https:\/\/(?:www\.)?(?:github\.com\/urnetwork|x\.com\/urnetwork|twitter\.com\/urnetwork|ur\.io)(?:[/?#]|$)/i;
  const seen = new Set();
  for (const p of pages.values()) {
    if (p.redirectStub) continue;
    const json = (p.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
    let org = null;
    try {
      org = (JSON.parse(json)["@graph"] || []).find((n) => n["@type"] === "Organization") || null;
    } catch {
      /* reported above */
    }
    if (!org) continue;
    const footerName = (p.html.match(/<div class="footer-utility">\s*<p>©\s*\d{4}\s+([^<]+?)\s*<\/p>/) || [])[1];
    const problems = [
      footerName && org.name !== footerName && `the Organization is named "${org.name}", the footer's publisher "${footerName}"`,
      ...[].concat(org.sameAs || []).filter((u) => PRODUCT_PROFILES.test(u)).map((u) => `the Organization claims ${u}, a URnetwork (ur.io) profile`),
    ].filter(Boolean);
    for (const problem of problems) {
      if (!seen.has(problem)) err(`${p.urlPath}: ${problem}`);
      seen.add(problem);
    }
  }
}

// ── machine/agent assets ──
const mustExist = [
  "robots.txt",
  "sitemap-index.xml",
  "llms.txt",
  "llms-full.txt",
  "litepaper.md",
  "og.png",
  "favicon.ico",
  "site.webmanifest",
  "investors/our-letter-to-bittensor.pdf",
  "investors/og-letter.png",
  "audits/masa-l2-2025.pdf",
  ".well-known/security.txt",
];
for (const rel of mustExist) {
  if (!existsSync(path.join(DIST, rel))) err(`missing build artifact: ${rel}`);
}

// security.txt must not be expired (the deployed one had been, for months)
const secPath = path.join(DIST, ".well-known/security.txt");
if (existsSync(secPath)) {
  const secText = readFileSync(secPath, "utf8");
  const m = secText.match(/^Expires:\s*(.+)$/m);
  if (!m) err("security.txt: no Expires line");
  else if (new Date(m[1]).getTime() < Date.now() + 30 * 86400_000)
    err(`security.txt: Expires ${m[1].trim()} is past or within 30 days`);
  // The preferred (first) contact is the reporting address itself, as a
  // mailto: an agent or a scanner can use without running the policy page,
  // whose address the CDN's email obfuscation rewrites into a script. It is
  // the address the policy page names.
  const contacts = [...secText.matchAll(/^Contact:\s*(\S+)/gm)].map((c) => c[1]);
  const vdp = pages.get("/vdp");
  if (!contacts.length || !contacts[0].startsWith("mailto:")) {
    err(`security.txt: the first Contact is ${contacts[0] || "missing"}, not the mailto: reporting address`);
  } else if (vdp && !vdp.html.includes(contacts[0].slice("mailto:".length))) {
    err(`security.txt: ${contacts[0]} is not the address /vdp names`);
  }
}

// ── markdown twins ──
// A document page (each /docs page, and the legal pages docs-shared.js
// publishes outside /docs) names its markdown twin with <link rel="alternate"
// type="text/markdown">, and the twin it names is served: the legal pages
// had no twin, so an agent got their text only by scraping the page.
const LEGAL_PAGES = Object.values(DOC_PAGE_PATHS);
for (const p of pages.values()) {
  if (p.redirectStub) continue;
  const head = p.html.slice(0, p.html.indexOf("</head>") + 7);
  const twin = attr((head.match(/<link rel="alternate" type="text\/markdown"[^>]*>/) || [])[0] || "", "href");
  if (twin) {
    const twinPath = toPath(twin);
    if (twinPath === null || !resolves(twinPath)) err(`${p.urlPath}: markdown twin ${twin} is not served`);
  } else if (p.urlPath.startsWith("/docs/") || LEGAL_PAGES.includes(p.urlPath)) {
    err(`${p.urlPath}: document page names no markdown twin`);
  }
}

// llms.txt + top-level twins: internal links resolve, no template placeholders.
// llms-full embeds the whole docs corpus, whose prose/code may legitimately
// say TODO or show elided example URLs — the strict checks apply to the
// generated files, the link check tolerates markdown punctuation.
// The agent files are generated from the build (llms.txt lists every page);
// they stay small, so an agent can take them in one fetch. As of 2026-10,
// llms-full.txt is about 137 KB: the three role guides, the litepaper, the
// page map and the investor materials as published. Its budget leaves room
// for the guides to grow and fails a build that embeds something by mistake.
const AGENT_FILE_BUDGET = { "llms.txt": 16 * 1024, "llms-full.txt": 160 * 1024 };
for (const rel of ["llms.txt", "llms-full.txt", "litepaper.md"]) {
  const fp = path.join(DIST, rel);
  if (!existsSync(fp)) continue;
  const text = readFileSync(fp, "utf8");
  if (AGENT_FILE_BUDGET[rel] && Buffer.byteLength(text) > AGENT_FILE_BUDGET[rel]) {
    err(`${rel}: ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB, over its ${AGENT_FILE_BUDGET[rel] / 1024} KB budget`);
  }
  if (/\{link\}|\{name\}/.test(text)) err(`${rel}: template placeholder leaked`);
  if (rel !== "llms-full.txt" && /TODO|FIXME/.test(text)) err(`${rel}: TODO/FIXME leaked`);
  for (const m of text.matchAll(/https:\/\/ur\.xyz(\/[^\s)>\]"`]*)/g)) {
    if (m[1].includes("<") || m[1].includes("...")) continue; // documented templates / elided examples
    const p = m[1].replace(/[`*.,;:!?]+$/, "");
    if (!resolves(p)) err(`${rel}: links to unserved https://ur.xyz${p}`);
  }
}

// The markdown an agent reads out of context (the docs and legal twins,
// litepaper.md, llms-full.txt) links absolutely: a target relative to the page
// it was written for (/docs/miner, a screenshot beside the walkthrough) means
// nothing in a file fetched on its own or concatenated into llms-full.txt.
{
  const agentMarkdown = files.filter((f) => f.endsWith(".md") || /\/llms(?:-full)?\.txt$/.test(f));
  for (const f of agentMarkdown) {
    const prose = readFileSync(f, "utf8").replace(/^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm, "");
    const relative = [...new Set([...prose.matchAll(/\]\(([^)\s]+)/g)].map((m) => m[1]))]
      .filter((t) => !/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(t));
    if (relative.length) err(`${relOf(f)}: links relative to a page (${relative.slice(0, 4).join(", ")})`);
  }
}

// llms.txt lists every machine-readable file the site publishes for programs,
// and the security contact's address itself: the operator list, the price
// sheet and its feed, and security.txt were served but listed nowhere.
{
  const llmsPath = path.join(DIST, "llms.txt");
  const llms = existsSync(llmsPath) ? readFileSync(llmsPath, "utf8") : "";
  for (const f of ["/llms-full.txt", "/litepaper.md", "/operators.yml", "/price.yml", "/price.rss", "/.well-known/security.txt"]) {
    if (existsSync(path.join(DIST, f)) && !llms.includes(`(${siteOrigin}${f})`)) err(`llms.txt: does not list ${f}`);
  }
  const mailto = existsSync(secPath) ? (readFileSync(secPath, "utf8").match(/^Contact:\s*(mailto:\S+)/m) || [])[1] : null;
  if (mailto && !llms.includes(`(${mailto})`)) err(`llms.txt: does not give the security contact ${mailto}`);
}

// llms-full.txt opens each embedded docs document with a source marker and,
// under its H1, where it lives and the day its page last changed: the page's
// own dateModified, filled in by the page-dates step before the llms step runs.
{
  const fullPath = path.join(DIST, "llms-full.txt");
  const full = existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
  for (const slug of DOC_ORDER) {
    const page = pages.get(`/docs/${slug}`);
    if (!page || !full) continue;
    const modified = (page.html.match(/"dateModified":"([^"]+)"/) || [])[1];
    const url = `${siteOrigin}/docs/${slug}`;
    const want = `<!-- source: ${url} -->\n\n# `;
    const at = full.indexOf(want);
    const where = at === -1 ? "" : full.slice(at + want.length).split("\n").slice(2, 3)[0];
    if (at === -1) err(`llms-full.txt: no source marker for ${url}`);
    else if (where !== `Source: ${url} · Markdown: ${siteOrigin}/docs-md/${slug}.md · Updated: ${modified}`) {
      err(`llms-full.txt: ${slug} says "${where}" under its H1, not its page, twin and dateModified ${modified}`);
    }
  }
}

// The letter PDF is reprinted manually (make letter-pdf). If the letter's copy
// changed after the PDF last did, the download no longer matches the page —
// fail until it is re-printed. The copy lives in the React component and the
// letter's metadata within the investor data module (the Astro page is only
// the shell), and the generator
// writes the PDF under react/public. Every path must exist: when the letter
// moved into React this check compared a shell page and a mirrored copy of the
// PDF, found no difference, and passed silently — a moved file now fails here.
{
  // ur.xyz/, from this script (the build dir may live anywhere)
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const LETTER_SOURCES = [
    "react/src/components/pages/investors/InvestorLetter.jsx",
    "react/src/data/investors.js",
  ];
  const LETTER_PDF = "react/public/investors/our-letter-to-bittensor.pdf";
  const missing = [...LETTER_SOURCES, LETTER_PDF].filter((rel) => !existsSync(path.join(ROOT, rel)));
  if (missing.length) {
    err(`letter PDF check: ${missing.join(", ")} not found under ${ROOT} — update the paths in seo-audit.mjs`);
  } else {
    const [newestRel, newestDate] = LETTER_SOURCES.map((rel) => [rel, contentDay(ROOT, rel,
      rel === "react/src/data/investors.js" ? investorLetterMetadata : undefined)])
      .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))[0];
    const pdfDate = contentDay(ROOT, LETTER_PDF);
    if (newestDate > pdfDate) {
      err(`letter PDF is stale: ${newestRel} changed ${newestDate}, the PDF was last printed ${pdfDate} — run \`make letter-pdf\``);
    }
  }
}

auditRobots();

// ── report ──
const indexable = canonicalSelf.length;
console.log(
  `seo-audit: ${htmlFiles.length} pages (${indexable} canonical-self), ${files.length} files scanned`,
);
if (errors.length) {
  console.error(`\nseo-audit: ${errors.length} problem(s):`);
  const MAX = 60;
  for (const e of errors.slice(0, MAX)) console.error(`  ${e}`);
  if (errors.length > MAX) console.error(`  … and ${errors.length - MAX} more`);
  process.exit(1);
}
console.log("seo-audit: OK");
