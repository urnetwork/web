import { useEffect, useState } from 'react';

/**
 * Live network stats, aggregated from the network operators' public
 * grafana feeds.
 *
 * Each operator publishes a public stats JSON with accumulators for the
 * current block (7 days) plus its cumulative contract stake:
 *
 *   {
 *     "users": 125000,                   // users served this block
 *     "data_gib": 812345.5,              // data transferred this block (GiB)
 *     "total_networks": 250000,          // total networks at the operator
 *     "staked_alpha": 250000.0,          // cumulative α staked in the contract
 *     "demand_deposits_alpha": 1234.5,   // demand deposits this block (α)
 *     "miner_emissions_alpha": 5678.9,   // miner emission captured this block (α)
 *     "alpha_usd": 1.75                  // the α price in USD, as the operator observes it
 *   }
 *
 * All fields are numeric; a missing accumulator counts as 0. The endpoint
 * must be served with CORS open (Access-Control-Allow-Origin: *) since the
 * site queries it straight from the visitor's browser. The site sums every
 * reachable feed — except alpha_usd, where it takes the mean (see
 * usePrice.js; operators can source the pool price server-side, so this
 * works even when CoinGecko is unreachable from the browser).
 */
export const NETWORK_OPERATORS = [
    {
        name: 'ur.io',
        siteUrl: 'https://ur.io',
        appName: 'URnetwork',
        dashboardUrl: 'https://main-grafana.ur.io',
        githubUrl: 'https://github.com/urnetwork',
        statsUrl: 'https://main-grafana.ur.io/stats.json',
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
 * The application-layer block clock: block 1 opened at 00:00 UTC on
 * July 1, 2026 and a new block starts every 7 days — block 1 was
 * July 1–8, block 2 July 8–15, and so on.
 */
export const BLOCK_GENESIS_MS = Date.UTC(2026, 6, 1);
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
const FEED_POLL_MS = 60_000;
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
        const alphaUsd = Number(body?.alpha_usd);
        return {
            users: num('users'),
            dataGib: num('data_gib'),
            totalNetworks: num('total_networks'),
            stakedAlpha: num('staked_alpha'),
            demandDepositsAlpha: num('demand_deposits_alpha'),
            minerEmissionsAlpha: num('miner_emissions_alpha'),
            // A price of 0 is no price; null marks "not published".
            alphaUsd: Number.isFinite(alphaUsd) && alphaUsd > 0 ? alphaUsd : null
        };
    } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onOuterAbort);
    }
}

/**
 * Every operator with its own live feed (not summed), refreshed every
 * minute — [{ operator, feed }] in registry order, where feed is null
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
 * Sums of every reachable operator feed, refreshed every minute.
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

            setState(prev => ({
                totals: ok.length === 0 ? prev.totals : ok.reduce((sum, f) => ({
                    users: sum.users + f.users,
                    dataGib: sum.dataGib + f.dataGib,
                    totalNetworks: sum.totalNetworks + f.totalNetworks,
                    stakedAlpha: sum.stakedAlpha + f.stakedAlpha,
                    demandDepositsAlpha: sum.demandDepositsAlpha + f.demandDepositsAlpha,
                    minerEmissionsAlpha: sum.minerEmissionsAlpha + f.minerEmissionsAlpha
                }), { users: 0, dataGib: 0, totalNetworks: 0, stakedAlpha: 0, demandDepositsAlpha: 0, minerEmissionsAlpha: 0 }),
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
