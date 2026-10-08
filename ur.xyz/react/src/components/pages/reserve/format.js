/**
 * Number and date formatting for the reserve page. The page is English-only
 * (like /about and /investors), so figures are formatted en-US throughout.
 */

const LOCALE = 'en-US';

/** 1,284 → "1.3K", 2,100,000 → "2.10M", 42.5 → "42.5". */
export function compact(v) {
    const n = Number(v) || 0;
    const a = Math.abs(n);
    const sign = n < 0 ? '−' : '';
    if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(1)}K`;
    return `${sign}${a.toLocaleString(LOCALE, { maximumFractionDigits: a % 1 ? 1 : 0 })}`;
}

/** Axis ticks: compact with no padding zeros (300K, 2.5M). */
export function axisCompact(v) {
    const n = Number(v) || 0;
    const a = Math.abs(n);
    const sign = n < 0 ? '−' : '';
    const trim = (x) => String(Number(x.toFixed(2)));
    if (a >= 1e9) return `${sign}${trim(a / 1e9)}B`;
    if (a >= 1e6) return `${sign}${trim(a / 1e6)}M`;
    if (a >= 1e3) return `${sign}${trim(a / 1e3)}K`;
    return `${sign}${trim(a)}`;
}

/** A whole-number figure with thousands separators. */
export function whole(v) {
    return Math.round(Number(v) || 0).toLocaleString(LOCALE);
}

/** An α amount to `dp` decimals, trailing zeros dropped. */
export function alpha(v, dp = 1) {
    return (Number(v) || 0).toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

/** 0.4123 → "41.2%". */
export function pct(ratio, dp = 1) {
    const v = (Number(ratio) || 0) * 100;
    return `${v.toLocaleString(LOCALE, { maximumFractionDigits: dp })}%`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_MS = 86_400_000;

/** "2026-10-12" → "12 Oct". */
export function shortDate(iso) {
    const [, m, d] = String(iso).split('-').map(Number);
    return `${d} ${MONTHS[m - 1]}`;
}

/** "2026-10-12" → "12 Oct 2026". */
export function longDate(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2026-10-12" → "12 Oct 26": for a span that crosses a year. */
export function shortDateYear(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

/** "2026-10" → "Oct 26". */
export function monthLabel(ym) {
    const [y, m] = String(ym).split('-').map(Number);
    return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

/** "2026-10" → "October 2026". */
export function monthLong(ym) {
    const [y, m] = String(ym).split('-').map(Number);
    return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "2026-10" → "Oct 2026". */
export function monthShort(ym) {
    const [y, m] = String(ym).split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
}

/** A USD amount: cents below $1,000 ("$1.97"), whole dollars above ("$4,650"), nothing as "$0". */
export function usd(v) {
    const n = Number(v) || 0;
    const a = Math.abs(n);
    const sign = n < 0 ? '−' : '';
    if (a === 0) return '$0';
    if (a >= 1000) return `${sign}$${whole(a)}`;
    return `${sign}$${a.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** A USD amount in compact form: "$1.35M", "$80.9K", "$4,650", "$1.97". */
export function usdCompact(v) {
    const n = Number(v) || 0;
    const a = Math.abs(n);
    const sign = n < 0 ? '−' : '';
    if (a >= 1e4) return `${sign}$${compact(a)}`;
    return usd(n);
}

/** A UTC timestamp (ms) → "2026-10-12". */
export function isoDay(ms) {
    return new Date(ms).toISOString().slice(0, 10);
}

/** A UTC timestamp (ms) → "12 Oct, 03:25 UTC". */
export function timeUtc(ms) {
    const d = new Date(ms);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}

export function epochDay(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function isoOf(day) {
    return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** Every UTC day from `start` to `end` inclusive. */
export function dayRange(start, end) {
    const out = [];
    for (let d = epochDay(start); d <= epochDay(end); d++) out.push(isoOf(d));
    return out;
}

/** Whole days from `a` to `b` (negative when b is earlier). */
export function daysBetween(a, b) {
    return epochDay(b) - epochDay(a);
}
