import React from 'react';
import Section from '../Section';
import { EXTERNAL, isExternal } from '../../lib/links';
import timeline from '../../data/mainnet-timeline.json';
import { mainnetActions, mainnetAfterEpochs, mainnetBeforeEpochs, mainnetEpochs } from '../../data/mainnet';
import {
    SETTLEMENT_LABEL,
    STATUS_LABEL,
    epochBlocks,
    epochDays,
    epochWhen,
    groupByEpoch,
    isApproximate,
    shortHex,
    sourceRows,
    whenParts,
} from './mainnet/timeline';
import { summaryModel } from './mainnet/summary';
import MainnetSummary from './mainnet/MainnetSummary';
import '../RoadmapTrack.css';
import './Mainnet.css';

/**
 * MainnetPage — the /mainnet page body: the SN25 mainnet launch timeline.
 *
 * Renders only what goes inside <main class="section-page">: the SPA's
 * SectionPage (App.jsx) and the Astro page (astro/src/pages/mainnet.astro)
 * both provide the Disclaimer + Nav + Footer shell around it, so the two
 * renders share one source. The milestones are data
 * (data/mainnet-timeline.json), grouped by the payout epochs of
 * data/mainnet.js and drawn on the roadmap's vertical track
 * (RoadmapTrack.css). The page is English-only, so no i18n lookup, and
 * apart from the summary's "now" it needs no browser: the Astro page renders
 * it to static HTML.
 *
 * `updated` is the day the page's content last changed (the sitemap's
 * lastmod), which only the static build knows; the SPA leaves it out.
 *
 * Under the title, the launch at a glance (mainnet/MainnetSummary.jsx)
 * draws the epochs and the key milestones on one axis, with "now", which
 * needs the visitor's clock. The SPA renders it here; the static page,
 * which renders the rest without script, passes it in as `summary`, an
 * island that hydrates by itself (astro/src/pages/mainnet.astro).
 */
export default function MainnetPage({ updated = null, summary = null }) {
    const groups = groupByEpoch(timeline.events, mainnetEpochs, { before: mainnetBeforeEpochs, after: mainnetAfterEpochs });
    const grouped = new Set(groups.map((group) => group.id));

    return (
        <div className="mainnet-page">
            <MinerActions actions={mainnetActions} />

            <Section id="mainnet" eyebrow="SN25 · Bittensor mainnet" title="Mainnet launch timeline" headingLevel="h1">
                <div className="mainnet-lede">
                    <p>
                        UR's subnet, SN25, went live on Bittensor mainnet on October 8, 2026. This timeline follows the launch by payout epoch, from the version 1 contracts to the first settlement v2 claim.
                    </p>
                    <p className="mainnet-note">
                        Milestones marked <span className="roadmap-flag" data-status="scheduled">Scheduled</span> or <span className="roadmap-flag" data-status="planned">Planned</span> are still ahead, and their dates may change. All times are UTC, and a time marked ≈ is approximate: most are projected from block numbers.
                    </p>
                </div>
                {summary || <MainnetSummary model={summaryModel(timeline.events, mainnetEpochs)} />}
            </Section>

            <Section id="settlement" eyebrow="Settlement" title="Version 1, then settlement v2">
                <p>
                    SN25 pays providers by payout epoch. These are UR's settlement epochs, not the chain's 72-minute tempo: epoch 0 lasted one day, and each later epoch lasts 7 days (50,400 blocks).
                </p>
                <p>
                    Version 1 launched on October 8 and settles epochs 1 to 3. It pays only the providers the validator has measured, and that measurement is capped at about 1,500 providers an epoch, so most miners receive no version 1 share.
                </p>
                <p>
                    Settlement v2 pays by usage and removes that cap. It was planned to take over from epoch 3, but its pool was not registered before epoch 3 began on October 23, so version 1 settles epoch 3 too. Settlement v2 is now targeting epoch 4, starting around October 30 at 18:25 UTC, pending final production checks and the on-chain pool registration before that epoch starts. The first v2 epoch would finish around November 6, with the first v2 claims no earlier than November 8, after the root is submitted and its challenge period ends. These dates are estimates from block production, and activation is confirmed only once the registration has finalized.
                </p>
                <ol className="mainnet-epochs" aria-label="Payout epochs">
                    {mainnetEpochs.map((epoch) => {
                        const id = `epoch-${epoch.number}`;
                        const row = (
                            <>
                                <span className="mainnet-epoch-no">Epoch {epoch.number}</span>{' '}
                                <span className="mainnet-epoch-days"><When parts={whenParts(epochDays(epoch))} /></span>{' '}
                                <span className="mainnet-epoch-by" data-settlement={epoch.settlement}>{SETTLEMENT_LABEL[epoch.settlement]}</span>
                            </>
                        );
                        return (
                            <li key={epoch.number}>
                                {grouped.has(id) ? <a href={`#${id}`}>{row}</a> : <div>{row}</div>}
                            </li>
                        );
                    })}
                </ol>
            </Section>

            <Section id="milestones" eyebrow="Timeline" title="Milestones">
                {groups.map((group) => <MilestoneGroup key={group.id} group={group} explorers={timeline.explorers} />)}
                <p className="mainnet-fine">
                    The time of a scheduled or planned milestone is a projection, from its block number at 12 seconds a block or from the plan, and is marked ≈ unless it was set for an exact time. A projected time moves a little if blocks run faster or slower. From epoch 1, each epoch closes within 120 blocks of its end, its payout root is due within 1,200 blocks of its end, and its claims open from 14,400 blocks (about two days) after it. Scheduled and planned milestones may change.
                    {updated && <> Updated <time dateTime={updated}>{updated}</time>.</>}
                </p>
            </Section>
        </div>
    );
}

/**
 * The box at the top: mainnet is live, and what miners need to do now
 * (data/mainnet.js). It comes before the timeline's own title, so its
 * headline is an h2 under the page's single h1.
 */
function MinerActions({ actions }) {
    return (
        <section className="mainnet-actions" id="actions" aria-labelledby="actions-heading">
            <div className="mainnet-actions-box">
                <h2 className="mainnet-actions-headline" id="actions-heading">{actions.headline}</h2>
                <h3 className="mainnet-actions-title">{actions.title}</h3>
                <ol className="mainnet-actions-steps">
                    {actions.steps.map((step, index) => (
                        <li key={step.title}>
                            <span className="mainnet-actions-no" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                            <div className="mainnet-actions-step">
                                <p><strong>{step.title}</strong> {step.detail}</p>
                                {step.link && <a className="mainnet-actions-link" href={step.link.href}>{step.link.label} <span aria-hidden="true">→</span></a>}
                            </div>
                        </li>
                    ))}
                </ol>
                <p className="mainnet-actions-closing">
                    {actions.closing.map((run) => (run.href
                        ? <a key={run.text} href={run.href}>{run.text}</a>
                        : <React.Fragment key={run.text}>{run.text}</React.Fragment>))}
                </p>
            </div>
        </section>
    );
}

/** A date's runs (timeline.js whenParts), the dated ones as <time>. */
function When({ parts }) {
    return parts.map((part, index) => (part.dateTime
        ? <time key={index} dateTime={part.dateTime}>{part.text}</time>
        : <React.Fragment key={index}>{part.text}</React.Fragment>));
}

/** One payout epoch (or the milestones before or after them) and its track. */
function MilestoneGroup({ group, explorers }) {
    const { epoch } = group;
    const headingId = `${group.id}-heading`;
    const about = [group.summary, epoch && epochBlocks(epoch)].filter(Boolean).join(' · ');
    return (
        <section className="mainnet-group" id={group.id} aria-labelledby={headingId}>
            <header className="mainnet-group-head">
                <h3 id={headingId}>{group.title}</h3>
                {epoch && (
                    <p className="mainnet-group-when">
                        <When parts={whenParts(epochWhen(epoch), { approxStart: Boolean(epoch.start.projected), approxEnd: Boolean(epoch.end.projected) })} />
                    </p>
                )}
                {(epoch || about) && (
                    <p className="mainnet-group-sub">
                        {epoch && <span className="mainnet-epoch-by" data-settlement={epoch.settlement}>{SETTLEMENT_LABEL[epoch.settlement]}</span>}
                        {epoch && about && ' '}
                        {about && <span className="mainnet-group-about">{about}</span>}
                    </p>
                )}
            </header>
            <ol className="roadmap mainnet-track">
                {group.events.map((event) => <Milestone key={event.id} event={event} explorers={explorers} />)}
            </ol>
        </section>
    );
}

/** One milestone: its date and status, what happens, and its sources. */
function Milestone({ event, explorers }) {
    const { rows, folded } = sourceRows(event.sources, explorers);
    return (
        <li className="roadmap-stop" id={event.id} data-status={event.status}>
            <span className="roadmap-node" aria-hidden="true" />
            <div className="roadmap-content">
                <div className="roadmap-meta">
                    <span className="roadmap-date"><When parts={whenParts(event.when, { approxStart: isApproximate(event, event.when) })} /></span>{' '}
                    <span className="roadmap-flag" data-status={event.status}>{STATUS_LABEL[event.status] || event.status}</span>
                </div>
                <h4 className="roadmap-title">{event.title}</h4>
                <p className="roadmap-body">{event.detail}</p>
                {rows.length > 0 && (
                    <ul className="mainnet-sources" aria-label={`Sources for ${event.title}`}>
                        {rows.map(({ source, link }) => <Source key={`${source.kind}:${source.ref}`} source={source} link={link} />)}
                    </ul>
                )}
                {/* a run of transactions (a deployment's) is listed, closed, under its contracts */}
                {folded.length > 0 && (
                    <details className="mainnet-sources-more">
                        <summary>{folded.length} transactions</summary>
                        <ul className="mainnet-sources" aria-label={`Transactions for ${event.title}`}>
                            {folded.map(({ source, link }) => <Source key={`${source.kind}:${source.ref}`} source={source} link={link} />)}
                        </ul>
                    </details>
                )}
            </div>
        </li>
    );
}

/** A source with a ref: its label, a contract's address in the code face, and the link. */
function Source({ source, link }) {
    const external = isExternal(link.href) ? EXTERNAL : {};
    const arrow = external.target ? <span aria-hidden="true"> ↗</span> : null;
    if (source.kind === 'doc') {
        return <li><a href={link.href} {...external}>{link.text}{arrow}</a></li>;
    }
    return (
        <li>
            <span className="mainnet-source-label">{source.label}</span>{' '}
            {link.value && <><code title={link.value} translate="no">{shortHex(link.value)}</code>{' '}</>}
            <a href={link.href} {...external} aria-label={`${link.text}: ${source.label}`}>{link.text}{arrow}</a>
        </li>
    );
}
