import React, { useEffect, useMemo, useRef, useState } from 'react';
import { reserve, publishedPrograms, activePrograms } from '../../data/reserve';
import { isLive, useReserve } from '../../lib/useReserve';
import { FINNEY_ARCHIVE, FINNEY_RPC, multisigAccountId, ss58Encode } from '../../lib/subtensor';
import { copyText } from '../../lib/clipboard';
import XYChart from './reserve/XYChart';
import SplitBar from './reserve/SplitBar';
import { PRICE_HOSTS, PriceNote, UnitToggle, useDenom } from './reserve/Denom';
import { compact, whole, alpha as fmtAlpha, usd as fmtUsd, pct, shortDate, shortDateYear, monthLabel, monthLong, isoDay, timeUtc, daysBetween } from './reserve/format';
import { projectBalance, spliceLive, flowsOf, observedInflow, monthlyFlows } from './reserve/projection';
import { inflowPerDay, momentumOf } from './reserve/momentum';
import './Reserve.css';

/**
 * ReservePage — /reserve, the Network Capacity Reserve.
 *
 * Renders only what goes inside <main class="section-page">: the SPA's
 * SectionPage (App.jsx) and astro/src/pages/reserve.astro both wrap it in the
 * shared Disclaimer / Nav / Footer shell. English-only, like /about.
 *
 * The figures are read in the visitor's browser from Bittensor mainnet
 * through its public RPC endpoints (lib/subtensor.js, lib/useReserve.js): the
 * reserve coldkey's α stake and free TAO at the latest finalized block, the
 * SN25 pool and emission, how the miner allocation is routed, and the
 * balance history from the recipients' registration. The reserve is not a
 * fixed share of the emissions: momentum, the share paid to providers now,
 * comes out of the miner emissions and the reserve receives the rest,
 * miner emissions × (1 − momentum). The balance chart is the live history
 * with the projection continuing from it, and the monthly chart the
 * receipts and payments by month; the projection holds momentum at its
 * launch value until the chain shows one of its own (reserve/momentum.js).
 * Amounts are in α, with a TAO mark at the SN25 pool's own ratio; a visitor
 * may switch the figures to USD at the live α price (reserve/Denom.jsx),
 * which is the only time a price feed is contacted.
 *
 * The server render carries no chain data, no price and no calendar
 * (hydration stays deterministic); the client fills them in and keeps them
 * fresh.
 */

// The emission schedule the chain confirms on every read, used for the
// projection until it does: 1 α per block (7,200 a day), an 18% owner share,
// and the remainder split evenly between validators and miners.
const FALLBACK_EMISSION = { alphaPerDay: 7200, ownerCut: 11_796 / 65_535 };
const minerPerDayOf = (em) => (em.alphaPerDay * (1 - em.ownerCut)) / 2;
// a monthly figure is a daily one over the mean calendar month
const DAYS_PER_MONTH = 30.44;

const shortKey = (key) => `${key.slice(0, 6)}…${key.slice(-4)}`;
const hostOf = (url) => new URL(url).host;

/** An address in the code face that breaks, if it must, only at its middle: two even rows. */
function Address({ value, codeRef }) {
    const half = Math.ceil(value.length / 2);
    return (
        <code ref={codeRef} className="reserve-address" translate="no">
            <span>{value.slice(0, half)}</span><wbr /><span>{value.slice(half)}</span>
        </code>
    );
}

/** The α sign inside uppercase text, kept lowercase (uppercased it is a capital Α). */
const Alpha = () => <span className="reserve-alpha">α</span>;

function Stat({ label, value, sub }) {
    return (
        <div className="reserve-stat">
            <span className="reserve-stat-label">{label}</span>
            <b>{value}</b>
            <small>{sub || ' '}</small>
        </div>
    );
}

/** A chart's key: a line, a dashed line or a swatch per series, mirroring the mark. Nothing for a single series. */
function Legend({ items }) {
    if (items.length < 2) return null;
    return (
        <span className="reserve-legend">
            {items.map((it) => (
                <span key={it.name}><i className={`is-${it.kind}`} style={{ '--c': it.color, opacity: it.opacity ?? 1 }} aria-hidden="true" />{it.name}</span>
            ))}
        </span>
    );
}

export default function ReservePage() {
    const { snapshot, history, historyReady, error, updatedAt } = useReserve({ address: reserve.address, netuid: reserve.netuid, launch: reserve.launch });
    // the calendar is read on the client: the server render has no "today"
    const [today, setToday] = useState(null);
    useEffect(() => { setToday(isoDay(Date.now())); }, [updatedAt]);
    // α or USD; the USD path is reserve/Denom.jsx
    const denom = useDenom();

    // the wallet's Copy button
    const [copied, setCopied] = useState(false);
    const addressRef = useRef(null);
    const copiedTimer = useRef(0);
    useEffect(() => () => clearTimeout(copiedTimer.current), []);
    const copyAddress = async () => {
        // say "Copied" only when it was; otherwise the address is left selected to copy by hand
        if (!(await copyText(reserve.address, addressRef.current))) return;
        setCopied(true);
        clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    };

    const live = isLive(snapshot);
    const emission = snapshot ? snapshot.emission : { ...FALLBACK_EMISSION, ownerPerDay: FALLBACK_EMISSION.alphaPerDay * FALLBACK_EMISSION.ownerCut, validatorPerDay: minerPerDayOf(FALLBACK_EMISSION), minerPerDay: minerPerDayOf(FALLBACK_EMISSION) };
    const minerPerDay = emission.minerPerDay;
    // Momentum is the share of the miner emissions paid to providers now; the
    // reserve receives the rest, minerPerDay × (1 − momentum). The launch value
    // until the chain shows momentum of its own (reserve/momentum.js): what
    // goes to neither the reserve's hotkeys nor the burn, once it is at least
    // 0.1% of the miner allocation.
    const routing = snapshot?.routing;
    const otherShare = routing ? Math.max(0, 1 - routing.reserve - routing.burned) : 0;
    const launchMomentum = reserve.launchMomentumBps / 10_000;
    const { momentum, fromChain, burned: burnedShare } = momentumOf({ routing, live, launchMomentum });
    const perDay = inflowPerDay(minerPerDay, momentum, burnedShare);
    const momentumPerDay = minerPerDay * momentum;
    // the worked line is labelled by where its momentum comes from
    const calcLabel = !fromChain ? 'At launch:' : live ? `At block ${whole(snapshot.block)}:` : 'At the current momentum:';
    // TAO per α at the pool's reserves: the one valuation the chain itself gives
    const priceTao = snapshot?.pool.priceTao ?? null;
    const daysToLaunch = today ? daysBetween(today, reserve.launch) : null;
    const firstRegistration = snapshot ? Math.min(...snapshot.hotkeys.map((h) => h.registeredAt).filter((b) => Number.isFinite(b) && b > 0), Infinity) : Infinity;

    // a launch day that has passed with nothing received: the projection
    // restarts from today instead of crediting days that did not happen
    const overdue = !live && daysToLaunch != null && daysToLaunch <= 0;
    const projectFrom = overdue ? today : reserve.launch;

    // ── the balance: live history, then the projection ──
    const chart = useMemo(() => {
        const livePoints = live && history?.length ? history : [];
        const { live: livePts, projected } = livePoints.length
            ? spliceLive({ live: livePoints, through: reserve.projectThrough, perDay })
            : { live: [], projected: live ? [] : projectBalance({ launch: projectFrom, through: reserve.projectThrough, perDay }) };
        const points = [...livePts, ...projected];
        const n = livePts.length;
        const liveValues = points.map((p, i) => (i < n ? p.alpha : undefined));
        // the projection starts at the last live point so the two series join
        const projValues = points.map((p, i) => (n === 0 || i >= n - 1 ? p.alpha : undefined));
        return { livePts, projected, points, liveValues, projValues: projected.length ? projValues : points.map(() => undefined) };
    }, [history, live, perDay, projectFrom]);
    const end = chart.points[chart.points.length - 1] || null;
    // receipts, payments and the observed inflow need the whole history, not
    // only the snapshot's own point. The observed rate starts at the first
    // receipt (the days between registration and the first payout are not a
    // rate) and needs at least a day of it.
    const flows = historyReady && chart.livePts.length ? flowsOf(chart.livePts) : null;
    const paidPts = chart.livePts.slice(Math.max(0, chart.livePts.findIndex((p) => p.alpha > 0)));
    const observedRaw = historyReady && paidPts.length ? observedInflow(paidPts) : null;
    const observed = observedRaw && observedRaw.days >= 1 ? observedRaw : null;
    // the same history and projection by calendar month
    const months = useMemo(() => monthlyFlows({ live: chart.livePts, projected: chart.projected }), [chart]);
    // the chart spans two Octobers, so its dates carry the year
    const yearSpan = chart.points.length > 0 && chart.points[0].date.slice(0, 4) !== end.date.slice(0, 4);
    const dateLabel = yearSpan ? shortDateYear : shortDate;

    // ── programs ──
    const earmarked = publishedPrograms.reduce((s, p) => s + Math.max(0, (p.ceilingAlpha || 0) - p.payments.reduce((t, x) => t + x.alpha, 0)), 0);
    const statusesPresent = Object.keys(reserve.programStatus).filter((s) => reserve.programs.some((p) => p.status === s));
    const countOf = (s) => reserve.programs.filter((p) => p.status === s).length;
    // "1 in preparation · 3 indicative"
    const statusCounts = statusesPresent.filter((s) => s !== 'active' && s !== 'complete').map((s) => `${countOf(s)} ${reserve.programStatus[s].toLowerCase()}`).join(' · ');
    const [filter, setFilter] = useState('all');
    const shownPrograms = reserve.programs.filter((p) => filter === 'all' || p.status === filter);
    // sizes and payments are columns only once a program has them
    const hasFigures = reserve.programs.some((p) => p.ceilingAlpha != null);

    // the signers' keys at the threshold must derive the reserve account itself
    const derivesAccount = useMemo(() => {
        try {
            return ss58Encode(multisigAccountId(reserve.custody.signers.map((s) => s.address), reserve.custody.multisigThreshold)) === reserve.address;
        } catch {
            return false;
        }
    }, []);

    // [lead, more, tail]: a phone shows the lead and the tail only
    const status = !snapshot
        ? (error ? ['Chain read unavailable', ' · retrying', ''] : ['Reading Bittensor mainnet…', '', ''])
        : live
            ? ['Live', ' · Bittensor mainnet · finalized', ` · block ${whole(snapshot.block)}`]
            : [overdue ? 'Awaiting the first receipt' : 'Pre-launch', ' · projected from on-chain emission', ` · block ${whole(snapshot.block)}`];
    const statusState = !snapshot ? (error ? 'error' : 'loading') : live ? 'live' : 'pre';

    // ── the three figures ──
    const monthlyObserved = live && observed ? observed : null;
    const stats = [
        {
            label: 'Reserve balance',
            value: snapshot ? denom.amount(snapshot.alpha) : '—',
            sub: !snapshot ? 'reading Bittensor mainnet…'
                : !live ? 'nothing received yet'
                    : flows ? `${denom.short(flows.received)} in · ${denom.short(flows.spent)} paid out`
                        : 'reading the balance history…',
        },
        {
            label: 'Monthly inflow',
            value: denom.amount((monthlyObserved ? monthlyObserved.perDay : perDay) * DAYS_PER_MONTH),
            sub: monthlyObserved
                ? `${whole(monthlyObserved.perDay)} α a day observed, last ${monthlyObserved.days} day${monthlyObserved.days === 1 ? '' : 's'}`
                : `${whole(perDay)} α a day projected · miner emissions × (1 − momentum)`,
        },
        {
            label: 'Committed to programs',
            value: denom.amount(earmarked),
            sub: activePrograms.length
                ? `${pct(earmarked / (perDay * 365), 0)} of 12-month inflow · ${activePrograms.length} active program${activePrograms.length === 1 ? '' : 's'}`
                : `none active · ${statusCounts}`,
        },
    ];

    // ── the balance chart ──
    const sc = (v) => (v == null ? undefined : denom.scale(v));
    const balanceSeries = [
        ...(chart.livePts.length ? [{ name: 'Live balance', color: 'var(--rv-live)', type: 'area', values: chart.liveValues.map(sc) }] : []),
        ...(chart.projected.length ? [{ name: 'Projected', color: 'var(--rv-reserve)', type: 'dash', values: chart.projValues.map(sc), end: end ? denom.short(end.alpha) : undefined }] : []),
    ];
    const balanceLegend = [
        ...(chart.livePts.length ? [{ name: 'Live balance', kind: 'line', color: 'var(--rv-live)' }] : []),
        ...(chart.projected.length ? [{ name: 'Projected', kind: 'dash', color: 'var(--rv-reserve)' }] : []),
    ];
    const todayMarks = chart.livePts.length && chart.projected.length ? [{ index: chart.livePts.length - 1, label: 'today' }] : [];
    const balanceLabel = chart.livePts.length
        ? (chart.projected.length ? `Reserve balance · live, projected to ${dateLabel(end.date)}` : 'Reserve balance · live')
        : (end ? `Reserve balance · projected to ${dateLabel(end.date)}` : 'Reserve balance');
    const momentumBasis = fromChain ? `${pct(momentum)}, its value on chain` : `its launch value of ${pct(launchMomentum)}`;
    const balanceNote = chart.livePts.length
        ? `Live balance sampled daily from finalized chain state; projected at miner emissions × (1 − momentum) with momentum at ${momentumBasis}, and no program payments.`
        : `Projected at miner emissions × (1 − momentum) with momentum at ${momentumBasis} and no programs paid. Switches to the live balance once the reserve receives emission.`;
    const unitWord = denom.rate != null ? 'USD at the live α price' : 'α';
    const balanceAria = `Reserve balance, ${unitWord}: ${chart.livePts.length ? `live to ${dateLabel(chart.livePts[chart.livePts.length - 1].date)}${chart.projected.length ? ', then ' : ''}` : ''}${chart.projected.length ? `projected to ${denom.short(end.alpha)} by ${dateLabel(end.date)}` : ''}. Arrow keys read each day.`;

    // the table twin of the balance chart: every live day, then the
    // projection's first day, month ends and last day
    const balanceRows = [
        ...chart.livePts.map((p, i) => ({ date: p.date, alpha: p.alpha, change: i === 0 ? null : p.alpha - chart.livePts[i - 1].alpha, kind: 'live' })),
        ...chart.projected
            .filter((p, i, arr) => i === 0 || i === arr.length - 1 || arr[i + 1].date.slice(5, 7) !== p.date.slice(5, 7))
            .map((p) => ({ date: p.date, alpha: p.alpha, change: null, kind: 'projected' })),
    ];

    // ── the monthly chart: receipts up, payments down, the projection on top ──
    const monthSeries = [
        ...(chart.livePts.length ? [
            { name: 'Received', color: 'var(--rv-live)', type: 'bar', stack: 'month', values: months.map((m) => denom.scale(m.received)) },
            { name: 'Spent', color: 'var(--rv-gray-1)', type: 'bar', stack: 'month', values: months.map((m) => -denom.scale(m.spent)), fmt: (v) => denom.fmt(-v) },
        ] : []),
        { name: 'Projected inflow', color: 'var(--rv-reserve)', type: 'bar', stack: 'month', opacity: 0.45, values: months.map((m) => denom.scale(m.projected)) },
    ];
    const monthLegend = chart.livePts.length
        ? [
            { name: 'Received', kind: 'rect', color: 'var(--rv-live)' },
            { name: 'Spent', kind: 'rect', color: 'var(--rv-gray-1)' },
            { name: 'Projected inflow', kind: 'rect', color: 'var(--rv-reserve)', opacity: 0.45 },
        ]
        : [];
    const monthHead = flows
        ? [`${denom.amount(flows.received)} in`, ` → ${denom.amount(flows.spent)} to programs so far`]
        : live ? ['—', ' reading the balance history…']
            : snapshot ? [`${denom.amount(perDay * DAYS_PER_MONTH)} a month`, ' projected · no programs paid']
                : ['—', ''];
    const monthNote = chart.livePts.length
        ? 'Receipts and payments are the rises and falls between daily samples of the chain; the inflow after the last sample is projected at the same momentum as the balance.'
        : 'Every month is projected until the reserve receives emission.';
    const monthAria = `Monthly inflow and program spend, ${unitWord}: ${months.length} months from ${months.length ? monthLong(months[0].month) : ''}${months.length ? ` to ${monthLong(months[months.length - 1].month)}` : ''}${chart.livePts.length ? ', received and spent from the chain, then projected' : ', all projected'}. Arrow keys read each month.`;

    return (
        <div className="reserve-page">
            <header className="reserve-hero reserve-shell">
                <span className="reserve-eyebrow">SN25 · Miner emissions</span>
                <h1>{reserve.name}</h1>
                <p className="reserve-tagline">{reserve.tagline}</p>
                <div className="reserve-rule" aria-hidden="true" />
                <p className="reserve-lede">
                    SN25's miner emissions are split two ways: momentum, paid to providers now, and the reserve, which receives the rest. The reserve pays providers for verified network capacity: more coverage, more reliable routes, and capacity for new Network Operators.
                </p>
                <div className="reserve-facts">
                    <div className="reserve-formula">
                        <span className="reserve-fact-label">Formula</span>
                        <p className="reserve-formula-eq">
                            <span className="reserve-nw"><span className="is-reserve">Reserve</span> =</span>{' '}
                            <span className="reserve-nw">miner emissions ×</span>{' '}
                            <span className="reserve-nw">(1 − <span className="is-momentum">momentum</span>)</span>
                        </p>
                        <p className="reserve-formula-calc">
                            <span className="reserve-nw">{calcLabel}</span>{' '}
                            <span className="reserve-nw">{whole(perDay)} α a day</span>{' '}
                            <span className="reserve-nw">= {whole(minerPerDay)} α a day</span>{' '}
                            <span className="reserve-nw">× (1 − {pct(momentum)}{burnedShare >= 0.0005 ? ` − ${pct(burnedShare)} burned` : ''})</span>
                        </p>
                        <p className="reserve-formula-def">
                            <dfn>Momentum</dfn> is the share of the miner emissions used now to power the network, as rewards to providers: {fromChain ? `${pct(momentum)} at block ${whole(snapshot.block)}, from ${pct(launchMomentum)} at launch` : `${pct(launchMomentum)} at launch`}. The reserve is not a fixed share. It receives whatever momentum does not use, so it receives less as momentum grows.
                            {live && !fromChain && routing ? ` The chain shows no momentum yet: at block ${whole(snapshot.block)} the reserve's recipients receive ${pct(routing.reserve)} of the miner allocation, and the page follows the chain's momentum once it is at least 0.1%.` : ''}
                        </p>
                    </div>
                    <div className="reserve-wallet">
                        <span className="reserve-fact-label">Reserve wallet</span>
                        <div className="reserve-wallet-row">
                            <Address value={reserve.address} codeRef={addressRef} />
                            <span className="reserve-wallet-actions">
                                <button type="button" className="reserve-copy" data-state={copied ? 'copied' : undefined} onClick={copyAddress}>
                                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        {copied
                                            ? <path d="M3.2 8.4l3 3 6.6-6.8" />
                                            : <><rect x="5.5" y="5.5" width="8" height="8" rx="1.6" /><path d="M10.5 5.5V4.1a1.6 1.6 0 0 0-1.6-1.6H4.1a1.6 1.6 0 0 0-1.6 1.6v4.8a1.6 1.6 0 0 0 1.6 1.6h1.4" /></>}
                                    </svg>
                                    {/* both words are laid in one cell, so the button is the same size in either state */}
                                    <span className="reserve-copy-label">
                                        <span data-shown={!copied}>Copy</span>
                                        <span data-shown={copied}>Copied</span>
                                    </span>
                                    <span className="reserve-visually-hidden"> the wallet address</span>
                                </button>
                                <a className="reserve-wallet-link" href={reserve.explorerUrl} target="_blank" rel="noopener noreferrer">View on Taostats <span aria-hidden="true">↗</span></a>
                            </span>
                            <span className="reserve-visually-hidden" role="status">{copied ? 'Copied to the clipboard' : ''}</span>
                        </div>
                    </div>
                </div>
                {/* the chain's status and the display unit: one row above the figures */}
                <div className="reserve-bar">
                    <p className="reserve-status" data-state={statusState}>
                        <i aria-hidden="true" />
                        <span>{status[0]}<span className="reserve-status-more">{status[1]}</span>{status[2]}</span>
                    </p>
                    <UnitToggle denom={denom} />
                </div>
                <div className="reserve-proof">
                    {stats.map((s) => <Stat key={s.label} {...s} />)}
                </div>
                <PriceNote denom={denom} />
                {/* in the page's HTML, for a reader or an agent that does not run it:
                    where the figures come from and where to check them */}
                <p className="reserve-verify">
                    Verify it yourself: these figures are read from Bittensor mainnet in your browser. The reserve is held by coldkey <code translate="no">{reserve.address}</code>; see it on <a href={reserve.explorerUrl} target="_blank" rel="noopener noreferrer">Taostats</a>.
                </p>
            </header>

            <section className="reserve-block" id="balance" aria-labelledby="reserve-balance-h">
                <div className="reserve-shell">
                    <span className="reserve-kicker">01 / The reserve</span>
                    <h2 id="reserve-balance-h">Watch the reserve grow.</h2>
                    <p className="reserve-sub">
                        {chart.livePts.length
                            ? `The balance and its flows by month, read from finalized chain state and projected to ${dateLabel(reserve.projectThrough)} at momentum's ${fromChain ? 'on-chain' : 'launch'} value.`
                            : `What the policy implies until the reserve receives emission: miner emissions × (1 − momentum), with momentum at ${momentumBasis}, and no programs paid.`}
                    </p>

                    <div className="reserve-charts">
                        <div className="reserve-card reserve-chart-card">
                            <div className="reserve-card-head">
                                <span className="reserve-card-label">{balanceLabel}</span>
                                <Legend items={balanceLegend} />
                            </div>
                            <p className="reserve-card-num">
                                <span>{snapshot ? denom.amount(snapshot.alpha) : '—'}</span>
                                {end && chart.projected.length > 0 && <span className="is-dim"> → {denom.short(end.alpha)} by {dateLabel(end.date)}</span>}
                            </p>
                            {chart.points.length === 0 && <p className="reserve-chart-note">Nothing to chart yet: the reserve has received no emission.</p>}
                            {chart.points.length > 0 && (
                                <XYChart
                                    labels={chart.points.map((p) => dateLabel(p.date))}
                                    series={balanceSeries}
                                    marks={todayMarks}
                                    fmt={denom.fmt}
                                    axisFmt={denom.axis}
                                    aria={balanceAria}
                                />
                            )}
                            <p className="reserve-card-note">
                                {balanceNote}
                                {live && !historyReady ? ' Reading the balance history…' : ''}
                            </p>
                            {balanceRows.length > 0 && (
                                <details className="reserve-table">
                                    <summary><span>Show as a table · <Alpha /></span></summary>
                                    <div className="reserve-table-scroll">
                                        <table>
                                            <thead><tr><th scope="col">Day</th><th scope="col">Balance</th><th scope="col">Change</th><th scope="col">Basis</th></tr></thead>
                                            <tbody>
                                                {balanceRows.map((r) => (
                                                    <tr key={`${r.kind}-${r.date}`}>
                                                        <td>{shortDateYear(r.date)}</td>
                                                        <td>{fmtAlpha(r.alpha, 1)}</td>
                                                        <td>{r.change == null ? '—' : `${r.change >= 0 ? '+' : '−'}${fmtAlpha(Math.abs(r.change), 1)}`}</td>
                                                        <td>{r.kind === 'live' ? 'Chain' : 'Projected'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            )}
                        </div>

                        <div className="reserve-card reserve-chart-card">
                            <div className="reserve-card-head">
                                <span className="reserve-card-label">Monthly inflow · program spend</span>
                                <Legend items={monthLegend} />
                            </div>
                            <p className="reserve-card-num">
                                <span>{monthHead[0]}</span>
                                {monthHead[1] && <span className="is-dim">{monthHead[1]}</span>}
                            </p>
                            {months.length === 0 && <p className="reserve-chart-note">Nothing to chart yet: the reserve has received no emission.</p>}
                            {months.length > 0 && (
                                <XYChart
                                    labels={months.map((m) => monthLabel(m.month))}
                                    tipLabels={months.map((m) => monthLong(m.month))}
                                    series={monthSeries}
                                    fmt={denom.fmt}
                                    axisFmt={denom.axis}
                                    aria={monthAria}
                                />
                            )}
                            <p className="reserve-card-note">{monthNote}</p>
                            {months.length > 0 && (
                                <details className="reserve-table">
                                    <summary><span>Show as a table · <Alpha /></span></summary>
                                    <div className="reserve-table-scroll">
                                        <table>
                                            <thead><tr><th scope="col">Month</th><th scope="col">Received</th><th scope="col">Spent</th><th scope="col">Projected</th></tr></thead>
                                            <tbody>
                                                {months.map((m) => (
                                                    <tr key={m.month}>
                                                        <td>{monthLabel(m.month)}</td>
                                                        <td>{m.received ? fmtAlpha(m.received, 1) : '—'}</td>
                                                        <td>{m.spent ? fmtAlpha(m.spent, 1) : '—'}</td>
                                                        <td>{m.projected ? fmtAlpha(m.projected, 1) : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>

                    {flows && flows.received > 0 && (flows.spent > 0 || earmarked > 0) && (
                        <SplitBar
                            title="Everything the reserve has received"
                            meta={denom.short(flows.received)}
                            fmt={(v) => denom.short(v)}
                            segments={[
                                { label: 'Spent', value: flows.spent, color: 'var(--rv-gray-1)' },
                                { label: 'Committed', value: Math.min(earmarked, Math.max(0, flows.received - flows.spent)), color: 'var(--rv-reserve)', className: 'is-earmarked' },
                                { label: 'Unallocated', value: Math.max(0, flows.received - flows.spent - earmarked), color: 'var(--rv-reserve)' },
                            ]}
                        />
                    )}

                    <h3 className="reserve-h3">Where the miner allocation goes</h3>
                    <div className="reserve-splits">
                        <SplitBar
                            title="SN25 emission"
                            meta={`${whole(emission.alphaPerDay)} α a day`}
                            fmt={(v) => `${whole(v)} α a day`}
                            segments={[
                                { label: 'Subnet owner', value: emission.ownerPerDay, color: 'var(--rv-gray-2)' },
                                { label: 'Validators', value: emission.validatorPerDay, color: 'var(--rv-gray-1)' },
                                { label: 'Miner allocation', value: emission.minerPerDay, color: 'var(--rv-reserve)' },
                            ]}
                            note={`The owner share is ${pct(emission.ownerCut, 0)}; validators and miners split the rest evenly.`}
                        />
                        {routing ? (
                            <SplitBar
                                title="Miner allocation, on chain now"
                                meta={`${whole(minerPerDay)} α a day`}
                                fmt={(v) => `${whole(v)} α a day`}
                                segments={[
                                    { label: 'Momentum, to providers', value: minerPerDay * otherShare, color: 'var(--rv-providers)' },
                                    { label: 'Reserve', value: minerPerDay * routing.reserve, color: 'var(--rv-reserve)' },
                                    { label: 'Owner-directed, burned', value: minerPerDay * routing.burned, color: 'var(--rv-burn)' },
                                ]}
                                note={live
                                    ? `The reserve receives what momentum leaves: 1 − momentum. At this block its recipients take ${pct(routing.reserve)} of the miner allocation and momentum on chain is ${pct(otherShare)}${fromChain ? ', the value the page uses' : `, below the 0.1% the page follows, so the formula keeps momentum's launch value of ${pct(launchMomentum)}`}.`
                                    : fromChain
                                        ? `Momentum is on chain now: ${pct(momentum)} of the miner allocation (${whole(momentumPerDay)} α a day) goes to providers. The reserve receives the rest, 1 − momentum (${whole(perDay)} α a day), once its hotkeys are paid.`
                                        : `From ${shortDate(reserve.launch)}, momentum goes to providers, ${pct(launchMomentum)} at launch (${whole(momentumPerDay)} α a day), and the reserve receives the rest, 1 − momentum (${whole(perDay)} α a day). Until then the chain burns the owner-directed share.`}
                            />
                        ) : (
                            <SplitBar
                                title={`Miner allocation from ${shortDate(reserve.launch)}`}
                                meta={`${whole(minerPerDay)} α a day`}
                                fmt={(v) => `${whole(v)} α a day`}
                                segments={[
                                    { label: 'Momentum, to providers', value: momentumPerDay, color: 'var(--rv-providers)' },
                                    { label: 'Reserve, 1 − momentum', value: perDay, color: 'var(--rv-reserve)' },
                                ]}
                                note={`Momentum at its launch value, ${pct(launchMomentum)}. The live split shows once the chain answers.`}
                            />
                        )}
                    </div>
                </div>
            </section>

            <section className="reserve-block" id="program-types" aria-labelledby="reserve-types-h">
                <div className="reserve-shell">
                    <span className="reserve-kicker">02 / Program types</span>
                    <h2 id="reserve-types-h">What the reserve pays for.</h2>
                    <p className="reserve-sub">Programs buy services from providers, not equipment.</p>
                    <div className="reserve-boundary">
                        {reserve.programTypes.map((t) => (
                            <article key={t.tag}>
                                <b className="reserve-type-tag">{t.tag}</b>
                                <h3>{t.title}</h3>
                                <p>{t.summary}</p>
                                <dl>
                                    <div><dt>Verified by</dt><dd>{t.verifiedBy}</dd></div>
                                    <div><dt>Paid as</dt><dd>{t.paidAs}</dd></div>
                                </dl>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="reserve-block" id="programs" aria-labelledby="reserve-programs-h">
                <div className="reserve-shell">
                    <span className="reserve-kicker">03 / Programs</span>
                    <h2 id="reserve-programs-h">Current programs.</h2>
                    <p className="reserve-sub">
                        Programs are published here before they are paid. One in preparation is having its terms prepared; an indicative one is expected but not yet approved. A program is active only once its terms are published and providers have accepted them, and its size and payments appear with it.{activePrograms.length === 0 ? ' None is active yet.' : ''}
                    </p>
                    <div className="reserve-programs-bar">
                        <div className="reserve-chips" role="group" aria-label="Filter programs by status">
                            <span className="reserve-card-label">Programs</span>
                            {statusesPresent.length > 1 && (
                                <>
                                    <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All · {reserve.programs.length}</button>
                                    {statusesPresent.map((s) => (
                                        <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>
                                            {reserve.programStatus[s]} · {countOf(s)}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                        <span className="reserve-programs-count">
                            {earmarked > 0 ? `${denom.short(earmarked)} committed · ${activePrograms.length} active` : `Nothing committed yet · ${activePrograms.length || 'none'} active`}
                        </span>
                    </div>
                    <div className="reserve-card reserve-table-card">
                        <table className="reserve-programs" role="table">
                            <thead>
                                <tr role="row">
                                    <th role="columnheader" scope="col">Program</th>
                                    <th role="columnheader" scope="col">Type</th>
                                    <th role="columnheader" scope="col">Pays</th>
                                    {hasFigures && <th role="columnheader" scope="col" className="is-num">Size</th>}
                                    {hasFigures && <th role="columnheader" scope="col">Paid</th>}
                                    <th role="columnheader" scope="col">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shownPrograms.map((p) => {
                                    const paid = p.payments.reduce((s, x) => s + x.alpha, 0);
                                    return (
                                        <tr key={p.id} role="row">
                                            <td role="cell" data-label="Program">
                                                <b>{p.title}</b>
                                                <span className="reserve-program-sum">{p.summary}</span>
                                                {/* the phone card's one meta line; the columns are hidden there */}
                                                <span className="reserve-program-meta">{[p.type, p.payRule || 'Terms to be published', ...(p.ceilingAlpha != null ? [`${denom.short(p.ceilingAlpha)} ceiling`, `${pct(paid / p.ceilingAlpha, 0)} paid`] : [])].join(' · ')}</span>
                                            </td>
                                            <td role="cell" data-label="Type" className="reserve-program-col">{p.type}</td>
                                            <td role="cell" data-label="Pays" className="reserve-program-col">{p.payRule || <span className="is-dim">Terms to be published</span>}</td>
                                            {hasFigures && <td role="cell" data-label="Size" className="is-num reserve-program-col">{p.ceilingAlpha != null ? denom.short(p.ceilingAlpha) : '—'}</td>}
                                            {hasFigures && (
                                                <td role="cell" data-label="Paid" className="reserve-program-col">
                                                    {p.ceilingAlpha != null ? (
                                                        <span className="reserve-paid" aria-label={`${fmtAlpha(paid)} α paid of a ${fmtAlpha(p.ceilingAlpha)} α ceiling`}>
                                                            <span className="reserve-use" aria-hidden="true"><i style={{ width: `${Math.min(100, (paid / p.ceilingAlpha) * 100)}%` }} /></span>
                                                            <span>{pct(paid / p.ceilingAlpha, 0)}</span>
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                            )}
                                            <td role="cell" data-label="Status" className="reserve-program-status"><span className="reserve-pill" data-status={p.status}>{reserve.programStatus[p.status]}</span></td>
                                        </tr>
                                    );
                                })}
                                {shownPrograms.length === 0 && (
                                    <tr role="row"><td role="cell" colSpan={hasFigures ? 6 : 4} className="reserve-programs-empty">No program has this status.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="reserve-block" id="process" aria-labelledby="reserve-process-h">
                <div className="reserve-shell">
                    <span className="reserve-kicker">04 / How a program goes live</span>
                    <h2 id="reserve-process-h">Published first, paid last.</h2>
                    <div className="reserve-steps">
                        {reserve.steps.map((s, i) => (
                            <div key={s.title}>
                                <span className="reserve-k">{String(i + 1).padStart(2, '0')}</span>
                                <b>{s.title}</b>
                                <p>{s.detail}</p>
                            </div>
                        ))}
                    </div>

                    <h3 className="reserve-custody-h">Custody</h3>
                    <div className="reserve-custody-cards">
                        <div className="reserve-card reserve-custody-card">
                            <div className="reserve-card-head">
                                <span className="reserve-card-label">Reserve account · {reserve.custody.threshold} multisig</span>
                                {snapshot && <span className="reserve-pill" data-status={live ? 'active' : 'preparing'}>{live ? 'On chain' : 'Awaiting funds'}</span>}
                            </div>
                            <Address value={reserve.address} />
                            <p className="reserve-card-text">
                                {reserve.custody.modeNote}
                                {snapshot ? ` It holds ${snapshot.account.freeTao.toFixed(4)} TAO free at block ${whole(snapshot.block)}.` : ''}
                            </p>
                            <dl className="reserve-recipients">
                                <dt>Recipient hotkeys</dt>
                                {!snapshot ? <dd>—</dd> : snapshot.hotkeys.length === 0 ? <dd>Not yet registered</dd> : snapshot.hotkeys.map((h) => (
                                    <dd key={h.hotkey}>
                                        <code title={h.hotkey} translate="no">{shortKey(h.hotkey)}</code> UID {h.uid ?? '—'} · {pct(h.incentiveShare)} of incentive{h.registeredAt ? ` · registered at block ${whole(h.registeredAt)}` : ''}
                                    </dd>
                                ))}
                            </dl>
                            <a className="reserve-wallet-link" href={reserve.explorerUrl} target="_blank" rel="noopener noreferrer">View on Taostats <span aria-hidden="true">↗</span></a>
                        </div>
                        <div className="reserve-card reserve-custody-card">
                            <div className="reserve-card-head">
                                <span className="reserve-card-label">Signers · {reserve.custody.threshold}</span>
                            </div>
                            <ul className="reserve-signers">
                                {reserve.custody.signers.map((s) => (
                                    <li key={s.label}><span>{s.label}</span><Address value={s.address} /></li>
                                ))}
                            </ul>
                            <p className="reserve-card-text">
                                {reserve.custody.thresholdNote}{' '}
                                {derivesAccount
                                    ? `These ${reserve.custody.signers.length} keys at threshold ${reserve.custody.multisigThreshold} derive the reserve account above.`
                                    : 'These keys do not derive the reserve account above: check the published signers.'}
                                {' '}Identities are not published.
                            </p>
                        </div>
                    </div>

                    <div className="reserve-ctas">
                        <a className="reserve-cta" href={reserve.contactUrl} target="_blank" rel="noopener noreferrer">Talk to UR team <span aria-hidden="true">↗</span></a>
                        <a className="reserve-link" href={reserve.minerGuideUrl}>Read the miner guide <span aria-hidden="true">→</span></a>
                        <a className="reserve-link" href={reserve.policyUrl} target="_blank" rel="noopener noreferrer">Emission policy on GitHub <span aria-hidden="true">↗</span></a>
                    </div>
                </div>
            </section>

            <section className="reserve-block reserve-fine-block" aria-label="Methodology">
                <div className="reserve-shell">
                    <p className="reserve-fine">
                        <span><b>Mechanism.</b> SN25 emits {whole(emission.alphaPerDay)} α a day: {pct(emission.ownerCut, 0)} to the subnet owner and the rest split evenly between validators and miners, so the miner allocation is {whole(minerPerDay)} α a day. From {shortDate(reserve.launch)}, momentum, the share used now to power the network, goes to providers as rewards: {pct(launchMomentum)} at launch. The reserve's recipient hotkeys receive the rest, miner emissions × (1 − momentum), so the reserve's share is not fixed. It falls as momentum grows. The page keeps momentum at its launch value until the chain shows one of at least 0.1%, then follows the chain.</span>
                        {snapshot && !live && (
                            <span><b>{overdue ? 'Before the first receipt.' : 'Before launch.'}</b> At finalized block {whole(snapshot.block)} ({timeUtc(snapshot.time)}) {pct(snapshot.routing.burned, 0)} of the miner allocation was directed to the subnet owner hotkey and burned by the chain, and the reserve account held nothing. The projection holds momentum at {fromChain ? `its value on chain now, ${pct(momentum)},` : 'its launch value'} and assumes no program payments.</span>
                        )}
                        {snapshot && live && (
                            <span><b>Balance.</b> The reserve is α staked on SN25 under its recipient hotkeys, owned by coldkey {shortKey(reserve.address)}, read from finalized chain state (block {whole(snapshot.block)}, {timeUtc(snapshot.time)}); any free TAO is shown separately. At this block the chain routes {pct(routing.reserve)} of the miner allocation to those hotkeys{routing.burned >= 0.0005 ? `, burns ${pct(routing.burned)}` : ''} and pays providers {pct(otherShare)}. Receipts and payments are the rises and falls between daily samples, from the recipients' registration{Number.isFinite(firstRegistration) ? ` at block ${whole(firstRegistration)}` : ''}; the projection continues from the latest balance at momentum's {fromChain ? 'on-chain' : 'launch'} value and assumes no program payments.</span>
                        )}
                        {priceTao && (
                            <span><b>Valuation.</b> TAO figures are a spot mark, not a realisable value: α at {priceTao.toFixed(6)} TAO, the SN25 pool's ratio of TAO in to α in at this block.{denom.usd
                                ? (denom.rate != null
                                    ? ` USD figures are α times the live α price, ${fmtUsd(denom.rate)} from ${denom.sourceLabel} at ${timeUtc(denom.at)}: a spot mark too.`
                                    : ' No α price has been read yet, so no USD figure is shown.')
                                : ' No USD figure is shown while the display unit is α.'}</span>
                        )}
                        <span><b>Sources.</b> The chain figures are read by your browser from Bittensor mainnet through its public RPC endpoints ({FINNEY_RPC.map(hostOf).join(', ')}; {FINNEY_ARCHIVE.map(hostOf).join(', ')} for history), so those hosts see the request. With USD selected, the α price is read from the network operators' stats feeds or CoinGecko's GeckoTerminal feed ({PRICE_HOSTS.join(', ')}). Nothing else is contacted. Account {reserve.accountId}.</span>
                    </p>
                </div>
            </section>
        </div>
    );
}
