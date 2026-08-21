#!/usr/bin/env node
// Emit .br (brotli, quality 11) and .gz (gzip, level 9) siblings for every
// compressible text asset in the build, so nginx serves maximum-compression
// bytes with ZERO runtime CPU via `brotli_static on` / `gzip_static on`
// (web/web/nginx/nginx.conf.j2). Brotli-11 typically lands 15–25% under
// gzip-9 for JS/CSS — far better than any on-the-fly setting worth running.
//
// Runs after the gates (which read the plain files) and after
// modulepreload.mjs (so the compressed HTML is the final HTML).
//
// Usage: node scripts/precompress.mjs [distDir]   (default: dist)

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const DIST = path.resolve(process.argv[2] || "dist");
if (!existsSync(DIST)) {
  console.error(`precompress: no such dir ${DIST}`);
  process.exit(2);
}

const EXT = new Set([
  ".html", ".js", ".mjs", ".css", ".svg", ".json", ".xml", ".txt", ".md",
  ".yml", ".yaml", ".webmanifest", ".map",
]);
// below this, compression headers cost more than they save
const MIN_BYTES = 1024;

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

let files = 0;
let raw = 0;
let br = 0;
let gz = 0;
for (const file of walk(DIST)) {
  if (!EXT.has(path.extname(file))) continue;
  const stat = statSync(file);
  if (stat.size < MIN_BYTES) continue;
  const buf = readFileSync(file);
  const brBuf = zlib.brotliCompressSync(buf, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
    },
  });
  const gzBuf = zlib.gzipSync(buf, { level: 9 });
  // only ship siblings that actually help
  if (brBuf.length < buf.length) writeFileSync(`${file}.br`, brBuf);
  if (gzBuf.length < buf.length) writeFileSync(`${file}.gz`, gzBuf);
  files++;
  raw += buf.length;
  br += Math.min(brBuf.length, buf.length);
  gz += Math.min(gzBuf.length, buf.length);
}

const mb = (n) => (n / 1e6).toFixed(1);
console.log(
  `precompress: ${files} files — ${mb(raw)} MB raw → ${mb(gz)} MB gz → ${mb(br)} MB br` +
  (gz ? ` (br saves ${(100 * (1 - br / gz)).toFixed(0)}% over gz)` : ""),
);
