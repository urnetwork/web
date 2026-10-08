import React, { useEffect, useState } from 'react';
import { useAlphaPrice } from '../../../lib/usePrice';
import { axisCompact, compact, alpha as fmtAlpha, usd as fmtUsd, usdCompact, timeUtc } from './format';

/**
 * The reserve's display unit: α, the default, or USD at the live α price.
 *
 * A USD figure is an α amount times the α price the site's price feed
 * reports (lib/usePrice.js: the network operators' stats feeds, else
 * CoinGecko's public GeckoTerminal pool feed), polled about once a minute
 * while USD is shown and never otherwise, so a visitor who keeps α contacts
 * nothing but the chain. A price is used only once a feed has answered in
 * this session: the feed's cached last-known value is never shown, and while
 * no feed has answered the figures stay in α and the page says so. The
 * server render and the first client render are in α (the stored choice is
 * read in an effect), so hydration stays deterministic.
 *
 * Dollars were dropped from this page on 2026-10-06 and asked back, live
 * only, on 2026-10-08. This file and its uses in Reserve.jsx are the whole
 * USD path: remove them to drop dollars again.
 */

const UNIT_KEY = 'ur.xyz.reserve.unit';
const SOURCE_LABEL = {
    operators: "the network operators' stats feeds",
    gecko: "CoinGecko's GeckoTerminal pool feed",
};
/** The hosts the price feed may contact, for the page's Sources line. */
export const PRICE_HOSTS = ['grafana.bringyour.com', 'api.geckoterminal.com'];

export function useDenom() {
    const [unit, setUnit] = useState('alpha');
    useEffect(() => {
        try { if (window.localStorage.getItem(UNIT_KEY) === 'usd') setUnit('usd'); } catch { /* private mode */ }
    }, []);
    const choose = (next) => {
        setUnit(next);
        try { window.localStorage.setItem(UNIT_KEY, next); } catch { /* private mode */ }
    };

    // the feeds are polled only while USD is shown
    const feed = useAlphaPrice({ enabled: unit === 'usd' });
    const fresh = unit === 'usd' && feed.alphaUsdAt != null && feed.alphaUsd != null;
    const rate = fresh ? feed.alphaUsd : null; // USD per α while a USD figure can be shown

    return {
        unit,
        choose,
        usd: unit === 'usd',
        rate,
        sourceLabel: fresh ? SOURCE_LABEL[feed.alphaUsdSource] || feed.alphaUsdSource : null,
        at: fresh ? feed.alphaUsdAt : null,
        /** an α amount as a full figure in the shown unit */
        amount: (a) => (rate != null ? fmtUsd(a * rate) : `${Math.abs(a) >= 1e5 ? compact(a) : fmtAlpha(a, 1)} α`),
        /** an α amount as a compact figure in the shown unit */
        short: (a) => (rate != null ? usdCompact(a * rate) : `${compact(a)} α`),
        /** a chart value: α into the shown unit, and the formatters of a value already in it */
        scale: (a) => (rate != null ? a * rate : a),
        fmt: (v) => (rate != null ? usdCompact(v) : `${compact(v)} α`),
        axis: (v) => (rate != null ? `$${axisCompact(v)}` : axisCompact(v)),
    };
}

/** α | USD, one row above the figures. */
export function UnitToggle({ denom }) {
    return (
        <span className="reserve-unit" role="group" aria-label="Display unit">
            <button type="button" aria-pressed={denom.unit === 'alpha'} onClick={() => denom.choose('alpha')}>α</button>
            <button type="button" aria-pressed={denom.unit === 'usd'} onClick={() => denom.choose('usd')}>USD</button>
        </span>
    );
}

/** Where a USD figure comes from, or why there is none. */
export function PriceNote({ denom }) {
    if (!denom.usd) return null;
    return (
        <p className="reserve-price-note" role="status">
            {denom.rate != null
                ? `USD at the live α price: ${fmtUsd(denom.rate)} per α from ${denom.sourceLabel}, ${timeUtc(denom.at)}. A spot mark, not a realisable value.`
                : 'α price unavailable: the figures stay in α until a price feed answers.'}
        </p>
    );
}
