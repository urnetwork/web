import React, { useEffect, useRef } from 'react';
import './Sim.css';

/**
 * ValidatorSim — validators probing miners for liveness.
 *
 * A packed cluster of ~200 miners, each a hollow outlined circle (the "outer",
 * a blank hole) with a solid pink core (the "inner"). Every miner starts empty
 * and has two intrinsic properties: a HEALTH = P(a probe succeeds), and a WEIGHT
 * (1–100) that sets how likely it is chosen for a probe (∝ weight / Σweight).
 * Validators orbit the rim and fire probes at weighted-random miners: a success
 * grows that miner's pink core and lets the validator continue (up to 10); a
 * failure grows the miner's blank hole and ends the validator. Miners accumulate
 * over their life, then leave and are replaced. Over time the cluster shows who
 * is solid pink (healthy) and who is a hole (unhealthy).
 *
 * Canvas, continuous, decorative. Constants below are the "feel".
 */

// --- tunables ---
const MINER_MEAN = 600;
const VAL_N = 60;               // concurrent validators
const PROBES = 10;              // successful probes before a validator retires
const CLAIM_HOLD_MS = 600;      // after the 10th success: fill solid and hold this long before fading (a claimed path)
const VAL_R0 = 7, VAL_GROW = 2.2; // validator radius = base + growth per sequential success (also holds its count)
const PROBE_MS = 320;           // outbound probe travel time
const RETURN_MS = 300;          // return-message (content) travel time on success
const SUCCESS_GROW = 0.22;      // pink area added on success (× base area)
const FAIL_GROW = 0.5;          // blank outer area added on failure (× base area)
const GROW_EASE = 0.16;         // how fast a miner eases toward its accumulated area
const SIZE_CAP = 10;            // a miner leaves once its outer area exceeds this × base
const W_MIN = 1, W_MAX = 100, W_POWER = 3; // probe-selection weight ~ power distribution: high weights are rare
const REL_ITERS = 3;
const COHESION = 0.008;         // gentle pull toward center — holds the cluster together without a chaotic center
const COL_UI = '214,230,244';   // --brand-ui (outline, validators, probes)
const COL_UR = '237,143,255';   // --brand-ur (pink core)

const rand = (a, b) => a + Math.random() * (b - a);

export default function ValidatorSim({ caption = 'Validators probe the available IP surface area and rank miners by reliability.' }) {
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const wrap = wrapRef.current, canvas = canvasRef.current;
        if (!wrap || !canvas) return;
        const ctx = canvas.getContext('2d');
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let W = 0, H = 0, dpr = 1, minerN = MINER_MEAN, valN = VAL_N, baseA = 1;
        let cluster = { cx: 0, cy: 0, r: 0 }, rim = 0;
        let miners = [], validators = [];
        let raf = 0, running = true, last = performance.now();

        const outerR = (m) => Math.sqrt((m.innerA + m.ringA) / Math.PI);
        const innerR = (m) => Math.sqrt(m.innerA / Math.PI);

        const layout = () => {
            const rect = wrap.getBoundingClientRect();
            W = Math.max(1, rect.width); H = W; dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
            canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const scale = W < 420 ? 0.55 : 1;
            minerN = Math.round(MINER_MEAN * scale); valN = Math.round(VAL_N * scale);
            cluster = { cx: 0.5 * W, cy: 0.5 * H, r: 0.42 * H };
            rim = 0.47 * H;
            baseA = (Math.PI * cluster.r * cluster.r) / (minerN * 2.4); // (2× the prior 0.5 coefficient) so the packed cluster fills a larger envelope
        };

        const spawnMiner = () => {
            const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * cluster.r * 0.9;
            return {
                intr: rand(0.2, 0.97),                 // health = P(probe succeeds)
                weight: W_MIN + (W_MAX - W_MIN) * Math.pow(Math.random(), W_POWER), // power-distributed probe-selection weight
                innerA: 0, innerT: 0, ringA: 0, ringT: 0,   // start empty; grow only via probes
                x: cluster.cx + Math.cos(a) * rr, y: cluster.cy + Math.sin(a) * rr,
                born: performance.now(), life: rand(14000, 40000),
            };
        };
        const spawnValidator = () => { const a = Math.random() * Math.PI * 2; return { x: cluster.cx + Math.cos(a) * rim, y: cluster.cy + Math.sin(a) * rim, done: 0, target: null, phase: 'out', t: 0, alpha: 0, dead: false, claimed: false, holdT: 0 }; };
        const init = () => { miners = []; for (let i = 0; i < minerN; i++) { const m = spawnMiner(); m.born -= rand(0, 30000); miners.push(m); } validators = []; for (let i = 0; i < valN; i++) validators.push(spawnValidator()); };

        // weighted-random miner: P(select i) = weight_i / Σ weight
        const pickMiner = () => {
            if (!miners.length) return null;
            let total = 0; for (const m of miners) total += m.weight;
            let r = Math.random() * total;
            for (const m of miners) { r -= m.weight; if (r <= 0) return m; }
            return miners[miners.length - 1];
        };

        const collide = () => {
            const cell = Math.max(8, 2.4 * Math.sqrt(SIZE_CAP * baseA / Math.PI));
            const grid = new Map(), key = (x, y) => x + ',' + y;
            for (const m of miners) { const k = key((m.x / cell) | 0, (m.y / cell) | 0); (grid.get(k) || grid.set(k, []).get(k)).push(m); }
            for (let it = 0; it < REL_ITERS; it++) for (const m of miners) {
                const gx = (m.x / cell) | 0, gy = (m.y / cell) | 0, rm = outerR(m);
                for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const arr = grid.get(key(gx + ox, gy + oy)); if (!arr) continue;
                    for (const n of arr) { if (n === m) continue; let dx = n.x - m.x, dy = n.y - m.y, d2 = dx * dx + dy * dy; const rr = rm + outerR(n);
                        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), pu = (rr - d) * 0.5; dx /= d; dy /= d; m.x -= dx * pu; m.y -= dy * pu; n.x += dx * pu; n.y += dy * pu; } } }
                let dx = m.x - cluster.cx, dy = m.y - cluster.cy, d = Math.hypot(dx, dy); const lim = cluster.r - rm;
                if (d > lim && d > 1e-6) { m.x = cluster.cx + dx / d * lim; m.y = cluster.cy + dy / d * lim; }
            }
        };

        const step = (now, dt) => {
            for (const m of miners) { m.innerA += (m.innerT - m.innerA) * GROW_EASE; m.ringA += (m.ringT - m.ringA) * GROW_EASE; }
            for (let i = miners.length - 1; i >= 0; i--) { const m = miners[i]; if (now - m.born > m.life || (m.innerT + m.ringT) > SIZE_CAP * baseA) { miners.splice(i, 1); miners.push(spawnMiner()); } }
            for (const v of validators) {
                if (v.dead) continue;
                if (v.alpha < 1) v.alpha = Math.min(1, v.alpha + 0.08);
                if (v.claimed) {                                                                    // claimed a path: hold the solid disc, then start fading
                    v.holdT += dt;
                    if (v.holdT >= CLAIM_HOLD_MS) v.dead = true;
                    continue;
                }
                if (!v.target) { v.target = pickMiner(); v.phase = 'out'; v.t = 0; if (!v.target) continue; }
                const m = v.target;
                if (!m || miners.indexOf(m) < 0) { v.target = pickMiner(); v.phase = 'out'; v.t = 0; continue; }
                if (v.phase === 'out') {
                    v.t += dt / PROBE_MS;
                    if (v.t >= 1) { if (Math.random() < m.intr) { v.phase = 'return'; v.t = 0; }   // content is coming back
                                    else { m.ringT += FAIL_GROW * baseA; v.dead = true; } }         // no content back → the hole grows, validator ends
                } else {                                                                            // return message travelling back to the validator
                    v.t += dt / RETURN_MS;
                    if (v.t >= 1) { m.innerT += SUCCESS_GROW * baseA; v.done++;                      // content received → pink core grows
                                    if (v.done >= PROBES) { v.claimed = true; v.holdT = 0; v.target = null; } // 10th success → claim the path: fill solid + hold
                                    else { v.target = pickMiner(); v.phase = 'out'; v.t = 0; } }
                }
            }
            for (let i = validators.length - 1; i >= 0; i--) { const v = validators[i]; if (v.dead) { v.alpha -= 0.06; if (v.alpha <= 0) validators.splice(i, 1); } }
            while (validators.length < valN) validators.push(spawnValidator());
            for (const m of miners) { m.x += (cluster.cx - m.x) * COHESION; m.y += (cluster.cy - m.y) * COHESION; } // gentle centering
            if (!reduce) collide();
        };

        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            for (const v of validators) { if (v.dead || !v.target) continue; const m = v.target;
                ctx.strokeStyle = `rgba(${COL_UI},${0.1 * v.alpha})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(v.x, v.y); ctx.lineTo(m.x, m.y); ctx.stroke();
                let px, py, rr, col;
                if (v.phase === 'out') { px = v.x + (m.x - v.x) * v.t; py = v.y + (m.y - v.y) * v.t; rr = 2; col = COL_UI; }    // outbound probe
                else { px = m.x + (v.x - m.x) * v.t; py = m.y + (v.y - m.y) * v.t; rr = 3.2; col = COL_UR; }                     // return message = content coming back
                ctx.fillStyle = `rgba(${col},${0.95 * v.alpha})`; ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill(); }
            for (const m of miners) { const ro = outerR(m), ri = innerR(m); if (ro < 0.4) continue;
                ctx.strokeStyle = `rgba(${COL_UI},0.5)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(m.x, m.y, ro, 0, Math.PI * 2); ctx.stroke();
                if (ri > 0.4) { ctx.fillStyle = `rgba(${COL_UR},0.92)`; ctx.beginPath(); ctx.arc(m.x, m.y, Math.min(ri, ro), 0, Math.PI * 2); ctx.fill(); } }
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (const v of validators) {
                const r = VAL_R0 + v.done * VAL_GROW;   // grows with each sequential success
                if (v.claimed) {
                    // Claimed a path: the ring fills solid and holds, then fades out via v.alpha.
                    ctx.fillStyle = `rgba(${COL_UI},${0.92 * v.alpha})`;
                    ctx.beginPath(); ctx.arc(v.x, v.y, r, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = `rgba(16,16,16,${0.9 * v.alpha})`;   // dark count for contrast on the solid fill
                } else {
                    ctx.strokeStyle = `rgba(${COL_UI},${0.8 * v.alpha})`; ctx.lineWidth = 1.4;
                    ctx.beginPath(); ctx.arc(v.x, v.y, r, 0, Math.PI * 2); ctx.stroke();
                    ctx.fillStyle = `rgba(${COL_UI},${0.92 * v.alpha})`;
                }
                ctx.font = `600 ${Math.round(r * 1.1)}px 'PPNeueBit', monospace`;
                ctx.fillText(String(v.done), v.x, v.y);
            }
        };

        const frame = () => { raf = 0; if (!running) return; const now = performance.now(), dt = Math.min(50, now - last); last = now; step(now, dt); draw(); raf = requestAnimationFrame(frame); };
        const onResize = () => { layout(); init(); };
        layout(); init(); last = performance.now(); frame();
        window.addEventListener('resize', onResize);
        const onVis = () => { running = document.visibilityState !== 'hidden'; if (running && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
        document.addEventListener('visibilitychange', onVis);
        return () => { running = false; if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); };
    }, []);

    return (
        <figure className="sim-figure">
            <div className="sim-wrap" ref={wrapRef}>
                <canvas className="sim-canvas" ref={canvasRef} aria-hidden="true" />
            </div>
            <figcaption className="sim-caption">{caption}</figcaption>
        </figure>
    );
}
