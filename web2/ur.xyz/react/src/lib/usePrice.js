import { useEffect, useState, useSyncExternalStore } from 'react';
import { fetchPriceSheet, fetchAlphaUsd, fetchAlphaUsd24h } from './price';
import { NETWORK_OPERATORS, fetchOperatorFeed } from './network';

const SPOT_POLL_MS = 60_000;
const SERIES_POLL_MS = 5 * 60_000;
const RETRY_MS = 10_000;

// Last-known α price, kept across visits so the USD figures paint
// immediately even when the price feeds are slow, rate-limited, or blocked.
const SPOT_CACHE_KEY = 'ur.xyz.alphaUsd';
const SPOT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * One shared feed for every consumer (the nav pill on every page, the
 * price page's table): a module-level store with ref-counted polling.
 * Sharing one poller keeps the request volume well under the public
 * feeds' rate limits no matter how many components subscribe.
 *
 *   sheet          — { sn, tiers } from /price.yml (null until loaded)
 *   alphaUsd       — current USD price of 1 α (cached value until a feed answers)
 *   alphaUsdSource — 'operators' (mean of the operators' stats feeds) or
 *                    'gecko' (the public subnet pool feed)
 *   closes         — hourly USD closes for the last 24h, oldest → newest
 *                    (only polled while a `series: true` consumer is mounted)
 *
 * Every fetch retries on failure (10s) instead of waiting out its full
 * poll interval, and the last good value is always kept.
 */
let state = { sheet: null, alphaUsd: null, alphaUsdSource: null, closes: null };
const listeners = new Set();

function setState(patch) {
    state = { ...state, ...patch };
    listeners.forEach(l => l());
}

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function readSpotCache() {
    try {
        const raw = window.localStorage.getItem(SPOT_CACHE_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (typeof cached.usd !== 'number') return null;
        if (Date.now() - cached.ts > SPOT_CACHE_MAX_AGE_MS) return null;
        return cached;
    } catch {
        return null;
    }
}

function writeSpotCache(sn, usd, source) {
    try {
        window.localStorage.setItem(SPOT_CACHE_KEY, JSON.stringify({ sn, usd, source, ts: Date.now() }));
    } catch { /* private mode */ }
}

/**
 * The α/USD spot price. Primary source: the mean of the alpha_usd figures
 * the network operators publish in their stats feeds — CoinGecko can be
 * unreachable from the browser (CORS proxies, blockers), while operators
 * are expected to publish a price. Fallback while no operator feed is
 * reachable: the subnet pool on CoinGecko's public GeckoTerminal API.
 * Throws only when every source fails.
 */
async function fetchSpot(sn, signal) {
    const results = await Promise.allSettled(
        NETWORK_OPERATORS.map(op => fetchOperatorFeed(op.statsUrl, signal))
    );
    const prices = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value.alphaUsd)
        .filter(v => v != null);

    if (prices.length > 0) {
        return {
            usd: prices.reduce((sum, v) => sum + v, 0) / prices.length,
            source: 'operators'
        };
    }
    return { usd: await fetchAlphaUsd(sn, signal), source: 'gecko' };
}

let consumers = 0;
let seriesConsumers = 0;
let seriesRunning = false;
let ctrl = null;
const timers = { sheet: 0, spot: 0, series: 0 };

function start() {
    ctrl = new AbortController();
    // Paint from the cache first; the live fetches refresh it. This runs
    // from an effect (client only), so hydration stays deterministic.
    const cached = readSpotCache();
    if (cached && state.alphaUsd == null) {
        setState({ alphaUsd: cached.usd, alphaUsdSource: cached.source || null });
    }
    loadSheet();
}

function stop() {
    ctrl.abort();
    clearTimeout(timers.sheet);
    clearTimeout(timers.spot);
    clearTimeout(timers.series);
    seriesRunning = false;
}

async function loadSheet() {
    try {
        const sheet = await fetchPriceSheet(ctrl.signal);
        // A cached spot price from a different subnet is meaningless.
        const cached = readSpotCache();
        if (cached && cached.sn !== sheet.sn) setState({ alphaUsd: null, alphaUsdSource: null });
        setState({ sheet });
        loadSpot();
        ensureSeries();
    } catch {
        if (ctrl.signal.aborted) return;
        timers.sheet = setTimeout(loadSheet, RETRY_MS);
    }
}

async function loadSpot() {
    const sn = state.sheet ? state.sheet.sn : null;
    if (sn == null) return;
    try {
        const spot = await fetchSpot(sn, ctrl.signal);
        writeSpotCache(sn, spot.usd, spot.source);
        setState({ alphaUsd: spot.usd, alphaUsdSource: spot.source });
        timers.spot = setTimeout(loadSpot, SPOT_POLL_MS);
    } catch {
        if (ctrl.signal.aborted) return;
        timers.spot = setTimeout(loadSpot, RETRY_MS);
    }
}

function ensureSeries() {
    if (seriesRunning || seriesConsumers === 0 || !state.sheet) return;
    seriesRunning = true;
    loadSeries();
}

async function loadSeries() {
    const sn = state.sheet ? state.sheet.sn : null;
    if (sn == null || seriesConsumers === 0) {
        seriesRunning = false;
        return;
    }
    try {
        const closes = await fetchAlphaUsd24h(sn, ctrl.signal);
        setState({ closes });
        timers.series = setTimeout(loadSeries, SERIES_POLL_MS);
    } catch {
        if (ctrl.signal.aborted) { seriesRunning = false; return; }
        timers.series = setTimeout(loadSeries, RETRY_MS);
    }
}

export function useAlphaPrice({ series = false } = {}) {
    const snapshot = useSyncExternalStore(subscribe, () => state, () => state);

    useEffect(() => {
        consumers++;
        if (series) {
            seriesConsumers++;
            ensureSeries();
        }
        if (consumers === 1) start();

        return () => {
            consumers--;
            if (series) seriesConsumers--;
            if (consumers === 0) stop();
        };
    }, [series]);

    return snapshot;
}

const DENOM_KEY = 'ur.xyz.priceDenom';

/**
 * The visitor's price denomination — 'usd' (default) or 'alpha' — persisted
 * across visits.
 */
export function usePriceDenom() {
    const [denom, setDenom] = useState(() => {
        if (typeof window === 'undefined') return 'usd';
        try {
            return window.localStorage.getItem(DENOM_KEY) === 'alpha' ? 'alpha' : 'usd';
        } catch {
            return 'usd';
        }
    });

    const set = (next) => {
        setDenom(next);
        try { window.localStorage.setItem(DENOM_KEY, next); } catch { /* private mode */ }
    };

    return [denom, set];
}
