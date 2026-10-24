// The summary timeline under the /mainnet title
// (src/components/pages/mainnet/summary.js): how the payout epochs of
// src/data/mainnet.js and the key milestones of src/data/mainnet-timeline.json
// map onto its axis, and where the epoch clock (src/lib/epoch.js) puts "now".
// The bands are the data's epochs, which must agree with the clock, then a
// tail out to the last key milestone; the markers are the milestones marked
// `key`, numbered in date order, each in the band of the epoch the list below
// shows it under; "now" is drawn only in the browser, so the model has none.
//
// Usage: node --test tests/mainnet-summary.test.mjs   (no network)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { mainnetEpochs } from '../src/data/mainnet.js';
import { epochBounds, epochEndBlock, epochStartBlock } from '../src/lib/epoch.js';
import { LANES, LANE_GAP_MS, SPAN_MIN_MS, axisNow, dayRange, summaryModel } from '../src/components/pages/mainnet/summary.js';
import { groupByEpoch, parseWhen } from '../src/components/pages/mainnet/timeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { events } = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/mainnet-timeline.json'), 'utf8'));
const model = summaryModel(events, mainnetEpochs);
const utc = (...args) => Date.UTC(...args);
const HOUR = 3_600_000;
const DAY = 86_400_000;
const byId = (id) => events.find((e) => e.id === id);
const marker = (id) => model.markers.find((m) => m.id === id);
// the instant a marker stands for: its band's start, plus `at` of the band
const instantOf = (m) => {
    const band = model.bands[m.band];
    return band.startMs + m.at * (band.endMs - band.startMs);
};
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} is not ${expected}`);

test('the bands are the data\'s epochs, which agree with the epoch clock, then a tail', () => {
    const epochBands = model.bands.filter((b) => !b.tail);
    assert.deepEqual(epochBands.map((b) => b.number), mainnetEpochs.map((e) => e.number));
    for (const [index, epoch] of mainnetEpochs.entries()) {
        const band = epochBands[index];
        // the coordinator's blocks, as the clock counts them
        assert.equal(epoch.start.block, epochStartBlock(epoch.number), `epoch ${epoch.number} start block`);
        assert.equal(epoch.end.block, epochEndBlock(epoch.number), `epoch ${epoch.number} end block`);
        // a boundary's time is its block's timestamp once it exists: within ten minutes of the clock's projection
        const clock = epochBounds(epoch.number);
        assert.ok(Math.abs(band.startMs - clock.startMs) <= 600_000, `epoch ${epoch.number} starts when the clock says`);
        assert.ok(Math.abs(band.endMs - clock.endMs) <= 600_000, `epoch ${epoch.number} ends when the clock says`);
        assert.equal(band.startMs, Date.parse(epoch.start.time));
        assert.equal(band.endMs, Date.parse(epoch.end.time));
        assert.equal(band.settlement, epoch.settlement);
        close(band.hours, (band.endMs - band.startMs) / HOUR, `epoch ${epoch.number} hours`);
    }
    // epoch 0 is a day, the others a week: the bands' shares of the axis
    assert.deepEqual(model.bands.map((b) => Math.round(b.hours)), [24, 168, 168, 168, 168, 52]);
    assert.deepEqual(model.bands.map((b) => b.short || b.name), ['E0', 'Epoch 1', 'Epoch 2', 'Epoch 3', 'Epoch 4', 'After']);
    assert.equal(model.bands[0].name, 'Epoch 0', 'a screen reader reads the full name');
    // a week's days; epoch 0's first day, as the sn ribbon gives it; the tail's first day
    assert.deepEqual(model.bands.map((b) => b.days), ['Oct 8', 'Oct 9–16', 'Oct 16–23', 'Oct 23–30', 'Oct 30 – Nov 6', 'Nov 6']);
    // version 1 settles epochs 0 to 3; settlement v2 is targeted from epoch 4, block 9,398,428, and what follows
    assert.deepEqual(model.bands.map((b) => b.settlement), ['v1', 'v1', 'v1', 'v1', 'v2', 'v2']);
    assert.equal(mainnetEpochs[4].start.block, 9_398_428);
    // the tail runs from the last epoch's end to the end of the last key milestone
    const tail = model.bands.at(-1);
    assert.equal(tail.tail, true);
    assert.equal(tail.startMs, Date.parse(mainnetEpochs.at(-1).end.time));
    assert.equal(tail.endMs, parseWhen(byId('first-v2-claim').date).end.ms);
    assert.equal(model.startMs, model.bands[0].startMs);
    assert.equal(model.endMs, tail.endMs);
    // each band is one of the list's groups
    const groups = groupByEpoch(events, mainnetEpochs).map((g) => g.id);
    for (const band of model.bands) assert.ok(groups.includes(band.group), `${band.group} is a group on the page`);
});

test('the key milestones are marked: the ones the sn summary marks, numbered in date order', () => {
    const keyed = events.filter((e) => e.key).map((e) => e.id);
    assert.deepEqual(keyed, [
        'v1-contracts-deployed', 'epoch-1-begins', 'last-usdc-payout-batch', 'v2-contracts-deployed',
        'v2-pool-registered', 'settlement-v2-active', 'fp2-modern-provider-gate', 'first-v2-claim',
    ]);
    // the pending registration runs until epoch 4: a span; the others are numbered points
    assert.deepEqual(model.spans.map((s) => s.id), ['v2-pool-registered']);
    assert.deepEqual(model.markers.map((m) => m.id), keyed.filter((id) => id !== 'v2-pool-registered'));
    assert.deepEqual(model.markers.map((m) => m.n), [1, 2, 3, 4, 5, 6, 7]);
    for (const item of [...model.markers, ...model.spans]) {
        const event = byId(item.id);
        assert.ok(event, `${item.id} is a milestone, so its link lands on it`);
        assert.equal(item.title, event.title);
        assert.equal(item.status, event.status, `${item.id}: its status, drawn as the track draws it`);
        assert.equal(item.look, { done: 'filled', in_progress: 'ringed', scheduled: 'outlined', planned: 'outlined' }[event.status]);
    }
    // a milestone not marked key is not on the summary
    assert.equal(marker('bittensor-runtime-478'), undefined);
});

test('a marker sits in the band of its date, as far through it as its date is', () => {
    const groups = groupByEpoch(events, mainnetEpochs);
    const groupOf = (id) => groups.find((g) => g.events.some((e) => e.id === id)).id;
    for (const m of model.markers) {
        // the list shows the milestone under the same epoch
        assert.equal(model.bands[m.band].group, groupOf(m.id), `${m.id}: the band of the group it is listed in`);
        assert.ok(m.at >= 0 && m.at < 1, `${m.id}: at ${m.at}`);
        const when = parseWhen(byId(m.id).date);
        // a time is drawn at its start, a day at its midday, never before the axis
        const expected = Math.max(model.startMs, when.start.hasTime ? when.start.ms : when.start.ms + DAY / 2);
        assert.ok(Math.abs(instantOf(m) - expected) < 1, `${m.id}: drawn at ${new Date(instantOf(m)).toISOString()}`);
    }
    // the version 1 deployment starts 9 minutes before epoch 0: at the axis's start
    assert.deepEqual([marker('v1-contracts-deployed').band, marker('v1-contracts-deployed').at], [0, 0]);
    // epoch 1 and settlement v2 begin their bands
    assert.deepEqual([marker('epoch-1-begins').band, marker('epoch-1-begins').at], [1, 0]);
    assert.deepEqual([marker('settlement-v2-active').band, marker('settlement-v2-active').at], [4, 0]);
    // the gate turns on at 00:00 UTC on Nov 4, 4 days 5 h 35 min into epoch 4
    assert.equal(marker('fp2-modern-provider-gate').band, 4);
    close(marker('fp2-modern-provider-gate').at, (utc(2026, 10, 4) - utc(2026, 9, 30, 18, 25)) / (7 * DAY), 'the gate');
    // the last USDC batch, a day, at its midday
    close(marker('last-usdc-payout-batch').at, (utc(2026, 9, 11, 12) - utc(2026, 9, 9, 18, 9)) / (7 * DAY), 'the batch');
    // the first v2 claim, 48 of the tail's 52 hours in
    assert.equal(marker('first-v2-claim').band, 5);
    close(marker('first-v2-claim').at, 48 / 52, 'the first v2 claim');
    // the pending registration, from the October 24 reading to a minute before epoch 4
    const pending = model.spans[0];
    assert.equal(pending.segments.length, 1);
    assert.equal(pending.segments[0].band, 3);
    const epoch3 = model.bands[3];
    close(pending.segments[0].from, (utc(2026, 9, 24, 16, 40) - epoch3.startMs) / (epoch3.endMs - epoch3.startMs), 'pending from');
    close(pending.segments[0].to, (utc(2026, 9, 30, 18, 24) - epoch3.startMs) / (epoch3.endMs - epoch3.startMs), 'pending to');
});

test('markers in one lane are far enough apart never to overlap', () => {
    assert.ok(model.lanes >= 1 && model.lanes <= LANES);
    assert.equal(model.lanes, Math.max(...model.markers.map((m) => m.lane)));
    for (let lane = 1; lane <= LANES; lane++) {
        const times = model.markers.filter((m) => m.lane === lane).map(instantOf);
        for (let i = 1; i < times.length; i++) {
            assert.ok(times[i] - times[i - 1] >= LANE_GAP_MS, `lane ${lane}: markers ${(times[i] - times[i - 1]) / DAY} days apart`);
        }
    }
    // the first payout epoch, 1 day after the deployment, drops to the second lane
    assert.equal(marker('v1-contracts-deployed').lane, 1);
    assert.equal(marker('epoch-1-begins').lane, 2);
});

test('the text: what a screen reader reads, the key dates\' days and the legend', () => {
    assert.equal(marker('fp2-modern-provider-gate').label, '6. Modern provider gate turns on, Wed Nov 4 · 00:00 UTC, Scheduled');
    assert.equal(marker('v1-contracts-deployed').label, '1. Version 1 contracts deployed, Thu Oct 8 · 17:59–18:16 UTC, Done');
    assert.equal(marker('settlement-v2-active').label, '5. Target: settlement v2 active, epoch 4 begins, Fri Oct 30 · ≈18:25 UTC, Planned');
    assert.deepEqual(model.markers.map((m) => m.day), ['Oct 8', 'Oct 9', 'Oct 11', '≈ Oct 17', 'Oct 30', 'Nov 4', 'Nov 8']);
    assert.deepEqual(model.markers.map((m) => m.dateTime), model.markers.map((m) => byId(m.id).date.split('/')[0]));
    const pending = model.spans[0];
    assert.equal(pending.days, 'Oct 24–30');
    assert.equal(pending.label, 'Settlement v2 pool registration, pending, Sat Oct 24 · ≈16:40 → Fri Oct 30 · ≈18:24 UTC, Planned');
    assert.deepEqual(model.settlements, [{ settlement: 'v1', label: 'Version 1' }, { settlement: 'v2', label: 'Settlement v2' }]);
    assert.deepEqual(model.looks, [{ look: 'filled', label: 'Done' }, { look: 'outlined', label: 'Scheduled or planned' }]);
    // the model is plain data, for the static page to hand to its island
    assert.deepEqual(JSON.parse(JSON.stringify(model)), model);
});

test('now: none until the browser\'s clock runs, then where the epoch clock puts it', () => {
    // the static render and the first render after hydration: nothing to draw
    assert.equal(axisNow(model, null), null);
    assert.equal(axisNow(model, NaN), null);

    // block 9,286,515, 2026-10-15 05:06:36 UTC: epoch 1, as tests/epoch.test.mjs reads it
    const now = axisNow(model, utc(2026, 9, 15, 5, 6, 36));
    assert.equal(now.pin.band, 1);
    assert.equal(now.pin.epoch, 1);
    assert.ok(Math.abs(now.pin.at - (9_286_515 - 9_247_228) / 50_400) < 1e-4);
    assert.equal(now.pin.progress, now.pin.at);
    assert.equal(now.pin.text, 'Thu Oct 15 · 05:06 UTC');
    assert.equal(now.pin.flip, false);
    assert.deepEqual(now.elapsed, [1, now.pin.at, 0, 0, 0, 0]);

    // epoch 3's first second: the start of its band
    const three = axisNow(model, utc(2026, 9, 23, 18, 9));
    assert.deepEqual([three.pin.band, three.pin.at, three.pin.epoch], [3, 0, 3]);
    assert.deepEqual(three.elapsed, [1, 1, 1, 0, 0, 0]);

    // in the tail: epoch 5 by the clock, placed by the tail's own span, its label to the left
    const tail = axisNow(model, utc(2026, 10, 7));
    assert.equal(tail.pin.band, 5);
    assert.equal(tail.pin.epoch, 5);
    close(tail.pin.at, (utc(2026, 10, 7) - utc(2026, 10, 6, 18, 25)) / (52 * HOUR), 'tail');
    assert.equal(tail.pin.flip, true);

    // off the axis: no pin, and the bands all ahead or all past
    assert.deepEqual(axisNow(model, utc(2026, 9, 8, 12)), { pin: null, elapsed: [0, 0, 0, 0, 0, 0] });
    assert.deepEqual(axisNow(model, utc(2026, 10, 10)), { pin: null, elapsed: [1, 1, 1, 1, 1, 1] });
});

test('a key interval of half a day or more is a span, cut at the bands it crosses; anything else a marker', () => {
    const fixture = [
        { id: 'a', date: '2026-10-09T20:00:00Z/2026-10-09T23:00:00Z', status: 'done', title: 'A short interval', key: true },
        { id: 'b', date: '2026-10-15T18:09:00Z/2026-10-17T18:09:00Z', status: 'planned', title: 'Across a boundary', key: true },
        { id: 'c', date: '2026-10-18/2026-10-19', status: 'scheduled', title: 'Two days', key: true },
        { id: 'd', date: '2026-10-20', status: 'in_progress', title: 'A day', key: true },
        { id: 'e', date: '2026-10-21T00:00:00Z', status: 'done', title: 'Not key' },
        { id: 'f', date: 'not a date', status: 'done', title: 'Unreadable', key: true },
    ];
    const m = summaryModel(fixture, mainnetEpochs);
    assert.deepEqual(m.markers.map((x) => [x.id, x.n]), [['a', 1], ['d', 2]]);
    assert.deepEqual(m.spans.map((x) => x.id), ['b', 'c']);
    assert.ok(3 * HOUR < SPAN_MIN_MS && SPAN_MIN_MS <= DAY);
    // a span across epochs 1 and 2: the last day of one, the first of the other
    const [b, c] = m.spans;
    assert.deepEqual(b.segments.map((s) => s.band), [1, 2]);
    close(b.segments[0].from, 6 / 7, 'b from');
    close(b.segments[0].to, 1, 'b to');
    close(b.segments[1].from, 0, 'b2 from');
    close(b.segments[1].to, 1 / 7, 'b2 to');
    // days run to the end of the last one
    assert.equal(c.days, 'Oct 18–19');
    close(c.segments[0].to, (utc(2026, 9, 20) - utc(2026, 9, 16, 18, 9)) / (7 * DAY), 'c to');
    // no milestone runs past epoch 4: no tail
    assert.equal(m.bands.some((x) => x.tail), false);
    assert.equal(m.endMs, Date.parse(mainnetEpochs.at(-1).end.time));
    // a milestone in progress is drawn filled and ringed
    assert.deepEqual(m.looks.map((x) => x.look), ['filled', 'ringed', 'outlined']);
    assert.deepEqual(m.looks.map((x) => x.label), ['Done', 'In progress', 'Scheduled or planned']);
});

test('days are written in UTC', () => {
    assert.equal(dayRange(utc(2026, 9, 9, 18, 9), utc(2026, 9, 16, 18, 9)), 'Oct 9–16');
    assert.equal(dayRange(utc(2026, 9, 30, 18, 9), utc(2026, 10, 6, 18, 9)), 'Oct 30 – Nov 6');
    assert.equal(dayRange(utc(2026, 9, 8, 18, 8), utc(2026, 9, 8, 23, 59)), 'Oct 8');
    assert.equal(dayRange(utc(2026, 11, 30), utc(2027, 0, 2)), 'Dec 30 – Jan 2');
    // an instant written with an offset is on its UTC day
    assert.equal(dayRange(Date.parse('2026-10-21T23:30:00-02:00'), Date.parse('2026-10-22T23:30:00Z')), 'Oct 22');
});
