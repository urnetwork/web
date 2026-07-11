import React, { useEffect, useRef } from 'react';
import './StatsPanel.css';
import { useLanguage } from '../i18n';

const fmt = (num) =>
    Number(num || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

const fmtInt = (num) => Math.floor(Number(num || 0)).toLocaleString();

// Placeholder while no operator feed has answered yet.
const DASH = '—';

/**
 * StatsPanel
 *
 * The Protocol Ledger panel — a single element that lives through three
 * scroll states. The two moves are deliberately different in feel:
 *
 *   1. Detached → Docked is a *continuous, scroll-linked* morph (--p / p1).
 *   2. Docked → Sticky is a *one-shot snap* — a self-contained ease-in-out
 *      animation that fires once the scroll crosses a threshold, never a
 *      frame-by-frame scrub. So if you stop scrolling mid-way it is never
 *      caught half-transitioned: it is always either the banner or the
 *      ticker, and it settles under slow-in/slow-out easing.
 *
 *   • Detached  (p1 = 0)    top-right dashboard over the hero      (320px)
 *   • Docked    (p1 = 1)    centered banner at the whitepaper top  (≤880px)
 *   • Sticky    (--q = 1)   full-width ticker pinned under the nav (100vw)
 *
 * The snap is a latched boolean guarded by hysteresis so it cannot chatter
 * at the boundary. We measure how far the docked banner has pushed past the
 * nav as a 0→1 progress centred on the pin line (0.5 = the banner's top is
 * exactly at the nav). It flips to the ticker only past 0.5 + HYST and back
 * to the banner only below 0.5 − HYST — i.e. the scroll has to travel a bit
 * beyond the trigger in either direction before anything happens. The snap
 * itself is a CSS transition toggled on only for its duration via the
 * `is-snapping` class; --q (registered with @property) drives every bit of
 * the ticker restyling and eases across with it.
 *
 * On viewports below 768px the whole thing is disabled and CSS renders a
 * simple pinned top-bar instead.
 */
export default function StatsPanel({ block, network, anchorId = 'whitepaper', disclaimerVisible = false }) {
    const ref = useRef(null);
    const { t } = useLanguage();

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const NAV_H = 64;
        const DETACHED_W = 320;
        const DETACHED_GAP = 24;
        const STICKY_TOP = NAV_H;

        // Docked → sticky one-shot snap.
        const SNAP_MS = 450;   // slow-in/slow-out duration of the snap
        const HYST = 0.25;     // normalized hysteresis on either side of the trigger
        const ZONE = 160;      // px height of the transition zone (maps to 0→1)

        // Single source of truth for the snap duration; the CSS transition
        // reads it back via var(--snap-ms).
        el.style.setProperty('--snap-ms', `${SNAP_MS}ms`);

        let raf = 0;
        let sticky = false;      // latched banner (false) ↔ ticker (true)
        let prevSticky = false;
        let snapTimer = 0;
        let first = true;        // never animate the very first layout pass

        const update = () => {
            raf = 0;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // Mobile: bail out, CSS handles positioning.
            if (vw < 768) {
                el.style.transform = '';
                el.style.width = '';
                el.style.setProperty('--p', '0');
                el.style.setProperty('--q', '0');
                el.classList.remove('is-snapping');
                sticky = false;
                prevSticky = false;
                return;
            }

            const anchor = document.getElementById(anchorId);
            if (!anchor) return;
            const rect = anchor.getBoundingClientRect();

            // p1: 0 when whitepaper is fully below the fold,
            //     1 when its top reaches just below the nav.
            const startY = vh - 80;
            const endY = NAV_H + 80;
            const denom = Math.max(1, startY - endY);
            const p1 = Math.max(0, Math.min(1, (startY - rect.top) / denom));

            const dockedW = Math.min(880, vw - 64);
            const dockedTop = rect.top + 24;

            // Docked → sticky as a hysteresis latch rather than a scrubbed
            // morph. `progress` is 0.5 exactly when the banner's top meets the
            // nav, rising above as you scroll past and falling below as you
            // scroll back. Flip only once you're HYST beyond the midpoint, so
            // the state can't oscillate at the trigger point.
            const past = STICKY_TOP - dockedTop;
            const progress = Math.max(0, Math.min(1, 0.5 + past / ZONE));
            if (progress >= 0.5 + HYST) sticky = true;
            else if (progress <= 0.5 - HYST) sticky = false;

            let width;
            let top;
            let left;

            if (sticky) {
                // Ticker: pinned under the nav, full viewport width.
                width = vw;
                top = STICKY_TOP;
                left = 0;
            } else {
                // Detached → docked. Continuous, scroll-linked morph (unchanged).
                width = DETACHED_W + (dockedW - DETACHED_W) * p1;

                const detachedTop = NAV_H + DETACHED_GAP;
                const detachedLeft = vw - width - DETACHED_GAP;
                const dockedLeft = (vw - width) / 2;

                top = detachedTop * (1 - p1) + dockedTop * p1;
                left = detachedLeft * (1 - p1) + dockedLeft * p1;

                // Hold the banner at the nav while it waits in the dead zone,
                // so it never slides up underneath it before snapping.
                top = Math.max(STICKY_TOP, top);
            }

            // Animate only at the instant the latch flips — one ease-in-out
            // snap, switched on just long enough to play, then off again so
            // the detached → docked morph stays crisply scroll-linked.
            if (sticky !== prevSticky) {
                if (!first) {
                    el.classList.add('is-snapping');
                    clearTimeout(snapTimer);
                    snapTimer = setTimeout(
                        () => el.classList.remove('is-snapping'),
                        SNAP_MS + 60
                    );
                }
                prevSticky = sticky;
            }

            el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
            el.style.width = `${width}px`;
            el.style.setProperty('--p', p1.toFixed(3));
            el.style.setProperty('--q', sticky ? '1' : '0');
            first = false;
        };

        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', update);
            if (raf) cancelAnimationFrame(raf);
            clearTimeout(snapTimer);
        };
    }, [anchorId]);

    // Everything except the block clock and the operator count comes from
    // the operators' feeds; until at least one feed answers those fields
    // show a placeholder.
    const totals = network ? network.totals : null;

    return (
        <aside
            className={`stats-panel ${disclaimerVisible ? 'stats-panel-below-disclaimer' : ''}`}
            ref={ref}
            aria-label={t.stats.protocolLedger}
        >
            <div className="stats-panel-header">
                <span className="stats-panel-eyebrow">{t.stats.protocolLedger}</span>
            </div>

            <div className="stat-grid">
                <Stat label={t.stats.blockNumber}      value={`#${block ? block.number : 1}`}                    tone="ur"    />
                <Stat label={t.stats.dataPerBlock}     value={totals ? fmt(totals.dataGib) : DASH}               tone="data"  />
                <Stat label={t.stats.usersPerBlock}    value={totals ? fmtInt(totals.users) : DASH}              tone="usd"   />
                <Stat label={t.stats.totalNetworks}    value={totals ? fmtInt(totals.totalNetworks) : DASH}      tone="white" />
                <Stat label={t.stats.stakedInContract} value={totals ? fmt(totals.stakedAlpha) : DASH}           tone="ur"    />
                <Stat label={t.stats.demandDeposits}   value={totals ? fmt(totals.demandDepositsAlpha) : DASH}   tone="ur"    />
                <Stat label={t.stats.minerEmissions}   value={totals ? fmt(totals.minerEmissionsAlpha) : DASH}   tone="ur"    />
                <Stat label={t.stats.networkOperators} value={fmtInt(network ? network.operators : 0)}           tone="white" />
            </div>
        </aside>
    );
}

function Stat({ label, value, tone }) {
    return (
        <div className="stat-box">
            <div className="stat-label">{label}</div>
            <div className={`stat-value tone-${tone}`}>{value}</div>
        </div>
    );
}
