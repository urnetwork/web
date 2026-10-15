import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseFeed, sumFeeds } from './epoch.js';

/**
 * Live network stats, aggregated from the network operators' public
 * grafana feeds.
 *
 * Each operator publishes a public stats JSON. Its windowed fields cover
 * the current settlement epoch (epoch.js) and its prev_* fields the epoch
 * before; the rest are cumulative or live:
 *
 *   {
 *     "epoch": 1,                        // the settlement epoch
 *     "epoch_start": 1791569340,         // its bounds: unix seconds...
 *     "epoch_end": 1792174140,
 *     "epoch_start_block": 9247228,      // ...and chain blocks
 *     "epoch_end_block": 9297628,
 *     "users": 125000,                   // users served this epoch (unique top-level clients)
 *     "data_gib": 812345.5,              // data transferred this epoch (GiB)
 *     "demand_deposits_alpha": 1234.5,   // demand deposits this epoch (α)
 *     "miner_emissions_alpha": 5678.9,   // miner emission captured this epoch (α)
 *     "prev_users": 118000,              // ...and the same for the last
 *     "prev_data_gib": 1012345.5,        //    FINISHED epoch, the stable
 *     "prev_demand_deposits_alpha": 1100.5, // reference while the current
 *     "prev_miner_emissions_alpha": 5200.1, // one accumulates from zero
 *     "total_networks": 250000,          // total networks at the operator
 *     "staked_alpha": 250000.0,          // cumulative α staked in the contract
 *     "alpha_usd": 1.75,                 // the α price in USD, as the operator observes it
 *     "countries": 123,                  // countries with a connected valid provider
 *     "block": 1                         // deprecated alias of epoch
 *   }
 *
 * A feed without `epoch` is the older form: `block` there counts the
 * site's former 7-day blocks (Sundays 00:00 UTC from June 28, 2026), which
 * are not mainnet epochs, and the windowed fields cover those weeks. The
 * page never shows such a window as an epoch's: it runs the epoch clock
 * from the chain anchor (epoch.js) and leaves the windowed figures out.
 * `block` is never read.
 *
 * countries is informational (overlapping between operators, so never
 * summed here); ur.io's own site reads it from this same feed. The prev_*
 * fields are optional: they parse as null (not 0) when unpublished, so the
 * UI can hide the reference rather than misreport a zero.
 *
 * All fields are numeric; missing values remain null so the UI can clearly
 * distinguish unavailable data from a measured zero. The endpoint
 * is queried straight from the visitor's browser, so it must answer with
 * exactly one Access-Control-Allow-Origin — either * or an allowlist
 * reflection that includes this site's origin (ur.io serves the latter
 * from its lb; two values, e.g. an upstream * plus a proxy reflection,
 * fail the browser's cors check). The site sums every
 * reachable feed — except alpha_usd, where it takes the mean (see
 * usePrice.js; operators can source the pool price server-side, so this
 * works even when CoinGecko is unreachable from the browser).
 */
export const NETWORK_OPERATORS = [
    {
        name: 'ur.io',
        siteUrl: 'https://ur.io',
        appName: 'URnetwork',
        // The operator's public dashboards directory (read-only, no login)
        dashboardUrl: 'https://grafana.bringyour.com/stats',
        githubUrl: 'https://github.com/urnetwork',
        statsUrl: 'https://grafana.bringyour.com/stats.json',
        // Store listings for the operator's app. Stores whose listing isn't
        // published yet point at the operator's site until one exists.
        stores: {
            play: 'https://play.google.com/store/apps/details?id=com.bringyour.network',
            appStore: 'https://apps.apple.com/us/app/urnetwork/id6741000606',
            chrome: 'https://ur.io',
            firefox: 'https://ur.io',
            fdroid: 'https://f-droid.org/packages/com.bringyour.network/',
            github: 'https://github.com/urnetwork/build/releases',
            solanaMobile: 'https://ur.io',
            ethos: 'https://ur.io',
            wireguard: 'https://ur.io'
        }
    }
];

const CLOCK_TICK_MS = 30_000;
// Feed refresh: the hero simulation and stats read live totals, so poll
// every 5s (the operator feeds cache briefly server side, so this stays
// cheap for the operators).
const FEED_POLL_MS = 5_000;
const FEED_TIMEOUT_MS = 10_000;

/**
 * The wall clock (ms) the epoch display reads, ticking every `tickMs`
 * (30s by default; the epoch toast runs its own per-second one).
 *
 * It is null in the static build's server render and in the client's
 * first hydration render, so the two agree; the real time lands in an
 * effect on the very next tick.
 */
export function useClock(tickMs = CLOCK_TICK_MS) {
    const [now, setNow] = useState(null);

    useEffect(() => {
        const update = () => setNow(Date.now());
        update();
        const id = setInterval(update, tickMs);
        return () => clearInterval(id);
    }, [tickMs]);

    return now;
}

export async function fetchOperatorFeed(statsUrl, signal) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FEED_TIMEOUT_MS);
    const onOuterAbort = () => ctrl.abort();
    if (signal) signal.addEventListener('abort', onOuterAbort);
    try {
        const res = await fetch(statsUrl, { signal: ctrl.signal, mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return parseFeed(await res.json());
    } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onOuterAbort);
    }
}

/**
 * Every operator with its own live feed (not summed), refreshed every
 * 5s — [{ operator, feed }] in registry order, where feed is null
 * until the operator's stats endpoint answers and keeps the last good
 * value if a later poll fails.
 */
export function useOperatorFeeds() {
    const [rows, setRows] = useState(() =>
        NETWORK_OPERATORS.map(operator => ({ operator, feed: null }))
    );

    useEffect(() => {
        const ctrl = new AbortController();

        const poll = async () => {
            const results = await Promise.allSettled(
                NETWORK_OPERATORS.map(op => fetchOperatorFeed(op.statsUrl, ctrl.signal))
            );
            if (ctrl.signal.aborted) return;

            setRows(prev => NETWORK_OPERATORS.map((operator, i) => ({
                operator,
                feed: results[i].status === 'fulfilled' ? results[i].value : prev[i].feed
            })));
        };

        poll();
        const id = setInterval(poll, FEED_POLL_MS);
        return () => { clearInterval(id); ctrl.abort(); };
    }, []);

    return rows;
}

/**
 * Sums of every reachable operator feed, refreshed every 5s.
 *
 *   totals    — summed feed fields (null until at least one feed answers;
 *               the last good sums are kept if a later poll fails entirely).
 *               The windowed fields are null unless every feed reports the
 *               same epoch (epoch.js sumFeeds)
 *   epoch     — that epoch, { number, startMs, endMs, startBlock, endBlock },
 *               or null; displayEpoch decides whether it is still current
 *   loaded    — feeds that answered on the latest poll
 *   operators — size of the baked-in operator registry
 *   fetching  — a poll is in flight right now
 *   lastAt    — ms timestamp when the last poll finished (null until one has)
 *   nextAt    — ms timestamp when the next auto poll fires (null until then)
 *   refresh   — start a poll immediately; a no-op while one is in flight
 *
 * Polls chain from completion (setTimeout) rather than run on a fixed
 * interval: lastAt → nextAt then always spans one full idle cycle — which
 * is exactly what the stats panel's countdown dial renders — and a manual
 * refresh() restarts the cadence instead of racing a pending interval tick.
 */
export function useNetworkTotals() {
    const [state, setState] = useState({
        totals: null,
        epoch: null,
        loaded: 0,
        operators: NETWORK_OPERATORS.length
    });
    // Poll-cycle metadata, split from the totals: it flips at the start and
    // end of every poll, and only the refresh dial reads it.
    const [cycle, setCycle] = useState({ fetching: false, lastAt: null, nextAt: null });
    const refreshRef = useRef(null);

    useEffect(() => {
        const ctrl = new AbortController();
        let timer = 0;
        let inFlight = false;

        const poll = async () => {
            if (inFlight) return;
            inFlight = true;
            clearTimeout(timer);
            setCycle(c => ({ ...c, fetching: true }));

            const results = await Promise.allSettled(
                NETWORK_OPERATORS.map(op => fetchOperatorFeed(op.statsUrl, ctrl.signal))
            );
            if (ctrl.signal.aborted) return;
            inFlight = false;

            const ok = results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);

            // A poll that reached no feed keeps the last good sums.
            setState(prev => {
                if (ok.length === 0) return { ...prev, loaded: 0 };
                const { totals, epoch } = sumFeeds(ok);
                return { totals, epoch, loaded: ok.length, operators: NETWORK_OPERATORS.length };
            });

            const now = Date.now();
            setCycle({ fetching: false, lastAt: now, nextAt: now + FEED_POLL_MS });
            timer = setTimeout(poll, FEED_POLL_MS);
        };

        refreshRef.current = poll;
        poll();
        return () => {
            clearTimeout(timer);
            ctrl.abort();
            refreshRef.current = null;
        };
    }, []);

    const refresh = useCallback(() => { refreshRef.current?.(); }, []);

    // Keep a stable identity between data changes, as when state was
    // returned directly — consumers may key effects on the whole object.
    return useMemo(() => ({ ...state, ...cycle, refresh }), [state, cycle, refresh]);
}
