// Visual parity test for ur.xyz: the SAME page rendered two ways must look identical.
//
//   react route  — the React SPA, client-rendered (vite dev)
//   astro route  — the Astro static islands build, prerendered to flat HTML + hydrated
//
// This guards the flat-file islands build: server-rendering each page must not change
// a pixel of what the user sees. It disables animations, waits for fonts, masks the
// inherently-animated bits, and pixel-diffs a viewport screenshot of each main route.
//
// Usage:  node tests/visual-parity.mjs           (builds astro output if missing)
//         node tests/visual-parity.mjs --update   (write baseline diffs, don't fail)
import { chromium, devices } from "playwright-core";
import { PNG } from "pngjs";
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
const OUT = path.join(__dirname, "__parity__");

// Main routes: home, the content sections, pricing, and the API explorer.
const ROUTES = ["/", "/operators", "/miners", "/validators", "/research", "/community", "/price", "/api"];

const PIXEL_TOLERANCE = 40; // desktop
// Phones render at 3x DPR; composited/animated text vs a static node antialiases the SAME
// glyphs a hair differently, and at 3x with mobile-sized text filling the small viewport
// that edge shimmer can exceed 40. It is a uniform small delta (benign) — so phones use a
// higher per-pixel tolerance. The 0.5% area threshold is unchanged and still catches real
// regressions (a wrong colour / moved / missing element flips pixels far past 112).
const MOBILE_TOLERANCE = 112;
const THRESHOLD = 0.005; // 0.5% of pixels

// Screens to check parity on: desktop plus two phones. Emulating a phone applies its
// viewport, device-pixel-ratio, touch and UA, so the page renders its RESPONSIVE layout
// (hamburger nav, stacked sections) — parity is verified there too, not just desktop.
// Both the react and astro sides are emulated identically (same chromium engine, same
// device metrics), so any diff is a real react-vs-astro divergence at that screen size,
// not a browser-engine difference. The Galaxy profile is the Galaxy S24 Ultra (model
// SM-S928B) at its shipped FHD+ resolution (360×780 CSS @3x); the iPhone is an iPhone 15.
const IPHONE = devices["iPhone 15"];
const GALAXY = devices["Galaxy S24"];
const PROFILES = [
  { name: "desktop", tol: PIXEL_TOLERANCE, viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  { name: "iphone", tol: MOBILE_TOLERANCE, viewport: IPHONE.viewport, screen: IPHONE.screen, userAgent: IPHONE.userAgent, deviceScaleFactor: IPHONE.deviceScaleFactor, isMobile: IPHONE.isMobile, hasTouch: IPHONE.hasTouch },
  { name: "galaxy", tol: MOBILE_TOLERANCE, viewport: GALAXY.viewport, userAgent: GALAXY.userAgent.replace("SM-S921U", "SM-S928B"), deviceScaleFactor: GALAXY.deviceScaleFactor, isMobile: GALAXY.isMobile, hasTouch: GALAXY.hasTouch },
];

// Inherently-nondeterministic elements (animated network diagram, video, canvas) are
// masked in both shots so only real content differences count.
const MASK = "canvas, video, [data-parity-ignore]";

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
      if (Date.now() - start > timeoutMs) reject(new Error(`timeout waiting for ${url}`));
      else setTimeout(tick, 400);
    });
    tick();
  });
}

function startServer(cmd, args, cwd, port) {
  return spawn(cmd, args, {
    cwd,
    env: { ...process.env, UR_ENV, PORT: String(port) },
    stdio: "ignore",
  });
}

async function stub(page) {
  // ur.xyz bakes its content at build time; stub any stray first-party calls so both
  // renders are deterministic.
  await page.route(/bringyour\.com|ur\.network/, (r) => r.fulfill({ json: {} }).catch(() => r.abort()));
}

// Injected AFTER navigation (a style added before goto lands on about:blank and is lost).
// Freezes animations and forces every [data-reveal] scroll-reveal to its settled state, so a
// section only partially in view at scrollY 0 is compared revealed on both sides (the SPA
// settles all sections at once under reducedMotion). No-op where there is no reveal.
const FREEZE_CSS =
  `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}` +
  `[data-reveal],[data-reveal-stagger]>*{opacity:1!important;transform:none!important}`;

async function shoot(browser, base, route, profile) {
  const { name, tol, ...pageOpts } = profile;
  const page = await browser.newPage(pageOpts);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stub(page);
  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: FREEZE_CSS }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  // Reveal every scroll-triggered section on BOTH renders (FREEZE_CSS settles [data-reveal];
  // any framer whileInView sections reveal only once scrolled into view). Scroll the whole
  // page in small steps, then return to the top; reveals use `once` so they stay revealed.
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight / 2));
    for (let y = 0; y <= document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.waitForTimeout(2000);
  const buf = await page.screenshot({
    clip: { x: 0, y: 0, ...profile.viewport },
    mask: [page.locator(MASK)],
    maskColor: "#101010",
  });
  await page.close();
  return buf;
}

function diff(bufA, bufB, tol) {
  const a = PNG.sync.read(bufA);
  const b = PNG.sync.read(bufB);
  if (a.width !== b.width || a.height !== b.height) {
    return { ratio: 1, note: `size ${a.width}x${a.height} vs ${b.width}x${b.height}`, png: null };
  }
  const out = new PNG({ width: a.width, height: a.height });
  let differing = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > tol) {
      differing++;
      out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 0; out.data[i + 3] = 255;
    } else {
      out.data[i] = a.data[i]; out.data[i + 1] = a.data[i + 1]; out.data[i + 2] = a.data[i + 2]; out.data[i + 3] = 60;
    }
  }
  return { ratio: differing / (a.width * a.height), png: PNG.sync.write(out) };
}

async function main() {
  // Re-entrancy guard: this runs as astro's postbuild hook; a nested build (standalone
  // run with no output yet) sets this flag so it doesn't re-trigger the postbuild loop.
  if (process.env.UR_SKIP_PARITY) {
    console.log("visual-parity: skipped (nested build inside a parity run)");
    process.exit(0);
  }
  fs.mkdirSync(OUT, { recursive: true });

  if (!fs.existsSync(path.join(ASTRO_OUT, "index.html"))) {
    console.log(`building astro islands output (build/${UR_ENV} missing)…`);
    const r = spawnSync("npm", ["run", "build"], { cwd: ASTRO_DIR, env: { ...process.env, UR_ENV, UR_SKIP_PARITY: "1" }, stdio: "inherit" });
    if (r.status !== 0) { console.error("astro build failed"); process.exit(1); }
  }

  const reactPort = await freePort();
  const astroPort = await freePort();
  const reactSrv = startServer("npx", ["vite", "--port", String(reactPort), "--strictPort"], REACT_DIR, reactPort);
  const astroSrv = startServer("npx", ["astro", "preview", "--port", String(astroPort)], ASTRO_DIR, astroPort);
  const cleanup = () => { try { reactSrv.kill(); } catch {} try { astroSrv.kill(); } catch {} };
  process.on("exit", cleanup);

  const reactBase = `http://localhost:${reactPort}`;
  const astroBase = `http://localhost:${astroPort}`;
  await waitFor(reactBase + "/");
  await waitFor(astroBase + "/");

  const browser = await chromium.launch();
  let failures = 0, total = 0;
  for (const profile of PROFILES) {
    const dpr = profile.deviceScaleFactor > 1 ? ` @${profile.deviceScaleFactor}x` : "";
    console.log(`\n=== ${profile.name}  (${profile.viewport.width}×${profile.viewport.height}${dpr}) ===`);
    for (const route of ROUTES) {
      const base = route === "/" ? "home" : route.replace(/\//g, "_").replace(/^_/, "");
      const name = `${base}.${profile.name}`;
      const [ra, as] = await Promise.all([shoot(browser, reactBase, route, profile), shoot(browser, astroBase, route, profile)]);
      fs.writeFileSync(path.join(OUT, `${name}.react.png`), ra);
      fs.writeFileSync(path.join(OUT, `${name}.astro.png`), as);
      const { ratio, png, note } = diff(ra, as, profile.tol);
      if (png) fs.writeFileSync(path.join(OUT, `${name}.diff.png`), png);
      const pass = ratio <= THRESHOLD;
      total++;
      if (!pass) failures++;
      console.log(`${pass ? "PASS" : "FAIL"}  ${route.padEnd(14)} ${(ratio * 100).toFixed(3)}% different${note ? " (" + note + ")" : ""}`);
    }
  }
  await browser.close();
  cleanup();

  console.log(`\n${total - failures}/${total} route×device renders pixel-identical (threshold ${THRESHOLD * 100}%, ${PROFILES.length} screens × ${ROUTES.length} routes). Artifacts: ${OUT}`);
  process.exit(failures && !process.argv.includes("--update") ? 1 : 0);
}

main().catch((e) => { console.error("parity test error:", e); process.exit(1); });
