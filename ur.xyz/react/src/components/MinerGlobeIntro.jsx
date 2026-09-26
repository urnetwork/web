import React, { useEffect, useRef } from 'react';
import './MinerGlobeIntro.css';
import { MINER_GLOBE_STEP, MINER_GLOBE_PALETTE, MINER_GLOBE_DOTS } from '../data/minerGlobeDots';

/**
 * The Miners page's opening visual. A miner is a provider, an extender, or
 * both, and the apps draw those as a filled dot, a hollow ring, and a dot
 * inside a ring. The intro opens on the two roles in provider green, brings
 * them together into one miner, pulls back to a globe of miners, starts the
 * globe turning, and lets a wave of country color spread out from that first
 * miner. The two roles carry their labels, which give way to "miner" when the
 * ring locks and fade as the camera pulls back. The intro plays once per page
 * load and never replays on scroll; after it the colored globe keeps turning,
 * and a refresh starts it over. Under reduced motion the final colored globe
 * is drawn once and never moves, which is also what the visual-parity test
 * compares between the SPA and the Astro build.
 *
 * Canvas 2D, no library. The land dots are data/minerGlobeDots.js (Natural
 * Earth 110m sampled on a 3° grid, each dot with its country's palette color,
 * see scripts/generate-miner-globe-dots.mjs); the projection is a hand-rolled
 * orthographic globe. The prototype this was ported from is
 * prototypes/miner-globe-intro.html.
 */

const GREEN = '#87FB67';
const BG = '#101010';
const DISC = '#161616';
// where the two roles meet: the land dot nearest Madrid
const ANCHOR_TARGET = [-3.7, 40.4];
const INTRO_END = 9.6;
const T = {
    appearEnd: 0.5,
    mergeEnd: 1.9,
    lockEnd: 2.8,
    zoomEnd: 5.0,
    rotateStart: 5.6,
    sweepStart: 6.2,
    sweepEnd: 8.6,
};
const ROTATE_DEG_PER_S = 7.5;
const TILT_END = 22;
const TILT_SECONDS = 4;
const SWEEP_FADE = 0.6;
// glyph geometry as a fraction of one grid cell (the arc of one grid step at
// the globe's center): the ring geometry the apps use around a provider dot
const DOT_R = 0.28;
const RING_R = 0.36;
const RING_W = 0.09;
const DOT_IN_RING_R = 0.16;
const ROLE_DOT = 0;
const ROLE_RING = 1;
const ROLE_BOTH = 2;
// the role labels under the glyphs while the roles meet: the site's label
// face, uppercase and tracked like its eyebrows, in the pale ui text color.
// PPNeueBit is Latin-only, so other scripts fall back to the page's text face
// (PPNeueMontreal carries Cyrillic) and then the system UI face — never a
// monospace system font, which set the Russian labels apart from the page.
const LABEL_FONT = '"PPNeueBit", "PPNeueMontreal", system-ui, sans-serif';
const LABEL_COLOR = '#D6E6F4';
const DEFAULT_LABELS = { provider: 'provider', extender: 'extender', miner: 'miner' };

const rad = d => (d * Math.PI) / 180;
const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const easeInOutCubic = v => { v = clamp01(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const easeOutBack = v => { v = clamp01(v); const c = 1.70158; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); };
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const GREEN_RGB = rgb(GREEN);
const PALETTE_RGB = MINER_GLOBE_PALETTE.map(rgb);

// The dot field: a unit vector and a seeded role per dot, the anchor forced
// to both roles, and each dot's delay in the color wave (its distance from
// the anchor along the surface). Pure, so it is computed once per load.
const DOTS = MINER_GLOBE_DOTS.map(([lon, lat, ci], i) => {
    const la = rad(lat);
    const lo = rad(lon);
    let h = (i * 2654435761) >>> 0;
    h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
    const r = h % 100;
    return {
        lon, lat, ci,
        x: Math.cos(la) * Math.sin(lo), y: Math.sin(la), z: Math.cos(la) * Math.cos(lo),
        role: r < 50 ? ROLE_DOT : r < 75 ? ROLE_RING : ROLE_BOTH,
        sweepDelay: 0,
    };
});
const ANCHOR = DOTS.reduce((best, d) => {
    const dd = Math.hypot(d.lon - ANCHOR_TARGET[0], d.lat - ANCHOR_TARGET[1]);
    const bd = Math.hypot(best.lon - ANCHOR_TARGET[0], best.lat - ANCHOR_TARGET[1]);
    return dd < bd ? d : best;
}, DOTS[0]);
ANCHOR.role = ROLE_BOTH;
for (const d of DOTS) {
    const cosd = Math.max(-1, Math.min(1, d.x * ANCHOR.x + d.y * ANCHOR.y + d.z * ANCHOR.z));
    const dist = Math.acos(cosd) / Math.PI;
    d.sweepDelay = Math.pow(dist, 0.8) * (T.sweepEnd - T.sweepStart - SWEEP_FADE);
}

// camera state at time t of the intro
function camera(t, size) {
    const R = size * 0.42;
    const cell = R * rad(MINER_GLOBE_STEP);
    // the ring at the intro's opening, as a fraction of the stage
    const openRing = size * 0.085;
    const Z0 = openRing / (RING_R * cell);
    let zoom = Z0;
    if (t >= T.zoomEnd) zoom = 1;
    else if (t > T.lockEnd) {
        const p = smooth((t - T.lockEnd) / (T.zoomEnd - T.lockEnd));
        zoom = Math.exp(Math.log(Z0) * (1 - p));
    }
    let lon0 = ANCHOR.lon;
    let tilt = ANCHOR.lat;
    if (t > T.rotateStart) {
        const s = t - T.rotateStart;
        const easeIn = 2;
        const turned = s < easeIn ? (s * s) / (2 * easeIn) : s - easeIn / 2;
        lon0 = ANCHOR.lon + turned * ROTATE_DEG_PER_S;
        // the globe opens tilted to the anchor's latitude and settles as it turns
        tilt = ANCHOR.lat + (TILT_END - ANCHOR.lat) * smooth(s / TILT_SECONDS);
    }
    return { R, cell, zoom, Z0, lon0, tilt };
}

function mixColor(ci, m) {
    if (m <= 0) return GREEN;
    if (m >= 1) return MINER_GLOBE_PALETTE[ci];
    const c = PALETTE_RGB[ci];
    const r = Math.round(GREEN_RGB[0] + (c[0] - GREEN_RGB[0]) * m);
    const g = Math.round(GREEN_RGB[1] + (c[1] - GREEN_RGB[1]) * m);
    const b = Math.round(GREEN_RGB[2] + (c[2] - GREEN_RGB[2]) * m);
    return `rgb(${r},${g},${b})`;
}

function drawLabel(ctx, text, x, y, size, alpha) {
    if (alpha <= 0 || !text) return;
    const px = Math.round(Math.max(13, Math.min(20, size * 0.03)));
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = `700 ${px}px ${LABEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.letterSpacing = '0.08em';
    ctx.fillText(text.toUpperCase(), x, y);
    ctx.letterSpacing = '0px';
}

function draw(ctx, t, size, dpr, labels) {
    const cam = camera(t, size);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    // labels sit this far under the ring's edge
    const labelGap = size * 0.045;
    const fillCircle = (x, y, r, color, alpha) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    };
    const strokeCircle = (x, y, r, w, color, alpha) => {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    };
    const glyph = (x, y, role, s, color, alpha) => {
        if (role === ROLE_DOT) {
            fillCircle(x, y, DOT_R * s, color, alpha);
        } else if (role === ROLE_RING) {
            strokeCircle(x, y, RING_R * s, RING_W * s, color, alpha);
        } else {
            strokeCircle(x, y, RING_R * s, RING_W * s, color, alpha);
            fillCircle(x, y, DOT_IN_RING_R * s, color, alpha);
        }
    };

    // the opening: the two roles meet, in screen space, at the zoomed size
    // the merged pair will have when the globe takes over
    if (t < T.lockEnd) {
        const appear = smooth(t / T.appearEnd);
        const travel = easeInOutCubic((t - T.appearEnd) / (T.mergeEnd - T.appearEnd));
        const offset = size * 0.3 * (1 - travel);
        const s = cam.cell * cam.Z0;
        // the dot contracts to its in-ring size over the last third of the move
        const shrink = smooth((travel - 0.66) / 0.34);
        const dotR = (DOT_R + (DOT_IN_RING_R - DOT_R) * shrink) * s;
        const lock = t > T.mergeEnd ? 1 - easeOutBack((t - T.mergeEnd) / 0.45) : 1;
        const ringR = RING_R * s * (1 + 0.06 * lock);
        fillCircle(cx - offset, cy, dotR * (0.6 + 0.4 * appear), GREEN, appear);
        strokeCircle(cx + offset, cy, ringR, RING_W * s, GREEN, appear);
        if (t > T.mergeEnd) {
            // a faint glow while the ring locks
            const glow = 0.35 * (1 - smooth((t - T.mergeEnd) / (T.lockEnd - T.mergeEnd)));
            strokeCircle(cx, cy, RING_R * s * (1.1 + 0.25 * (1 - lock)), RING_W * s * 0.6, GREEN, glow);
        }
        // the role labels travel with their glyphs and fade as the two merge;
        // "miner" takes their place under the merged pair once the ring locks
        const labelY = cy + ringR + labelGap;
        const roleAlpha = appear * (1 - smooth((travel - 0.5) / 0.3));
        drawLabel(ctx, labels.provider, cx - offset, labelY, size, roleAlpha);
        drawLabel(ctx, labels.extender, cx + offset, labelY, size, roleAlpha);
        if (t > T.mergeEnd) {
            drawLabel(ctx, labels.miner, cx, labelY, size, smooth((t - T.mergeEnd) / 0.4));
        }
        ctx.globalAlpha = 1;
        return;
    }

    // the globe, zoomed about its center; the field fades in as the camera
    // pulls back, the merged pair is already there
    const zoomP = clamp01((t - T.lockEnd) / (T.zoomEnd - T.lockEnd));
    const fieldAlpha = smooth((zoomP - 0.12) / 0.6);
    const lon0 = rad(cam.lon0);
    const tilt = rad(cam.tilt);
    const sinT = Math.sin(tilt);
    const cosT = Math.cos(tilt);
    const discR = cam.R * cam.zoom;
    if (discR < size * 4) fillCircle(cx, cy, discR, DISC, fieldAlpha);
    const limit = size * 0.75;
    const s = cam.cell * cam.zoom;
    for (const d of DOTS) {
        const dl = rad(d.lon) - lon0;
        const cosLa = Math.cos(rad(d.lat));
        const sinLa = Math.sin(rad(d.lat));
        const x = cosLa * Math.sin(dl);
        const y = cosT * sinLa - sinT * cosLa * Math.cos(dl);
        const zc = sinT * sinLa + cosT * cosLa * Math.cos(dl);
        if (zc <= 0.02) continue;
        const sx = cx + cam.R * x * cam.zoom;
        const sy = cy - cam.R * y * cam.zoom;
        if (Math.abs(sx - cx) > limit || Math.abs(sy - cy) > limit) continue;
        const limb = 0.3 + 0.7 * Math.pow(zc, 0.6);
        let color = GREEN;
        if (t > T.sweepStart) color = mixColor(d.ci, smooth((t - T.sweepStart - d.sweepDelay) / SWEEP_FADE));
        if (d === ANCHOR) glyph(sx, sy, ROLE_BOTH, s, color, limb);
        else glyph(sx, sy, d.role, s, color, fieldAlpha * limb);
    }
    // the miner label stays under the merged pair and fades out as the camera
    // starts to pull back
    const minerAlpha = 1 - smooth(zoomP / 0.35);
    if (minerAlpha > 0) {
        drawLabel(ctx, labels.miner, cx, cy + RING_R * s + labelGap, size, minerAlpha);
    }
    ctx.globalAlpha = 1;
}

/**
 * `alt` names the canvas for assistive technology; `labels` are the role
 * words drawn under the glyphs while the roles meet ({ provider, extender,
 * miner }, in the page's language).
 */
export default function MinerGlobeIntro({ alt, labels }) {
    const stageRef = useRef(null);
    const canvasRef = useRef(null);
    // read by the draw loop without restarting it when the words change
    const labelsRef = useRef(DEFAULT_LABELS);
    labelsRef.current = { ...DEFAULT_LABELS, ...labels };

    useEffect(() => {
        const stage = stageRef.current;
        const canvas = canvasRef.current;
        if (!stage || !canvas) return undefined;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;

        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
        let current = reduced ? INTRO_END : 0;
        let size = 0;
        let dpr = 1;
        let visible = true;
        let last = 0;
        let raf = 0;

        const render = () => draw(ctx, current, size, dpr, labelsRef.current);
        const resize = () => {
            const rect = stage.getBoundingClientRect();
            size = Math.max(120, Math.round(rect.width));
            dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = Math.round(size * dpr);
            canvas.height = Math.round(size * dpr);
            render();
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(stage);

        if (reduced) {
            // the final colored globe, drawn once: nothing moves
            return () => ro.disconnect();
        }

        const frame = now => {
            raf = requestAnimationFrame(frame);
            if (!visible || document.hidden) {
                last = 0;
                return;
            }
            if (last) current += (now - last) / 1000;
            last = now;
            render();
        };
        const io = new IntersectionObserver(entries => {
            visible = entries.some(e => e.isIntersecting);
        });
        io.observe(stage);
        const onVisibility = () => { last = 0; };
        document.addEventListener('visibilitychange', onVisibility);
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            io.disconnect();
            ro.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    return (
        <div className="miner-globe" ref={stageRef}>
            <canvas ref={canvasRef} role="img" aria-label={alt} />
        </div>
    );
}
