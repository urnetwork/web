// The reserve account is the native 2-of-3 multisig of the signer keys the
// custody section publishes (src/data/reserve.js). A multisig account is
// derived, not chosen: blake2_256 of "modlpy/utilisuba", the sorted signer
// keys and the threshold. So the three addresses and the threshold on the
// page must derive exactly the reserve's AccountId32, or one of them is
// wrong. Offline, like subtensor.test.mjs.
//
// Usage: node --test tests/reserve-multisig.test.mjs   (no network)
import assert from 'node:assert/strict';
import test from 'node:test';

import { reserve } from '../src/data/reserve.js';
import { multisigAccountId, ss58Decode, ss58Encode, toHex } from '../src/lib/subtensor.js';

const { custody } = reserve;
const signers = custody.signers.map((s) => s.address);

test('the published signers at the published threshold derive the reserve account', () => {
    const account = multisigAccountId(signers, custody.multisigThreshold);
    assert.equal(toHex(account), reserve.accountId);
    assert.equal(ss58Encode(account), reserve.address);
    // the spending multisig the page names is that same account
    assert.equal(custody.multisig, reserve.address);
    assert.equal(custody.threshold, `${custody.multisigThreshold} of ${signers.length}`);
});

test('the derivation does not depend on the order the signers are listed in', () => {
    const reversed = multisigAccountId([...signers].reverse(), custody.multisigThreshold);
    assert.equal(toHex(reversed), reserve.accountId);
    const asKeys = multisigAccountId(signers.map((s) => ss58Decode(s)), custody.multisigThreshold);
    assert.equal(toHex(asKeys), reserve.accountId);
});

test('a different threshold or signer set is a different account', () => {
    assert.notEqual(toHex(multisigAccountId(signers, 3)), reserve.accountId);
    assert.notEqual(toHex(multisigAccountId(signers.slice(0, 2), 2)), reserve.accountId);
});

test('every published signer address is a valid 32-byte SS58 key, and none is the reserve itself', () => {
    for (const s of signers) {
        assert.equal(ss58Decode(s).length, 32);
        assert.notEqual(s, reserve.address);
    }
    assert.equal(new Set(signers).size, signers.length);
});
