// The /mainnet timeline's data (src/data/mainnet-timeline.json, the epochs in
// src/data/mainnet.js) and the helpers that render it
// (src/components/pages/mainnet/timeline.js). The milestones are edited by
// hand and their transaction hashes merged in as they are verified, so this
// checks what a careless edit would break: every milestone has a readable
// date, a known status and a unique id, they run in order, and every source
// the page would link has a well-formed ref and an explorer to link it with.
// A source whose ref is still empty is allowed: the page leaves it out. Besides
// the fields every milestone has, one may say whether its time is approximate
// (`approximate`), where the default for its status is wrong, and a key
// milestone says so (`key: true`): the summary timeline under the page's title
// marks it (tests/mainnet-summary.test.mjs).
//
// Usage: node --test tests/mainnet-timeline.test.mjs   (no network)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { mainnetActions, mainnetEpochs, SECONDS_PER_BLOCK } from '../src/data/mainnet.js';
import {
    EXPLORER_PLACEHOLDERS,
    REF_FORMATS,
    SETTLEMENT_LABEL,
    SOURCE_KINDS,
    STATUS_LABEL,
    epochBlocks,
    groupByEpoch,
    isApproximate,
    parseWhen,
    sourceLink,
    sourceRows,
    whenText,
} from '../src/components/pages/mainnet/timeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '../src/data/mainnet-timeline.json');
const timeline = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const { explorers, events } = timeline;

test('the file has the explorers and the events, and nothing else', () => {
    assert.deepEqual(Object.keys(timeline).sort(), ['events', 'explorers']);
    assert.ok(Array.isArray(events) && events.length > 0);
    for (const [kind, placeholders] of Object.entries(EXPLORER_PLACEHOLDERS)) {
        const template = explorers[kind];
        assert.equal(typeof template, 'string', `explorers.${kind}`);
        assert.match(template, /^https:\/\/[^\s/]+\//, `explorers.${kind} is an https URL`);
        for (const placeholder of placeholders) assert.ok(template.includes(placeholder), `explorers.${kind} carries ${placeholder}`);
    }
    for (const kind of Object.keys(explorers)) assert.ok(Object.hasOwn(EXPLORER_PLACEHOLDERS, kind), `explorers.${kind} is no source kind`);
});

test('every milestone has a unique id, a readable date, a known status, a title and a detail', () => {
    const ids = new Set();
    // ids the page itself uses: the sections and the epoch groups
    const reserved = new Set(['actions', 'mainnet', 'settlement', 'milestones', 'before-launch', ...mainnetEpochs.map((e) => `epoch-${e.number}`), `after-epoch-${mainnetEpochs.at(-1).number}`]);
    for (const event of events) {
        const fields = Object.keys(event).filter((key) => key !== 'approximate' && key !== 'key').sort();
        assert.deepEqual(fields, ['date', 'detail', 'id', 'sources', 'status', 'title'], `${event.id}: fields`);
        if ('approximate' in event) assert.equal(typeof event.approximate, 'boolean', `${event.id}: approximate is true or false`);
        if ('key' in event) assert.equal(event.key, true, `${event.id}: key is true, or left out`);
        assert.match(event.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${event.id}: a lowercase slug`);
        assert.ok(!ids.has(event.id), `${event.id}: duplicate id`);
        assert.ok(!reserved.has(event.id) && !event.id.endsWith('-heading'), `${event.id}: an id the page uses`);
        ids.add(event.id);
        assert.ok(parseWhen(event.date), `${event.id}: unreadable date ${event.date}`);
        assert.ok(Object.hasOwn(STATUS_LABEL, event.status), `${event.id}: unknown status ${event.status}`);
        for (const field of ['title', 'detail']) {
            assert.equal(typeof event[field], 'string', `${event.id}: ${field}`);
            assert.ok(event[field].trim().length > 0, `${event.id}: empty ${field}`);
            assert.equal(event[field], event[field].trim(), `${event.id}: ${field} has surrounding space`);
        }
    }
});

test('the milestones run in date order', () => {
    // a date without a time is the whole day: it orders against its day only
    let previous = null;
    for (const event of events) {
        const { start } = parseWhen(event.date);
        if (previous) {
            const coarse = !start.hasTime || !previous.start.hasTime;
            const day = (ms) => Math.floor(ms / 86400000);
            const ok = coarse ? day(start.ms) >= day(previous.start.ms) : start.ms >= previous.start.ms;
            assert.ok(ok, `${event.id} (${event.date}) comes before ${previous.id} (${previous.date})`);
        }
        previous = { id: event.id, date: event.date, start };
    }
});

test('every source has a label and a known kind, and a ref that is empty or well formed', () => {
    for (const event of events) {
        assert.ok(Array.isArray(event.sources), `${event.id}: sources`);
        const linked = new Set();
        for (const source of event.sources) {
            const where = `${event.id}: source "${source.label}"`;
            assert.deepEqual(Object.keys(source).sort(), ['kind', 'label', 'ref'], `${where}: fields`);
            assert.ok(typeof source.label === 'string' && source.label.trim(), `${where}: no label`);
            assert.ok(SOURCE_KINDS.includes(source.kind), `${where}: unknown kind ${source.kind}`);
            assert.equal(typeof source.ref, 'string', `${where}: ref is not a string`);
            if (source.ref === '') continue;
            assert.match(source.ref, REF_FORMATS[source.kind], `${where}: ref ${source.ref} is not a ${source.kind}`);
            const key = `${source.kind}:${source.ref.toLowerCase()}`;
            assert.ok(!linked.has(key), `${where}: the same ${source.kind} twice`);
            linked.add(key);
            const link = sourceLink(source, explorers);
            assert.ok(link, `${where}: no link`);
            assert.ok(new URL(link.href).protocol === 'https:' || link.href.startsWith('/'), `${where}: ${link.href}`);
            assert.ok(!/[{}]/.test(link.href), `${where}: a placeholder is left in ${link.href}`);
        }
    }
});

test('a source becomes a link only with a well-formed ref', () => {
    const hash = `0x${'ab'.repeat(32)}`;
    const address = '0xC18925925E2B7bb9059b7d696b8c92762AE86406';
    assert.equal(sourceLink({ label: 'Pending', kind: 'evm_tx', ref: '' }, explorers), null);
    assert.equal(sourceLink({ label: 'Pending', kind: 'evm_tx', ref: '   ' }, explorers), null);
    assert.equal(sourceLink({ label: 'Short', kind: 'evm_tx', ref: '0x1234' }, explorers), null);
    assert.equal(sourceLink({ label: 'Address as a tx', kind: 'evm_tx', ref: address }, explorers), null);
    assert.equal(sourceLink({ label: 'Unknown', kind: 'solana_tx', ref: hash }, explorers), null);
    assert.equal(sourceLink({ label: 'No template', kind: 'evm_tx', ref: hash }, {}), null);
    assert.equal(sourceLink({ label: 'Plain http', kind: 'doc', ref: 'http://example.com/x' }, explorers), null);
    assert.equal(sourceLink({ label: 'Not a block', kind: 'evm_block', ref: '9,247,228' }, explorers), null);
    assert.equal(sourceLink({ label: 'Index too long', kind: 'substrate_extrinsic', ref: '9276925-10000' }, explorers), null);

    const test = {
        evm_tx: 'https://explorer.test/tx/{hash}',
        substrate_extrinsic: 'https://explorer.test/extrinsic/{block}-{index}',
        evm_address: 'https://explorer.test/address/{address}',
        evm_block: 'https://explorer.test/block/{number}',
        substrate_block: 'https://explorer.test/block/{number}/extrinsics',
    };
    assert.deepEqual(sourceLink({ label: 'Close', kind: 'evm_tx', ref: hash }, test), { href: `https://explorer.test/tx/${hash}`, text: 'View transaction', value: null });
    assert.deepEqual(sourceLink({ label: 'Coordinator', kind: 'evm_address', ref: address }, test), { href: `https://explorer.test/address/${address}`, text: 'View contract', value: address });
    assert.deepEqual(sourceLink({ label: 'Epoch start', kind: 'evm_block', ref: '9247228' }, test), { href: 'https://explorer.test/block/9247228', text: 'View block', value: null });
    assert.deepEqual(sourceLink({ label: 'Upgrade', kind: 'substrate_block', ref: '9276925' }, test), { href: 'https://explorer.test/block/9276925/extrinsics', text: 'View block', value: null });
    // an extrinsic id is built from its numbers, the index padded to 4 digits:
    // the explorer answers an unpadded id with an empty page
    for (const ref of ['9248148-5', '9248148-0005', '9248148-005']) {
        const extrinsic = sourceLink({ label: 'Commit', kind: 'substrate_extrinsic', ref }, test);
        assert.deepEqual(extrinsic, { href: 'https://explorer.test/extrinsic/9248148-0005', text: 'View transaction', value: null }, ref);
    }
    assert.equal(sourceLink({ label: 'Commit', kind: 'substrate_extrinsic', ref: '9248148-5' }, explorers).href, 'https://taostats.io/extrinsic/9248148-0005');
    const doc = sourceLink({ label: 'Miner guide', kind: 'doc', ref: '/docs/miner' }, {});
    assert.deepEqual(doc, { href: '/docs/miner', text: 'Miner guide', value: null });
});

test('a run of more than three transactions is listed apart from the contracts', () => {
    const tx = (n) => ({ label: `Step ${n}`, kind: 'evm_tx', ref: `0x${String(n).repeat(64).slice(0, 64)}` });
    const contract = { label: 'Coordinator', kind: 'evm_address', ref: '0xC18925925E2B7bb9059b7d696b8c92762AE86406' };
    const pending = { label: 'Pending', kind: 'evm_tx', ref: '' };
    const few = sourceRows([contract, tx(1), tx(2), pending, tx(3)], explorers);
    assert.deepEqual(few.rows.map((r) => r.source.label), ['Coordinator', 'Step 1', 'Step 2', 'Step 3']);
    assert.equal(few.folded.length, 0);
    const many = sourceRows([contract, tx(1), tx(2), tx(3), tx(4), pending], explorers);
    assert.deepEqual(many.rows.map((r) => r.source.label), ['Coordinator']);
    assert.deepEqual(many.folded.map((r) => r.source.label), ['Step 1', 'Step 2', 'Step 3', 'Step 4']);
    // the deployment shows its contracts, and its 8 transactions apart
    const deployment = sourceRows(events.find((e) => e.id === 'v1-contracts-deployed')?.sources, explorers);
    assert.ok(deployment.rows.every((r) => r.source.kind === 'evm_address'));
    assert.equal(deployment.folded.length, 8);
});

test('dates are written in UTC, with ≈ on the times that are projections', () => {
    const at = (value, options) => whenText(parseWhen(value), options);
    assert.equal(at('2026-10-08T18:36:12Z'), 'Thu Oct 8 · 18:36 UTC');
    assert.equal(at('2026-10-08T17:59:12Z/2026-10-08T18:16:00Z'), 'Thu Oct 8 · 17:59–18:16 UTC');
    assert.equal(at('2026-10-17T15:48:00Z/2026-10-17T16:08:00Z', { approxStart: true }), 'Sat Oct 17 · ≈15:48–16:08 UTC');
    assert.equal(at('2026-10-21T18:09:00Z/2026-10-22T18:09:00Z', { approxStart: true }), 'Wed Oct 21 · ≈18:09 → Thu Oct 22 · ≈18:09 UTC');
    assert.equal(at('2026-10-09T18:09:00Z/2026-10-16T18:09:00Z', { approxStart: false, approxEnd: true }), 'Fri Oct 9 · 18:09 → Fri Oct 16 · ≈18:09 UTC');
    assert.equal(at('2026-10-11'), 'Sun Oct 11');
    assert.equal(at('2026-10-18/2026-10-19'), 'Sun Oct 18 – Mon Oct 19');
    assert.equal(at('2026-10-18/2026-10-19', { approxStart: true }), '≈ Sun Oct 18 – Mon Oct 19');
    // an offset is read as the instant it names, and written in UTC
    assert.equal(at('2026-10-09T20:09:00+02:00'), 'Fri Oct 9 · 18:09 UTC');

    assert.equal(at('2026-10-17', { approxStart: true }), '≈ Sat Oct 17');

    // a scheduled or planned time is a projection (≈) unless set exactly; a
    // past time, or a bare day, is exact unless the milestone says otherwise
    const shown = (event) => whenText(parseWhen(event.date), { approxStart: isApproximate(event) });
    assert.deepEqual(Object.keys(STATUS_LABEL).filter((status) => isApproximate({ status, date: '2026-10-21T00:00:00Z' })), ['scheduled', 'planned']);
    assert.equal(shown({ status: 'scheduled', date: '2026-10-21T00:00:00Z', approximate: false }), 'Wed Oct 21 · 00:00 UTC');
    assert.equal(shown({ status: 'scheduled', date: '2026-10-23T18:09:00Z' }), 'Fri Oct 23 · ≈18:09 UTC');
    assert.equal(shown({ status: 'done', date: '2026-10-09T17:55:00Z', approximate: true }), 'Fri Oct 9 · ≈17:55 UTC');
    assert.equal(shown({ status: 'done', date: '2026-10-09T18:09:00Z' }), 'Fri Oct 9 · 18:09 UTC');
    assert.equal(shown({ status: 'planned', date: '2026-10-16' }), 'Fri Oct 16');
    assert.equal(shown({ status: 'planned', date: '2026-10-17', approximate: true }), '≈ Sat Oct 17');

    for (const bad of ['', 'October 8', '2026-10-32', '2026-02-30', '2026-10-08T18:36', '2026-10-09/2026-10-08', '2026-10-08/2026-10-09T00:00:00Z', 'a/b/c']) {
        assert.equal(parseWhen(bad), null, `"${bad}" should not parse`);
    }
});

test('the epochs are contiguous, and each lasts its number of blocks', () => {
    mainnetEpochs.forEach((epoch, index) => {
        assert.equal(epoch.number, index);
        assert.ok(Object.hasOwn(SETTLEMENT_LABEL, epoch.settlement), `epoch ${epoch.number}: settlement ${epoch.settlement}`);
        const blocks = epoch.end.block - epoch.start.block;
        assert.equal(blocks, index === 0 ? 7200 : 50400, `epoch ${epoch.number}: ${blocks} blocks`);
        const start = Date.parse(epoch.start.time);
        const end = Date.parse(epoch.end.time);
        assert.ok(Number.isFinite(start) && Number.isFinite(end) && end > start, `epoch ${epoch.number}: times`);
        // block times wander; a boundary is within ten minutes of 12 s a block
        assert.ok(Math.abs((end - start) / 1000 - blocks * SECONDS_PER_BLOCK) <= 600, `epoch ${epoch.number}: ${blocks} blocks in ${(end - start) / 1000} s`);
        if (index > 0) {
            const previous = mainnetEpochs[index - 1];
            assert.equal(epoch.start.block, previous.end.block, `epoch ${epoch.number} starts where ${previous.number} ends`);
            assert.equal(epoch.start.time, previous.end.time, `epoch ${epoch.number} starts when ${previous.number} ends`);
        }
    });
    assert.equal(epochBlocks(mainnetEpochs[1]), 'Blocks 9,247,228 → 9,297,628 · 50,400 blocks, 7 days');
    assert.equal(epochBlocks(mainnetEpochs[0]), 'Blocks 9,240,028 → 9,247,228 · 7,200 blocks, 1 day');
});

test('a milestone is grouped by the epoch it ends in, a day counting from its start', () => {
    const epochs = mainnetEpochs;
    const fixture = [
        { id: 'a', date: '2026-10-06T00:00:00Z' },
        // starts before epoch 0, ends in it
        { id: 'b', date: '2026-10-08T17:59:12Z/2026-10-08T18:16:00Z' },
        // a day on which epoch 0 ends at 18:09: the day counts from 00:00
        { id: 'c', date: '2026-10-09' },
        { id: 'd', date: '2026-10-09T18:09:00Z' },
        { id: 'e', date: '2026-10-16T18:09:00Z/2026-10-16T18:33:00Z' },
        { id: 'f', date: '2026-10-23T18:09:00Z' },
        { id: 'g', date: '2026-10-30T18:09:00Z/2026-10-30T22:09:00Z' },
        { id: 'h', date: 'not a date' },
    ];
    const groups = groupByEpoch(fixture, epochs, { before: { title: 'Before launch' }, after: { summary: 'After' } });
    const where = Object.fromEntries(groups.flatMap((g) => g.events.map((e) => [e.id, g.id])));
    assert.deepEqual(where, { a: 'before-launch', b: 'epoch-0', c: 'epoch-0', d: 'epoch-1', e: 'epoch-2', f: 'epoch-3', g: 'after-epoch-3' });
    assert.deepEqual(groups.map((g) => g.title), ['Before launch', 'Epoch 0', 'Epoch 1', 'Epoch 2', 'Epoch 3', 'After epoch 3']);

    // the real milestones all land in a group, in the order the data lists them
    const real = groupByEpoch(events, epochs);
    assert.deepEqual(real.flatMap((g) => g.events.map((e) => e.id)), events.map((e) => e.id));
});

test('the box at the top gives the timeline\'s dates, and links only pages the site has', () => {
    const text = (step) => `${step.title} ${step.detail}`;
    const [install, wallet, payments] = mainnetActions.steps;
    assert.equal(mainnetActions.headline, 'Mainnet is live!');
    assert.equal(mainnetActions.steps.length, 3);
    // the old miner is deprioritized when the modern provider gate turns on
    const gate = events.find((e) => e.id === 'fp2-modern-provider-gate');
    assert.equal(gate.date, '2026-10-21T00:00:00Z');
    assert.match(text(install), /October 21, 2026/);
    assert.match(text(install), /From 00:00 UTC on October 21/);
    // epoch 2 runs October 16 to 23; epoch 3, where settlement v2 starts, at about 18:09 on October 23
    const [, , epoch2, epoch3] = mainnetEpochs;
    assert.equal(epoch2.start.time.slice(0, 10), '2026-10-16');
    assert.equal(epoch2.end.time.slice(0, 10), '2026-10-23');
    assert.match(text(payments), /Epoch 2 \(October 16 to 23\)/);
    assert.equal(epoch3.settlement, 'v2');
    assert.equal(epoch3.start.time, '2026-10-23T18:09:00Z');
    assert.match(text(payments), /epoch 3, about October 23, 18:09 UTC/);
    assert.equal(events.find((e) => e.id === 'settlement-v2-active').date, epoch3.start.time);
    // links: the miner guide's own sections, and the operators' apps
    const guide = fs.readFileSync(path.join(__dirname, '../../docs/miner/README.md'), 'utf8');
    const slug = (heading) => heading.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-');
    const anchors = new Set([...guide.matchAll(/^#{2,3} (.+)$/gm)].map((m) => slug(m[1])));
    for (const step of [install, wallet]) {
        const [route, anchor] = step.link.href.split('#');
        assert.equal(route, '/docs/miner');
        assert.ok(anchors.has(anchor), `the miner guide has no section #${anchor}`);
    }
    assert.equal(payments.link, undefined);
    assert.deepEqual(mainnetActions.closing.filter((run) => run.href).map((run) => [run.text, run.href]), [['the apps', '/operators']]);
    assert.match(mainnetActions.closing.map((run) => run.text).join(''), /^After epoch 3, the subnet is set up to run itself and scale to millions of miners\. New miners can participate in Bittensor from the apps with zero Bittensor experience\.$/);
});
