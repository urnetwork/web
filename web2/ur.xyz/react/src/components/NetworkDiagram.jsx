import React, { useEffect, useRef } from 'react';
import './NetworkDiagram.css';
import { buildPath, navigate, splitPath } from '../router';

/**
 * NetworkDiagram — the page's navigation key, in two forms:
 *
 *   • Inline (centered in the text column): a rotating 3D pyramid. The current
 *     section is the APEX (fixed at top); the other three spin as an isometric
 *     triangular base. A base label shows as its vertex swings to the foreground
 *     and fades as it swings to the back. Edges encode meaning: pink = connects
 *     to the current vertex, solid = a real subnet edge, dashed = structural-only
 *     (the Miners–Validators pair, which is not a real connection).
 *
 *   • Docked (left margin, on scroll): it slides into the left column, shrinks,
 *     and FLATTENS into the flat square nav — the vertices rotate into place
 *     (affine, in polar coords) rather than crossing over, the Miners–Validators
 *     diagonal opens up, and the pink glow settles back to the subtle wire.
 *
 * Tapping any vertex routes to that section. Progressive enhancement: without JS
 * it renders as the flat square. The whole "feel" is in the tunables below.
 */

const NODE_KEYS = ['operators', 'miners', 'validators', 'subnet'];
const LABEL = { operators: 'Operators', miners: 'Miners', validators: 'Validators', subnet: 'Subnet' };
const ROUTE = { operators: 'operators', miners: 'miners', validators: 'validators', subnet: 'home' };

// Flat square corners + label anchors, in the 320×288 viewBox (the docked layout).
const SQUARE = {
    operators:  { x: 72,  y: 56,  lx: 72,  ly: 36  },
    miners:     { x: 248, y: 56,  lx: 248, ly: 36  },
    validators: { x: 72,  y: 232, lx: 72,  ly: 256 },
    subnet:     { x: 248, y: 232, lx: 248, ly: 256 },
};

// The 5 real connections + the open Miners–Validators pair.
const REAL_EDGES = [
    ['operators', 'miners'], ['operators', 'validators'], ['operators', 'subnet'],
    ['subnet', 'miners'], ['subnet', 'validators'],
];
const MV = ['miners', 'validators'];
const EDGES = [...REAL_EDGES.map(e => ({ e, mv: false })), { e: MV, mv: true }];
const ekey = ([a, b]) => `${a}-${b}`;

// --- Pyramid feel (tunable) ---
const CX = 160, CY = 144;           // viewBox center — pivot for the affine flatten
const APEX = { x: 160, y: 46 };     // fixed apex, screen coords
const BASE_CX = 160, BASE_CY = 198; // base-ellipse center
const BASE_RX = 96;                 // base-ellipse half-width
const BASE_RY = 30;                 // base-ellipse half-height (isometric tilt)
const OMEGA = 0.6;                  // rotation speed, rad/s
const FADE_MIN = 0.1;               // label opacity of a fully back-facing base vertex

// --- Dock geometry (tunable) ---
const NAV_H = 64, GAP = 16, DOCK_SCALE = 0.8, TRAVEL = 220, EDGE_GAP = 14;
const DOCK_VFRAC = 0.25;            // vertical position of the docked diagram: fraction from nav→bottom (0.25 = 25% above center)
const THRESHOLD = 0.25;            // raw scroll progress that commits the binary dock/undock (either direction)
const DOCK_DURATION = 600;         // ms — ease-in-out duration of the committed transition
const NAT_W = 300, NAT_H = NAT_W * 288 / 320;
const DOCKED_W = NAT_W * DOCK_SCALE, DOCKED_H = NAT_H * DOCK_SCALE;

const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a0, a1, t) => { const d = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)); return a0 + d * t; };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function NetworkDiagram({ active = 'subnet', lang = 'en' }) {
    const holderRef = useRef(null);
    const svgRef = useRef(null);
    const circleRefs = useRef({});
    const hitRefs = useRef({});
    const labelRefs = useRef({});
    const edgeRefs = useRef({});

    useEffect(() => {
        const holder = holderRef.current;
        const svg = svgRef.current;
        if (!holder || !svg) return;
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const base = NODE_KEYS.filter(k => k !== active);
        const baseAngle = {};
        base.forEach((k, i) => { baseAngle[k] = (Math.PI * 2 * i) / base.length - Math.PI / 2; });

        // Polar form of each node's flat-square target (pivot = viewBox center).
        const sqPolar = {};
        NODE_KEYS.forEach(k => {
            sqPolar[k] = { r: Math.hypot(SQUARE[k].x - CX, SQUARE[k].y - CY), a: Math.atan2(SQUARE[k].y - CY, SQUARE[k].x - CX) };
        });

        let raf = 0;
        let running = true;
        const t0 = performance.now();
        // Binary, self-easing dock: scroll only flips `target` (at THRESHOLD, either
        // direction); `p` then eases the whole way to it, so it never hovers mid-morph.
        let p = 0, target = 0, animFrom = 0, animStart = t0;

        const frame = () => {
            raf = 0;
            if (!running) return;
            const now = performance.now();
            const theta = reduce ? 0 : OMEGA * (now - t0) / 1000;

            const vw = window.innerWidth, vh = window.innerHeight;
            const rect = holder.getBoundingClientRect();
            const leftCol = rect.left;              // left margin = width of the left column
            const canDock = !(vw < 768 || leftCol < DOCKED_W + 2 * EDGE_GAP);

            // Commit to docked/inline once raw scroll progress crosses THRESHOLD, then ease.
            const rawP = Math.max(0, Math.min(1, ((NAV_H + GAP + TRAVEL) - rect.top) / TRAVEL));
            const newTarget = (canDock && rawP >= THRESHOLD) ? 1 : 0;
            if (newTarget !== target) { animFrom = p; animStart = now; target = newTarget; }
            p = reduce ? target : animFrom + (target - animFrom) * easeInOut(Math.min(1, (now - animStart) / DOCK_DURATION));

            // --- external morph: slide/shrink into the left column, driven by eased p ---
            if (!canDock) {
                holder.classList.remove('is-interactive');
                holder.style.height = '';
                svg.style.transform = '';
                svg.style.width = '';
            } else {
                holder.classList.add('is-interactive');
                const inlineX = rect.left + (rect.width - NAT_W) / 2; // centered in the content column
                const dockX = (leftCol - DOCKED_W) / 2;              // centered in the left column
                const dockY = NAV_H + DOCK_VFRAC * (vh - NAV_H) - DOCKED_H / 2; // 0.25 of the nav→bottom span
                svg.style.width = NAT_W + 'px';
                svg.style.transform =
                    `translate3d(${lerp(inlineX, dockX, p).toFixed(1)}px, ${lerp(rect.top, dockY, p).toFixed(1)}px, 0) scale(${lerp(1, DOCK_SCALE, p).toFixed(3)})`;
                holder.style.height = (NAT_H * (1 - p)).toFixed(1) + 'px';
            }

            // --- internal morph: pyramid (p=0) → flat square (p=1), rotating in polar ---
            const pos = {}, lop = {};
            NODE_KEYS.forEach(k => {
                let px, py, front;
                if (k === active) { px = APEX.x; py = APEX.y; front = 1; }
                else {
                    const a = baseAngle[k] + theta;
                    px = BASE_CX + BASE_RX * Math.cos(a);
                    py = BASE_CY + BASE_RY * Math.sin(a);
                    front = (Math.sin(a) + 1) / 2; // 0 back … 1 front
                }
                // Affine reorientation: interpolate radius + angle about the center so the
                // points rotate into their square corners instead of sliding across.
                const r0 = Math.hypot(px - CX, py - CY), a0 = Math.atan2(py - CY, px - CX);
                const r = lerp(r0, sqPolar[k].r, p), aa = lerpAngle(a0, sqPolar[k].a, p);
                const x = CX + r * Math.cos(aa), y = CY + r * Math.sin(aa);
                const offP = (k === active) ? { ox: 0, oy: -16 } : { ox: 0, oy: 18 };
                const offS = { ox: SQUARE[k].lx - SQUARE[k].x, oy: SQUARE[k].ly - SQUARE[k].y };
                pos[k] = { x, y, lx: x + lerp(offP.ox, offS.ox, p), ly: y + lerp(offP.oy, offS.oy, p) };
                lop[k] = lerp(lerp(FADE_MIN, 1, front), 1, p);
            });

            NODE_KEYS.forEach(k => {
                const c = circleRefs.current[k], h = hitRefs.current[k], t = labelRefs.current[k], pk = pos[k];
                if (c) { c.setAttribute('cx', pk.x.toFixed(1)); c.setAttribute('cy', pk.y.toFixed(1)); }
                if (h) { h.setAttribute('cx', pk.x.toFixed(1)); h.setAttribute('cy', pk.y.toFixed(1)); }
                if (t) { t.setAttribute('x', pk.lx.toFixed(1)); t.setAttribute('y', pk.ly.toFixed(1)); t.style.opacity = lop[k].toFixed(2); }
            });
            // Edge appearance is static (CSS: pink = current-vertex, solid = real,
            // dashed = structural); only the endpoints animate.
            EDGES.forEach(({ e }) => {
                const line = edgeRefs.current[ekey(e)];
                if (!line) return;
                const A = pos[e[0]], B = pos[e[1]];
                line.setAttribute('x1', A.x.toFixed(1)); line.setAttribute('y1', A.y.toFixed(1));
                line.setAttribute('x2', B.x.toFixed(1)); line.setAttribute('y2', B.y.toFixed(1));
            });

            // Keep looping while the transition is easing or the inline pyramid spins;
            // once it settles docked (or reduced-motion), stop and wait for a scroll kick.
            const animating = Math.abs(p - target) > 0.001;
            const rotating = !reduce && target === 0;
            if (running && (animating || rotating)) raf = requestAnimationFrame(frame);
        };

        frame();

        const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
        window.addEventListener('scroll', kick, { passive: true });
        window.addEventListener('resize', kick);
        const onVis = () => { running = document.visibilityState !== 'hidden'; if (running && !reduce) kick(); };
        document.addEventListener('visibilitychange', onVis);

        return () => {
            running = false;
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener('scroll', kick);
            window.removeEventListener('resize', kick);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [active]);

    const hrefFor = (key) => {
        const route = ROUTE[key];
        return route === 'home' ? buildPath({ name: 'home' }, lang) : buildPath({ name: route, slug: null }, lang);
    };
    const go = (e, key) => {
        e.preventDefault();
        const l = splitPath(window.location.pathname).lang;
        const route = ROUTE[key];
        navigate(route === 'home' ? buildPath({ name: 'home' }, l) : buildPath({ name: route, slug: null }, l));
    };

    // SSR / no-JS render = the flat square (accessible fallback; JS morphs it).
    return (
        <div className="nd-holder" ref={holderRef}>
            <svg
                className="network-diagram"
                ref={svgRef}
                viewBox="0 0 320 288"
                role="img"
                aria-label={`The UR network — Subnet, Operators, Miners and Validators — with ${active} highlighted`}
            >
                <g className="nd-edges">
                    {EDGES.map(({ e, mv }) => {
                        const A = SQUARE[e[0]], B = SQUARE[e[1]];
                        return (
                            <line
                                key={ekey(e)}
                                ref={el => (edgeRefs.current[ekey(e)] = el)}
                                className={`nd-edge ${mv ? 'nd-edge-open' : 'nd-edge-real'} ${!mv && (e[0] === active || e[1] === active) ? 'is-active' : ''}`}
                                x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                            />
                        );
                    })}
                </g>
                <g className="nd-nodes">
                    {NODE_KEYS.map(key => {
                        const sq = SQUARE[key];
                        return (
                            <a
                                key={key}
                                href={hrefFor(key)}
                                onClick={e => go(e, key)}
                                className={`nd-node ${key === active ? 'is-active' : ''}`}
                                aria-label={`Go to ${LABEL[key]}`}
                            >
                                <circle className="nd-hit" ref={el => (hitRefs.current[key] = el)} cx={sq.x} cy={sq.y} r={24} />
                                <circle ref={el => (circleRefs.current[key] = el)} cx={sq.x} cy={sq.y} r={key === active ? 9 : 6} />
                                <text className="nd-label" ref={el => (labelRefs.current[key] = el)} x={sq.lx} y={sq.ly} textAnchor="middle">{LABEL[key]}</text>
                            </a>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
}
