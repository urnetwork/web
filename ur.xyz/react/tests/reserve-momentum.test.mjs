// The reserve page's momentum (src/components/pages/reserve/momentum.js): it
// shows momentum's launch value until the chain shows momentum of its own,
// and then follows the chain. Mainnet cannot exercise the switch before
// launch, so each state the chain can be in is checked here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MIN_SEEN, inflowPerDay, momentumOf } from '../src/components/pages/reserve/momentum.js';

const launchMomentum = 0.1;
const MINER_PER_DAY = 2952;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

test('before the chain answers, the launch value', () => {
    const m = momentumOf({ routing: null, live: false, launchMomentum });
    assert.deepEqual(m, { momentum: 0.1, fromChain: false, burned: 0, onChain: null });
    near(inflowPerDay(MINER_PER_DAY, m.momentum, m.burned), 2656.8);
});

test('before launch, with every α of the miner emissions burned, the launch value', () => {
    // mainnet on 2026-10-06: MinerBurned 1.0, nothing to the reserve or to providers
    const m = momentumOf({ routing: { reserve: 0, burned: 1 }, live: false, launchMomentum });
    assert.equal(m.fromChain, false);
    assert.equal(m.momentum, 0.1);
    assert.equal(m.onChain, 0);
    assert.equal(m.burned, 0, 'the pre-launch burn is not charged against the inflow the page states');
});

test('fixed-point dust is not momentum', () => {
    const dust = momentumOf({ routing: { reserve: 0, burned: 1 - MIN_SEEN / 4 }, live: false, launchMomentum });
    assert.equal(dust.fromChain, false);
    assert.equal(dust.momentum, 0.1);
    const seen = momentumOf({ routing: { reserve: 0, burned: 1 - MIN_SEEN }, live: false, launchMomentum });
    assert.equal(seen.fromChain, true);
});

test('providers paid on chain before the reserve is: the chain value, and the inflow it implies', () => {
    // providers get 15% while the chain still burns the rest
    const m = momentumOf({ routing: { reserve: 0, burned: 0.85 }, live: false, launchMomentum });
    assert.equal(m.fromChain, true);
    near(m.momentum, 0.15);
    assert.equal(m.burned, 0);
    near(inflowPerDay(MINER_PER_DAY, m.momentum, m.burned), 2509.2);
});

test('launch as planned: the chain split, and the inflow equals the reserve share', () => {
    const routing = { reserve: 0.9, burned: 0 };
    const m = momentumOf({ routing, live: true, launchMomentum });
    assert.equal(m.fromChain, true);
    near(m.momentum, 0.1);
    near(inflowPerDay(MINER_PER_DAY, m.momentum, m.burned), MINER_PER_DAY * routing.reserve);
});

test('momentum that moves after launch is followed', () => {
    const routing = { reserve: 0.7, burned: 0 };
    const m = momentumOf({ routing, live: true, launchMomentum });
    near(m.momentum, 0.3);
    near(inflowPerDay(MINER_PER_DAY, m.momentum, m.burned), MINER_PER_DAY * 0.7);
});

test('once the reserve is live, a burn left on chain is not counted as momentum or as inflow', () => {
    const routing = { reserve: 0.8, burned: 0.05 };
    const m = momentumOf({ routing, live: true, launchMomentum });
    near(m.momentum, 0.15);
    near(m.burned, 0.05);
    near(inflowPerDay(MINER_PER_DAY, m.momentum, m.burned), MINER_PER_DAY * routing.reserve);
});

test('once the reserve is live, a momentum of zero is real', () => {
    const m = momentumOf({ routing: { reserve: 1, burned: 0 }, live: true, launchMomentum });
    assert.equal(m.fromChain, true);
    assert.equal(m.momentum, 0);
    near(inflowPerDay(MINER_PER_DAY, m.momentum, m.burned), MINER_PER_DAY);
});

test('the inflow is never negative', () => {
    assert.equal(inflowPerDay(MINER_PER_DAY, 0.6, 0.6), 0);
});
