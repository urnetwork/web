import React, { useEffect, useRef } from 'react';
import './StatsPanel.css';
import { useLanguage } from '../i18n';

const fmt = (num) =>
    Number(num || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

/**
 * StatsPanel
 *
 * The Protocol Ledger panel — a single element that lives through three
 * scroll-driven states. It morphs continuously between them; there is no
 * separate ticker component, this *is* the ticker once you've scrolled
 * past the whitepaper section.
 *
 *   • Detached  (p1 = 0, p2 = 0)
 *       Top-right dashboard floating over the simulation hero.
 *       width  = 320px
 *       top    = navHeight + 24
 *       left   = viewportWidth - width - 24
 *       columns = 2 (driven by auto-fit grid)
 *
 *   • Docked    (p1 = 1, p2 = 0)
 *       Centered banner anchored to the top of the whitepaper section,
 *       scrolling naturally with it until its top would slip above the nav.
 *       width  = min(880, viewportWidth - 64)
 *       top    = whitepaperRect.top + 24
 *       left   = (viewportWidth - width) / 2
 *
 *   • Sticky    (p1 = 1, p2 = 1)
 *       Pinned ticker bar — same height as the nav, full viewport width,
 *       chunky borders / shadow / padding shed and the header collapsed.
 *       width  = viewportWidth
 *       top    = navHeight
 *       left   = 0
 *
 * The dock → sticky morph (p2) begins the moment the docked panel's top
 * would otherwise drop above the nav. From there a fixed scroll range
 * smoothly expands the panel into its ticker form.
 *
 * On viewports below 768px the morph is disabled and a simpler horizontal
 * top-bar is rendered instead via CSS, since the morph depends on having
 * room to slide horizontally.
 */
export default function StatsPanel({ stats, anchorId = 'whitepaper' }) {
    const ref = useRef(null);
    const { t } = useLanguage();

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        let raf = 0;

        const NAV_H = 64;
        const DETACHED_W = 320;
        const DETACHED_GAP = 24;
        const STICKY_TOP = NAV_H;
        // Pixels of extra scroll over which the dock → sticky morph plays.
        const MORPH_RANGE = 240;

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
            let p1 = Math.max(0, Math.min(1, (startY - rect.top) / denom));

            const dockedW = Math.min(880, vw - 64);
            const dockedTop = rect.top + 24;

            let width;
            let top;
            let left;
            let p2 = 0;

            if (dockedTop > STICKY_TOP) {
                // Detached → docked. The original morph is unchanged.
                width = DETACHED_W + (dockedW - DETACHED_W) * p1;

                const detachedTop = NAV_H + DETACHED_GAP;
                const detachedLeft = vw - width - DETACHED_GAP;
                const dockedLeft = (vw - width) / 2;

                top = detachedTop * (1 - p1) + dockedTop * p1;
                left = detachedLeft * (1 - p1) + dockedLeft * p1;
            } else {
                // Docked → sticky/ticker. Pin to STICKY_TOP and grow the
                // panel out to viewport width as the user keeps scrolling.
                p1 = 1;
                p2 = Math.max(0, Math.min(1, (STICKY_TOP - dockedTop) / MORPH_RANGE));

                width = dockedW + (vw - dockedW) * p2;
                top = STICKY_TOP;
                left = (vw - width) / 2;
            }

            el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
            el.style.width = `${width}px`;
            el.style.setProperty('--p', p1.toFixed(3));
            el.style.setProperty('--q', p2.toFixed(3));
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
        };
    }, [anchorId]);

    return (
        <aside className="stats-panel" ref={ref} aria-label={t.stats.protocolLedger}>
            <div className="stats-panel-header">
                <span className="stats-panel-eyebrow">{t.stats.protocolLedger}</span>
            </div>

            <div className="stat-grid">
                <Stat label={t.stats.block}            value={`#${stats.blockHeight}`}                                       tone="ur"    />
                <Stat label={t.stats.totalFees}        value={fmt(stats.totalFeesUr)}                                        tone="ur"    />
                <Stat label={t.stats.totalData}        value={`${fmt(stats.dataPB)} PB`}                                     tone="data"  />
                <Stat label={t.stats.totalUsers}       value={Math.floor(stats.displayedNetworks).toLocaleString()}          tone="white" />
                <Stat label={t.stats.totalSupply}      value={fmt(stats.totalSupply)}                                        tone="white" />
                <Stat label={t.stats.totalDistributed} value={fmt(stats.urDistributed)}                                      tone="ur"    />
                <Stat label={t.stats.urAbsorbed}       value={fmt(stats.urAbsorbed)}                                         tone="burn"  />
                <Stat label={t.stats.statusHeld}       value={fmt(stats.totalHeldUr)}                                        tone="ur"    />
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
