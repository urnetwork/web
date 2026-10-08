/**
 * The pre-launch projection and its splice onto live history: the reserve's
 * balance if it receives what momentum leaves of the miner allocation every
 * day (momentum.js), at a steady momentum, and pays no program.
 */
import { dayRange, isoDay } from './format';

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

/**
 * The balance by calendar month (UTC): what the reserve received and paid out
 * in each month of the live history (a rise between two samples is emission
 * received, a fall a payment out; the first sample's balance counts as
 * received), and the inflow the projection adds for the days after the last
 * sample. [{ month: 'YYYY-MM', received, spent, projected }] in order.
 */
export function monthlyFlows({ live, projected }) {
    const months = new Map();
    const at = (date) => {
        const key = date.slice(0, 7);
        if (!months.has(key)) months.set(key, { month: key, received: 0, spent: 0, projected: 0 });
        return months.get(key);
    };
    live.forEach((s, i) => {
        const delta = i === 0 ? s.alpha : s.alpha - live[i - 1].alpha;
        const m = at(s.date);
        if (delta >= 0) m.received += delta; else m.spent -= delta;
    });
    projected.forEach((p, i) => {
        const before = i === 0 ? (live.length ? live[live.length - 1].alpha : 0) : projected[i - 1].alpha;
        at(p.date).projected += p.alpha - before;
    });
    return [...months.values()];
}

/** Average α per day over the trailing `days` of samples (null with fewer than two samples). */
export function observedInflow(live, days = 7) {
    const tail = live.filter((s) => s.time >= live[live.length - 1].time - days * 86_400_000);
    if (tail.length < 2) return null;
    const span = (tail[tail.length - 1].time - tail[0].time) / 86_400_000;
    if (span <= 0) return null;
    return { perDay: (tail[tail.length - 1].alpha - tail[0].alpha) / span, days: Math.round(span) };
}
