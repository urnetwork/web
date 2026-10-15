import React from 'react';
import { useClock } from '../../../lib/network.js';
import { axisNow } from './summary.js';

// "now" moves about a pixel an hour on a desktop axis: a minute's tick is plenty
const CLOCK_TICK_MS = 60_000;

/**
 * MainnetSummary — the launch at a glance, above the /mainnet milestones: the
 * payout epochs as bands on one horizontal axis, the key milestones numbered
 * on it and listed beneath, each linking to its milestone on the page, and
 * "now". `model` is summary.js summaryModel(): plain data, so the Astro page
 * can compute it at build time and hand it to this component as an island.
 *
 * The clock is null in the static render and in the first render after
 * hydration (lib/network.js useClock), so the two agree; "now", and the
 * progress up to it, appear on the next tick, as the landing page's epoch
 * clock does. Everything else is static, and reads the same without script.
 */
export default function MainnetSummary({ model }) {
    const clock = useClock(CLOCK_TICK_MS);
    const now = axisNow(model, clock);
    const pin = now ? now.pin : null;

    return (
        <div className="mainnet-summary" data-lanes={model.lanes}>
            <h2 className="mainnet-summary-title" id="glance-heading">At a glance</h2>
            <figure className="mainnet-summary-figure" aria-labelledby="glance-heading">
                <ol className="mainnet-summary-bands" aria-label="Payout epochs and key milestones">
                    {model.bands.map((band, index) => {
                        // the band's milestones in date order, the spans among the
                        // markers, so the tab order follows the axis
                        const items = [
                            ...model.markers.filter((m) => m.band === index).map((mark) => ({ at: mark.at, mark })),
                            ...model.spans.flatMap((span) => span.segments
                                .map((segment, part) => ({ at: segment.from, span, segment, part }))
                                .filter(({ segment }) => segment.band === index)),
                        ].sort((a, b) => a.at - b.at);
                        return (
                            <li
                                key={band.group}
                                className="mainnet-summary-band"
                                data-settlement={band.settlement}
                                data-tail={band.tail ? '' : undefined}
                                style={{ '--hours': band.hours }}
                            >
                                <div className="mainnet-summary-box">
                                    <span className="mainnet-summary-name">
                                        {band.short ? <><span aria-hidden="true">{band.short}</span><span className="mainnet-visually-hidden">{band.name}</span></> : band.name}
                                    </span>
                                    <span className="mainnet-visually-hidden">: </span>
                                    <span className="mainnet-summary-days">
                                        {band.tail && <span className="mainnet-visually-hidden">from </span>}
                                        {band.days}
                                        {band.tail && <span aria-hidden="true"> →</span>}
                                    </span>
                                    <span className="mainnet-visually-hidden">, {settlementOf(model, band)}</span>
                                </div>
                                <span className="mainnet-summary-track" aria-hidden="true">
                                    {now && <span className="mainnet-summary-elapsed" style={{ '--elapsed': now.elapsed[index] }} />}
                                </span>
                                {items.length > 0 && (
                                    <ul className="mainnet-summary-marks">
                                        {items.map(({ mark, span, segment, part }) => (mark
                                            ? (
                                                <li key={mark.id} className="mainnet-summary-mark" data-lane={mark.lane} style={{ '--at': mark.at }}>
                                                    <a className="mainnet-summary-dot" data-look={mark.look} href={`#${mark.id}`} aria-label={mark.label} title={mark.label}>{mark.n}</a>
                                                </li>
                                            )
                                            : (
                                                // a span across its days; one that crosses into this band from the last links there
                                                <li key={`${span.id}-${part}`} className="mainnet-summary-window" aria-hidden={part > 0 ? 'true' : undefined} style={{ '--from': segment.from, '--to': segment.to }}>
                                                    {part === 0
                                                        ? <a className="mainnet-summary-span" data-look={span.look} href={`#${span.id}`} aria-label={span.label} title={span.label} />
                                                        : <span className="mainnet-summary-span" data-look={span.look} />}
                                                </li>
                                            )))}
                                    </ul>
                                )}
                                {pin && pin.band === index && (
                                    <div className="mainnet-summary-now" data-flip={pin.flip ? '' : undefined} style={{ '--at': pin.at }}>
                                        <span className="mainnet-summary-now-label">Now</span>
                                        <span className="mainnet-visually-hidden">
                                            : {pin.text}{pin.epoch != null && `, ${Math.floor(pin.progress * 100)}% through epoch ${pin.epoch}`}
                                        </span>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ol>
                <figcaption className="mainnet-summary-legend">
                    <ul aria-label="Bands">
                        {model.settlements.map(({ settlement, label }) => (
                            <li key={settlement}><span className="mainnet-summary-swatch" data-settlement={settlement} aria-hidden="true" />{label}</li>
                        ))}
                        {model.spans.map((span) => (
                            <li key={span.id}><span className="mainnet-summary-swatch" data-span={span.look} aria-hidden="true" />{span.title}, {span.days}</li>
                        ))}
                    </ul>
                    <ul aria-label="Markers">
                        <li><span className="mainnet-summary-swatch" data-now="" aria-hidden="true" />Now</li>
                        {model.looks.map(({ look, label }) => (
                            <li key={look}><span className="mainnet-summary-dot" data-look={look} aria-hidden="true" />{label}</li>
                        ))}
                    </ul>
                </figcaption>
            </figure>
            <ol className="mainnet-summary-dates" aria-label="Key dates">
                {model.markers.map((mark) => (
                    <li key={mark.id}>
                        <a href={`#${mark.id}`} className="mainnet-summary-date">
                            <span className="mainnet-summary-dot" data-look={mark.look} aria-hidden="true">{mark.n}</span>
                            <span className="mainnet-summary-date-meta">
                                <time className="mainnet-summary-day" dateTime={mark.dateTime}>{mark.day}</time>{' '}
                                <span className="roadmap-flag" data-status={mark.status}>{mark.statusLabel}</span>
                            </span>
                            <span className="mainnet-summary-date-title">{mark.title}</span>
                        </a>
                    </li>
                ))}
            </ol>
        </div>
    );
}

/** "settled by version 1": what pays a band, for a screen reader. */
function settlementOf(model, band) {
    const label = model.settlements.find((s) => s.settlement === band.settlement)?.label;
    return label ? `settled by ${label.charAt(0).toLowerCase()}${label.slice(1)}` : '';
}
