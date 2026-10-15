// The landing page's settlement-epoch clock and the operator feed it reads
// (src/lib/epoch.js). The chain facts below were read from Finney through
// snow's archive on 2026-10-15: the v1 coordinator's epochStartBlock and
// epochEndBlock for epochs 0 to 5, and the timestamps of blocks 9,240,028,
// 9,247,228 and 9,286,515.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    BLOCK_SECONDS, EPOCH_BLOCKS, EPOCH_ONE_START_BLOCK, EPOCH_ONE_START_MS, EPOCH_ZERO_START_BLOCK, EPOCH_ZERO_START_MS,
    FEED_EPOCH_SLACK_MS, blockTimeMs, displayEpoch, epochAt, epochEndBlock, epochProgress, epochStartBlock,
    feedEpoch, fillDate, formatEpochEnd, parseFeed, sumFeeds,
} from '../src/lib/epoch.js';

const utc = (...args) => Date.UTC(...args);

// grafana.bringyour.com/stats.json on 2026-10-15 04:54 UTC: the older form,
// whose "block" counts the site's former Sunday weeks
const OLDER_FEED = {
    block: 16, users: 109721, data_gib: 14821.374982766743, total_networks: 1122653, online_providers: 71596,
    countries: 96, staked_alpha: 0, demand_deposits_alpha: 0, miner_emissions_alpha: 0, alpha_usd: 1.51328729091742,
    prev_users: 109117, prev_data_gib: 24520.146110679234, prev_demand_deposits_alpha: 0, prev_miner_emissions_alpha: 0,
};

// the same feed in the form agreed with its producers: epoch 1 and its bounds
const EPOCH_FEED = {
    ...OLDER_FEED, block: 1, epoch: 1, epoch_start: 1791569340, epoch_end: 1792174140,
    epoch_start_block: 9247228, epoch_end_block: 9297628, users: 150000, data_gib: 30000.5,
};

test('the epochs are the coordinator\'s', () => {
    // [epoch, epochStartBlock, epochEndBlock] as the v1 coordinator returns them
    const chain = [
        [0, 9_240_028, 9_247_228], [1, 9_247_228, 9_297_628], [2, 9_297_628, 9_348_028],
        [3, 9_348_028, 9_398_428], [4, 9_398_428, 9_448_828], [5, 9_448_828, 9_499_228],
    ];
    for (const [e, start, end] of chain) {
        assert.equal(epochStartBlock(e), start, `epoch ${e} start`);
        assert.equal(epochEndBlock(e), end, `epoch ${e} end`);
    }
    assert.equal(EPOCH_ZERO_START_BLOCK, 9_240_028);
    assert.equal(EPOCH_ONE_START_BLOCK, 9_247_228);
    assert.equal(EPOCH_BLOCKS * BLOCK_SECONDS, 7 * 24 * 3600, 'an epoch is 7 days at 12 s a block');
});

test('the anchor is the chain\'s timestamps', () => {
    assert.equal(EPOCH_ZERO_START_MS, 1_791_482_892_000, 'block 9,240,028: 2026-10-08 18:08:12 UTC');
    assert.equal(EPOCH_ONE_START_MS, 1_791_569_340_000, 'block 9,247,228: 2026-10-09 18:09:00 UTC');
    // block 9,286,515 was at 05:06:36.001 UTC; the 12-second projection is within 13 seconds of it
    assert.ok(Math.abs(blockTimeMs(9_286_515) - utc(2026, 9, 15, 5, 6, 36)) < 13_000);
});

test('on 2026-10-15 it is epoch 1, which ends at block 9,297,628, about 18:09 UTC on Oct 16', () => {
    const now = utc(2026, 9, 15, 5, 6, 36);
    const e = epochAt(now);
    assert.equal(e.number, 1, 'not the former Sunday clock\'s block 16');
    assert.equal(e.startBlock, 9_247_228);
    assert.equal(e.endBlock, 9_297_628);
    assert.equal(e.startMs, utc(2026, 9, 9, 18, 9, 0));
    assert.equal(e.endMs, utc(2026, 9, 16, 18, 9, 0));
    assert.ok(Math.abs(epochProgress(e, now) - (9_286_515 - 9_247_228) / 50_400) < 1e-4);
});

test('the boundaries: before launch, epoch 0, and the epoch settlement v2 starts', () => {
    assert.equal(epochAt(utc(2026, 9, 8, 18, 0, 0)), null, 'before epoch 0');
    const zero = epochAt(utc(2026, 9, 9, 12, 0, 0));
    assert.deepEqual(zero, { number: 0, startBlock: 9_240_028, endBlock: 9_247_228, startMs: EPOCH_ZERO_START_MS, endMs: EPOCH_ONE_START_MS });
    assert.equal(epochAt(EPOCH_ONE_START_MS - 1).number, 0);
    assert.equal(epochAt(EPOCH_ONE_START_MS).number, 1);
    assert.equal(epochAt(utc(2026, 9, 16, 18, 8, 59)).number, 1);
    assert.equal(epochAt(utc(2026, 9, 16, 18, 9, 0)).number, 2);
    const three = epochAt(utc(2026, 9, 23, 18, 9, 0));
    assert.equal(three.number, 3);
    assert.equal(three.startBlock, 9_348_028, 'E_s, the first settlement v2 epoch');
    assert.equal(epochAt(NaN), null);
});

test('progress runs 0 to 1 and stops at the ends', () => {
    const e = epochAt(utc(2026, 9, 12, 0, 0, 0));
    assert.equal(epochProgress(e, e.startMs), 0);
    assert.equal(epochProgress(e, e.startMs - 5000), 0);
    assert.equal(epochProgress(e, e.endMs + 5000), 1);
    assert.equal(epochProgress(e, (e.startMs + e.endMs) / 2), 0.5);
});

test('an older feed reports no epoch, and its block is never read as one', () => {
    const feed = parseFeed(OLDER_FEED);
    assert.equal(feed.epoch, null);
    assert.equal('block' in feed || 'blockNumber' in feed, false);
    assert.equal(feedEpoch(feed), null);
});

test('a feed\'s epoch and its chain-derived bounds', () => {
    const e = feedEpoch(parseFeed(EPOCH_FEED));
    assert.deepEqual(e, { number: 1, startBlock: 9_247_228, endBlock: 9_297_628, startMs: 1_791_569_340_000, endMs: 1_792_174_140_000 });
    // an end the feed has re-projected from slower blocks wins over the anchor's
    const later = feedEpoch(parseFeed({ ...EPOCH_FEED, epoch_end: 1792174155 }));
    assert.equal(later.endMs, 1_792_174_155_000);
    // bounds the feed leaves out are the anchor's
    assert.deepEqual(feedEpoch(parseFeed({ epoch: 2 })), epochAt(utc(2026, 9, 17)));
    // a malformed feed is no epoch
    assert.equal(feedEpoch(parseFeed({ epoch: 1, epoch_start: 100, epoch_end: 100 })), null);
    assert.equal(feedEpoch(parseFeed({ epoch: 1.5 })), null);
    assert.equal(feedEpoch(parseFeed({ epoch: -1 })), null);
    assert.equal(feedEpoch(null), null);
});

test('the display takes the feeds\' epoch while it is current, else the anchor\'s', () => {
    const fromFeeds = feedEpoch(parseFeed(EPOCH_FEED));
    const now = utc(2026, 9, 15, 5, 0, 0);
    assert.equal(displayEpoch(fromFeeds, now).fromFeed, true);
    assert.equal(displayEpoch(null, now).fromFeed, false);
    assert.equal(displayEpoch(null, now).number, 1);
    // a feed that rolls over a little late still stands...
    const justAfter = fromFeeds.endMs + FEED_EPOCH_SLACK_MS - 1000;
    assert.deepEqual([displayEpoch(fromFeeds, justAfter).number, displayEpoch(fromFeeds, justAfter).fromFeed], [1, true]);
    // ...one that stopped does not: the clock moves on, and no windowed figure belongs to it
    const stale = displayEpoch(fromFeeds, fromFeeds.endMs + FEED_EPOCH_SLACK_MS + 1000);
    assert.deepEqual([stale.number, stale.fromFeed], [2, false]);
    // a feed already in the next epoch (blocks ran fast) is believed
    const ahead = feedEpoch(parseFeed({ epoch: 2, epoch_start: 1792174100, epoch_end: 1792778900 }));
    assert.equal(displayEpoch(ahead, 1792174120_000).number, 2);
    assert.equal(displayEpoch(null, NaN), null);
});

test('sums: the per-epoch fields only when every feed reports the same epoch', () => {
    const older = sumFeeds([parseFeed(OLDER_FEED)]);
    assert.equal(older.epoch, null);
    assert.equal(older.totals.users, null, 'a Sunday week is not an epoch');
    assert.equal(older.totals.dataGib, null);
    assert.equal(older.totals.prevUsers, null);
    assert.equal(older.totals.totalNetworks, 1122653, 'cumulative fields still sum');
    assert.equal(older.totals.stakedAlpha, 0, 'a measured zero stays a zero');

    const current = sumFeeds([parseFeed(EPOCH_FEED)]);
    assert.equal(current.epoch.number, 1);
    assert.equal(current.totals.users, 150000);
    assert.equal(current.totals.dataGib, 30000.5);
    assert.equal(current.totals.prevUsers, 109117);

    const two = sumFeeds([parseFeed(EPOCH_FEED), parseFeed({ ...EPOCH_FEED, users: 10, total_networks: 7 })]);
    assert.equal(two.totals.users, 150010);
    assert.equal(two.totals.totalNetworks, 1122660);

    const mixed = sumFeeds([parseFeed(EPOCH_FEED), parseFeed(OLDER_FEED)]);
    assert.equal(mixed.epoch, null);
    assert.equal(mixed.totals.users, null);
    assert.equal(mixed.totals.totalNetworks, 2245306);

    const acrossRollover = sumFeeds([parseFeed(EPOCH_FEED), parseFeed({ ...EPOCH_FEED, epoch: 2, epoch_start: 1792174140, epoch_end: 1792778940 })]);
    assert.equal(acrossRollover.epoch, null);
    assert.equal(acrossRollover.totals.dataGib, null);

    const none = sumFeeds([]);
    assert.equal(none.epoch, null);
    assert.equal(none.totals.totalNetworks, null);
});

test('the end reads to the minute in UTC, in the page\'s language', () => {
    const end = utc(2026, 9, 16, 18, 9, 0);
    assert.equal(formatEpochEnd(end, 'en'), 'Oct 16, 18:09');
    assert.equal(fillDate('Ends ≈ {date} UTC', formatEpochEnd(end, 'en')), 'Ends ≈ Oct 16, 18:09 UTC');
    assert.match(formatEpochEnd(end, 'de'), /^16\. Okt\.?, 18:09$/);
    // a date that ends in an abbreviation's period also ends the sentence
    assert.equal(fillDate('Ende {date}. Rest', '16. Okt.'), 'Ende 16. Okt. Rest');
});
