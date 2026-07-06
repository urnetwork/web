import React, { useEffect, useRef } from 'react';
import './Sim.css';

/**
 * MinerSim — the competition from pool to top-level miner.
 *
 * A circular-envelope cluster of pool miners (circles, strict collision, areas
 * on a random walk, pushing like kernels). Above them the top miners are laid
 * out like text glyphs: boxes flow left-to-right and wrap to new rows,
 * bottom-aligned per row, with small gaps — no physics. Every SWAP_MS a
 * countdown bar empties and a swap cascade runs: the greatest-area circle trades
 * places with the greatest square smaller than it, repeatedly, until none are
 * eligible. Each swapping pair takes the other's place along opposing curved
 * arcs (paths don't cross) and morphs circle↔square through an area-preserving
 * rounded rectangle, slow enough to watch; a promotion lands in the demoted
 * square's slot.
 *
 * Canvas, continuous, decorative. Constants below are the "feel".
 */

// --- tunables ---
const POOL_N = 300, TOP_N = 20;
const SWAP_MS = 5000;           // swap cadence + countdown length
const SWAPS_PER_INTERVAL = 3;   // max top-miner moves per interval (gradual cold-start fill + calm competition)
const POP_MS = 1300;            // per-swap morph/arc duration (slow, watchable)
const POP_STAGGER = 150;        // ms between staggered pops in a cascade
const ARC = 0.32;               // arc bow, as a fraction of the swap distance
const SWAP_SPLIT = 0.45;        // first part of a swap fills/unfills in place; the rest morphs the shape + moves
const WALK = 0.05;              // area random-walk step (× base area / frame)
const AREA_SPREAD = 0.7;        // ± fraction of a miner's mean area the walk ranges over
const W_MIN = 1, W_MAX = 1000, W_POWER = 6; // intrinsic weight ~ power distribution: high weights are rare (higher power → rarer)
const WEIGHT_MEAN = W_MIN + (W_MAX - W_MIN) / (W_POWER + 1); // ≈ E[weight]; keeps total area ≈ budget so packing holds
const BUFFER = 1;               // px of empty space kept between neighbouring pool miners
const CHURN_MS = 900;           // how often pool miners are replaced
const REL_ITERS = 12;           // relaxation passes / frame — enough to fully clear overlaps across the size range
const TARGET_PACK = 0.70;       // fit the envelope so pool circles pack to ~this density (compact, with room to resolve)
const TOP_Y_FRAC = 0.06;        // top of the single top-miner row (× canvas height)
const BOX_GAP = 3;              // spacing between top boxes
const OUTLINE_W = 1.5;          // border thickness of an outline (circle) pool miner; thickens to fill as it becomes a square
const TOP_SCALE = 0.5;          // top miners render at this fraction of their true size, to fit one line (visual only)
const COL_UI = '214,230,244';   // --brand-ui (miners)
const COL_UR = '237,143,255';   // --brand-ur (swapping miners, countdown)

const rand = (a, b) => a + Math.random() * (b - a);
const easeOutSlow = (t) => 1 - Math.pow(1 - t, 3);

export default function MinerSim({ caption = 'Miners compete for the most unique IPs reliably available on the network. Top miners get promoted to their own UID slot.' }) {
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const wrap = wrapRef.current, canvas = canvasRef.current;
        if (!wrap || !canvas) return;
        const ctx = canvas.getContext('2d');
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let W = 0, H = 0, dpr = 1, poolN = POOL_N, topN = TOP_N, baseA = 1;
        let pool = { cx: 0, cy: 0, r: 0 };
        let miners = [], topSlots = [];
        let raf = 0, running = true, lastSwap = performance.now(), lastChurn = performance.now();

        const circR = (A) => Math.sqrt(A / Math.PI);
        const rr = (x, y, s, rad) => { if (ctx.roundRect) ctx.roundRect(x, y, s, s, Math.max(0, rad)); else ctx.rect(x, y, s, s); };
        const ghostPos = (g) => g.tier === 'top' ? [g.tx, g.ty] : [g.x, g.y]; // reserved slot uses its laid-out spot; pool hole flows with the cluster

        const layout = () => {
            const rect = wrap.getBoundingClientRect();
            W = Math.max(1, rect.width); H = W; dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
            canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const scale = W < 420 ? 0.5 : 1;
            poolN = Math.round(POOL_N * scale); topN = Math.round(TOP_N * scale);
            pool = { cx: 0.5 * W, cy: 0.5 * H, r: 0.36 * H };
            baseA = 0.6 * Math.PI * pool.r * pool.r / poolN;
        };

        const spawn = (tier) => {
            const weight = W_MIN + (W_MAX - W_MIN) * Math.pow(Math.random(), W_POWER), meanA = baseA * weight / WEIGHT_MEAN; // power-distributed weight → mean area
            const variance = Math.random(); // 0..1 uniform — scales the amplitude & speed of this miner's area walk
            const A = meanA * rand(1 - AREA_SPREAD * variance, 1 + AREA_SPREAD * variance);
            let x = 0.5 * W, y = TOP_Y_FRAC * H;
            if (tier === 'pool') { const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * pool.r * 0.95; x = pool.cx + Math.cos(a) * rr; y = pool.cy + Math.sin(a) * rr; }
            return { tier, weight, meanA, variance, A, ta: A, x, y, tx: x, ty: y, alpha: 0, swap: null, slot: -1, tenure: 0, born: performance.now(), life: tier === 'pool' ? rand(6000, 22000) : Infinity };
        };

        // A single row of top miners: centered horizontally, set evenly between the top of the
        // canvas and the top of the cluster, boxes bottom-aligned (like glyphs on a line).
        const layoutTop = () => {
            const list = topSlots.filter(Boolean);
            let total = -BOX_GAP, rowH = 0;
            for (const m of list) { const side = TOP_SCALE * Math.sqrt(m.A); total += side + BOX_GAP; rowH = Math.max(rowH, side); }
            const by = (pool.cy - pool.r) / 2 - rowH / 2;   // vertically centered in the gap above the cluster
            let x = (W - total) / 2;                         // horizontally centered
            for (const m of list) { const side = TOP_SCALE * Math.sqrt(m.A); m.tx = x + side / 2; m.ty = by + rowH - side / 2; x += side + BOX_GAP; }
        };

        const init = () => {
            miners = []; topSlots = new Array(topN).fill(null); // top line starts empty; slots fill via promotions
            for (let i = 0; i < poolN; i++) { const m = spawn('pool'); m.alpha = 1; m.born -= rand(0, 20000); miners.push(m); }
            layoutTop();
        };

        // Brute-force O(n²) so nothing is missed across the wide (weight-driven) size range; keep a
        // BUFFER between every pair, stay in the envelope. Reserved holes (ghosts) flow with the
        // cluster like any circle, so an arriving miner's target moves with the layout.
        const collide = () => {
            const poolM = miners.filter(m => m.tier === 'pool' && !m.swap), n = poolM.length;
            for (let it = 0; it < REL_ITERS; it++) {
                for (let i = 0; i < n; i++) { const a = poolM[i], ra = circR(a.A);
                    for (let j = i + 1; j < n; j++) { const b = poolM[j]; let dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy; const rr = ra + circR(b.A) + BUFFER;
                        if (d2 > 1e-9) { if (d2 < rr * rr) { const d = Math.sqrt(d2), pu = (rr - d) * 0.5; dx /= d; dy /= d; a.x -= dx * pu; a.y -= dy * pu; b.x += dx * pu; b.y += dy * pu; } }
                        else { a.x -= 0.5; b.x += 0.5; } } }
                for (const m of poolM) { let dx = m.x - pool.cx, dy = m.y - pool.cy, d = Math.hypot(dx, dy); const lim = pool.r - circR(m.A); if (d > lim && d > 1e-6) { m.x = pool.cx + dx / d * lim; m.y = pool.cy + dy / d * lim; } }
            }
        };

        // Moves: while any slot is empty, the biggest pool miners fill them (s: null, no demotion).
        // Once full, the biggest pool miners compete in, displacing the biggest top square smaller than them.
        const computeMoves = () => {
            const poolM = miners.filter(m => m.tier === 'pool' && !m.swap && !m.ghost && m.alpha > 0.9).sort((a, b) => b.A - a.A);
            const empties = [];
            for (let i = 0; i < topN; i++) if (!topSlots[i]) empties.push(i);
            if (empties.length) return empties.slice(0, Math.min(poolM.length, SWAPS_PER_INTERVAL)).map((slot, k) => ({ c: poolM[k], s: null, slot }));
            const topM = topSlots.filter(m => m && !m.swap && !m.ghost).sort((a, b) => b.A - a.A);
            const used = new Set(), out = [];
            for (const c of poolM) { let s = null; for (const t of topM) { if (!used.has(t) && t.A < c.A) { s = t; break; } } if (!s) break; used.add(s); out.push({ c, s, slot: s.slot }); if (out.length >= SWAPS_PER_INTERVAL) break; }
            return out;
        };

        // Each swap tracks two reserved ghosts: fromGhost (its origin hole, followed during the
        // fill/unfill) and toGhost (its live destination). Promotion bows one way, demotion the other.
        const startSwap = (c, s, pg, tg, now, order) => {
            const start = now + order * POP_STAGGER;
            c.swap = { start, side: 1, toTier: 'top', fromGhost: pg, toGhost: tg, closeGhost: s ? null : pg, locked: false, x0: c.x, y0: c.y };
            if (s) s.swap = { start, side: -1, toTier: 'pool', fromGhost: tg, toGhost: pg, locked: false, x0: s.x, y0: s.y };
        };

        const step = (now) => {
            for (const m of miners) { if (m.ghost) continue; const sp = AREA_SPREAD * m.variance; m.ta += (Math.random() - 0.5) * 2 * WALK * m.meanA * m.variance; m.ta = Math.max(m.meanA * (1 - sp), Math.min(m.meanA * (1 + sp), m.ta)); m.A += (m.ta - m.A) * 0.08; if (m.alpha < 1) m.alpha = Math.min(1, m.alpha + 0.05); }
            for (const m of miners) { if (!m.swap) continue; const sw = m.swap, t = (now - sw.start) / POP_MS; if (t < 0) continue;
                const ap = t < SWAP_SPLIT ? 0 : (t - SWAP_SPLIT) / (1 - SWAP_SPLIT); // hole keeps the outgoing size through the fill, resizes during the move
                if (sw.toGhost) sw.toGhost.A = sw.toGhost.A0 + (sw.toGhost.A1 - sw.toGhost.A0) * ap;
                if (sw.fromGhost) sw.fromGhost.A = sw.fromGhost.A0 + (sw.fromGhost.A1 - sw.fromGhost.A0) * ap; // origin hole resizes too (a fill's pool hole closes to 0)
                const [dx1, dy1] = ghostPos(sw.toGhost); // live destination, re-read each frame
                if (t >= 1) {
                    if (sw.toTier === 'top') { topSlots[m.slot] = m; m.tenure = 1; if (sw.closeGhost) { const gi = miners.indexOf(sw.closeGhost); if (gi >= 0) miners.splice(gi, 1); } } // fill the slot; close a fill's vacated pool hole
                    else { const idx = miners.indexOf(sw.toGhost); if (idx >= 0) miners.splice(idx, 1); } // release the reserved pool hole
                    m.x = dx1; m.y = dy1; m.tier = sw.toTier; m.life = m.tier === 'pool' ? rand(6000, 22000) : Infinity; m.born = now; m.swap = null; continue;
                }
                if (t < SWAP_SPLIT) { const [fx, fy] = ghostPos(sw.fromGhost); m.x = fx; m.y = fy; continue; } // fill/unfill in place, following the layout
                if (!sw.locked) { sw.x0 = m.x; sw.y0 = m.y; sw.locked = true; }  // lock the start the moment movement begins
                const pp = (t - SWAP_SPLIT) / (1 - SWAP_SPLIT), e = easeOutSlow(pp), u = 1 - e; // constant, time-driven progress
                const cx = (sw.x0 + dx1) / 2 + sw.side * ARC * Math.hypot(dx1 - sw.x0, dy1 - sw.y0), cy = (sw.y0 + dy1) / 2; // re-aim the arc at the live destination
                m.x = u * u * sw.x0 + 2 * u * e * cx + e * e * dx1; m.y = u * u * sw.y0 + 2 * u * e * cy + e * e * dy1; }
            // Compact by fitting the envelope radius to the circles' total area (even, perimeter compaction).
            { let ta = 0; for (const m of miners) if (m.tier === 'pool' && !m.swap) ta += m.A; if (ta > 0) pool.r = Math.min(0.42 * H, Math.sqrt(ta / (Math.PI * TARGET_PACK))); }
            if (!reduce) collide();
            layoutTop();
            for (const m of miners) if (m.tier === 'top' && !m.swap && !m.ghost) { m.x = m.tx; m.y = m.ty; } // snap into the top line once mounted
            if (now - lastChurn > CHURN_MS) { lastChurn = now; const olds = miners.filter(m => m.tier === 'pool' && !m.swap && !m.ghost && now - m.born > m.life); for (const m of olds.slice(0, 2)) { const i = miners.indexOf(m); if (i >= 0) miners.splice(i, 1); miners.push(spawn('pool')); } }
            if (now - lastSwap > SWAP_MS) {
                lastSwap = now; const moves = computeMoves(), info = [], demoting = new Set(moves.filter(mv => mv.s).map(mv => mv.s));
                for (const m of topSlots) if (m && !m.ghost && !demoting.has(m)) m.tenure = (m.tenure || 0) + 1; // top miners that survive this interval
                for (const { c, s, slot } of moves) {  // reserve both holes NOW, sized outgoing → incoming (0 for an empty slot)
                    const sA = s ? s.A : 0;
                    const pg = { ghost: true, tier: 'pool', A: c.A, A0: c.A, A1: sA, x: c.x, y: c.y, swap: null };
                    miners.push(pg);
                    const tg = { ghost: true, tier: 'top', A: sA, A0: sA, A1: c.A, slot, tx: c.x, ty: c.y };
                    topSlots[slot] = tg; c.slot = slot;
                    info.push({ c, s, pg, tg });
                }
                layoutTop();  // position the reserved slots before aiming the promotions at them
                info.forEach(({ c, s, pg, tg }, k) => startSwap(c, s, pg, tg, now, k));
            }
        };

        const draw = (now) => {
            ctx.clearRect(0, 0, W, H);
            const remain = Math.max(0, 1 - (now - lastSwap) / SWAP_MS);
            ctx.fillStyle = `rgba(${COL_UI},0.1)`; ctx.fillRect(0, 3, W, 2.5);
            ctx.fillStyle = `rgba(${COL_UR},0.7)`; ctx.fillRect(0, 3, W * remain, 2.5);
            for (const m of miners) {
                if (m.ghost) continue;
                // Steady: pool = outline circle (f=1, fill=0); top = solid square (f=0, fill=1).
                // Swap: fill/unfill FIRST (in place), THEN morph the shape.
                let f, fill;
                if (!m.swap) { f = m.tier === 'pool' ? 1 : 0; fill = m.tier === 'pool' ? 0 : 1; }
                else { const t = Math.max(0, Math.min(1, (now - m.swap.start) / POP_MS));
                    if (m.swap.toTier === 'top') { if (t < SWAP_SPLIT) { f = 1; fill = t / SWAP_SPLIT; } else { f = 1 - easeOutSlow((t - SWAP_SPLIT) / (1 - SWAP_SPLIT)); fill = 1; } }
                    else { if (t < SWAP_SPLIT) { f = 0; fill = 1 - t / SWAP_SPLIT; } else { f = easeOutSlow((t - SWAP_SPLIT) / (1 - SWAP_SPLIT)); fill = 0; } } }
                const s0 = Math.sqrt(m.A / (1 - (4 - Math.PI) / 4 * f * f)), s = (TOP_SCALE + (1 - TOP_SCALE) * f) * s0, r = f * s / 2; // scale down toward the top line (1 at circle → TOP_SCALE at square)
                const col = m.swap ? COL_UR : COL_UI;
                ctx.beginPath(); rr(m.x - s / 2, m.y - s / 2, s, r);
                if (fill > 0.01) { ctx.fillStyle = `rgba(${col},${0.85 * fill * m.alpha})`; ctx.fill(); }
                ctx.strokeStyle = `rgba(${col},${0.62 * m.alpha})`; ctx.lineWidth = OUTLINE_W; ctx.stroke();
                // tenure number, centered; fades out as a top miner transitions back to the cluster
                const numAlpha = m.swap ? (m.swap.toTier === 'pool' ? 1 - Math.max(0, Math.min(1, (now - m.swap.start) / POP_MS)) : 0) : (m.tier === 'top' ? 1 : 0);
                if (numAlpha > 0.02) { ctx.fillStyle = `rgba(16,16,16,${0.9 * numAlpha * m.alpha})`; ctx.font = `${Math.max(6, Math.round(s * 0.6))}px 'PPNeueBit', monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(m.tenure), m.x, m.y); }
            }
        };

        const frame = () => { raf = 0; if (!running) return; const now = performance.now(); step(now); draw(now); raf = requestAnimationFrame(frame); };
        const onResize = () => { layout(); init(); lastSwap = performance.now(); };
        layout(); init(); lastSwap = performance.now(); frame();
        window.addEventListener('resize', onResize);
        const onVis = () => { running = document.visibilityState !== 'hidden'; if (running && !raf) raf = requestAnimationFrame(frame); };
        document.addEventListener('visibilitychange', onVis);
        return () => { running = false; if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); };
    }, []);

    return (
        <div className="sim-wrap" ref={wrapRef}>
            <canvas className="sim-canvas" ref={canvasRef} aria-hidden="true" />
            <p className="sim-caption">{caption}</p>
        </div>
    );
}
