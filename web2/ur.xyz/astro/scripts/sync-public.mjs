#!/usr/bin/env node
// Sync static assets from react/public into astro/public before `astro build`.
//
// Astro only copies files from its own public/ directory, so any asset that
// lives in ../react/public — favicons, fonts, ur.png/ur.svg, the orgs/ art —
// simply does not exist on the astro side unless it is mirrored. The failure
// is silent: the build succeeds and the page ships a broken <img>.
//
// This mirrors EVERY entry rather than an allowlist. ur.io ran an allowlist of
// three directories and images/ was never added to it, so images added there
// were missing from the astro build until someone noticed a blank space on the
// page. A list that must be hand-edited whenever an asset appears will go
// stale, and it goes stale quietly.
//
// Mirroring is ADDITIVE — nothing in astro/public is deleted — so the files
// generated straight into astro/public (whitepaper.md, docs-md/, openapi.yml,
// llms.txt, llms-full.txt from generate-agent-assets.mjs) are untouched.
//
// Usage:
//   node scripts/sync-public.mjs
//
// Wired into the Makefile's build targets, which run `npx astro build` and so
// never execute a package.json prebuild step.

import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASTRO_PUBLIC = path.resolve(__dirname, "../public");
const REACT_PUBLIC = path.resolve(__dirname, "../../react/public");

// Files astro owns outright, which must NOT be overwritten by the react copy.
//
// robots.txt: astro's is the real one — it carries the explicit AI-crawler
// allowlist (GPTBot, ClaudeBot, PerplexityBot, …) that states this site's
// open-to-agents policy, plus pointers to llms.txt and the price sheet.
// react/public/robots.txt is the older four-line version. Mirroring would
// silently downgrade the policy, so it is excluded rather than copied.
//
// _redirects: the react copy is an SPA catch-all (`/*  /index.html  200`),
// right for a client-routed single-page app and wrong here. Mirroring it makes
// 404.html unreachable and answers every dead link with the homepage at 200.
// Astro's copy is deliberately rule-free; see the comment in that file.
const ASTRO_OWNED = new Set(["robots.txt", "_redirects"]);

// Pricing is retired from the public site for now. Keep the source and sync
// implementation available, but never let stale/generated feed files leak
// back into a production build through the public-directory mirror.
const RETIRED_PUBLIC = new Set(["price.yml", "price.rss"]);

const SKIP = new Set([".DS_Store"]);

if (!existsSync(REACT_PUBLIC)) {
  console.error(`[sync-public] react/public not found at ${REACT_PUBLIC}`);
  process.exit(1);
}

let totalBytes = 0;
const skipped = [];

for (const name of readdirSync(REACT_PUBLIC)) {
  if (name.startsWith(".") || SKIP.has(name)) continue;
  if (RETIRED_PUBLIC.has(name)) {
    rmSync(path.join(ASTRO_PUBLIC, name), { force: true });
    skipped.push(name);
    continue;
  }
  if (ASTRO_OWNED.has(name)) {
    skipped.push(name);
    continue;
  }

  const src = path.join(REACT_PUBLIC, name);
  const dst = path.join(ASTRO_PUBLIC, name);

  // Recursive, overwriting: a regenerated asset must replace the stale copy.
  cpSync(src, dst, { recursive: true, force: true });

  const size = getDirSize(dst);
  totalBytes += size;
  console.log(`[sync-public] ${name}: ${formatBytes(size)}`);
}

if (skipped.length) {
  console.log(`[sync-public] kept astro's own: ${skipped.join(", ")}`);
}
console.log(`[sync-public] done. mirrored ${formatBytes(totalBytes)} into astro/public`);

function getDirSize(p) {
  const s = statSync(p);
  if (s.isFile()) return s.size;
  if (!s.isDirectory()) return 0;
  let total = 0;
  for (const entry of readdirSync(p)) {
    total += getDirSize(path.join(p, entry));
  }
  return total;
}

function formatBytes(n) {
  if (n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}
