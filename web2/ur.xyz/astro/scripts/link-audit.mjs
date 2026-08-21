#!/usr/bin/env node
// Audit every INTERNAL link in the built site against what the build actually
// emitted. External URLs are listed but not fetched (that is a separate,
// network-bound check).
//
// Resolution mirrors how the static host serves files: /foo -> foo.html or
// foo/index.html, /foo/ -> foo/index.html, and a bare path may also be a real
// file (an asset, a .md mirror). Anything that resolves to none of those is a
// dead link.
//
// Usage: node scripts/link-audit.mjs [distDir]

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve(process.argv[2] || "dist");
if (!existsSync(DIST)) {
  console.error(`link-audit: no such dir ${DIST}`);
  process.exit(2);
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(DIST);
const pages = files.filter((f) => f.endsWith(".html"));

// Every path the host can serve, normalised to a leading-slash URL path.
const served = new Set();
for (const f of files) {
  const rel = "/" + path.relative(DIST, f).split(path.sep).join("/");
  served.add(rel);
  if (rel.endsWith("/index.html")) served.add(rel.slice(0, -"index.html".length));
  if (rel.endsWith(".html")) served.add(rel.slice(0, -".html".length));
}

const ATTR = /(?:href|src)="([^"]+)"/g;

const dead = new Map();     // target -> Set(pages)
const external = new Set();
let internalChecked = 0;

for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const from = "/" + path.relative(DIST, page).split(path.sep).join("/");
  for (const m of html.matchAll(ATTR)) {
    let raw = m[1].trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("data:")) continue;
    if (/^(https?:)?\/\//i.test(raw) || /^(mailto|tel|solanadappstore|intent|javascript):/i.test(raw)) {
      external.add(raw.split("?")[0]);
      continue;
    }
    if (!raw.startsWith("/")) continue;   // relative — rare here, skip
    const target = decodeURIComponent(raw.split("#")[0].split("?")[0]);
    if (!target) continue;
    internalChecked++;

    const candidates = [
      target,
      target + ".html",
      target.replace(/\/$/, "") + "/index.html",
      target.replace(/\/$/, "") + ".html",
    ];
    if (candidates.some((c) => served.has(c))) continue;

    if (!dead.has(target)) dead.set(target, new Set());
    dead.get(target).add(from);
  }
}

console.log(`pages scanned:        ${pages.length}`);
console.log(`internal links checked: ${internalChecked}`);
console.log(`distinct external URLs: ${external.size}`);
console.log(`\nDEAD INTERNAL LINKS: ${dead.size}`);
for (const [target, froms] of [...dead].sort((a, b) => b[1].size - a[1].size)) {
  const list = [...froms].slice(0, 3).join(", ");
  console.log(`  ${target}  <- ${froms.size} page(s): ${list}${froms.size > 3 ? " …" : ""}`);
}

if (process.env.LIST_EXTERNAL) {
  console.log("\nEXTERNAL:");
  for (const u of [...external].sort()) console.log("  " + u);
}

process.exit(dead.size ? 1 : 0);
