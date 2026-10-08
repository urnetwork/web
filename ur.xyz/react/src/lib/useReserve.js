import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BLOCKS_PER_DAY, readReserve, readReserveAt } from './subtensor';

/**
 * The reserve page's chain feed: the reserve's state at the latest finalized
 * block, polled every minute (a block is 12 s; the balance moves once per
 * tempo, 360 blocks), and, once the reserve is live, its balance history
 * from the archive node.
 *
 *   snapshot      readReserve()'s result (null until the chain answers; the
 *                 last good value is kept if a later poll fails)
 *   history       [{ block, time, freeTao, alpha }] ascending, ending at the
 *                 snapshot; null before the first snapshot, [] for a reserve
 *                 that has not received anything yet
 *   historyReady  the archive samples behind `history` have been read (until
 *                 then a live history is just the snapshot's own point)
 *   error         the last poll's error while there is no snapshot
 *   updatedAt     wall-clock time of the last successful poll
 *
 * Nothing here runs during render: the static build server-renders the page
 * without a snapshot and the client fills it in, so hydration is
 * deterministic.
 */

const POLL_MS = 60_000;
const RETRY_MS = 10_000;
const HISTORY_REFRESH_MS = 15 * 60_000;
// One sample a day for the last five weeks, then one per settlement epoch
// (7 days, 50,400 blocks) back to the first receipt, on fixed block
// boundaries so every visit asks for the same blocks. A sample at a
// finalized block never changes, so each is read once and kept in
// localStorage: a first visit reads a month of history in ~3 s; a year
// (about 80 samples) takes two passes a minute apart, newest first, because
// the public archive node rations historical reads (see lib/subtensor.js);
// later visits read only the new days. A sample that comes back unusable is
// asked for a few times and then left out; one the node had no budget for is
// simply asked for again.
const DAILY_WINDOW_DAYS = 35;
const WEEK_BLOCKS = 7 * BLOCKS_PER_DAY;
const MAX_SAMPLE_ATTEMPTS = 3;
const CACHE_KEY = 'ur.xyz.reserve.history.v1';
const CACHE_MAX_SAMPLES = 2000;

function readCache(address, netuid) {
    try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (!raw) return {};
        const cached = JSON.parse(raw);
        if (cached.address !== address || cached.netuid !== netuid) return {};
        return cached.samples || {};
    } catch {
        return {};
    }
}

function writeCache(address, netuid, samples) {
    try {
        const entries = Object.entries(samples).sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, CACHE_MAX_SAMPLES);
        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ address, netuid, samples: Object.fromEntries(entries) }));
    } catch { /* private mode or full */ }
}

/**
 * The block the history starts at: the earliest registration of a recipient
 * hotkey, which is the first block the reserve could have been paid at (the
 * recipients registered before the launch date); failing that, the launch
 * date's block, estimated from the snapshot's time.
 */
function historyStart(snapshot, launchIso) {
    const registered = snapshot.hotkeys.map((h) => h.registeredAt).filter((b) => Number.isFinite(b) && b > 0);
    if (registered.length) return Math.min(...registered);
    const launchMs = Date.parse(`${launchIso}T00:00:00Z`);
    const blocksSinceLaunch = Math.max(0, Math.round((snapshot.time - launchMs) / 12_000));
    return snapshot.block - blocksSinceLaunch;
}

/** The blocks to sample between the history's start and the snapshot's block, ascending. */
function sampleBlocks(snapshot, launchIso) {
    const from = Math.max(snapshot.emission.firstEmissionBlock || 0, historyStart(snapshot, launchIso));
    const dailyFrom = Math.max(from, snapshot.block - DAILY_WINDOW_DAYS * BLOCKS_PER_DAY);
    const blocks = new Set();
    for (let b = Math.ceil(from / WEEK_BLOCKS) * WEEK_BLOCKS; b < dailyFrom; b += WEEK_BLOCKS) blocks.add(b);
    for (let b = Math.ceil(dailyFrom / BLOCKS_PER_DAY) * BLOCKS_PER_DAY; b < snapshot.block; b += BLOCKS_PER_DAY) blocks.add(b);
    return [...blocks].filter((b) => b > from).sort((a, b) => a - b);
}

/** Whether the reserve has received anything: α staked, TAO held, or a recipient hotkey being paid. */
export function isLive(snapshot) {
    if (!snapshot) return false;
    return snapshot.alpha > 0 || snapshot.account.exists || snapshot.hotkeys.some((h) => h.incentiveShare > 0);
}

export function useReserve({ address, netuid, launch }) {
    const [snapshot, setSnapshot] = useState(null);
    const [samples, setSamples] = useState(null); // archive samples, ascending; null until read
    const [error, setError] = useState(null);
    const [updatedAt, setUpdatedAt] = useState(null);
    const ctrlRef = useRef(null);
    const timerRef = useRef(0);
    const samplesAtRef = useRef(0);
    const samplesBusyRef = useRef(false);
    const failuresRef = useRef(new Map()); // block → failed reads this session

    const loadSamples = useCallback(async (snap, signal) => {
        if (samplesBusyRef.current) return;
        samplesBusyRef.current = true;
        const cached = readCache(address, netuid);
        const wanted = sampleBlocks(snap, launch);
        const failures = failuresRef.current;
        const pending = () => wanted.filter((b) => !cached[b] && (failures.get(b) || 0) < MAX_SAMPLE_ATTEMPTS);
        const publish = () => setSamples(wanted.filter((b) => cached[b]).map((b) => ({ block: b, time: cached[b][0], freeTao: cached[b][1], alpha: cached[b][2] })));
        try {
            const missing = pending();
            if (missing.length) {
                const { samples: read, attempted } = await readReserveAt({
                    address,
                    netuid,
                    blocks: missing,
                    hotkeys: snap.stakeHotkeys,
                    // storage while it reproduces the runtime API's stake at
                    // the head; the rationed runtime API if a runtime upgrade
                    // has moved the storage
                    viaRuntimeApi: !snap.stakeStorageAgrees,
                    signal,
                });
                const got = new Set(read.map((s) => s.block));
                for (const s of read) cached[s.block] = [s.time, s.freeTao, s.alpha];
                for (const b of attempted) if (!got.has(b)) failures.set(b, (failures.get(b) || 0) + 1);
                if (read.length) writeCache(address, netuid, cached);
            }
            if (signal.aborted) return;
            publish();
            // everything read (or given up on): back to the slow cadence;
            // otherwise the next poll asks for the rest
            samplesAtRef.current = pending().length ? 0 : Date.now();
        } catch {
            // the chain did not answer at all: show what the cache holds and
            // let the next poll try again
            if (!signal.aborted) publish();
        } finally {
            samplesBusyRef.current = false;
        }
    }, [address, netuid, launch]);

    const poll = useCallback(async () => {
        const ctrl = ctrlRef.current;
        if (!ctrl || ctrl.signal.aborted) return;
        clearTimeout(timerRef.current);
        try {
            const snap = await readReserve({ address, netuid, signal: ctrl.signal });
            if (ctrl.signal.aborted) return;
            setSnapshot(snap);
            setError(null);
            setUpdatedAt(Date.now());
            if (isLive(snap) && Date.now() - samplesAtRef.current > HISTORY_REFRESH_MS) loadSamples(snap, ctrl.signal);
            timerRef.current = setTimeout(poll, POLL_MS);
        } catch (e) {
            if (ctrl.signal.aborted) return;
            setError(e);
            timerRef.current = setTimeout(poll, RETRY_MS);
        }
    }, [address, netuid, loadSamples]);

    useEffect(() => {
        ctrlRef.current = new AbortController();
        poll();
        return () => {
            ctrlRef.current.abort();
            clearTimeout(timerRef.current);
        };
    }, [poll]);

    const live = isLive(snapshot);
    const history = useMemo(() => {
        if (!snapshot) return null;
        if (!live) return [];
        const latest = { block: snapshot.block, time: snapshot.time, freeTao: snapshot.account.freeTao, alpha: snapshot.alpha };
        return [...(samples || []).filter((s) => s.block < snapshot.block), latest];
    }, [snapshot, samples, live]);

    return { snapshot, history, historyReady: !live || samples !== null, error, updatedAt };
}
