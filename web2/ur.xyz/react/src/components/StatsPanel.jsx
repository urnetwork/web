import React, { useEffect, useRef, useState } from 'react';
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

// Stat values glide between readings: a 2s ease-in-out count from the old
// number to the new one.
const COUNT_MS = 2000;
const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Count interpolation runs in each quantity's integer sub-unit — the
// underlying whole thing being counted — and the stat's own formatter
// rounds it for display as it normally would. Data is a byte quantity
// published in GiB, so it counts in whole bytes; α amounts count in
// hundredths (the displayed precision); plain counts in whole units.
const GIB_BYTES = 2 ** 30;
const CENTI = 100;

/**
 * useCountUp
 *
 * Animate a stat between readings: whenever `target` moves, the returned
 * value counts from the currently shown number to the new one over 2s
 * with ease-in-out pacing. Interpolation is rounded to the quantity's
 * integer sub-unit (`scale` sub-units per displayed unit, e.g. bytes for
 * the GiB stat), so the count moves through real quantities — never
 * float tails — while the display's normal rounding does the rest; the
 * final frame lands on the exact target.
 *
 * It snaps (no count) when there is nothing sensible to count through:
 * the first reading after mount (— → value, and the block clock's
 * hydration correction from its fixed initial render), a change smaller
 * than one sub-unit, or when the visitor prefers reduced motion.
 */
function useCountUp(target, scale = 1) {
    const [display, setDisplay] = useState(target);
    const ref = useRef({ shown: target, raf: 0, mounted: false, changes: 0 });

    useEffect(() => {
        const s = ref.current;
        const from = s.shown;
        cancelAnimationFrame(s.raf);
        s.raf = 0;

        if (!s.mounted) {
            // Mount pass: the initial value is already displayed.
            s.mounted = true;
            return undefined;
        }
        if (target === from) return undefined;
        s.changes += 1;

        const reduceMotion =
            typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const snap =
            target == null ||
            from == null ||
            s.changes === 1 ||
            Math.round(target * scale) === Math.round(from * scale) ||
            reduceMotion;

        if (snap) {
            s.shown = target;
            setDisplay(target);
            return undefined;
        }

        const start = performance.now();
        const tick = (now) => {
            const t = Math.min(1, (now - start) / COUNT_MS);
            if (t >= 1) {
                s.shown = target;
                s.raf = 0;
                setDisplay(target);
                return;
            }
            const v = Math.round((from + (target - from) * easeInOutCubic(t)) * scale) / scale;
            s.shown = v;
            setDisplay(v);
            s.raf = requestAnimationFrame(tick);
        };
        s.raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(s.raf);
    }, [target, scale]);

    return display;
}

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
    const reflowRef = useRef(false);
    const { t } = useLanguage();

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const NAV_H = 64;
        const DETACHED_W = 320;
        const DETACHED_GAP = 24;
        const STICKY_TOP = NAV_H;

        // The disclaimer bar (shown while the page is scrolled to the top)
        // pushes the nav down one row; the detached panel hangs from the
        // real nav bottom or it renders under the nav's price pill — which
        // would also swallow taps meant for the panel's refresh dial. The
        // sticky pin needs no offset: the ticker only exists deep in the
        // page, where the disclaimer is always hidden.
        const detachedTop = NAV_H * (disclaimerVisible ? 2 : 1) + DETACHED_GAP;

        // This effect re-runs when the disclaimer flips; ease the panel to
        // its new resting spot in step with the nav's own 0.3s slide (the
        // very first run positions it without animating).
        let reflowTimer = 0;
        if (reflowRef.current) {
            el.classList.add('is-reflowing');
            reflowTimer = setTimeout(() => el.classList.remove('is-reflowing'), 320);
        }
        reflowRef.current = true;

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
            clearTimeout(reflowTimer);
            el.classList.remove('is-reflowing');
        };
    }, [anchorId, disclaimerVisible]);

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
            <RefreshIndicator
                fetching={network ? !!network.fetching : false}
                lastAt={network ? network.lastAt : null}
                nextAt={network ? network.nextAt : null}
                onRefresh={network ? network.refresh : undefined}
                label={t.stats.refresh}
            />

            <div className="stats-panel-header">
                <span className="stats-panel-eyebrow">{t.stats.protocolLedger}</span>
            </div>

            <div className="stat-grid">
                <Stat label={t.stats.blockNumber}      value={block ? block.number : 1}                   format={(n) => `#${n}`} tone="ur"                       />
                <Stat label={t.stats.dataPerBlock}     value={totals ? totals.dataGib : null}             format={fmt}            tone="data"  scale={GIB_BYTES} />
                <Stat label={t.stats.usersPerBlock}    value={totals ? totals.users : null}               format={fmtInt}         tone="usd"                      />
                <Stat label={t.stats.totalNetworks}    value={totals ? totals.totalNetworks : null}       format={fmtInt}         tone="white"                    />
                <Stat label={t.stats.stakedInContract} value={totals ? totals.stakedAlpha : null}         format={fmt}            tone="ur"    scale={CENTI}     />
                <Stat label={t.stats.demandDeposits}   value={totals ? totals.demandDepositsAlpha : null} format={fmt}            tone="ur"    scale={CENTI}     />
                <Stat label={t.stats.minerEmissions}   value={totals ? totals.minerEmissionsAlpha : null} format={fmt}            tone="ur"    scale={CENTI}     />
                <Stat label={t.stats.networkOperators} value={network ? network.operators : 0}            format={fmtInt}         tone="white"                    />
            </div>
        </aside>
    );
}

function Stat({ label, value, format, scale, tone }) {
    const shown = useCountUp(value, scale);
    return (
        <div className="stat-box">
            <div className="stat-label">{label}</div>
            <div className={`stat-value tone-${tone}`}>{shown == null ? DASH : format(shown)}</div>
        </div>
    );
}

// The countdown dial's ring: r=5 in a 14×14 viewBox.
const RING_R = 5;
const RING_C = +(2 * Math.PI * RING_R).toFixed(3);
// A poll counts as slow — and the dial starts spinning — after 1s in flight.
const SLOW_FETCH_MS = 1000;

/**
 * RefreshIndicator
 *
 * The small dial in the panel's top-right corner:
 *
 *   • counting — a ring fills clockwise across the poll cycle; full means
 *     the next auto refresh is due. The fill is a CSS animation over the
 *     cycle duration, restarted each cycle by keying the arc on the
 *     cycle's end timestamp — no per-frame JS.
 *   • loading  — if a poll runs longer than 1s, the arc collapses to a
 *     short segment and spins until the poll answers, then the ring
 *     resets to empty and counts up again.
 *   • tap      — starts a poll immediately (ignored while one is already
 *     in flight); the cycle restarts from its completion.
 *
 * Before the first poll finishes (lastAt == null) the ring sits empty,
 * which also keeps the server render and hydration in agreement.
 */
function RefreshIndicator({ fetching, lastAt, nextAt, onRefresh, label }) {
    const [slow, setSlow] = useState(false);

    useEffect(() => {
        if (!fetching) {
            setSlow(false);
            return undefined;
        }
        const timer = setTimeout(() => setSlow(true), SLOW_FETCH_MS);
        return () => clearTimeout(timer);
    }, [fetching]);

    const cycleMs = lastAt != null && nextAt != null ? nextAt - lastAt : 0;

    return (
        <button
            type="button"
            className={`stats-refresh${slow ? ' is-loading' : ''}`}
            onClick={onRefresh}
            aria-label={label}
            title={label}
            aria-busy={fetching || undefined}
        >
            <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
                {/* rotate(-90): arcs start at 12 o'clock */}
                <g transform="rotate(-90 7 7)">
                    <circle className="stats-refresh-track" cx="7" cy="7" r={RING_R} />
                    {slow ? (
                        <circle
                            className="stats-refresh-arc"
                            cx="7" cy="7" r={RING_R}
                            strokeDasharray={`${+(RING_C * 0.3).toFixed(3)} ${RING_C}`}
                        />
                    ) : (
                        <circle
                            key={nextAt ?? 'idle'}
                            className="stats-refresh-arc"
                            cx="7" cy="7" r={RING_R}
                            strokeDasharray={RING_C}
                            strokeDashoffset={RING_C}
                            style={cycleMs > 0 ? {
                                '--ring-c': `${RING_C}px`,
                                animation: `stats-refresh-fill ${cycleMs}ms linear forwards`
                            } : undefined}
                        />
                    )}
                </g>
            </svg>
        </button>
    );
}
