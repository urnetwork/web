import { useEffect, useState } from 'react';

/**
 * Live network stats, aggregated from the network operators' public
 * grafana feeds.
 *
 * Each operator publishes a public stats JSON with accumulators for the
 * current block (7 days) plus its cumulative contract stake:
 *
 *   {
 *     "users": 125000,                   // users served this block (unique top-level clients)
 *     "data_gib": 812345.5,              // data transferred this block (GiB)
 *     "total_networks": 250000,          // total networks at the operator
 *     "staked_alpha": 250000.0,          // cumulative α staked in the contract
 *     "demand_deposits_alpha": 1234.5,   // demand deposits this block (α)
 *     "miner_emissions_alpha": 5678.9,   // miner emission captured this block (α)
 *     "alpha_usd": 1.75,                 // the α price in USD, as the operator observes it
 *     "countries": 123,                  // countries with a connected valid provider
 *     "prev_users": 118000,              // ...and the same accumulators for the
 *     "prev_data_gib": 1012345.5,        //    last FINISHED block — the stable
 *     "prev_demand_deposits_alpha": 1100.5, // reference while the current block
 *     "prev_miner_emissions_alpha": 5200.1  // accumulates from zero
 *   }
 *
 * countries is informational (overlapping between operators, so never
 * summed here); ur.io's own site reads it from this same feed. The prev_*
 * fields are optional: they parse as null (not 0) when unpublished — e.g.
 * during block 1, which has no finished predecessor — so the UI can hide
 * the reference rather than misreport a zero.
 *
 * All fields are numeric; a missing accumulator counts as 0. The endpoint
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

/**
 * The application-layer block clock: blocks are the subnet's 7-day
 * settlement periods, and every block starts and ends at 00:00 UTC on
 * Sunday. Block 1 opened Sunday June 28, 2026 — the Sunday of the
 * launch week — so block 2 was July 5–12, block 3 July 12–19, and so on.
 */
export const BLOCK_GENESIS_MS = Date.UTC(2026, 5, 28);
export const BLOCK_MS = 7 * 24 * 60 * 60 * 1000;

export function blockNumberAt(nowMs = Date.now()) {
    return Math.max(1, Math.floor((nowMs - BLOCK_GENESIS_MS) / BLOCK_MS) + 1);
}

/** 0 → 1 progress through the current block. */
export function blockProgressAt(nowMs = Date.now()) {
    if (nowMs <= BLOCK_GENESIS_MS) return 0;
    return ((nowMs - BLOCK_GENESIS_MS) % BLOCK_MS) / BLOCK_MS;
}

/** Timestamp (ms) when the current block ends — always 00:00 UTC. */
export function blockEndAt(nowMs = Date.now()) {
    const index = Math.max(0, Math.floor((nowMs - BLOCK_GENESIS_MS) / BLOCK_MS));
    return BLOCK_GENESIS_MS + (index + 1) * BLOCK_MS;
}

const CLOCK_TICK_MS = 30_000;
// Feed refresh: the hero simulation and stats read live totals, so poll
// every 30s (the operator feeds cache briefly server side, so this stays
// cheap for the operators).
const FEED_POLL_MS = 30_000;
const FEED_TIMEOUT_MS = 10_000;

/**
 * { number, progress } for the current block, ticking every 30s.
 *
 * The initial state is a fixed zero rather than the wall clock so the
 * static build's server render and the client's first hydration render
 * agree; the real values land in an effect on the very next tick.
 */
export function useBlockClock() {
    const [block, setBlock] = useState({ number: 1, progress: 0 });

    useEffect(() => {
        const update = () => {
            setBlock({ number: blockNumberAt(), progress: blockProgressAt() });
        };
        update();
        const id = setInterval(update, CLOCK_TICK_MS);
        return () => clearInterval(id);
    }, []);

    return block;
}

export async function fetchOperatorFeed(statsUrl, signal) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FEED_TIMEOUT_MS);
    const onOuterAbort = () => ctrl.abort();
    if (signal) signal.addEventListener('abort', onOuterAbort);
    try {
        const res = await fetch(statsUrl, { signal: ctrl.signal, mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const num = (key) => {
            const v = Number(body?.[key]);
            return Number.isFinite(v) ? v : 0;
        };
        // Optional fields stay null when unpublished so the UI can hide
        // them instead of misreporting a zero.
        const optional = (key) => {
            const v = Number(body?.[key]);
            return Number.isFinite(v) ? v : null;
        };
        const alphaUsd = Number(body?.alpha_usd);
        return {
            users: num('users'),
            dataGib: num('data_gib'),
            totalNetworks: num('total_networks'),
            stakedAlpha: num('staked_alpha'),
            demandDepositsAlpha: num('demand_deposits_alpha'),
            minerEmissionsAlpha: num('miner_emissions_alpha'),
            // A price of 0 is no price; null marks "not published".
            alphaUsd: Number.isFinite(alphaUsd) && alphaUsd > 0 ? alphaUsd : null,
            // The last finished block (see the schema note above).
            prevUsers: optional('prev_users'),
            prevDataGib: optional('prev_data_gib'),
            prevDemandDepositsAlpha: optional('prev_demand_deposits_alpha'),
            prevMinerEmissionsAlpha: optional('prev_miner_emissions_alpha')
        };
    } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onOuterAbort);
    }
}

/**
 * Every operator with its own live feed (not summed), refreshed every
 * 30s — [{ operator, feed }] in registry order, where feed is null
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
 * Sums of every reachable operator feed, refreshed every 30s.
 *
 *   totals    — summed feed fields (null until at least one feed answers;
 *               the last good sums are kept if a later poll fails entirely)
 *   loaded    — feeds that answered on the latest poll
 *   operators — size of the baked-in operator registry
 */
export function useNetworkTotals() {
    const [state, setState] = useState({
        totals: null,
        loaded: 0,
        operators: NETWORK_OPERATORS.length
    });

    useEffect(() => {
        const ctrl = new AbortController();

        const poll = async () => {
            const results = await Promise.allSettled(
                NETWORK_OPERATORS.map(op => fetchOperatorFeed(op.statsUrl, ctrl.signal))
            );
            if (ctrl.signal.aborted) return;

            const ok = results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);

            // Optional fields sum null-aware: the total stays null until
            // at least one feed publishes the field.
            const addOptional = (a, b) => (a == null && b == null ? null : (a ?? 0) + (b ?? 0));

            setState(prev => ({
                totals: ok.length === 0 ? prev.totals : ok.reduce((sum, f) => ({
                    users: sum.users + f.users,
                    dataGib: sum.dataGib + f.dataGib,
                    totalNetworks: sum.totalNetworks + f.totalNetworks,
                    stakedAlpha: sum.stakedAlpha + f.stakedAlpha,
                    demandDepositsAlpha: sum.demandDepositsAlpha + f.demandDepositsAlpha,
                    minerEmissionsAlpha: sum.minerEmissionsAlpha + f.minerEmissionsAlpha,
                    prevUsers: addOptional(sum.prevUsers, f.prevUsers),
                    prevDataGib: addOptional(sum.prevDataGib, f.prevDataGib),
                    prevDemandDepositsAlpha: addOptional(sum.prevDemandDepositsAlpha, f.prevDemandDepositsAlpha),
                    prevMinerEmissionsAlpha: addOptional(sum.prevMinerEmissionsAlpha, f.prevMinerEmissionsAlpha)
                }), {
                    users: 0, dataGib: 0, totalNetworks: 0, stakedAlpha: 0,
                    demandDepositsAlpha: 0, minerEmissionsAlpha: 0,
                    prevUsers: null, prevDataGib: null,
                    prevDemandDepositsAlpha: null, prevMinerEmissionsAlpha: null
                }),
                loaded: ok.length,
                operators: NETWORK_OPERATORS.length
            }));
        };

        poll();
        const id = setInterval(poll, FEED_POLL_MS);
        return () => { clearInterval(id); ctrl.abort(); };
    }, []);

    return state;
}
