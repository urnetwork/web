/**
 * The subnet's settlement epochs, as SN25 mainnet counts them (the v1
 * coordinator's epochStartBlock and epochEndBlock; sn mainnet/MAINNET.md,
 * "As launched"):
 *
 *   epoch 0      blocks 9,240,028 to 9,247,228: 7,200 blocks, one day
 *   epoch n ≥ 1  starts at block 9,247,228 + (n − 1) × 50,400 and lasts
 *                50,400 blocks, 7 days at 12 seconds a block
 *
 * An epoch ends at a block, not at a clock time. This module keeps no React
 * and reads no chain (only /reserve contacts one), so the unit tests can
 * import it and the page stays on its first-party feeds. It turns blocks
 * into time from one anchor: block 9,247,228, where epoch 1 starts, has the
 * timestamp 2026-10-09 18:09:00 UTC on Finney, and each later block counts
 * 12 seconds. From the anchor to block 9,286,515 (2026-10-15 05:06:36 UTC)
 * blocks averaged 12.0003 seconds, so a projected end drifts by seconds a
 * week, not minutes. An operator feed that reports its epoch takes
 * precedence (feedEpoch): its bounds come from the chain.
 */
export const EPOCH_ZERO_START_BLOCK = 9_240_028;
export const EPOCH_ONE_START_BLOCK = 9_247_228;
export const EPOCH_BLOCKS = 50_400;
export const BLOCK_SECONDS = 12;
/** Block 9,240,028's timestamp: epoch 0 starts. */
export const EPOCH_ZERO_START_MS = Date.UTC(2026, 9, 8, 18, 8, 12);
/** Block 9,247,228's timestamp: epoch 1 starts. The anchor. */
export const EPOCH_ONE_START_MS = Date.UTC(2026, 9, 9, 18, 9, 0);

const BLOCK_MS = BLOCK_SECONDS * 1000;
const EPOCH_MS = EPOCH_BLOCKS * BLOCK_MS;

export function epochStartBlock(n) {
    return n === 0 ? EPOCH_ZERO_START_BLOCK : EPOCH_ONE_START_BLOCK + (n - 1) * EPOCH_BLOCKS;
}

export function epochEndBlock(n) {
    return n === 0 ? EPOCH_ONE_START_BLOCK : epochStartBlock(n) + EPOCH_BLOCKS;
}

/** When the chain reaches `block`, projected from the anchor at 12 s a block. */
export function blockTimeMs(block) {
    return EPOCH_ONE_START_MS + (block - EPOCH_ONE_START_BLOCK) * BLOCK_MS;
}

/** Epoch n: { number, startBlock, endBlock, startMs, endMs }. */
export function epochBounds(n) {
    const startBlock = epochStartBlock(n);
    const endBlock = epochEndBlock(n);
    return {
        number: n,
        startBlock,
        endBlock,
        // epoch 0 is history: its start is the block's own timestamp
        startMs: n === 0 ? EPOCH_ZERO_START_MS : blockTimeMs(startBlock),
        endMs: blockTimeMs(endBlock),
    };
}

/** The epoch at nowMs by the anchor, or null before epoch 0 began. */
export function epochAt(nowMs) {
    if (!Number.isFinite(nowMs) || nowMs < EPOCH_ZERO_START_MS) return null;
    if (nowMs < EPOCH_ONE_START_MS) return epochBounds(0);
    return epochBounds(1 + Math.floor((nowMs - EPOCH_ONE_START_MS) / EPOCH_MS));
}

/** 0 → 1 through `epoch` at nowMs. */
export function epochProgress(epoch, nowMs) {
    const span = epoch.endMs - epoch.startMs;
    if (!(span > 0)) return 0;
    return Math.min(1, Math.max(0, (nowMs - epoch.startMs) / span));
}

/**
 * The epoch an operator feed reports, or null when it reports none. A feed
 * without `epoch` is the older form: its `block` counts the site's former
 * Sunday-to-Sunday weeks and its windowed fields cover those weeks, so it
 * says nothing about epochs and `block` is never read as one. Bounds the
 * feed leaves out are the anchor's for its epoch.
 */
export function feedEpoch(feed) {
    const n = feed?.epoch;
    if (!Number.isInteger(n) || n < 0) return null;
    const own = epochBounds(n);
    const startBlock = Number.isInteger(feed.epochStartBlock) ? feed.epochStartBlock : own.startBlock;
    const endBlock = Number.isInteger(feed.epochEndBlock) ? feed.epochEndBlock : own.endBlock;
    const startMs = Number.isFinite(feed.epochStart) ? feed.epochStart * 1000 : (n === 0 ? own.startMs : blockTimeMs(startBlock));
    const endMs = Number.isFinite(feed.epochEnd) ? feed.epochEnd * 1000 : blockTimeMs(endBlock);
    if (!(endMs > startMs)) return null;
    return { number: n, startBlock, endBlock, startMs, endMs };
}

// A feed's epoch stands while the clock is inside it, give or take this
// much: the end block can land a little either side of its projected time,
// and a feed refreshes about once a minute, so its rollover can trail the
// projection. A feed still on an epoch beyond that has stopped updating, and
// the clock moves on without it.
export const FEED_EPOCH_SLACK_MS = 15 * 60 * 1000;

/**
 * The epoch to show at nowMs: the feeds' own while it is current
 * (fromFeed true, and the feeds' windowed figures are that epoch's), else
 * the anchor's (fromFeed false, and no windowed figure belongs to it).
 * Null before epoch 0.
 */
export function displayEpoch(feedsEpoch, nowMs) {
    if (!Number.isFinite(nowMs)) return null;
    if (feedsEpoch
        && nowMs >= feedsEpoch.startMs - FEED_EPOCH_SLACK_MS
        && nowMs < feedsEpoch.endMs + FEED_EPOCH_SLACK_MS) {
        return { ...feedsEpoch, fromFeed: true };
    }
    const own = epochAt(nowMs);
    return own && { ...own, fromFeed: false };
}

/**
 * An operator feed's JSON body as numbers: null where a field is missing,
 * so the page tells "not published" from a measured zero.
 */
export function parseFeed(body) {
    const optional = (key) => {
        if (body?.[key] == null || body?.[key] === '') return null;
        const v = Number(body?.[key]);
        return Number.isFinite(v) ? v : null;
    };
    const alphaUsd = Number(body?.alpha_usd);
    return {
        // the settlement epoch and its bounds (unix seconds, blocks)
        epoch: optional('epoch'),
        epochStart: optional('epoch_start'),
        epochEnd: optional('epoch_end'),
        epochStartBlock: optional('epoch_start_block'),
        epochEndBlock: optional('epoch_end_block'),
        // windowed: the current epoch, or a Sunday week in the older form
        users: optional('users'),
        dataGib: optional('data_gib'),
        demandDepositsAlpha: optional('demand_deposits_alpha'),
        minerEmissionsAlpha: optional('miner_emissions_alpha'),
        // ...and the window before it
        prevUsers: optional('prev_users'),
        prevDataGib: optional('prev_data_gib'),
        prevDemandDepositsAlpha: optional('prev_demand_deposits_alpha'),
        prevMinerEmissionsAlpha: optional('prev_miner_emissions_alpha'),
        // not windowed
        totalNetworks: optional('total_networks'),
        stakedAlpha: optional('staked_alpha'),
        // A price of 0 is no price; null marks "not published".
        alphaUsd: Number.isFinite(alphaUsd) && alphaUsd > 0 ? alphaUsd : null,
    };
}

export const WINDOWED_FIELDS = [
    'users', 'dataGib', 'demandDepositsAlpha', 'minerEmissionsAlpha',
    'prevUsers', 'prevDataGib', 'prevDemandDepositsAlpha', 'prevMinerEmissionsAlpha',
];
export const CUMULATIVE_FIELDS = ['totalNetworks', 'stakedAlpha'];

/**
 * The sum of the feeds that answered: { totals, epoch }. The cumulative
 * fields always add up. The windowed fields add up only when every feed
 * reports the same epoch, which `epoch` then is; otherwise they are null
 * and so is `epoch`: an older feed's windows are Sunday weeks, and two
 * feeds either side of a rollover cover different epochs. A field stays
 * null until at least one feed publishes it.
 */
export function sumFeeds(feeds) {
    const epochs = feeds.map(feedEpoch);
    const shared = feeds.length > 0 && epochs.every((e) => e && e.number === epochs[0].number) ? epochs[0] : null;
    const add = (a, b) => (a == null && b == null ? null : (a ?? 0) + (b ?? 0));
    const totals = {};
    for (const key of CUMULATIVE_FIELDS) totals[key] = feeds.reduce((sum, f) => add(sum, f[key]), null);
    for (const key of WINDOWED_FIELDS) totals[key] = shared ? feeds.reduce((sum, f) => add(sum, f[key]), null) : null;
    return { totals, epoch: shared };
}

/** An epoch's projected end in the page's language, to the minute, in UTC. */
export function formatEpochEnd(endMs, locale) {
    return new Date(endMs).toLocaleString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: 'UTC',
    });
}

/**
 * Put a formatted date into a template's {date}. A date that ends in its
 * own period (an abbreviated month, de "16. Okt.") also ends the sentence,
 * rather than printing "Okt.." when the template follows {date} with one.
 */
export function fillDate(template, date) {
    return (date.endsWith('.') ? template.replace('{date}.', '{date}') : template).replace('{date}', date);
}
