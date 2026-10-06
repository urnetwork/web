/**
 * Momentum and the reserve's inflow: the formula the reserve page states.
 *
 * Momentum is the share of SN25's miner emissions paid to providers now, to
 * power the network. The reserve receives the rest:
 *
 *     reserve = miner emissions × (1 − momentum)
 *
 * The page shows momentum's launch value (data/reserve.js) until the chain
 * shows momentum of its own: from the first finalized block at which
 * providers are paid a measurable share of the miner incentive, or at which
 * the reserve has received anything (its split is then in effect, and even
 * a momentum of zero is real). A share below MIN_SEEN counts as none: it is
 * the dust of the chain's fixed-point shares, not a payout.
 *
 * No imports, so tests/reserve-momentum.test.mjs runs it under plain node.
 */

/** The least share of the miner emissions that counts as momentum on chain: a tenth of a percent. */
export const MIN_SEEN = 0.001;

/**
 * routing         readReserve()'s routing: { reserve, burned }, each a share
 *                 of the miner allocation; null before the chain answers
 * live            the reserve has received anything
 * launchMomentum  momentum's launch value, a share
 *
 * Returns
 * momentum   the momentum to show and compute with
 * fromChain  whether it is the chain's
 * burned     the share the chain burns instead, which the reserve does not
 *            receive. It counts once the reserve is live; before that the
 *            page states what the reserve receives once it is paid, and the
 *            routing bar shows the burn.
 * onChain    the chain's own momentum, whatever its size (null before the
 *            chain answers)
 */
export function momentumOf({ routing, live, launchMomentum }) {
    const onChain = routing ? Math.max(0, 1 - routing.reserve - routing.burned) : null;
    const fromChain = onChain != null && (live || onChain >= MIN_SEEN);
    return {
        momentum: fromChain ? onChain : launchMomentum,
        fromChain,
        burned: live && routing ? routing.burned : 0,
        onChain,
    };
}

/** α per day the reserve receives: minerPerDay × (1 − momentum), less any share the chain burns. */
export function inflowPerDay(minerPerDay, momentum, burned = 0) {
    return minerPerDay * Math.max(0, 1 - momentum - burned);
}
