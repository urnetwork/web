/**
 * The pre-launch projection and its splice onto live history: the reserve's
 * balance if it retains its share of the miner allocation every day and pays
 * no program, which is the same arithmetic the published simulation used.
 */
import { dayRange, isoDay } from './format';

/** α per day retained by the reserve. */
export function inflowPerDay(minerPerDay, retentionBps) {
    return (minerPerDay * retentionBps) / 10_000;
}

/** Daily balances from `launch` to `through`, starting from `opening`. */
export function projectBalance({ launch, through, perDay, opening = 0 }) {
    return dayRange(launch, through).map((date, i) => ({ date, alpha: opening + perDay * (i + 1) }));
}

/**
 * Live samples ([{ time, alpha }]) become the solid series; the projection
 * continues from the last live balance for the days after it.
 */
export function spliceLive({ live, through, perDay }) {
    if (!live.length) return { live: [], projected: [] };
    // one point per UTC day: a later sample of the same day replaces the earlier
    const byDay = new Map();
    for (const s of live) byDay.set(isoDay(s.time), { date: isoDay(s.time), time: s.time, alpha: s.alpha, freeTao: s.freeTao });
    const points = [...byDay.values()];
    const last = points[points.length - 1];
    const after = dayRange(last.date, through).slice(1);
    return { live: points, projected: after.map((date, i) => ({ date, alpha: last.alpha + perDay * (i + 1) })) };
}

/**
 * Receipts and payments read off the balance history: a rise between two
 * samples is emission received, a fall is a payment out. The first sample's
 * balance counts as received (it arrived before the window started).
 */
export function flowsOf(live) {
    let received = 0, spent = 0;
    live.forEach((s, i) => {
        const delta = i === 0 ? s.alpha : s.alpha - live[i - 1].alpha;
        if (delta >= 0) received += delta; else spent -= delta;
    });
    return { received, spent };
}

/** Average α per day over the trailing `days` of samples (null with fewer than two samples). */
export function observedInflow(live, days = 7) {
    const tail = live.filter((s) => s.time >= live[live.length - 1].time - days * 86_400_000);
    if (tail.length < 2) return null;
    const span = (tail[tail.length - 1].time - tail[0].time) / 86_400_000;
    if (span <= 0) return null;
    return { perDay: (tail[tail.length - 1].alpha - tail[0].alpha) / span, days: Math.round(span) };
}
