import React from 'react';
import Section from './Section';
import './PriceSection.css';
import { useLanguage, intlLocale } from '../i18n';
import { useAlphaPrice } from '../lib/usePrice';
import { PRICE_FEED_URL, PRICE_SHEET_URL } from '../lib/price';

// Figures are formatted in the page's language (intlLocale), never the
// browser's.

// Tier α rates are published exact — render them without rounding.
const formatAlphaExact = (n, locale) =>
    Number(n).toLocaleString(locale, { maximumFractionDigits: 8 });

// USD equivalents: 2 decimals at cents scale, 4 below a cent.
const formatUsd = (n, locale) => {
    if (!isFinite(n)) return '—';
    const digits = n >= 0.01 || n === 0 ? 2 : 4;
    return '$' + n.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: digits
    });
};

/**
 * PriceSection
 *
 * The published price sheet (/price.yml) rendered as a table: one row per
 * staked-α tier, with the α rates published exactly as the sheet states
 * them and live USD equivalents resolved from the subnet's public pool
 * feed. Links out to the RSS change feed and the raw yaml.
 *
 * It is the whole /price page (the SPA's SectionPage, astro/src/pages/price.astro),
 * so its title is the page's h1. The static page passes the sheet it was
 * built from as `initialSheet`, so the table and the initial-period note are
 * in the HTML; the live sheet replaces it once fetched.
 */
export default function PriceSection({ initialSheet = null }) {
    const { t, code } = useLanguage();
    const locale = intlLocale(code);
    const fmtAlphaExact = (n) => formatAlphaExact(n, locale);
    const fmtUsd = (n) => formatUsd(n, locale);
    const p = t.price;
    const { sheet: liveSheet, alphaUsd, alphaUsdSource } = useAlphaPrice();
    const sheet = liveSheet || initialSheet;

    const tiers = sheet ? sheet.tiers : [];
    const usdNote = alphaUsdSource === 'operators'
        ? p.usdNoteOperators
        : p.usdNote.replace('{sn}', String(sheet ? sheet.sn : ''));
    // The initial period: the sheet publishes 0 α in every tier (no demand
    // deposits are collected while the network is hardened). The table still
    // shows the zeros; the note says why. The USD columns multiply a rate by
    // the α price, so a 0 rate is an honest $0.00 and nothing divides.
    const initialPeriod = tiers.length > 0 && tiers.every(t => t.alphaPerGib === 0 && t.alphaPerUser === 0);

    return (
        <Section id="price" eyebrow={p.eyebrow} title={p.title} headingLevel="h1">
            <p>{p.intro}</p>
            {initialPeriod && p.initialPeriod && (
                <p className="price-initial-period">{p.initialPeriod}</p>
            )}

            <div className="article-table-wrap">
                <table className="article-table price-table">
                    <thead>
                        <tr>
                            <th>{p.colTier}</th>
                            <th>{p.colStake}</th>
                            <th>{p.colGib}</th>
                            <th>{p.colUser}</th>
                            <th>{p.colGibUsd}</th>
                            <th>{p.colUserUsd}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tiers.map((tier, i) => (
                            <tr key={tier.minStakeAlpha}>
                                <td>{i}</td>
                                <td>
                                    {tier.minStakeAlpha === 0
                                        ? p.tierEveryone
                                        : `≥ ${fmtAlphaExact(tier.minStakeAlpha)} α`}
                                </td>
                                <td>{fmtAlphaExact(tier.alphaPerGib)} α</td>
                                <td>{fmtAlphaExact(tier.alphaPerUser)} α</td>
                                <td>{alphaUsd == null ? '—' : fmtUsd(tier.alphaPerGib * alphaUsd)}</td>
                                <td>{alphaUsd == null ? '—' : fmtUsd(tier.alphaPerUser * alphaUsd)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="price-note">
                {alphaUsd == null || !sheet
                    ? p.usdUnavailable
                    : `${usdNote} ${p.alphaNow.replace('{usd}', fmtUsd(alphaUsd))}`}
            </p>

            <div className="price-actions">
                <a href={PRICE_FEED_URL} className="card-link" type="application/rss+xml">
                    {p.subscribe}
                </a>
                <a href={PRICE_SHEET_URL} className="card-link">
                    {p.rawFile}
                </a>
            </div>
        </Section>
    );
}
