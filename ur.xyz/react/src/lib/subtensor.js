/**
 * A small Bittensor (Substrate) reader for the browser: the reserve page reads
 * the Network Capacity Reserve's state straight from mainnet (Finney) through
 * the chain's public JSON-RPC endpoints (the foundation-run nodes at
 * *.opentensor.ai), which answer HTTPS POSTs with
 * `Access-Control-Allow-Origin: *`, so no proxy, API key or WebSocket is
 * needed. Everything here is dependency-free on purpose: the
 * storage keys need xxhash64 (twox128) and blake2b-128, the SS58 address needs
 * blake2b-512 for its checksum, and the values are plain little-endian
 * integers or SCALE compacts, which is a few hundred lines rather than the
 * polkadot.js stack.
 *
 * What it reads (all at one finalized block, so the figures agree):
 *
 *   System.Account(coldkey)                 free TAO and the nonce
 *   StakeInfoRuntimeApi_get_stake_info_for_coldkey(coldkey)
 *                                           every (hotkey, netuid) α stake the
 *                                           coldkey owns (runtime API, so it
 *                                           survives the stake storage
 *                                           reshuffles between runtimes)
 *   SubtensorModule.OwnedHotkeys(coldkey)   the recipient hotkeys registered
 *                                           to the coldkey, and their UIDs
 *   SubnetTAO / SubnetAlphaIn / SubnetAlphaOut(netuid)
 *                                           the subnet pool: α price in TAO
 *   SubnetAlphaOutEmission(netuid)          α emitted per block
 *   SubnetOwnerCut                          the owner's share (default 18%)
 *   MinerBurned(netuid), Incentive(netuid)  how the miner allocation is
 *                                           routed right now
 *   Timestamp.Now                           the block's wall-clock time
 *   AlphaV2, TotalHotkeySharesV2, TotalHotkeyAlpha
 *                                           the storage behind a stake, for
 *                                           the balance history (below)
 *
 * The public nodes' limits, measured 2026-10-06 (they shape the history
 * read; the live read is three small round trips of ~150 ms):
 *
 *   - 40 calls per JSON-RPC batch (60 is refused as too large);
 *   - the entrypoint and lite nodes keep block hashes but only recent state,
 *     so state at a past block comes from the archive node;
 *   - about 100 HTTP requests per source per rolling minute, a batch
 *     counting as one: beyond it the node answers 429 with
 *     { "policy": "http_60s", "retry_after_seconds": 60 };
 *   - a budget for state at past blocks ("Historical work rate limit
 *     exceeded", -32004, { "budget": "historical_references" }), refused
 *     call by call inside an otherwise successful batch: roughly 700 storage
 *     reads in a burst, refilling at about 10 a second (1,262 reads went
 *     through in a minute from idle). A runtime-API call at a past block
 *     costs about 50 of them and ~1 s: 20 in a row exhaust it.
 *
 * So the balance history is read from storage (a stake is shares × the
 * hotkey's α ÷ the hotkey's shares): nine reads a sample instead of a
 * runtime call, 30 samples in ~3 s. Storage layouts change with runtime
 * upgrades (these are the "V2" maps), so every live read compares the
 * storage-derived stake with the runtime API's at the same block; while they
 * agree the history uses storage, and if they ever stop agreeing it falls
 * back to paced runtime-API calls (see readReserveAt).
 */

export const RAO = 1_000_000_000;
export const BLOCKS_PER_DAY = 7200; // 12 s blocks
export const NETUID = 25;

/** Live state: the entrypoint first, the lite node as its stand-in. */
export const FINNEY_RPC = Object.freeze([
    'https://entrypoint-finney.opentensor.ai',
    'https://lite.chain.opentensor.ai',
]);
/** Historical state (the other nodes answer "State already discarded"). */
export const FINNEY_ARCHIVE = Object.freeze(['https://archive.chain.opentensor.ai']);

// Below the nodes' refusal threshold, with room for the per-call overhead.
const BATCH_LIMIT = 32;
const BATCH_CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 20_000;
// The archive node: a few requests at a time, a longer leash, and one pass
// of history reads kept to about two thirds of its burst budget (other tabs
// and other visitors behind the same address draw on the same budget; the
// caller comes back for the rest a minute later, by when it has refilled).
// On the runtime-API fallback: one call at a time, a dozen per pass.
const ARCHIVE_CONCURRENCY = 3;
const ARCHIVE_TIMEOUT_MS = 30_000;
const ARCHIVE_READS_PER_PASS = 448;
// a sample is the time, the account and the staking hotkeys, then three
// reads per hotkey: nine for a coldkey with two
const READS_PER_SAMPLE = 9;
const HISTORICAL_WORK_REFUSED = -32004;
const RUNTIME_SAMPLE_INTERVAL_MS = 2_500;
const RUNTIME_SAMPLES_PER_PASS = 12;

// Storage defaults the chain leaves unset: `SubnetOwnerCut` is a ValueQuery
// whose default is 18% of 65535.
const DEFAULT_OWNER_CUT = 11_796 / 65_535;

// ── bytes ───────────────────────────────────────────────────────────────────

const utf8 = (s) => new TextEncoder().encode(s);

function concat(...parts) {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let offset = 0;
    for (const p of parts) { out.set(p, offset); offset += p.length; }
    return out;
}

export function toHex(bytes) {
    let s = '0x';
    for (const b of bytes) s += b.toString(16).padStart(2, '0');
    return s;
}

export function fromHex(hex) {
    const s = String(hex).startsWith('0x') ? hex.slice(2) : String(hex);
    const out = new Uint8Array(s.length >> 1);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
}

const sameBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// ── blake2b (RFC 7693), BigInt words: the inputs are a few dozen bytes ───────

const M64 = (1n << 64n) - 1n;
const B2_IV = [
    0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
    0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n,
];
const B2_SIGMA = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
    [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
    [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
    [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
    [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
    [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
    [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
    [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
    [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
];
const rotr64 = (x, n) => ((x >> BigInt(n)) | (x << BigInt(64 - n))) & M64;

function b2Mix(v, a, b, c, d, x, y) {
    v[a] = (v[a] + v[b] + x) & M64; v[d] = rotr64(v[d] ^ v[a], 32);
    v[c] = (v[c] + v[d]) & M64; v[b] = rotr64(v[b] ^ v[c], 24);
    v[a] = (v[a] + v[b] + y) & M64; v[d] = rotr64(v[d] ^ v[a], 16);
    v[c] = (v[c] + v[d]) & M64; v[b] = rotr64(v[b] ^ v[c], 63);
}

export function blake2b(data, outLen = 64) {
    const h = B2_IV.slice();
    h[0] ^= 0x01010000n ^ BigInt(outLen); // digest length, no key, fanout 1, depth 1
    const blocks = Math.max(1, Math.ceil(data.length / 128));
    let counter = 0n;
    for (let b = 0; b < blocks; b++) {
        const block = new Uint8Array(128);
        const start = b * 128, end = Math.min(data.length, start + 128);
        block.set(data.subarray(start, end));
        counter += BigInt(end - start);
        const view = new DataView(block.buffer);
        const m = [];
        for (let i = 0; i < 16; i++) m.push(view.getBigUint64(i * 8, true));
        const v = [...h, ...B2_IV];
        v[12] ^= counter & M64;
        v[13] ^= (counter >> 64n) & M64;
        if (b === blocks - 1) v[14] ^= M64;
        for (let r = 0; r < 12; r++) {
            const s = B2_SIGMA[r];
            b2Mix(v, 0, 4, 8, 12, m[s[0]], m[s[1]]); b2Mix(v, 1, 5, 9, 13, m[s[2]], m[s[3]]);
            b2Mix(v, 2, 6, 10, 14, m[s[4]], m[s[5]]); b2Mix(v, 3, 7, 11, 15, m[s[6]], m[s[7]]);
            b2Mix(v, 0, 5, 10, 15, m[s[8]], m[s[9]]); b2Mix(v, 1, 6, 11, 12, m[s[10]], m[s[11]]);
            b2Mix(v, 2, 7, 8, 13, m[s[12]], m[s[13]]); b2Mix(v, 3, 4, 9, 14, m[s[14]], m[s[15]]);
        }
        for (let i = 0; i < 8; i++) h[i] ^= v[i] ^ v[i + 8];
    }
    const out = new Uint8Array(64);
    const view = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) view.setBigUint64(i * 8, h[i], true);
    return out.slice(0, outLen);
}

// ── xxhash64 → twox128 (Substrate's pallet and storage-item prefix hash) ─────

const X_P1 = 11400714785074694791n, X_P2 = 14029467366897019727n, X_P3 = 1609587929392839161n;
const X_P4 = 9650029242287828579n, X_P5 = 2870177450012600261n;
const rotl64 = (x, n) => ((x << BigInt(n)) | (x >> BigInt(64 - n))) & M64;
const xRound = (acc, input) => (rotl64((acc + input * X_P2) & M64, 31) * X_P1) & M64;
const xMerge = (acc, val) => ((acc ^ xRound(0n, val)) * X_P1 + X_P4) & M64;

export function xxhash64(data, seed) {
    const s = BigInt(seed);
    const len = data.length;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let i = 0, h;
    if (len >= 32) {
        let v1 = (s + X_P1 + X_P2) & M64, v2 = (s + X_P2) & M64, v3 = s, v4 = (s - X_P1) & M64;
        for (; i + 32 <= len; i += 32) {
            v1 = xRound(v1, view.getBigUint64(i, true)); v2 = xRound(v2, view.getBigUint64(i + 8, true));
            v3 = xRound(v3, view.getBigUint64(i + 16, true)); v4 = xRound(v4, view.getBigUint64(i + 24, true));
        }
        h = (rotl64(v1, 1) + rotl64(v2, 7) + rotl64(v3, 12) + rotl64(v4, 18)) & M64;
        h = xMerge(h, v1); h = xMerge(h, v2); h = xMerge(h, v3); h = xMerge(h, v4);
    } else {
        h = (s + X_P5) & M64;
    }
    h = (h + BigInt(len)) & M64;
    for (; i + 8 <= len; i += 8) { h ^= xRound(0n, view.getBigUint64(i, true)); h = (rotl64(h, 27) * X_P1 + X_P4) & M64; }
    for (; i + 4 <= len; i += 4) { h ^= (BigInt(view.getUint32(i, true)) * X_P1) & M64; h = (rotl64(h, 23) * X_P2 + X_P3) & M64; }
    for (; i < len; i++) { h ^= (BigInt(data[i]) * X_P5) & M64; h = (rotl64(h, 11) * X_P1) & M64; }
    h ^= h >> 33n; h = (h * X_P2) & M64; h ^= h >> 29n; h = (h * X_P3) & M64; h ^= h >> 32n;
    return h;
}

const le64 = (n) => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, n, true); return b; };
const twox128 = (name) => { const b = utf8(name); return concat(le64(xxhash64(b, 0)), le64(xxhash64(b, 1))); };
const blake2_128concat = (bytes) => concat(blake2b(bytes, 16), bytes);
const u16le = (n) => new Uint8Array([n & 255, (n >> 8) & 255]);

/** The storage key of pallet.item with the given (already hashed) map keys. */
export function storageKey(pallet, item, ...mapKeys) {
    return toHex(concat(twox128(pallet), twox128(item), ...mapKeys));
}

// ── SS58 ────────────────────────────────────────────────────────────────────

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Decode(s) {
    let n = 0n;
    for (const c of s) {
        const i = B58.indexOf(c);
        if (i < 0) throw new Error('ss58: not base58');
        n = n * 58n + BigInt(i);
    }
    const bytes = [];
    while (n > 0n) { bytes.push(Number(n & 255n)); n >>= 8n; }
    bytes.reverse();
    let zeros = 0;
    for (const c of s) { if (c !== '1') break; zeros++; }
    return new Uint8Array([...new Array(zeros).fill(0), ...bytes]);
}

/** The 32-byte public key of an SS58 address (checksum verified). */
export function ss58Decode(address) {
    const b = base58Decode(address);
    const prefixLen = b[0] & 0x40 ? 2 : 1;
    if (b.length !== prefixLen + 32 + 2) throw new Error('ss58: not a 32-byte account');
    const body = b.subarray(0, b.length - 2);
    const check = blake2b(concat(utf8('SS58PRE'), body), 64);
    if (check[0] !== b[b.length - 2] || check[1] !== b[b.length - 1]) throw new Error('ss58: checksum mismatch');
    return new Uint8Array(b.subarray(prefixLen, b.length - 2));
}

/** The SS58 address (generic prefix 42, as Bittensor displays keys) of a public key. */
export function ss58Encode(pubkey, prefix = 42) {
    const body = concat(new Uint8Array([prefix]), pubkey);
    const check = blake2b(concat(utf8('SS58PRE'), body), 64).subarray(0, 2);
    const all = concat(body, check);
    let n = 0n;
    for (const x of all) n = (n << 8n) | BigInt(x);
    let s = '';
    while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
    for (const x of all) { if (x !== 0) break; s = '1' + s; }
    return s;
}

// ── SCALE ───────────────────────────────────────────────────────────────────

/** [value, nextOffset] of a compact integer at `pos`. */
function compactAt(b, pos) {
    const mode = b[pos] & 3;
    if (mode === 0) return [BigInt(b[pos] >> 2), pos + 1];
    if (mode === 1) return [BigInt((b[pos] | (b[pos + 1] << 8)) >> 2), pos + 2];
    if (mode === 2) return [BigInt((b[pos] | (b[pos + 1] << 8) | (b[pos + 2] << 16) | (b[pos + 3] << 24)) >>> 2), pos + 4];
    const n = (b[pos] >> 2) + 4;
    let v = 0n;
    for (let i = 0; i < n; i++) v |= BigInt(b[pos + 1 + i]) << BigInt(8 * i);
    return [v, pos + 1 + n];
}

const u16At = (b, pos) => b[pos] | (b[pos + 1] << 8);
const u64At = (b, pos) => new DataView(b.buffer, b.byteOffset).getBigUint64(pos, true);
const u128At = (b, pos) => u64At(b, pos) | (u64At(b, pos + 8) << 64n);

const decodeU16 = (hex) => (hex == null ? null : u16At(fromHex(hex), 0));
const decodeU64 = (hex) => (hex == null ? null : u64At(fromHex(hex), 0));
/** I96F32 fixed point (non-negative here) → Number. */
const decodeI96F32 = (hex) => (hex == null ? null : Number(u128At(fromHex(hex), 0)) / 2 ** 32);

/** share_pool::SafeFloat { mantissa: u128, exponent: i64 }: mantissa × 10^exponent. */
function decodeSafeFloat(hex) {
    if (hex == null) return null;
    const b = fromHex(hex);
    return { mantissa: u128At(b, 0), exponent: new DataView(b.buffer, b.byteOffset).getBigInt64(16, true) };
}

/**
 * The α (rao) a coldkey holds under a hotkey: its shares of the hotkey's
 * pool, times the hotkey's α, over the hotkey's total shares. Exact integer
 * arithmetic on the decimal floats, rounding down as the chain does.
 */
export function stakeFromShares(shares, totalShares, totalAlphaRao) {
    if (!shares || !totalShares || totalShares.mantissa === 0n) return 0n;
    const shift = shares.exponent - totalShares.exponent;
    return shift >= 0n
        ? (totalAlphaRao * shares.mantissa * 10n ** shift) / totalShares.mantissa
        : (totalAlphaRao * shares.mantissa) / (totalShares.mantissa * 10n ** -shift);
}

/** stakeFromShares from the three raw storage values (hex, as state_getStorage returns them). */
export function stakeFromStorage(sharesHex, totalSharesHex, totalAlphaHex) {
    return stakeFromShares(decodeSafeFloat(sharesHex), decodeSafeFloat(totalSharesHex), decodeU64(totalAlphaHex) ?? 0n);
}

function decodeVecU16(hex) {
    if (hex == null) return [];
    const b = fromHex(hex);
    let [n, pos] = compactAt(b, 0);
    const out = [];
    for (let i = 0; i < Number(n); i++) { out.push(u16At(b, pos)); pos += 2; }
    return out;
}

function decodeVecAccount(hex) {
    if (hex == null) return [];
    const b = fromHex(hex);
    let [n, pos] = compactAt(b, 0);
    const out = [];
    for (let i = 0; i < Number(n); i++) { out.push(b.slice(pos, pos + 32)); pos += 32; }
    return out;
}

/** frame_system AccountInfo: nonce u32, consumers, providers, sufficients, then AccountData { free, reserved, frozen, flags: u128 }. */
function decodeAccountInfo(hex) {
    if (hex == null) return { exists: false, nonce: 0, freeRao: 0n, reservedRao: 0n };
    const b = fromHex(hex);
    return { exists: true, nonce: new DataView(b.buffer).getUint32(0, true), freeRao: u128At(b, 16), reservedRao: u128At(b, 32) };
}

/**
 * Vec<StakeInfo> from StakeInfoRuntimeApi_get_stake_info_for_coldkey:
 *   hotkey, coldkey (AccountId32), netuid, stake, locked, emission,
 *   tao_emission, drain (Compact), is_registered (bool).
 * Every entry's coldkey must be the one asked for; a layout change in a
 * future runtime would fail that check rather than yield wrong numbers.
 */
function decodeStakeInfo(hex, coldkey) {
    if (hex == null || hex === '0x') return [];
    const b = fromHex(hex);
    let [n, pos] = compactAt(b, 0);
    const out = [];
    for (let i = 0; i < Number(n); i++) {
        const hotkey = b.slice(pos, pos + 32); pos += 32;
        const cold = b.slice(pos, pos + 32); pos += 32;
        let netuid, stake, locked, emission, taoEmission, drain;
        [netuid, pos] = compactAt(b, pos);
        [stake, pos] = compactAt(b, pos);
        [locked, pos] = compactAt(b, pos);
        [emission, pos] = compactAt(b, pos);
        [taoEmission, pos] = compactAt(b, pos);
        [drain, pos] = compactAt(b, pos);
        const registered = b[pos] === 1; pos += 1;
        if (!sameBytes(cold, coldkey)) throw new Error('stake info: unexpected layout (coldkey mismatch)');
        out.push({ hotkey: ss58Encode(hotkey), hotkeyBytes: hotkey, netuid: Number(netuid), stakeRao: stake, lockedRao: locked, emissionRao: emission, registered });
    }
    if (pos !== b.length) throw new Error('stake info: unexpected layout (trailing bytes)');
    return out;
}

// ── JSON-RPC ────────────────────────────────────────────────────────────────

let nextId = 1;

class RpcError extends Error {
    constructor(message, code) { super(message); this.name = 'RpcError'; this.code = code; }
}

async function post(url, body, signal, timeoutMs = REQUEST_TIMEOUT_MS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const onAbort = () => ctrl.abort();
    if (signal) signal.addEventListener('abort', onAbort);
    try {
        const res = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
            signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onAbort);
    }
}

/**
 * One batch (≤ BATCH_LIMIT calls) against the first endpoint that answers;
 * a transport failure moves to the next endpoint, a JSON-RPC error does not
 * (it is the chain's answer). Results come back in call order, an error
 * entry as { error }.
 */
async function sendBatch(endpoints, calls, signal, timeoutMs) {
    const body = calls.map(([method, params]) => ({ jsonrpc: '2.0', id: nextId++, method, params }));
    let lastError = null;
    for (const url of endpoints) {
        if (signal?.aborted) throw new Error('aborted');
        try {
            const json = await post(url, body, signal, timeoutMs);
            const byId = new Map((Array.isArray(json) ? json : [json]).map((r) => [r.id, r]));
            return body.map((req) => {
                const r = byId.get(req.id);
                if (!r) return { error: { message: 'no response' } };
                return r.error ? { error: r.error } : r.result;
            });
        } catch (e) {
            if (signal?.aborted) throw e;
            lastError = e;
        }
    }
    throw lastError || new Error('no endpoint');
}

/** Any number of calls, chunked into batches sent a few at a time. */
export async function rpcBatch(endpoints, calls, signal) {
    const chunks = [];
    for (let i = 0; i < calls.length; i += BATCH_LIMIT) chunks.push(calls.slice(i, i + BATCH_LIMIT));
    const results = new Array(chunks.length);
    let next = 0;
    const worker = async () => {
        while (next < chunks.length) {
            const i = next++;
            results[i] = await sendBatch(endpoints, chunks[i], signal);
        }
    };
    await Promise.all(Array.from({ length: Math.min(BATCH_CONCURRENCY, chunks.length) }, worker));
    return results.flat();
}

// What a call of a request that failed (refused, timed out, unreachable) or
// was not sent comes back as from rpcBatchSettled.
const REQUEST_FAILED = Object.freeze({ error: Object.freeze({ message: 'request failed' }) });
/** A call the node did not answer for want of budget (or at all): ask again later; nothing is wrong with it. */
const refused = (result) => result === REQUEST_FAILED
    || (result != null && typeof result === 'object' && result.error?.code === HISTORICAL_WORK_REFUSED);

/**
 * rpcBatch for the rationed archive node: it never rejects for a failed
 * request, and the first failure (a 429 above all) stops it sending more.
 * The calls of a failed or unsent request come back as REQUEST_FAILED, so
 * the caller keeps what the earlier requests returned and asks again later.
 */
async function rpcBatchSettled(endpoints, calls, signal, { concurrency = BATCH_CONCURRENCY, timeoutMs } = {}) {
    const chunks = [];
    for (let i = 0; i < calls.length; i += BATCH_LIMIT) chunks.push(calls.slice(i, i + BATCH_LIMIT));
    const results = new Array(chunks.length);
    let next = 0, failed = false;
    const worker = async () => {
        while (next < chunks.length) {
            const i = next++;
            if (!failed) {
                try {
                    results[i] = await sendBatch(endpoints, chunks[i], signal, timeoutMs);
                    continue;
                } catch (e) {
                    if (signal?.aborted) throw e;
                    failed = true;
                }
            }
            results[i] = chunks[i].map(() => REQUEST_FAILED);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, chunks.length) }, worker));
    return results.flat();
}

export async function rpc(endpoints, method, params = [], signal) {
    const [r] = await sendBatch(endpoints, [[method, params]], signal);
    if (r && r.error) throw new RpcError(r.error.message || 'rpc error', r.error.code);
    return r;
}

const unwrap = (r, what) => {
    if (r && typeof r === 'object' && r.error) throw new RpcError(`${what}: ${r.error.message || 'rpc error'}`, r.error.code);
    return r;
};

// ── the reserve ─────────────────────────────────────────────────────────────

const rao = (n) => (n == null ? null : Number(n) / RAO);

/** The three storage values behind one stake: the coldkey's shares, the hotkey's total shares and its α. */
function stakeStorageKeys(hotkey, coldkey, netuid) {
    const n = u16le(netuid);
    return [
        storageKey('SubtensorModule', 'AlphaV2', blake2_128concat(hotkey), blake2_128concat(coldkey), n),
        storageKey('SubtensorModule', 'TotalHotkeySharesV2', blake2_128concat(hotkey), n),
        storageKey('SubtensorModule', 'TotalHotkeyAlpha', blake2_128concat(hotkey), n),
    ];
}

/** The storage keys the reserve read needs, for one coldkey and subnet. */
function reserveKeys(coldkey, netuid) {
    const n = u16le(netuid);
    return {
        account: storageKey('System', 'Account', blake2_128concat(coldkey)),
        ownedHotkeys: storageKey('SubtensorModule', 'OwnedHotkeys', blake2_128concat(coldkey)),
        subnetTAO: storageKey('SubtensorModule', 'SubnetTAO', n),
        subnetAlphaIn: storageKey('SubtensorModule', 'SubnetAlphaIn', n),
        subnetAlphaOut: storageKey('SubtensorModule', 'SubnetAlphaOut', n),
        subnetAlphaOutEmission: storageKey('SubtensorModule', 'SubnetAlphaOutEmission', n),
        subnetMovingPrice: storageKey('SubtensorModule', 'SubnetMovingPrice', n),
        subnetOwnerCut: storageKey('SubtensorModule', 'SubnetOwnerCut'),
        subnetOwnerHotkey: storageKey('SubtensorModule', 'SubnetOwnerHotkey', n),
        minerBurned: storageKey('SubtensorModule', 'MinerBurned', n),
        incentive: storageKey('SubtensorModule', 'Incentive', n),
        tempo: storageKey('SubtensorModule', 'Tempo', n),
        firstEmissionBlock: storageKey('SubtensorModule', 'FirstEmissionBlockNumber', n),
        timestamp: storageKey('Timestamp', 'Now'),
    };
}

/**
 * The reserve at the latest finalized block: balances, stakes, the subnet
 * pool and emission, and where the miner allocation is routed. Plain numbers
 * (α and TAO, not rao) for the page; the few BigInt rao values stay internal.
 */
export async function readReserve({ address, netuid = NETUID, endpoints = FINNEY_RPC, signal } = {}) {
    const coldkey = ss58Decode(address);
    const keys = reserveKeys(coldkey, netuid);
    const hash = await rpc(endpoints, 'chain_getFinalizedHead', [], signal);

    const names = Object.keys(keys);
    const first = await rpcBatch(endpoints, [
        ['chain_getHeader', [hash]],
        ['state_call', ['StakeInfoRuntimeApi_get_stake_info_for_coldkey', toHex(coldkey), hash]],
        ...names.map((name) => ['state_getStorage', [keys[name], hash]]),
    ], signal);
    const header = unwrap(first[0], 'header');
    const stakeHex = unwrap(first[1], 'stake info');
    const raw = {};
    names.forEach((name, i) => { raw[name] = unwrap(first[2 + i], name); });

    const account = decodeAccountInfo(raw.account);
    const stakes = decodeStakeInfo(stakeHex, coldkey);
    const ownedHotkeys = decodeVecAccount(raw.ownedHotkeys);
    const ownerHotkey = raw.subnetOwnerHotkey ? fromHex(raw.subnetOwnerHotkey) : null;

    const onSubnet = stakes.filter((s) => s.netuid === netuid);
    // every hotkey the coldkey has α under on this subnet, or owns
    const stakeHotkeys = [...onSubnet.map((s) => s.hotkeyBytes), ...ownedHotkeys]
        .filter((hot, i, all) => all.findIndex((other) => sameBytes(other, hot)) === i);

    // UIDs, to read each recipient's share of the miner allocation (and the
    // owner hotkey's, which is the burned/recycled share today); and the
    // storage behind each stake, to check it against the runtime API's figure.
    const uidKey = (hot) => storageKey('SubtensorModule', 'Uids', u16le(netuid), blake2_128concat(hot));
    const uidTargets = [...ownedHotkeys, ...(ownerHotkey ? [ownerHotkey] : [])];
    const third = uidTargets.length + stakeHotkeys.length
        ? await rpcBatch(endpoints, [
            ...uidTargets.map((hot) => ['state_getStorage', [uidKey(hot), hash]]),
            ...stakeHotkeys.flatMap((hot) => stakeStorageKeys(hot, coldkey, netuid).map((key) => ['state_getStorage', [key, hash]])),
        ], signal)
        : [];
    const uidResults = third.slice(0, uidTargets.length);
    const storageRao = stakeHotkeys.reduce((sum, hot, i) => {
        const at = uidTargets.length + i * 3;
        return sum + stakeFromStorage(unwrap(third[at], 'shares'), unwrap(third[at + 1], 'total shares'), unwrap(third[at + 2], 'hotkey alpha'));
    }, 0n);
    const incentive = decodeVecU16(raw.incentive);
    const incentiveSum = incentive.reduce((s, v) => s + v, 0);
    const shareOf = (uid) => (uid == null || incentiveSum === 0 ? 0 : incentive[uid] / incentiveSum);
    const uidOf = (i) => decodeU16(unwrap(uidResults[i], 'uid'));

    const hotkeys = ownedHotkeys.map((hot, i) => {
        const uid = uidOf(i);
        return { hotkey: ss58Encode(hot), uid, incentiveShare: shareOf(uid) };
    });
    const ownerUid = ownerHotkey ? uidOf(ownedHotkeys.length) : null;
    const ownerHotkeyAddress = ownerHotkey ? ss58Encode(ownerHotkey) : null;

    const taoInRao = decodeU64(raw.subnetTAO), alphaInRao = decodeU64(raw.subnetAlphaIn), alphaOutRao = decodeU64(raw.subnetAlphaOut);
    const alphaPerBlock = rao(decodeU64(raw.subnetAlphaOutEmission)) ?? 0;
    const ownerCutRaw = decodeU16(raw.subnetOwnerCut);
    const ownerCut = ownerCutRaw == null ? DEFAULT_OWNER_CUT : ownerCutRaw / 65_535;
    const alphaPerDay = alphaPerBlock * BLOCKS_PER_DAY;
    const minerPerDay = (alphaPerDay * (1 - ownerCut)) / 2;

    const sumRao = (list) => list.reduce((s, x) => s + x.stakeRao, 0n);
    const runtimeRao = sumRao(onSubnet);
    const gap = storageRao > runtimeRao ? storageRao - runtimeRao : runtimeRao - storageRao;

    return {
        netuid,
        block: parseInt(header.number, 16),
        hash,
        time: Number(decodeU64(raw.timestamp) ?? 0n),
        address,
        account: { exists: account.exists, nonce: account.nonce, freeTao: rao(account.freeRao), reservedTao: rao(account.reservedRao) },
        stakes: stakes.map((s) => ({ hotkey: s.hotkey, netuid: s.netuid, alpha: rao(s.stakeRao), registered: s.registered })),
        alpha: rao(runtimeRao),
        alphaElsewhere: rao(sumRao(stakes.filter((s) => s.netuid !== netuid))),
        hotkeys,
        // the hotkeys whose storage the balance history reads, and whether
        // that storage reproduces the runtime API's stake at this block (to
        // a millionth of an α, or a billionth of the stake if larger)
        stakeHotkeys: stakeHotkeys.map((hot) => ss58Encode(hot)),
        stakeStorageAgrees: gap <= 1000n || gap * 1_000_000_000n <= runtimeRao,
        pool: {
            taoIn: rao(taoInRao),
            alphaIn: rao(alphaInRao),
            alphaOut: rao(alphaOutRao),
            // TAO per α at the pool's current reserves; the chain's own
            // smoothed price alongside
            priceTao: taoInRao && alphaInRao ? Number(taoInRao) / Number(alphaInRao) : null,
            movingPriceTao: decodeI96F32(raw.subnetMovingPrice),
        },
        emission: {
            alphaPerBlock,
            alphaPerDay,
            ownerCut,
            ownerPerDay: alphaPerDay * ownerCut,
            validatorPerDay: minerPerDay,
            minerPerDay,
            tempo: decodeU16(raw.tempo),
            firstEmissionBlock: raw.firstEmissionBlock == null ? null : Number(decodeU64(raw.firstEmissionBlock)),
        },
        routing: {
            // of the miner allocation: the owner-directed share (burned or
            // recycled by the chain, never paid), the reserve's recipients,
            // and everything else (providers and other miners)
            // MinerBurned is an I96F32 proportion (1.0 = the whole allocation)
            burned: decodeI96F32(raw.minerBurned) ?? shareOf(ownerUid),
            ownerHotkey: shareOf(ownerUid),
            // (a recipient that is the owner hotkey would be burned, not received)
            reserve: hotkeys.filter((h) => h.hotkey !== ownerHotkeyAddress).reduce((s, h) => s + h.incentiveShare, 0),
        },
    };
}

const pause = (ms, signal) => new Promise((resolve, reject) => {
    const onAbort = () => { clearTimeout(timer); reject(new Error('aborted')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
});

/**
 * The reserve's balance at past blocks: free TAO, α on the subnet and the
 * block's time. Returns { samples, attempted }: the samples that could be
 * read, ascending by block, and the blocks an answer came back for (a block
 * in `attempted` but not in `samples` did not decode; a block in neither was
 * not reached this pass, and is simply asked for again).
 *
 * One call is one pass within the archive node's budget for historical
 * reads, newest blocks first (about 50 samples for a coldkey with two
 * hotkeys). Block hashes come from the live nodes (they keep every
 * hash), the state from the archive node. By default the α is computed from
 * storage, for the hotkeys the coldkey staked to at each block plus any
 * given (`hotkeys`, SS58: the snapshot's stakeHotkeys). With `viaRuntimeApi`
 * it is the runtime API's own figure instead, which costs the same budget
 * some fifty times as much: one sample per request, a dozen per pass.
 *
 * A read the node refuses for want of budget, or a request that fails, just
 * leaves its samples for a later pass. Only the block-hash lookup, without
 * which nothing can be read, rejects.
 */
export async function readReserveAt({ address, netuid = NETUID, hotkeys = [], blocks, viaRuntimeApi = false, endpoints = FINNEY_ARCHIVE, hashEndpoints = FINNEY_RPC, signal } = {}) {
    if (!blocks.length) return { samples: [], attempted: [] };
    const coldkey = ss58Decode(address);
    const accountKey = storageKey('System', 'Account', blake2_128concat(coldkey));
    const timeKey = storageKey('Timestamp', 'Now');
    const archive = { concurrency: ARCHIVE_CONCURRENCY, timeoutMs: ARCHIVE_TIMEOUT_MS };
    const reach = viaRuntimeApi ? RUNTIME_SAMPLES_PER_PASS : Math.floor(ARCHIVE_READS_PER_PASS / READS_PER_SAMPLE);
    // newest first: the recent days matter most, and a pass may not reach them all
    const wanted = [...blocks].sort((x, y) => y - x).slice(0, reach);
    const hashes = await rpcBatch([...hashEndpoints, ...endpoints], wanted.map((n) => ['chain_getBlockHash', [n]]), signal);
    const known = wanted.map((_, i) => i).filter((i) => typeof hashes[i] === 'string');

    const samples = [];
    // a height the chain has no block at is answered: there is nothing to read
    const attempted = wanted.filter((_, i) => typeof hashes[i] !== 'string');
    const sampleOf = (i, time, account, alphaRao) => ({
        block: wanted[i],
        time: Number(decodeU64(unwrap(time, 'time')) ?? 0n),
        freeTao: rao(decodeAccountInfo(unwrap(account, 'account')).freeRao),
        alpha: rao(alphaRao),
    });
    const done = () => ({ samples: samples.sort((x, y) => x.block - y.block), attempted });

    if (viaRuntimeApi) {
        for (const i of known) {
            const started = Date.now();
            let reads;
            try {
                reads = await sendBatch(endpoints, [
                    ['state_getStorage', [timeKey, hashes[i]]],
                    ['state_getStorage', [accountKey, hashes[i]]],
                    ['state_call', ['StakeInfoRuntimeApi_get_stake_info_for_coldkey', toHex(coldkey), hashes[i]]],
                ], signal, ARCHIVE_TIMEOUT_MS);
            } catch (e) {
                if (signal?.aborted) throw e;
                break;
            }
            // refused for want of budget: leave the rest for the next pass
            if (reads.some(refused)) break;
            attempted.push(wanted[i]);
            try {
                const stakes = decodeStakeInfo(unwrap(reads[2], 'stake info'), coldkey);
                samples.push(sampleOf(i, reads[0], reads[1], stakes.filter((x) => x.netuid === netuid).reduce((sum, x) => sum + x.stakeRao, 0n)));
            } catch {
                // a block whose runtime has no such API, or laid stake info out
                // differently: left out
            }
            await pause(Math.max(0, RUNTIME_SAMPLE_INTERVAL_MS - (Date.now() - started)), signal);
        }
        return done();
    }

    // First: the time, the account, and the hotkeys the coldkey staked to at
    // that block (stake may since have moved to other hotkeys, so the head's
    // list alone would miss it).
    const stakingKey = storageKey('SubtensorModule', 'StakingHotkeys', blake2_128concat(coldkey));
    const given = hotkeys.map((h) => ss58Decode(h));
    const first = await rpcBatchSettled(endpoints, known.flatMap((i) => [
        ['state_getStorage', [timeKey, hashes[i]]],
        ['state_getStorage', [accountKey, hashes[i]]],
        ['state_getStorage', [stakingKey, hashes[i]]],
    ]), signal, archive);
    // Then: the storage behind each of those stakes, for as many samples as
    // the rest of the budget covers.
    let readsLeft = ARCHIVE_READS_PER_PASS - known.length * 3;
    const plan = [];
    for (let k = 0; k < known.length; k++) {
        const [time, account, staking] = first.slice(k * 3, k * 3 + 3);
        if (refused(time) || refused(account) || refused(staking)) continue; // not reached this pass
        let hots;
        try {
            hots = [...decodeVecAccount(unwrap(staking, 'staking hotkeys')), ...given]
                .filter((hot, n, all) => all.findIndex((other) => sameBytes(other, hot)) === n);
            unwrap(time, 'time');
            unwrap(account, 'account');
        } catch {
            attempted.push(wanted[known[k]]); // answered, but not usable
            continue;
        }
        if (hots.length * 3 > readsLeft) break;
        readsLeft -= hots.length * 3;
        plan.push({ i: known[k], time, account, hots });
    }
    const second = await rpcBatchSettled(endpoints, plan.flatMap(({ i, hots }) => hots.flatMap(
        (hot) => stakeStorageKeys(hot, coldkey, netuid).map((key) => ['state_getStorage', [key, hashes[i]]]),
    )), signal, archive);
    let at = 0;
    for (const { i, time, account, hots } of plan) {
        const reads = second.slice(at, at + hots.length * 3);
        at += hots.length * 3;
        if (reads.some(refused)) continue; // not reached this pass
        attempted.push(wanted[i]);
        try {
            let alphaRao = 0n;
            hots.forEach((_, h) => {
                alphaRao += stakeFromStorage(unwrap(reads[h * 3], 'shares'), unwrap(reads[h * 3 + 1], 'total shares'), unwrap(reads[h * 3 + 2], 'hotkey alpha'));
            });
            samples.push(sampleOf(i, time, account, alphaRao));
        } catch {
            // a value of this sample did not decode: left out
        }
    }
    return done();
}
