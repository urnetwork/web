import React, { useEffect, useMemo, useRef, useState } from 'react';
import { reserve, publishedPrograms } from '../../data/reserve';
import { isLive, useReserve } from '../../lib/useReserve';
import { FINNEY_ARCHIVE, FINNEY_RPC } from '../../lib/subtensor';
import { copyText } from '../../lib/clipboard';
import XYChart from './reserve/XYChart';
import SplitBar from './reserve/SplitBar';
import { axisCompact, compact, whole, alpha as fmtAlpha, pct, shortDate, longDate, isoDay, timeUtc, daysBetween } from './reserve/format';
import { flowsOf, observedInflow } from './reserve/projection';
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
 * SN25 pool and emission, and how the miner allocation is routed. The
 * reserve is not a fixed share of it: momentum, the share paid to providers
 * now, comes out of the miner emissions and the reserve receives the rest,
 * miner emissions × (1 − momentum). The chart shows observed balance history
 * through the latest finalized reading, without a projection. Amounts
 * are in α, with a TAO mark at the SN25 pool's own ratio; the page shows no
 * fiat value, so it reads nothing but the chain.
 *
 * The server render carries no chain data and no calendar (hydration stays
 * deterministic); the client fills both in and keeps them fresh.
 */

// The emission schedule shown until the chain answers:
// 1 α per block (7,200 a day), an 18% owner share,
// and the remainder split evenly between validators and miners.
const FALLBACK_EMISSION = { alphaPerDay: 7200, ownerCut: 11_796 / 65_535 };
const minerPerDayOf = (em) => (em.alphaPerDay * (1 - em.ownerCut)) / 2;

const shortKey = (key) => `${key.slice(0, 6)}…${key.slice(-4)}`;
// the wallet address breaks, if it must, only at its middle: two even rows
const ADDRESS_HALF = Math.ceil(reserve.address.length / 2);
const hostOf = (url) => new URL(url).host;

function Stat({ label, value, sub }) {
    return (
        <span className="reserve-stat">
            <span className="reserve-stat-label">{label}</span>
            <b>{value}</b>
            <small>{sub || '\u00a0'}</small>
        </span>
    );
}

export default function ReservePage() {
    const { snapshot, history, historyReady, error, updatedAt } = useReserve({ address: reserve.address, netuid: reserve.netuid, launch: reserve.launch });
    // the calendar is read on the client: the server render has no "today"
    const [today, setToday] = useState(null);
    useEffect(() => { setToday(isoDay(Date.now())); }, [updatedAt]);

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
    // goes to neither the reserve's hotkeys nor the burn, once providers are
    // paid on chain or the reserve has received anything.
    const routing = snapshot?.routing;
    const otherShare = routing ? Math.max(0, 1 - routing.reserve - routing.burned) : 0;
    const launchMomentum = reserve.launchMomentumBps / 10_000;
    const { momentum, fromChain, burned: burnedShare } = momentumOf({ routing, live, launchMomentum });
    const perDay = inflowPerDay(minerPerDay, momentum, burnedShare);
    const momentumPerDay = minerPerDay * momentum;
    // TAO per α at the pool's reserves: the one valuation the page shows
    const priceTao = snapshot?.pool.priceTao ?? null;
    const daysToLaunch = today ? daysBetween(today, reserve.launch) : null;

    const overdue = !live && daysToLaunch != null && daysToLaunch <= 0;

    // Keep the latest observed balance for each UTC day.
    const chart = useMemo(() => {
        const byDay = new Map();
        if (live && history?.length) {
            for (const sample of history) {
                const date = isoDay(sample.time);
                byDay.set(date, { ...sample, date });
            }
        }
        const points = [...byDay.values()];
        return { livePts: points, points, liveValues: points.map((p) => p.alpha) };
    }, [history, live]);
    const end = chart.points[chart.points.length - 1] || null;
    // receipts, payments and the observed inflow need the whole history, not
    // only the snapshot's own point
    const flows = historyReady && chart.livePts.length ? flowsOf(chart.livePts) : null;
    const observed = historyReady && chart.livePts.length ? observedInflow(chart.livePts) : null;

    // ── programs with a published ceiling ──
    const earmarked = publishedPrograms.reduce((s, p) => s + Math.max(0, (p.ceilingAlpha || 0) - p.payments.reduce((t, x) => t + x.alpha, 0)), 0);
    const allIndicative = reserve.firstPrograms.every((p) => p.status === 'indicative');

    const status = !snapshot
        ? (error ? 'Chain read unavailable · retrying' : 'Reading Bittensor mainnet…')
        : live
            ? `Live · Bittensor mainnet · finalized block ${whole(snapshot.block)}`
            : `${overdue ? 'Awaiting the first receipt' : 'Pre-launch'} · block ${whole(snapshot.block)}`;
    const statusState = !snapshot ? (error ? 'error' : 'loading') : live ? 'live' : 'pre';

    const custodyStat = { label: 'Custody', value: `${reserve.custody.threshold} multisig` };
    const stats = live
        ? [
            observed && observed.perDay < 0
                ? { label: 'Net change per day', value: `−${whole(-observed.perDay)} α`, sub: `observed, last ${observed.days} days` }
                : { label: 'Inflow per day', value: `${whole(observed?.perDay ?? perDay)} α`, sub: observed ? `observed, last ${observed.days} days` : 'miner emissions × (1 − momentum)' },
            { label: 'In the reserve', value: `${compact(snapshot.alpha)} α`, sub: `${snapshot.account.freeTao ? `+ ${snapshot.account.freeTao.toFixed(2)} TAO free · ` : ''}${priceTao ? `≈ ${compact(snapshot.alpha * priceTao)} TAO spot` : ''}` },
            custodyStat,
        ]
        : [
            { label: 'Inflow per day', value: `${whole(perDay)} α`, sub: 'miner emissions × (1 − momentum)' },
            { label: 'In the reserve', value: snapshot ? `${compact(snapshot.alpha)} α` : '—' },
            custodyStat,
        ];

    const chartFmt = (v) => `${compact(v)} α${priceTao ? ` · ≈ ${compact(v * priceTao)} TAO` : ''}`;
    const chartSeries = [
        ...(chart.livePts.length ? [{ name: 'Live balance', color: 'var(--rv-live)', type: 'area', values: chart.liveValues }] : []),
    ];
    const chartTag = end ? `Live to ${shortDate(end.date)}` : '';

    const tableRows = chart.livePts.map((p, i) => ({ date: p.date, alpha: p.alpha, change: i === 0 ? null : p.alpha - chart.livePts[i - 1].alpha }));

    return (
        <div className="reserve-page">
            <header className="reserve-hero reserve-shell">
                <span className="reserve-eyebrow">SN25 · Miner emissions</span>
                <h1>{reserve.name}</h1>
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
                            <span className="reserve-nw">{live && routing ? `At block ${whole(snapshot.block)}:` : fromChain ? 'At the current momentum:' : 'At launch:'}</span>{' '}
                            <span className="reserve-nw">{whole(perDay)} α a day</span>{' '}
                            <span className="reserve-nw">= {whole(minerPerDay)} α a day</span>{' '}
                            <span className="reserve-nw">× (1 − momentum{burnedShare >= 0.0005 ? ` − ${pct(burnedShare)} burned` : ''})</span>
                        </p>
                        <p className="reserve-formula-def">
                            <dfn>Momentum</dfn> is the share of the miner emissions used now to power the network, as rewards to providers. The reserve is not a fixed share. It receives whatever momentum does not use, so it receives less as momentum grows.
                        </p>
                    </div>
                    <div className="reserve-wallet">
                        <span className="reserve-fact-label">Reserve wallet</span>
                        <div className="reserve-wallet-row">
                            <code ref={addressRef} className="reserve-address" translate="no">
                                <span>{reserve.address.slice(0, ADDRESS_HALF)}</span><wbr /><span>{reserve.address.slice(ADDRESS_HALF)}</span>
                            </code>
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
                <p className="reserve-status" data-state={statusState}><i aria-hidden="true" /><span>{status}</span></p>
                <div className="reserve-proof">
                    {stats.map((s) => <Stat key={s.label} {...s} />)}
                </div>
                {/* in the page's HTML, for a reader or an agent that does not run it:
                    where the figures come from and where to check them */}
                <p className="reserve-verify">
                    Verify it yourself: these figures are read from Bittensor mainnet in your browser. The reserve is held by coldkey <code translate="no">{reserve.address}</code>; see it on <a href={reserve.explorerUrl} target="_blank" rel="noopener noreferrer">Taostats</a>.
                </p>
            </header>

            <section className="reserve-block" id="balance" aria-labelledby="reserve-balance-h">
                <div className="reserve-shell">
                    <span className="reserve-kicker">01 / The reserve</span>
                    <h2 id="reserve-balance-h">Reserve balance.</h2>
                    <p className="reserve-sub">Live balance sampled daily from finalized chain state.</p>

                    <div className="reserve-panel">
                        <div className="reserve-panel-head">
                            <b>{snapshot ? `${compact(snapshot.alpha)} α` : '—'}</b>
                            <span className="reserve-tag">{chartTag}</span>
                        </div>
                        {chart.points.length === 0 && <p className="reserve-chart-note">{!snapshot ? (error ? 'Chain read unavailable · retrying' : 'Reading Bittensor mainnet…') : 'Nothing to chart yet: the reserve has received no emission.'}</p>}
                        {/* two geometries of the same chart; Reserve.css shows the one that fits */}
                        {chart.points.length > 0 && [false, true].map((narrow) => (
                            <XYChart
                                key={narrow ? 'narrow' : 'wide'}
                                className={narrow ? 'is-narrow' : 'is-wide'}
                                compact={narrow}
                                width={narrow ? 420 : 960}
                                height={narrow ? 280 : 300}
                                labels={chart.points.map((p) => shortDate(p.date))}
                                series={chartSeries}
                                fmt={chartFmt}
                                axisFmt={axisCompact}
                                aria={`Reserve balance, α: live to ${shortDate(end.date)}. Arrow keys read each sample.`}
                            />
                        ))}
                        <div className="reserve-legend">
                            {chart.livePts.length > 0 && <span><i className="is-live" />Live balance</span>}
                            {live && !historyReady && <span className="is-note">Reading the balance history…</span>}
                        </div>
                        {tableRows.length > 0 && (
                            <details className="reserve-table">
                                <summary>Show as a table</summary>
                                <div className="reserve-table-scroll">
                                    <table>
                                        <thead><tr><th scope="col">Day</th><th scope="col">Balance, α</th><th scope="col">Change, α</th><th scope="col">Basis</th></tr></thead>
                                        <tbody>
                                            {tableRows.map((r) => (
                                                <tr key={r.date}>
                                                    <td>{longDate(r.date)}</td>
                                                    <td>{fmtAlpha(r.alpha, 1)}</td>
                                                    <td>{r.change == null ? '—' : `${r.change >= 0 ? '+' : '−'}${fmtAlpha(Math.abs(r.change), 1)}`}</td>
                                                    <td>Chain</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </details>
                        )}
                    </div>

                    {flows && (
                        <div className="reserve-kpis" aria-label="What the reserve has received and spent">
                            <Stat label="Received" value={`${compact(flows.received)} α`} sub="since the first sample" />
                            <Stat label="Spent" value={`${compact(flows.spent)} α`} sub={flows.spent > 0 ? `${pct(flows.spent / Math.max(flows.received, 1e-9))} of received` : 'no payments yet'} />
                            <Stat label="Earmarked" value={`${compact(earmarked)} α`} sub={publishedPrograms.length ? `${publishedPrograms.length} published program${publishedPrograms.length === 1 ? '' : 's'}` : 'no published programs'} />
                            <Stat label="Unallocated" value={`${compact(Math.max(0, snapshot.alpha - earmarked))} α`} sub="free for new programs" />
                        </div>
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
                                showPercentages={false}
                                meta={`${whole(minerPerDay)} α a day`}
                                fmt={(v) => `${whole(v)} α a day`}
                                segments={[
                                    { label: 'Momentum, to providers', value: minerPerDay * otherShare, color: 'var(--rv-providers)' },
                                    { label: 'Reserve', value: minerPerDay * routing.reserve, color: 'var(--rv-reserve)' },
                                    { label: 'Owner-directed, burned', value: minerPerDay * routing.burned, color: 'var(--rv-burn)' },
                                ]}
                                note={live
                                    ? 'The reserve receives what momentum leaves: 1 − momentum.'
                                    : fromChain
                                        ? `Momentum is on chain now: ${whole(momentumPerDay)} α a day goes to providers. The reserve receives the rest, 1 − momentum (${whole(perDay)} α a day), once its hotkeys are paid.`
                                        : `From ${shortDate(reserve.launch)}, momentum goes to providers (${whole(momentumPerDay)} α a day), and the reserve receives the rest, 1 − momentum (${whole(perDay)} α a day). Until then the chain burns the owner-directed share.`}
                            />
                        ) : (
                            <SplitBar
                                title={`Miner allocation from ${shortDate(reserve.launch)}`}
                                showPercentages={false}
                                meta={`${whole(minerPerDay)} α a day`}
                                fmt={(v) => `${whole(v)} α a day`}
                                segments={[
                                    { label: 'Momentum, to providers', value: momentumPerDay, color: 'var(--rv-providers)' },
                                    { label: 'Reserve, 1 − momentum', value: perDay, color: 'var(--rv-reserve)' },
                                ]}
                                note="The live split shows once the chain answers."
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

            <section className="reserve-block" id="first-programs" aria-labelledby="reserve-first-h">
                <div className="reserve-shell">
                    <span className="reserve-kicker">03 / First programs</span>
                    <h2 id="reserve-first-h">What to expect first.</h2>
                    <p className="reserve-sub">The first programs being prepared.</p>
                    {allIndicative && <span className="reserve-indicative">Indicative · not approved</span>}
                    <ol className="reserve-expect">
                        {reserve.firstPrograms.map((p, i) => {
                            const paid = p.payments.reduce((s, x) => s + x.alpha, 0);
                            return (
                                <li key={p.id}>
                                    <span className="reserve-n">{String(i + 1).padStart(2, '0')}</span>
                                    <div>
                                        <h3>{p.title}</h3>
                                        <p>{p.summary}</p>
                                        {p.ceilingAlpha != null && (
                                            <div className="reserve-use" aria-label={`${fmtAlpha(paid)} α paid of a ${fmtAlpha(p.ceilingAlpha)} α ceiling`}>
                                                <i style={{ width: `${Math.min(100, (paid / p.ceilingAlpha) * 100)}%` }} />
                                            </div>
                                        )}
                                    </div>
                                    <span className="reserve-pay">
                                        {p.type} · {p.payRule}
                                        {p.ceilingAlpha != null && <small>{compact(paid)} α paid of {compact(p.ceilingAlpha)} α ceiling</small>}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
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
                    <dl className="reserve-custody">
                        <div className="is-wide">
                            <dt>Account</dt>
                            <dd>
                                <code>{reserve.address}</code>
                                <a href={reserve.explorerUrl} target="_blank" rel="noopener noreferrer">View on Taostats <span aria-hidden="true">↗</span></a>
                            </dd>
                        </div>
                        <div>
                            <dt>Recipient hotkeys</dt>
                            <dd>
                                {!snapshot ? '—' : snapshot.hotkeys.length === 0 ? 'Not yet registered' : snapshot.hotkeys.map((h) => (
                                    <span key={h.hotkey} className="reserve-hotkey"><code title={h.hotkey}>{shortKey(h.hotkey)}</code> UID {h.uid ?? '—'}</span>
                                ))}
                            </dd>
                        </div>
                    </dl>

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
                        <span><b>Mechanism.</b> SN25 emits {whole(emission.alphaPerDay)} α a day: {pct(emission.ownerCut, 0)} to the subnet owner and the rest split evenly between validators and miners, so the miner allocation is {whole(minerPerDay)} α a day. From {shortDate(reserve.launch)}, momentum, the share used now to power the network, goes to providers as rewards. The reserve's recipient hotkeys receive the rest, miner emissions × (1 − momentum), so the reserve's share is not fixed. It falls as momentum grows.</span>
                        {snapshot && !live && (
                            <span><b>{overdue ? 'Before the first receipt.' : 'Before launch.'}</b> At finalized block {whole(snapshot.block)} ({timeUtc(snapshot.time)}) {pct(snapshot.routing.burned, 0)} of the miner allocation was directed to the subnet owner hotkey and burned by the chain, and the reserve account held nothing.</span>
                        )}
                        {snapshot && live && (
                            <span><b>Balance.</b> The reserve is α staked on SN25 under its recipient hotkeys, owned by coldkey {shortKey(reserve.address)}, read from finalized chain state (block {whole(snapshot.block)}, {timeUtc(snapshot.time)}); any free TAO is shown separately. Receipts and payments are the rises and falls between daily samples.</span>
                        )}
                        {priceTao && (
                            <span><b>Valuation.</b> TAO figures are a spot mark, not a realisable value: α at {priceTao.toFixed(6)} TAO, the SN25 pool's ratio of TAO in to α in at this block. The page shows no fiat value.</span>
                        )}
                        <span><b>Sources.</b> Everything on this page is read by your browser from Bittensor mainnet through its public RPC endpoints ({FINNEY_RPC.map(hostOf).join(', ')}; {FINNEY_ARCHIVE.map(hostOf).join(', ')} for history), so those hosts see the request. Nothing else is contacted. Account {reserve.accountId}.</span>
                    </p>
                </div>
            </section>
        </div>
    );
}
