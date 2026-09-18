import React from 'react';
import Section from './Section';
import './PriceSection.css';
import { useLanguage } from '../i18n';
import { useAlphaPrice } from '../lib/usePrice';
import { PRICE_FEED_URL, PRICE_SHEET_URL } from '../lib/price';

// Tier α rates are published exact — render them without rounding.
const fmtAlphaExact = (n) =>
    Number(n).toLocaleString(undefined, { maximumFractionDigits: 8 });

// USD equivalents: 2 decimals at cents scale, 4 below a cent.
const fmtUsd = (n) => {
    if (!isFinite(n)) return '—';
    const digits = n >= 0.01 || n === 0 ? 2 : 4;
    return '$' + n.toLocaleString(undefined, {
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
 */
export default function PriceSection() {
    const { t } = useLanguage();
    const p = t.price;
    const { sheet, alphaUsd, alphaUsdSource } = useAlphaPrice();

    const tiers = sheet ? sheet.tiers : [];
    const usdNote = alphaUsdSource === 'operators'
        ? p.usdNoteOperators
        : p.usdNote.replace('{sn}', String(sheet ? sheet.sn : ''));

    return (
        <Section id="price" eyebrow={p.eyebrow} title={p.title}>
            <p>{p.intro}</p>

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
