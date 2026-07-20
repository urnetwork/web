// Network privacy guard for ur.xyz.
//
// On normal browsing the site must contact ONLY first-party hosts plus the explicitly
// allowed price feed. No analytics, no telemetry, no unexpected third-party data. This
// loads the main routes, records every host contacted, and fails on anything not on the
// allowlist.
//
// Allowed:
//   - first-party: *.ur.xyz, *.ur.io, *.bringyour.com (whitelisted network
//     operators, e.g. grafana.bringyour.com), *.ur.network, *.urnetwork.com
//   - api.geckoterminal.com — CoinGecko's keyless public α→USD price feed (approved;
//     sends no user data, just fetches public prices)
//
// SSO / WalletConnect / payment SDKs are intentionally NOT allowlisted — they may load
// only inside their own flows, which this test does not trigger.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REACT_DIR = path.resolve(__dirname, "..");

const ROUTES = ["/", "/price", "/roadmap", "/api", "/operators", "/miners", "/validators", "/research", "/community"];

const ALLOWED = ["ur.xyz", "ur.io", "bringyour.com", "ur.network", "urnetwork.com", "geckoterminal.com"];

function isAllowed(host) {
  if (host.startsWith("localhost") || host.startsWith("127.")) return true;
  return ALLOWED.some((d) => host === d || host.endsWith("." + d));
}

function freePort() {
  return new Promise((res) => {
    const s = net.createServer();
    s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); });
  });
}
function waitFor(url, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => fetch(url).then(() => resolve()).catch(() => {
      if (Date.now() - start > timeoutMs) reject(new Error(`timeout ${url}`));
      else setTimeout(tick, 400);
    });
    tick();
  });
}

async function main() {
  // Skip inside a nested build (parity may spawn `npm run build` whose postbuild
  // chains here); the top-level postbuild run already covers it.
  if (process.env.UR_SKIP_PARITY) {
    console.log("network-privacy: skipped (nested build)");
    process.exit(0);
  }
  const port = await freePort();
  const srv = spawn("npx", ["vite", "--port", String(port), "--strictPort"], { cwd: REACT_DIR, stdio: "ignore" });
  process.on("exit", () => { try { srv.kill(); } catch {} });
  const base = `http://localhost:${port}`;
  await waitFor(base + "/");

  const browser = await chromium.launch();
  const offenders = new Map();
  const allHosts = new Set();

  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("request", (r) => {
      let host;
      try { host = new URL(r.url()).host; } catch { return; }
      if (host.startsWith("localhost") || host.startsWith("127.")) return;
      allHosts.add(host);
      if (!isAllowed(host)) {
        if (!offenders.has(host)) offenders.set(host, new Set());
        offenders.get(host).add(route);
      }
    });
    await page.goto(base + route, { waitUntil: "networkidle" }).catch(() => {});
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y <= h; y += 500) { window.scrollTo(0, y); await new Promise((r) => requestAnimationFrame(r)); }
    });
    await page.waitForTimeout(2500);
    await page.close();
  }
  await browser.close();
  try { srv.kill(); } catch {}

  console.log("hosts contacted:");
  [...allHosts].filter(isAllowed).sort().forEach((h) => console.log(`  ✓ ${h}`));

  if (offenders.size > 0) {
    console.log("\n❌ non-allowlisted hosts contacted on normal browsing:");
    for (const [h, rs] of [...offenders.entries()].sort()) console.log(`   ${h}  (on ${[...rs].join(", ")})`);
    process.exit(1);
  }
  console.log("\n✓ network-privacy: only first-party + approved hosts contacted.");
  process.exit(0);
}
main().catch((e) => { console.error("network-privacy error:", e); process.exit(1); });
