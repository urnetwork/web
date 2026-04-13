import React, { useEffect, useRef, useState } from 'react';
import './Simulation.css';

// Brand Constants mapped from the CSS variables
const COLORS = {
    ur: '#ED8FFF',
    usd: '#87FB67',
    prov: '#0039DE',
    bg: '#101010',
    white: '#F8F8F8',
    ui: '#D6E6F4',
    burn: '#FF6C58',
    burnDark: '#421006'
};

/**
 * URSimulation
 *
 * The canvas fills its parent container (no longer the full viewport).
 * Stats are pushed to the parent via the `onStats` callback so they can be
 * rendered by an external StatsPanel that animates independently from the
 * simulation as the user scrolls.
 *
 * Toasts (block payout flashes) remain owned by the simulation since they
 * are part of the visual rhythm of the canvas itself.
 */
export default function URSimulation({ onStats }) {
    const canvasRef = useRef(null);
    const wrapperRef = useRef(null);
    const onStatsRef = useRef(onStats);
    onStatsRef.current = onStats;

    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // Core Simulation State (kept inside effect to avoid strict-mode ghosts & stale closures)
        const stats = {
            totalFeesUr: 0, urDistributed: 0, urAbsorbed: 0,
            urCurrentPool: 0, blockHeight: 0, totalSupply: 10000000, dataPB: 0,
            totalNetworks: 250000, displayedNetworks: 250000, totalHeldUr: 0
        };

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

        function pushStats() {
            const diff = stats.totalNetworks - stats.displayedNetworks;
            if (Math.abs(diff) > 0.5) stats.displayedNetworks += diff * 0.08;
            else stats.displayedNetworks = stats.totalNetworks;

            if (onStatsRef.current) {
                onStatsRef.current({
                    totalFeesUr: stats.totalFeesUr,
                    dataPB: stats.dataPB,
                    displayedNetworks: stats.displayedNetworks,
                    blockHeight: stats.blockHeight,
                    totalSupply: stats.totalSupply,
                    urDistributed: stats.urDistributed,
                    urAbsorbed: stats.urAbsorbed,
                    totalHeldUr: stats.totalHeldUr
                });
            }
        }

        function triggerToast(amount, absorbed, blockFeesUr) {
            const id = Date.now() + Math.random();
            const toastData = { id, amount, absorbed, blockFeesUr, blockHeight: stats.blockHeight };

            setToasts(prev => [...prev, toastData]);

            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 4000);
        }

        function animate() {
            ctx.fillStyle = COLORS.bg;
            ctx.fillRect(0, 0, width, height);
            rotation += 0.002;

            const revenuePerBlockTarget = stats.totalNetworks * (60000000 / 9000000000);
            const valPerParticle = revenuePerBlockTarget / 100;

            // Logic: Demand (Users buying data via OPS)
            if (Math.random() < 0.25) {
                const randomUser = users[Math.floor(Math.random() * users.length)];
                const actualVal = valPerParticle * (0.5 + Math.random());
                spawn(randomUser, 'ops', null, COLORS.usd, 'usd', 0.015, actualVal);
                randomUser.balance += 0.5;
                const randomProviderIdx = Math.floor(Math.random() * providers.length);
                spawn(randomUser, 'provider', randomProviderIdx, COLORS.prov, 'data', 0.015, 0.05);
            }

            // Logic: Ops -> Protocol
            if (Math.random() < 0.1) spawn(hubs.ops, 'protocol', null, COLORS.ur, 'ur', 0.012, Math.random() * 250);

            // Logic: Direct User -> Protocol Payment
            if (Math.random() < 0.08 && stats.totalHeldUr > 0) {
                const randomUser = users[Math.floor(Math.random() * users.length)];
                const basePayment = 50 + Math.random() * 100;
                const discountFactor = Math.min(0.9, randomUser.balance * 0.05);
                let finalPayment = basePayment * (1 - discountFactor);

                finalPayment = Math.min(finalPayment, stats.totalHeldUr);
                stats.totalHeldUr -= finalPayment;

                spawn(randomUser, 'protocol', null, COLORS.ur, 'ur_direct', 0.015, finalPayment);

                if (discountFactor > 0.2) randomUser.glow = 1.0;
            }

            const targetRadius = 4 + Math.sqrt(stats.urCurrentPool / Math.PI) * 1.5;
            currentRadius += (targetRadius - currentRadius) * 0.08;

            // Distribution Logic
            distTimer++;
            if (distTimer > 400) {
                const payout = stats.urCurrentPool * 0.95;
                if (payout > 1) {
                    stats.urCurrentPool -= payout;
                    stats.urDistributed += payout;
                    stats.totalHeldUr += payout;
                    stats.blockHeight++;

                    // Network Growth
                    const N = stats.totalNetworks;
                    const CAP_9B = 9000000000;
                    let growth = 0;

                    if (N >= CAP_9B) stats.totalNetworks = CAP_9B;
                    else if (N < 3000000000) growth = Math.floor(N * (0.15 + Math.random() * 0.10));
                    else if (N < 4000000000) {
                        const p = (N - 3000000000) / 1000000000;
                        growth = Math.floor(N * (0.10 * (1 - p) + 0.01));
                    } else if (N < 5000000000) {
                        const p = (N - 4000000000) / 1000000000;
                        growth = Math.floor(N * (0.01 * (1 - p)));
                        if (growth < 1000) growth = 1000 + Math.floor(Math.random() * 5000);
                    } else {
                        growth = 5 + Math.floor(Math.random() * 20);
                    }
                    stats.totalNetworks += growth;

                    // Burn / Distribute
                    const absorbedAmount = payout * 0.025;
                    stats.urAbsorbed += absorbedAmount;
                    stats.totalSupply -= absorbedAmount;

                    const currentBlockFees = payout + absorbedAmount;
                    stats.totalFeesUr += currentBlockFees;

                    triggerToast(payout, absorbedAmount, currentBlockFees);

                    providers.forEach((p, i) => {
                        if (Math.random() > 0.8) spawn(hubs.protocol, 'provider', i, COLORS.ur, 'dist', 0.005, payout / 30);
                    });

                    for (let k = 0; k < 5; k++) spawn(hubs.protocol, 'protocol', null, COLORS.burn, 'absorb', 0.01, 0);
                }
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

                if (pt.type === 'absorb') {
                    const r = currentRadius * (1 - pt.p);
                    const angle = Math.random() * Math.PI * 2;
                    ctx.beginPath(); ctx.arc(hubs.protocol.x + Math.cos(angle) * r, hubs.protocol.y + Math.sin(angle) * r, 2, 0, Math.PI * 2);
                    ctx.fillStyle = COLORS.burn; ctx.fill();
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
                        stats.urCurrentPool += pt.val;
                    }
                    if (pt.type === 'data') {
                        stats.dataPB += pt.val;
                        createHop(pt.eIdx, COLORS.prov, 5);
                    }
                    if (pt.type === 'dist') {
                        providers[pt.eIdx].excite = 1.0;
                        providers[pt.eIdx].balance += pt.val;
                    }
                    pushStats();
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

            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className="payout-toast">
                        ⚡ BLOCK #{toast.blockHeight}<br />
                        {toast.amount.toFixed(2)} $UR DISTRIBUTED <br />
                        <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>
                            <span style={{ fontWeight: 'bold' }}>
                                {toast.blockFeesUr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $UR
                            </span> BLOCK FEES
                        </span><br />
                        <span style={{ fontSize: '0.85em', color: COLORS.burnDark }}>
                            ({toast.absorbed.toFixed(2)} Absorbed)
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
