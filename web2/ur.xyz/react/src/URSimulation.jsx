import React, { useEffect, useRef, useState } from 'react';
import './Simulation.css';
import { useLanguage } from './i18n';
import { blockEndAt, blockNumberAt } from './lib/network';

// Brand Constants mapped from the CSS variables
const COLORS = {
    ur: '#ED8FFF',
    usd: '#87FB67',
    prov: '#0039DE',
    bg: '#101010',
    white: '#F8F8F8',
    ui: '#D6E6F4'
};

const fmtAlpha = (n) =>
    Number(n || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

/**
 * Animate a displayed number toward `target` with an ease-out ramp each
 * time the target moves — the "counting up" of the block accumulators.
 * Returns null until the first real target arrives.
 */
function useCountUp(target) {
    const [display, setDisplay] = useState(null);
    const displayRef = useRef(0);
    const rafRef = useRef(0);

    useEffect(() => {
        if (target == null) return undefined;
        const from = displayRef.current;
        const start = performance.now();
        const DURATION = 900;

        cancelAnimationFrame(rafRef.current);
        const tick = (now) => {
            const p = Math.min(1, (now - start) / DURATION);
            const eased = 1 - Math.pow(1 - p, 3);
            const v = from + (target - from) * eased;
            displayRef.current = v;
            setDisplay(v);
            if (p < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target]);

    return display;
}

/**
 * A once-per-second wall clock, started client-side only (null during
 * SSR and the hydration render, so the static build stays deterministic).
 */
function useSecondTick() {
    const [now, setNow] = useState(null);
    useEffect(() => {
        const tick = () => setNow(Date.now());
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);
    return now;
}

/**
 * BlockToast
 *
 * Persistent progress card for the current block (7 days). The bar along
 * its top edge fills as the block elapses, the two accumulators count up
 * the miner emissions and demand deposits reported by the network
 * operators' feeds for the block so far, and a live countdown runs to
 * the block's end (always 00:00 UTC).
 */
function BlockToast({ block, network }) {
    const { t, code } = useLanguage();
    const totals = network ? network.totals : null;
    const emissions = useCountUp(totals ? totals.minerEmissionsAlpha : null);
    const deposits = useCountUp(totals ? totals.demandDepositsAlpha : null);
    const now = useSecondTick();

    if (!block) return null;
    const pct = block.progress * 100;

    // The countdown reads its own clock so the title, end date, and the
    // remaining time all agree to the second — including at rollover.
    let blockNumber = block.number;
    let countdown = null;
    if (now != null) {
        blockNumber = blockNumberAt(now);
        const end = blockEndAt(now);
        const left = Math.max(0, end - now);
        const endDate = new Date(end).toLocaleDateString(code, {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
        });
        countdown = t.sim.endsAt
            .replace('{date}', endDate)
            .replace('{d}', Math.floor(left / 86400000))
            .replace('{h}', Math.floor(left / 3600000) % 24)
            .replace('{m}', Math.floor(left / 60000) % 60)
            .replace('{s}', Math.floor(left / 1000) % 60);
    }

    return (
        <div className="block-toast" role="status" aria-label={t.sim.blockProgressAria}>
            <div className="block-toast-progress" aria-hidden="true">
                <span
                    className="block-toast-progress-fill"
                    style={{ width: `${pct.toFixed(3)}%` }}
                />
            </div>
            <div className="block-toast-head">
                <span className="block-toast-title">⚡ {t.sim.block} #{blockNumber}</span>
                <span className="block-toast-pct">{Math.floor(pct)}%</span>
            </div>
            <div className="block-toast-rows">
                <div className="block-toast-row">
                    <span className="block-toast-label">{t.stats.minerEmissions}</span>
                    <span className="block-toast-value is-ur">
                        {emissions == null ? '—' : fmtAlpha(emissions)}
                    </span>
                </div>
                <div className="block-toast-row">
                    <span className="block-toast-label">{t.stats.demandDeposits}</span>
                    <span className="block-toast-value is-ur">
                        {deposits == null ? '—' : fmtAlpha(deposits)}
                    </span>
                </div>
            </div>
            {/* aria-hidden: a per-second text change inside a role="status"
                live region would be announced continuously. */}
            {countdown && (
                <div className="block-toast-countdown" aria-hidden="true">
                    {countdown}
                </div>
            )}
        </div>
    );
}

/**
 * URSimulation
 *
 * The canvas fills its parent container. The animation is decorative
 * rhythm — demand flowing in from users, deposits staking into the
 * contract, emission pulsing out to the providers — at a fixed, alive
 * cadence. It carries no synthetic statistics: the one real magnitude in
 * the scene is the contract pool, whose size tracks the staked α the
 * operators' feeds report. Every figure lives in the StatsPanel and the
 * BlockToast, fed by the same feeds.
 */
export default function URSimulation({ block, network }) {
    const canvasRef = useRef(null);
    const wrapperRef = useRef(null);
    // The animation loop reads the live totals through a ref so the canvas
    // effect never re-runs when a poll lands.
    const networkRef = useRef(network);
    networkRef.current = network;

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        let width, height, globeRadius, rotation = 0, distTimer = 0;
        let providers = [], users = [], particles = [], bolts = [];
        let currentRadius = 4;
        let globeCenterX, globeCenterY;

        const hubs = {
            ops: { x: 0, y: 0, label: "OPS" },
            protocol: { x: 0, y: 0, label: "PROTOCOL" }
        };

        function init() {
            // Fill the wrapper, not the whole window. Honors device pixel ratio
            // for sharper rendering on retina screens.
            const rect = wrapper.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = Math.max(1, Math.floor(rect.width));
            height = Math.max(1, Math.floor(rect.height));

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const isMobile = width < 768;

            if (isMobile) {
                globeRadius = Math.min(width, height) * 0.3;
                globeCenterX = width * 0.5; globeCenterY = height * 0.70;
                hubs.ops.x = width * 0.25; hubs.ops.y = height * 0.35;
                hubs.protocol.x = width * 0.75; hubs.protocol.y = height * 0.35;
            } else {
                globeRadius = Math.min(width, height) * 0.35;
                globeCenterX = width * 0.62; globeCenterY = height * 0.5;
                hubs.ops.x = width * 0.1; hubs.ops.y = height * 0.5;
                hubs.protocol.x = width * 0.25; hubs.protocol.y = height * 0.5;
            }

            if (providers.length === 0) {
                const count = 160;
                for (let i = 0; i < count; i++) {
                    const phiP = Math.acos(-1 + (2 * i) / count);
                    const thetaP = Math.sqrt(count * Math.PI) * phiP;
                    providers.push({ phi: phiP, theta: thetaP, id: i, excite: 0, balance: 0 });

                    const phiU = Math.acos(-1 + (2 * (i + 0.5)) / count);
                    const thetaU = Math.sqrt(count * Math.PI) * phiU;
                    users.push({ phi: phiU, theta: thetaU, id: i, balance: 0, glow: 0 });
                }
            }
        }

        function project(phi, theta, rot) {
            const x = Math.sin(phi) * Math.cos(theta + rot);
            const y = Math.cos(phi);
            const z = Math.sin(phi) * Math.sin(theta + rot);
            return { x: globeCenterX + x * globeRadius, y: globeCenterY + y * globeRadius, z: z, visible: z > 0 };
        }

        function spawn(s, eType, eIdx, color, type, spd, val) {
            particles.push({ s, eType, eIdx, color, type, p: 0, spd, val, trail: [] });
        }

        function createHop(currentIdx, color, hopsLeft) {
            if (hopsLeft <= 0) return;
            providers[currentIdx].excite = 1.0;
            let targetIdx = (currentIdx + Math.floor(Math.random() * 20) + 1) % providers.length;
            bolts.push({
                startIdx: currentIdx, endIdx: targetIdx,
                color, life: 1.0, decay: 0.04,
                onComplete: () => createHop(targetIdx, color, hopsLeft - 1)
            });
        }

        function animate() {
            ctx.fillStyle = COLORS.bg;
            ctx.fillRect(0, 0, width, height);
            rotation += 0.002;

            // Demand: users buying data via OPS. A fixed cadence — the
            // flows are texture, not statistics.
            if (Math.random() < 0.25) {
                const randomUser = users[Math.floor(Math.random() * users.length)];
                spawn(randomUser, 'ops', null, COLORS.usd, 'usd', 0.015, 0);
                randomUser.balance += 0.5;
                const randomProviderIdx = Math.floor(Math.random() * providers.length);
                spawn(randomUser, 'provider', randomProviderIdx, COLORS.prov, 'data', 0.015, 0);
            }

            // Ops -> Protocol: demand deposits headed for the contract.
            if (Math.random() < 0.1) spawn(hubs.ops, 'protocol', null, COLORS.ur, 'ur', 0.012, 0);

            // Direct User -> Protocol deposits; frequent buyers glow.
            if (Math.random() < 0.08) {
                const randomUser = users[Math.floor(Math.random() * users.length)];
                const discountFactor = Math.min(0.9, randomUser.balance * 0.05);
                spawn(randomUser, 'protocol', null, COLORS.ur, 'ur_direct', 0.015, 0);
                if (discountFactor > 0.2) randomUser.glow = 1.0;
            }

            // The one real magnitude in the scene: the contract pool is
            // sized from the α the operators report staked, on a log scale
            // so early stake reads while heavy stake can't blow the
            // composition (saturates around 10M α).
            const totals = networkRef.current ? networkRef.current.totals : null;
            const stakedAlpha = totals ? totals.stakedAlpha : 0;
            const maxRadius = Math.min(globeRadius * 0.6, 80);
            const stakedNorm = Math.min(1, Math.log10(1 + stakedAlpha) / 7);
            const targetRadius = 4 + (maxRadius - 4) * stakedNorm;
            currentRadius += (targetRadius - currentRadius) * 0.08;

            // Emission pulse: a periodic wave from the contract out to the
            // providers. The small fixed value lets the dots breathe
            // without inventing a statistic.
            distTimer++;
            if (distTimer > 400) {
                providers.forEach((p, i) => {
                    if (Math.random() > 0.8) spawn(hubs.protocol, 'provider', i, COLORS.ur, 'dist', 0.005, 6);
                });
                distTimer = 0;
            }

            // Drawing Protocol Hub
            ctx.beginPath(); ctx.arc(hubs.protocol.x, hubs.protocol.y, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.bg; ctx.fill();
            ctx.strokeStyle = COLORS.ur; ctx.lineWidth = 2;
            ctx.shadowBlur = currentRadius * 0.5; ctx.shadowColor = COLORS.ur;
            ctx.stroke(); ctx.shadowBlur = 0;

            // Drawing Globe Providers & Users
            providers.forEach(p => {
                const pos = project(p.phi, p.theta, rotation);
                if (pos.visible) {
                    const totalSize = 1.5 + (Math.sqrt(p.balance) * 0.8) + (p.excite * 4);
                    ctx.fillStyle = p.excite > 0.1 ? '#4d7cff' : COLORS.prov;
                    ctx.globalAlpha = 0.6 + p.excite * 0.4;
                    ctx.beginPath(); ctx.arc(pos.x, pos.y, totalSize, 0, Math.PI * 2); ctx.fill();
                    ctx.globalAlpha = 1;
                }
                p.excite *= 0.92; p.balance *= 0.999;
            });

            users.forEach(u => {
                const pos = project(u.phi, u.theta, rotation);
                if (pos.visible) {
                    const totalSize = 1.2 + (Math.sqrt(u.balance) * 0.6);
                    ctx.fillStyle = COLORS.white; ctx.globalAlpha = 0.5;
                    ctx.beginPath(); ctx.arc(pos.x, pos.y, totalSize, 0, Math.PI * 2); ctx.fill();
                    ctx.globalAlpha = 1;

                    if (u.glow && u.glow > 0.01) {
                        ctx.fillStyle = COLORS.ur; ctx.globalAlpha = u.glow * 0.9;
                        ctx.beginPath(); ctx.arc(pos.x, pos.y, totalSize * 0.8, 0, Math.PI * 2); ctx.fill();
                        ctx.globalAlpha = 1;
                    }
                }
                u.balance *= 0.999;
                if (u.glow !== undefined) u.glow *= 0.93;
            });

            // Drawing Bolts
            bolts = bolts.filter(b => {
                const p1 = project(providers[b.startIdx].phi, providers[b.startIdx].theta, rotation);
                const p2 = project(providers[b.endIdx].phi, providers[b.endIdx].theta, rotation);
                if (p1.visible && p2.visible) {
                    ctx.beginPath(); ctx.strokeStyle = b.color; ctx.globalAlpha = b.life * 0.5;
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo((p1.x + p2.x) / 2 + (Math.random() - 0.5) * 15, (p1.y + p2.y) / 2 + (Math.random() - 0.5) * 15);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke(); ctx.globalAlpha = 1;
                }
                b.life -= b.decay; return b.life > 0;
            });

            // Drawing Particles
            particles = particles.filter(pt => {
                pt.p += pt.spd;

                if (pt.type === 'stake') {
                    // A deposit locking into the contract: a shimmer that
                    // collapses from the pool's rim to its center.
                    const r = currentRadius * (1 - pt.p);
                    const angle = Math.random() * Math.PI * 2;
                    ctx.beginPath(); ctx.arc(hubs.protocol.x + Math.cos(angle) * r, hubs.protocol.y + Math.sin(angle) * r, 2, 0, Math.PI * 2);
                    ctx.fillStyle = COLORS.ur; ctx.fill();
                    return pt.p < 1;
                }

                let startPos = pt.s.phi !== undefined ? project(pt.s.phi, pt.s.theta, rotation) : pt.s;
                let endPos = pt.eType === 'ops' ? hubs.ops : (pt.eType === 'protocol' ? hubs.protocol : project(providers[pt.eIdx].phi, providers[pt.eIdx].theta, rotation));

                const cx = startPos.x + (endPos.x - startPos.x) * pt.p;
                const cy = startPos.y + (endPos.y - startPos.y) * pt.p;
                pt.trail.push({ x: cx, y: cy });
                if (pt.trail.length > 10) pt.trail.shift();

                ctx.beginPath(); ctx.strokeStyle = pt.color;
                pt.trail.forEach((pos, i) => {
                    ctx.globalAlpha = i / pt.trail.length;
                    i === 0 ? ctx.moveTo(pos.x, pos.y) : ctx.lineTo(pos.x, pos.y);
                });
                ctx.stroke(); ctx.globalAlpha = 1;

                if (pt.p >= 1) {
                    if (pt.type === 'ur' || pt.type === 'ur_direct') {
                        // A deposit locking into the contract — the shimmer
                        // is the visual; the pool's size tracks the feeds.
                        for (let k = 0; k < 2; k++) spawn(hubs.protocol, 'protocol', null, COLORS.ur, 'stake', 0.01, 0);
                    }
                    if (pt.type === 'data') {
                        createHop(pt.eIdx, COLORS.prov, 5);
                    }
                    if (pt.type === 'dist') {
                        providers[pt.eIdx].excite = 1.0;
                        providers[pt.eIdx].balance += pt.val;
                    }
                    return false;
                }
                return true;
            });

            // Hub Labels
            ctx.fillStyle = COLORS.ui; ctx.font = 'bold 10px "PPNeueMontreal", sans-serif'; ctx.textAlign = 'center';
            ctx.fillText("OPS", hubs.ops.x, hubs.ops.y - 12);
            ctx.fillStyle = COLORS.ur;
            ctx.fillText("PROTOCOL", hubs.protocol.x, hubs.protocol.y - (currentRadius + 10));

            animationFrameId = requestAnimationFrame(animate);
        }

        // Boot
        const ro = new ResizeObserver(init);
        ro.observe(wrapper);
        init();
        animate();

        return () => {
            ro.disconnect();
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="simulation-wrapper" ref={wrapperRef}>
            <canvas ref={canvasRef} className="sim-canvas"></canvas>
            <BlockToast block={block} network={network} />
        </div>
    );
}
