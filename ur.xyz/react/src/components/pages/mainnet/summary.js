/**
 * The summary timeline at the top of /mainnet (MainnetSummary.jsx): the sn
 * repo's "at a glance" ribbon (mainnet/timeline.html) in this site's terms.
 * The payout epochs of data/mainnet.js are bands on one horizontal axis, each
 * as long as it lasts and settled by version 1 or by settlement v2, followed
 * by a tail out to the last key milestone; the key milestones of
 * data/mainnet-timeline.json (`key: true`) are marked on it, numbered in date
 * order; and "now" falls where the epoch clock (lib/epoch.js) puts it.
 *
 * Pure functions with no React and no browser APIs, so the static render, the
 * SPA and the node test (tests/mainnet-summary.test.mjs) share them. The model
 * holds no clock and no dates of its own: every date in it comes from the two
 * data files, and the page draws "now" only in the browser, after hydration.
 */

import { epochAt, epochProgress } from '../../../lib/epoch.js';
import { MONTHS, SETTLEMENT_LABEL, STATUS_LABEL, isApproximate, parseWhen, whenText } from './timeline.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

// A key milestone that is an interval of at least this long (the v2 pool
// registration window, a day) is drawn as a span across its days; anything
// shorter, and a single date, is a numbered marker at its start.
export const SPAN_MIN_MS = 12 * HOUR_MS;

// Markers hang from the axis in two lanes. A marker takes the first lane whose
// last marker is at least this much earlier: on a 320 px phone a 7-day epoch is
// about 50 px wide, so 2.5 days keep two 18 px markers in one lane apart.
export const LANES = 2;
export const LANE_GAP_MS = 2.5 * DAY_MS;

// A band shorter than this (epoch 0, one day) has no room for "Epoch 0" or
// for its days: it shows its short name ("E0") over the full one, which a
// screen reader reads, and its first day, as the sn ribbon does.
const COMPACT_MS = 2 * DAY_MS;

// how a status is drawn: as on the track below, filled when done, filled and
// ringed in progress, outlined while scheduled or planned
export const STATUS_LOOK = Object.freeze({ done: 'filled', in_progress: 'ringed', scheduled: 'outlined', planned: 'outlined' });

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const monthDay = (ms) => {
    const d = new Date(ms);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

/** "Oct 9–16", "Oct 30 – Nov 6", or "Oct 8" for one day: the UTC days from startMs to endMs. */
export function dayRange(startMs, endMs) {
    const a = new Date(startMs);
    const b = new Date(endMs);
    if (Math.floor(startMs / DAY_MS) === Math.floor(endMs / DAY_MS)) return monthDay(startMs);
    if (a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()) return `${monthDay(startMs)}–${b.getUTCDate()}`;
    return `${monthDay(startMs)} – ${monthDay(endMs)}`;
}

// A date without a time is the whole day: it lasts to the next midnight, and
// a marker draws it at midday.
const endOf = ({ start, end }) => {
    const last = end || start;
    return last.hasTime ? last.ms : last.ms + DAY_MS;
};
const pointOf = ({ start }) => (start.hasTime ? start.ms : start.ms + DAY_MS / 2);

/** Where ms falls: the band and how far through it, an instant before the first band at its start. */
function place(bands, ms) {
    const found = bands.findIndex((b) => ms < b.endMs);
    const band = found === -1 ? bands.length - 1 : found;
    const { startMs, endMs } = bands[band];
    return { band, at: clamp01((ms - startMs) / (endMs - startMs)) };
}

/** The parts of [startMs, endMs) in each band it crosses: { band, from, to }. */
function segments(bands, startMs, endMs) {
    return bands
        .map((b, band) => {
            const span = b.endMs - b.startMs;
            return { band, from: clamp01((startMs - b.startMs) / span), to: clamp01((endMs - b.startMs) / span) };
        })
        .filter((s) => s.to > s.from);
}

/** A status in words, as the track's pill writes it. */
const statusLabel = (status) => STATUS_LABEL[status] || status;

/** "Scheduled or planned": the statuses drawn one way, in the pills' order. */
function lookLabel(look, statuses) {
    const words = Object.keys(STATUS_LABEL).filter((s) => STATUS_LOOK[s] === look && statuses.has(s)).map(statusLabel);
    return words.map((w, i) => (i ? w.toLowerCase() : w)).join(' or ');
}

/**
 * The summary of the timeline:
 *
 *   startMs, endMs  the axis: from the first epoch's start to the end of the
 *                   last key milestone (or of the last epoch)
 *   bands     [{ group, number, name, short, settlement, startMs, endMs,
 *               hours, days, tail }]: the epochs, then the tail after the last
 *               one; `hours` is the band's length, its share of the axis,
 *               `days` the days it runs (the tail's first day), and `group`
 *               the id of its milestones on the page
 *   markers   [{ id, n, title, status, statusLabel, look, dateTime, day,
 *               when, band, at, lane, label }]: the key milestones drawn as a
 *               point, numbered from 1 in date order; `look` is how its status
 *               is drawn (STATUS_LOOK), `at` how far through its band (0 to
 *               1), `label` its text for a screen reader
 *   spans     [{ id, title, status, statusLabel, look, dateTime, days, when,
 *               segments: [{ band, from, to }], label }]: the key milestones
 *               drawn across their days
 *   lanes     how many marker lanes are used
 *   settlements, looks  what the legend explains: [{ settlement, label }],
 *               [{ look, label }]
 *
 * `events` are the milestones (each with id, date, status and title, and
 * `key` on those the summary marks), `epochs` the payout epochs in order.
 */
export function summaryModel(events, epochs) {
    const keyed = events
        .filter((event) => event.key === true)
        .map((event) => ({ event, when: parseWhen(event.date) }))
        .filter(({ when }) => when);

    const bands = epochs.map((epoch) => {
        const startMs = Date.parse(epoch.start.time);
        const endMs = Date.parse(epoch.end.time);
        const compact = endMs - startMs < COMPACT_MS;
        return {
            group: `epoch-${epoch.number}`,
            number: epoch.number,
            name: `Epoch ${epoch.number}`,
            short: compact ? `E${epoch.number}` : null,
            settlement: epoch.settlement,
            startMs,
            endMs,
            hours: (endMs - startMs) / HOUR_MS,
            days: compact ? monthDay(startMs) : dayRange(startMs, endMs),
            tail: false,
        };
    });
    const last = bands[bands.length - 1];
    const endMs = Math.max(last.endMs, ...keyed.map(({ when }) => endOf(when)));
    if (endMs > last.endMs) {
        // the epochs after the last one are settled as it is, so the tail is too
        bands.push({
            group: `after-epoch-${last.number}`,
            number: null,
            name: `After epoch ${last.number}`,
            short: 'After',
            settlement: last.settlement,
            startMs: last.endMs,
            endMs,
            hours: (endMs - last.endMs) / HOUR_MS,
            // its first day; the page draws it running on ("Oct 30 →")
            days: monthDay(last.endMs),
            tail: true,
        });
    }

    const markers = [];
    const spans = [];
    for (const { event, when } of keyed) {
        const approximate = isApproximate(event, when);
        const text = whenText(when, { approxStart: approximate });
        const status = statusLabel(event.status);
        const look = STATUS_LOOK[event.status] || 'outlined';
        const common = { id: event.id, title: event.title, status: event.status, statusLabel: status, look, dateTime: when.start.iso, when: text };
        if (when.end && endOf(when) - when.start.ms >= SPAN_MIN_MS) {
            spans.push({
                ...common,
                days: dayRange(when.start.ms, (when.end || when.start).ms),
                segments: segments(bands, when.start.ms, endOf(when)),
                label: `${event.title}, ${text}, ${status}`,
            });
            continue;
        }
        const n = markers.length + 1;
        markers.push({
            ...common,
            n,
            // the day it happens; ≈ only on a day that is itself approximate
            day: `${!when.start.hasTime && approximate ? '≈ ' : ''}${monthDay(when.start.ms)}`,
            ms: pointOf(when),
            ...place(bands, pointOf(when)),
            label: `${n}. ${event.title}, ${text}, ${status}`,
        });
    }

    // lanes: the first lane free for LANE_GAP_MS, else the one free longest
    const lastIn = Array(LANES).fill(-Infinity);
    for (const marker of markers) {
        let lane = lastIn.findIndex((ms) => marker.ms - ms >= LANE_GAP_MS);
        if (lane === -1) lane = lastIn.indexOf(Math.min(...lastIn));
        lastIn[lane] = marker.ms;
        marker.lane = lane + 1;
    }

    const statuses = new Set([...markers, ...spans].map((m) => m.status));
    const looks = ['filled', 'ringed', 'outlined']
        .map((look) => ({ look, label: lookLabel(look, statuses) }))
        .filter((look) => look.label);
    const settlements = Object.keys(SETTLEMENT_LABEL)
        .filter((settlement) => bands.some((b) => b.settlement === settlement))
        .map((settlement) => ({ settlement, label: SETTLEMENT_LABEL[settlement] }));

    return {
        startMs: bands[0].startMs,
        endMs,
        bands,
        markers: markers.map(({ ms, ...marker }) => marker),
        spans,
        lanes: Math.max(1, ...markers.map((m) => m.lane)),
        settlements,
        looks,
    };
}

/**
 * Where nowMs falls on the summary's axis, for the browser to draw:
 *
 *   pin      { band, at, epoch, progress, flip, text }: the band of the epoch
 *            the epoch clock puts nowMs in, and how far through it (past the
 *            last epoch, how far through the tail); `epoch` and `progress`
 *            are the clock's own; `flip` puts the label on the pin's left,
 *            near the axis's end; `text` is the time in UTC. Null before the
 *            axis starts and after it ends.
 *   elapsed  how much of each band has passed, 0 to 1
 *
 * Null when nowMs is not a time (the static render, before the clock starts).
 */
export function axisNow(model, nowMs) {
    if (!Number.isFinite(nowMs)) return null;
    const { bands } = model;
    if (nowMs < model.startMs) return { pin: null, elapsed: bands.map(() => 0) };
    if (nowMs >= model.endMs) return { pin: null, elapsed: bands.map(() => 1) };

    const epoch = epochAt(nowMs);
    let band = epoch ? bands.findIndex((b) => b.number === epoch.number) : -1;
    let at;
    if (band !== -1) {
        at = epochProgress(epoch, nowMs);
    } else {
        band = bands.findIndex((b) => nowMs >= b.startMs && nowMs < b.endMs);
        if (band === -1) return { pin: null, elapsed: bands.map(() => 0) };
        at = clamp01((nowMs - bands[band].startMs) / (bands[band].endMs - bands[band].startMs));
    }
    const total = bands.reduce((sum, b) => sum + b.hours, 0);
    const before = bands.slice(0, band).reduce((sum, b) => sum + b.hours, 0);
    return {
        pin: {
            band,
            at,
            epoch: epoch ? epoch.number : null,
            progress: epoch ? epochProgress(epoch, nowMs) : null,
            flip: (before + at * bands[band].hours) / total > 0.88,
            text: whenText({ start: { iso: new Date(nowMs).toISOString(), ms: nowMs, hasTime: true }, end: null }),
        },
        elapsed: bands.map((_, i) => (i < band ? 1 : i === band ? at : 0)),
    };
}
