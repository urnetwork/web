import { parseYaml } from './yaml';

/**
 * The published price sheet (/price.yml) and its market resolution.
 *
 * /price.yml is copied from the sn repo at build time (scripts/sync-price.mjs)
 * and publishes the demand deposit price per block (7 days), tiered by the
 * operator's staked α:
 *
 *   sn: 1
 *   tiered_per_block_demand_deposits:
 *     0:    { alpha_per_gib: 1,   alpha_per_user: 1 }
 *     1000: { alpha_per_gib: 0.1, alpha_per_user: 0.1 }
 *
 * An operator pays the best tier whose staked-α threshold it meets; the
 * 0 tier applies to everyone, with or without staked α.
 *
 * α → USD resolves against CoinGecko's public onchain (GeckoTerminal) feed:
 * on the "bittensor" network, every subnet's α/TAO pool has the
 * deterministic address "0-<sn>" and is quoted in USD. The endpoints are
 * keyless and CORS-open, so the browser queries them directly.
 */

export const PRICE_SHEET_URL = '/price.yml';
export const PRICE_FEED_URL = '/price.rss';

const GECKO_POOLS = 'https://api.geckoterminal.com/api/v2/networks/bittensor/pools';

/**
 * Parse the price.yml text into { sn, tiers } where tiers are sorted by
 * ascending staked-α threshold (so tiers[0] is the 0 / everyone tier).
 */
export function parsePriceSheet(text) {
    const doc = parseYaml(text);
    const raw = doc.tiered_per_block_demand_deposits || {};
    const tiers = Object.keys(raw)
        .map(k => ({
            minStakeAlpha: Number(k),
            alphaPerGib: Number(raw[k]?.alpha_per_gib ?? 0),
            alphaPerUser: Number(raw[k]?.alpha_per_user ?? 0)
        }))
        .filter(t => Number.isFinite(t.minStakeAlpha))
        .sort((a, b) => a.minStakeAlpha - b.minStakeAlpha);
    return { sn: doc.sn, tiers };
}

/** The best tier whose staked-α threshold `stakedAlpha` meets. */
export function tierForStake(tiers, stakedAlpha) {
    let best = tiers[0] || null;
    for (const t of tiers) {
        if (stakedAlpha >= t.minStakeAlpha) best = t;
    }
    return best;
}

export async function fetchPriceSheet(signal) {
    const res = await fetch(PRICE_SHEET_URL, { signal });
    if (!res.ok) throw new Error(`price sheet: HTTP ${res.status}`);
    return parsePriceSheet(await res.text());
}

/** Current subnet α price in USD. */
export async function fetchAlphaUsd(sn, signal) {
    const res = await fetch(`${GECKO_POOLS}/0-${sn}`, { signal });
    if (!res.ok) throw new Error(`alpha price: HTTP ${res.status}`);
    const body = await res.json();
    const usd = Number(body?.data?.attributes?.base_token_price_usd);
    if (!Number.isFinite(usd)) throw new Error('alpha price: no base_token_price_usd');
    return usd;
}

/** Hourly USD closes for the last 24h, oldest → newest. */
export async function fetchAlphaUsd24h(sn, signal) {
    const res = await fetch(
        `${GECKO_POOLS}/0-${sn}/ohlcv/hour?aggregate=1&limit=24&currency=usd`,
        { signal }
    );
    if (!res.ok) throw new Error(`alpha ohlcv: HTTP ${res.status}`);
    const body = await res.json();
    const list = body?.data?.attributes?.ohlcv_list;
    if (!Array.isArray(list)) throw new Error('alpha ohlcv: no ohlcv_list');
    // Rows arrive newest-first as [ts, open, high, low, close, volume].
    return list
        .map(row => Number(row?.[4]))
        .filter(Number.isFinite)
        .reverse();
}
