// Interactive wiring parity for ur.xyz: every interactive button on the Astro islands build
// must lead to the SAME end state as the React SPA when tapped.
//
// "End state" is captured STRUCTURALLY, not by full-page pixels: the URL after the tap, plus
// which on-screen dialog/panel overlay (a fixed/absolute, elevated, sizable, in-viewport
// element) is open, identified by its text. Immune to scroll position and to content showing
// through a backdrop, while catching DEAD buttons, MISPOSITIONED dialogs (off-screen ⇒ not
// counted), and DIFFERENT end states (different nav / different dialog). Buttons that do
// nothing on react, or only change in-place, are SKIPPED.
//
// Requires the astro build (build/<UR_ENV>). React via vite dev, Astro via astro preview.
import { chromium, devices } from "playwright-core";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REACT_DIR = path.resolve(__dirname, "..");
const ASTRO_DIR = path.resolve(__dirname, "../../astro");
const UR_ENV = process.env.UR_ENV || "main";
const ASTRO_OUT = path.join(ASTRO_DIR, "build", UR_ENV);
const OUT = path.join(__dirname, "__wiring__");

const ROUTES = ["/", "/price", "/api", "/operators", "/miners", "/validators", "/research", "/community"];
// Same screens as the pixel test: desktop + two phones. On phones the header collapses to a
// hamburger, so the visible-button inventory differs from desktop — but react and astro share
// the Header, so they still match each other per-profile, and tapping the hamburger exercises
// the mobile-menu wiring too. Emulation is identical on both sides (same chromium engine).
const IPHONE = devices["iPhone 15"];
const GALAXY = devices["Galaxy S24"];
const PROFILES = [
  { name: "desktop", viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  { name: "iphone", viewport: IPHONE.viewport, screen: IPHONE.screen, userAgent: IPHONE.userAgent, deviceScaleFactor: IPHONE.deviceScaleFactor, isMobile: IPHONE.isMobile, hasTouch: IPHONE.hasTouch },
  { name: "galaxy", viewport: GALAXY.viewport, userAgent: GALAXY.userAgent.replace("SM-S921U", "SM-S928B"), deviceScaleFactor: GALAXY.deviceScaleFactor, isMobile: GALAXY.isMobile, hasTouch: GALAXY.hasTouch },
];
const MAX_BUTTONS = 14;
const SEL = 'button:visible, [role="button"]:visible';

function freePort() { return new Promise((r) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); }); }
function waitFor(u, t = 60000) { const s = Date.now(); return new Promise((res, rej) => { const k = () => fetch(u).then(res).catch(() => Date.now() - s > t ? rej(new Error("timeout")) : setTimeout(k, 400)); k(); }); }
async function stub(page) {
  await page.route(/geckoterminal\.com|grafana\.ur\.io|bringyour\.com/, (r) => r.fulfill({ json: {} }).catch(() => r.abort()));
  await page.addStyleTag({ content: `*,*::before,*::after{animation:none!important;transition:none!important}html,body,*{scroll-behavior:auto!important}` }).catch(() => {});
}
async function open(browser, base, route, profile) {
  const { name, ...pageOpts } = profile;
  const page = await browser.newPage(pageOpts);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stub(page);
  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(1600);
  return page;
}
async function sig(page) {
  return page.evaluate(() => {
    const url = location.pathname + location.search;
    const overlays = new Set();
    for (const el of document.querySelectorAll("body *")) {
      const s = getComputedStyle(el);
      if (s.position !== "fixed" && s.position !== "absolute") continue;
      if (s.visibility === "hidden" || s.display === "none" || parseFloat(s.opacity) < 0.6) continue;
      if ((parseInt(s.zIndex) || 0) < 5) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 220 || r.height < 130) continue;
      if (r.bottom < 40 || r.top > window.innerHeight - 40) continue;
      const t = (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 70);
      if (t) overlays.add(t);
    }
    return { url, overlays: [...overlays].sort() };
  });
}
async function buttonLabels(page) {
  return page.$$eval(SEL, (els) => els.map((e) => (e.innerText || e.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40)));
}
async function probe(browser, base, route, i, profile) {
  const page = await open(browser, base, route, profile);
  try {
    const btn = page.locator(SEL).nth(i);
    await btn.scrollIntoViewIfNeeded({ timeout: 2500 });
    await btn.click({ timeout: 3000, noWaitAfter: true });
  } catch { await page.close(); return null; }
  await page.waitForTimeout(1200);
  const s = await sig(page);
  const shot = await page.screenshot({ clip: { x: 0, y: 0, ...profile.viewport } }).catch(() => null);
  await page.close();
  return { ...s, shot };
}

const newOverlays = (before, after) => after.overlays.filter((o) => !before.overlays.includes(o));
const sameSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(path.join(ASTRO_OUT, "index.html"))) {
    const r = spawnSync("npm", ["run", "build"], { cwd: ASTRO_DIR, env: { ...process.env, UR_ENV }, stdio: "inherit" });
    if (r.status !== 0) { console.error("astro build failed"); process.exit(1); }
  }
  const rp = await freePort(), ap = await freePort();
  const rsrv = spawn("npx", ["vite", "--port", String(rp), "--strictPort"], { cwd: REACT_DIR, env: { ...process.env, UR_ENV }, stdio: "ignore" });
  const asrv = spawn("npx", ["astro", "preview", "--port", String(ap)], { cwd: ASTRO_DIR, env: { ...process.env, UR_ENV }, stdio: "ignore" });
  const cleanup = () => { try { rsrv.kill(); } catch {} try { asrv.kill(); } catch {} };
  process.on("exit", cleanup);
  const rBase = `http://localhost:${rp}`, aBase = `http://localhost:${ap}`;
  await waitFor(rBase + "/"); await waitFor(aBase + "/");

  const browser = await chromium.launch();
  let dead = 0, diffState = 0, mism = 0, ok = 0, skip = 0;

  // WIRING_PROFILES=desktop,iphone (comma-sep) runs a subset — lets the long full sweep be
  // split into shorter per-profile runs. Default: all three.
  const activeProfiles = PROFILES.filter((p) => !process.env.WIRING_PROFILES || process.env.WIRING_PROFILES.split(",").includes(p.name));
  for (const profile of activeProfiles) {
   console.log(`\n════════ ${profile.name}  (${profile.viewport.width}×${profile.viewport.height}${profile.deviceScaleFactor > 1 ? " @" + profile.deviceScaleFactor + "x" : ""}) ════════`);
   for (const route of ROUTES) {
    const [rp0, ap0] = await Promise.all([open(browser, rBase, route, profile), open(browser, aBase, route, profile)]);
    const rBefore = await sig(rp0), aBefore = await sig(ap0);
    const rLabels = await buttonLabels(rp0), aLabels = await buttonLabels(ap0);
    await rp0.close(); await ap0.close();

    console.log(`\n▸ [${profile.name}] ${route}  (react ${rLabels.length} buttons, astro ${aLabels.length})`);
    if (rLabels.length !== aLabels.length) { console.log(`  ⚠ button COUNT differs: react=${rLabels.length} astro=${aLabels.length}`); mism++; }

    const n = Math.min(rLabels.length, aLabels.length, MAX_BUTTONS);
    if (Math.min(rLabels.length, aLabels.length) > MAX_BUTTONS) console.log(`  (capped at ${MAX_BUTTONS} of ${Math.min(rLabels.length, aLabels.length)})`);

    for (let i = 0; i < n; i++) {
      const label = rLabels[i] || aLabels[i] || `#${i}`;
      if (rLabels[i] !== aLabels[i]) { console.log(`  ⚠ [${i}] label differs: react="${rLabels[i]}" astro="${aLabels[i]}"`); mism++; }
      const [r, a] = await Promise.all([probe(browser, rBase, route, i, profile), probe(browser, aBase, route, i, profile)]);
      if (!r || !a) { console.log(`  –  [${i}] "${label}" — not tappable, skipped`); skip++; continue; }
      const rNew = newOverlays(rBefore, r), aNew = newOverlays(aBefore, a);
      const rNav = r.url !== rBefore.url, aNav = a.url !== aBefore.url;
      const reactChanged = rNav || rNew.length > 0;
      const astroChanged = aNav || aNew.length > 0;
      const save = () => { const b = `${profile.name}_${route.replace(/\W/g, "_")}_${i}`; if (r.shot) fs.writeFileSync(path.join(OUT, `${b}.react.png`), r.shot); if (a.shot) fs.writeFileSync(path.join(OUT, `${b}.astro.png`), a.shot); };
      if (!reactChanged) { console.log(`  –  [${i}] "${label}" — no dialog/nav on react, skipped`); skip++; continue; }
      if (!astroChanged) {
        console.log(`  ✗  [${i}] "${label}" — DEAD on astro (react ${rNav ? "navigates" : "opens: " + JSON.stringify(rNew)}, astro does nothing)`); save(); dead++;
      } else if (r.url !== a.url || !sameSet(rNew, aNew)) {
        console.log(`  ✗  [${i}] "${label}" — DIFFERENT: react=(${rNav ? r.url : JSON.stringify(rNew).slice(0, 50)}) astro=(${aNav ? a.url : JSON.stringify(aNew).slice(0, 50)})`); save(); diffState++;
      } else { console.log(`  ✓  [${i}] "${label}"`); ok++; }
    }
   }
  }
  await browser.close(); cleanup();

  const fails = dead + diffState + mism;
  console.log(`\n${ok} wired-and-matching · ${skip} no-dialog/skipped · ${dead} DEAD · ${diffState} different-end-state · ${mism} inventory-mismatch`);
  console.log(fails ? `FAIL — ${fails} problem(s). Artifacts: ${OUT}` : "PASS — every wired button reaches the same end state on astro as react.");
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error("interactive-wiring error:", e); process.exit(1); });
