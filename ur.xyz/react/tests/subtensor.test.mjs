// Offline checks of the hand-written Substrate primitives the reserve page
// reads the chain with (src/lib/subtensor.js). A wrong hash here would not
// fail loudly: a storage key that is off by a bit reads "no value", which the
// page would show as an empty reserve. So the hashes are pinned to their
// published vectors, the storage prefixes to the well-known ones, and the
// reserve address to the AccountId32 the sn repo documents for it.
//
// Usage: node --test tests/subtensor.test.mjs   (no network)
import assert from 'node:assert/strict';
import test from 'node:test';

import { reserve } from '../src/data/reserve.js';
import { blake2b, fromHex, ss58Decode, ss58Encode, stakeFromShares, stakeFromStorage, storageKey, toHex, xxhash64 } from '../src/lib/subtensor.js';

const utf8 = (s) => new TextEncoder().encode(s);
const hex = (bytes) => toHex(bytes).slice(2);

test('blake2b matches the RFC 7693 vectors', () => {
    assert.equal(
        hex(blake2b(utf8('abc'), 64)),
        'ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
    );
    assert.equal(
        hex(blake2b(new Uint8Array(0), 64)),
        '786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419d25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce',
    );
    // the 16-byte digest Substrate's Blake2_128Concat uses is its own
    // parameterisation, not a truncation of the 64-byte one
    assert.equal(hex(blake2b(new Uint8Array(0), 16)), 'cae66941d9efbd404e4d88758ea67670');
    // more than one 128-byte block
    assert.equal(blake2b(new Uint8Array(300).fill(7), 32).length, 32);
});

test('xxhash64 matches the reference vectors', () => {
    assert.equal(xxhash64(new Uint8Array(0), 0).toString(16), 'ef46db3751d8e999');
    assert.equal(xxhash64(utf8('abc'), 0).toString(16), '44bc2cf5ad770999');
    // 39 bytes: the 32-byte stripe loop and every tail branch
    assert.equal(xxhash64(utf8('Nobody inspects the spammish repetition'), 0).toString(16), 'fbcea83c8a378bf1');
});

test('storage prefixes are the well-known twox128 values', () => {
    assert.equal(storageKey('System', 'Account'), '0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9');
    assert.equal(storageKey('Timestamp', 'Now'), '0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb');
});

test('the reserve address is the documented AccountId32 and round-trips', () => {
    const pubkey = ss58Decode(reserve.address);
    assert.equal(toHex(pubkey), reserve.accountId);
    assert.equal(ss58Encode(pubkey), reserve.address);
    assert.deepEqual(fromHex(reserve.accountId), pubkey);
});

test('a mistyped address is rejected by its checksum', () => {
    const last = reserve.address.at(-1);
    assert.throws(() => ss58Decode(reserve.address.slice(0, -1) + (last === 'x' ? 'y' : 'x')));
    assert.throws(() => ss58Decode('not-an-address'));
});

test('a stake computed from storage is the figure the runtime API reports', () => {
    // SN25 owner coldkey under its hotkey at finalized block 9,221,748 (2026-10-06): the raw
    // AlphaV2 shares, TotalHotkeySharesV2 and TotalHotkeyAlpha values, and the stake
    // StakeInfoRuntimeApi returned at the same block (2,190.657103273 α)
    assert.equal(
        stakeFromStorage(
            '0x28e097462a225aad0b00000000000000f8ffffffffffffff',
            '0x5e2944764940ea922900000000000000faffffffffffffff',
            '0x60174f9158c50200',
        ),
        2190657103273n,
    );
    // no shares, or an empty pool, is no stake
    assert.equal(stakeFromStorage(null, '0x5e2944764940ea922900000000000000faffffffffffffff', '0x60174f9158c50200'), 0n);
    assert.equal(stakeFromShares({ mantissa: 5n, exponent: 0n }, { mantissa: 0n, exponent: 0n }, 100n), 0n);
    // the exponents can differ either way: 5 × 10² shares of 10 × 10³ is 5%
    assert.equal(stakeFromShares({ mantissa: 5n, exponent: 2n }, { mantissa: 10n, exponent: 3n }, 1000n), 50n);
    assert.equal(stakeFromShares({ mantissa: 5n, exponent: 3n }, { mantissa: 10n, exponent: 2n }, 1000n), 5000n);
});
