import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A line, area and bar chart in plain SVG for the reserve page: one y axis,
 * solid hairline gridlines, 2 px lines, a 12% wash under an area series,
 * stacked bars (at most 24 px wide, a 2 px surface gap between the segments
 * of a stack, a rounded data end), an end marker with a surface ring
 * (.xy-dot), dated vertical markers, and a tooltip that reads every series
 * at the hovered, tapped or arrow-keyed index: a crosshair over lines, a
 * lifted band over bars. No dependencies.
 *
 * Geometry: the chart measures its container and draws at one unit per CSS
 * pixel, so axis and label text render at their CSS size at every width (a
 * phone, a full-width tablet card, half a desktop column), with margins and
 * tick counts chosen for that width. The server render and the first client
 * render use `width` (hydration stays deterministic); the measured width
 * takes over in an effect.
 *
 *   labels   x labels, one per index; tipLabels the tooltip's, if longer
 *   series   [{ name, color, type: 'area' | 'line' | 'dash' | 'bar', values,
 *              end?, stack?, opacity?, fmt? }]
 *            values may be undefined where a series has no point (the live
 *            series ends where the projection starts); `end` is a label
 *            drawn after the series' last point; bars with the same `stack`
 *            stack on each other in series order, negative values below the
 *            baseline; `opacity` dims a mark (a projected bar); `fmt`
 *            formats this series' tooltip value instead of the chart's
 *   marks    [{ index, label }]: a vertical marker at an index (today)
 *   fmt      tooltip value formatter; axisFmt the y-axis one
 *   width    the geometry before the container is measured, px
 *   height   optional; otherwise about 0.68 × the width, within 220–300 px
 *
 * Touch: `touch-action: pan-y` on the hit area keeps vertical scrolling to
 * the page; a tap or a sideways drag scrubs the readout, which stays until
 * a tap elsewhere (a touch's pointerleave is ignored).
 */

/** A round axis step giving about four intervals. */
export function niceStep(span) {
    const raw = Math.max(span, 1e-9) / 4;
    const pow = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw * 0.999) ?? raw;
}

const defined = (v) => typeof v === 'number' && Number.isFinite(v);
const f1 = (v) => v.toFixed(1);
const COMPACT_BELOW = 480; // px: tighter margins, the end label above the point
const TIP_GAP = 14;

export default function XYChart({ labels, tipLabels, series, fmt, axisFmt, width = 800, height, aria, className = '', marks = [] }) {
    const hostRef = useRef(null);
    const tipRef = useRef(null);
    const tipWidthRef = useRef(200); // the tooltip's last measured width, for placing the next one
    const [measured, setMeasured] = useState(null);
    const [hover, setHover] = useState(null); // { k, left, width }

    // one unit per CSS pixel: draw at the container's width
    useEffect(() => {
        const el = hostRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver((entries) => {
            const w = Math.round(entries[0].contentRect.width);
            if (w > 0) setMeasured(w);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const n = labels.length;
    const band = series.some((s) => s.type === 'bar');
    const hasEnd = series.some((s) => s.end);
    const W = measured ?? width;
    const compact = W < COMPACT_BELOW;
    const H = height ?? Math.round(Math.max(220, Math.min(300, W * 0.68)));
    const L = compact ? 44 : 54, T = compact && hasEnd ? 30 : 16, B = 26;
    const R = compact ? 12 : hasEnd ? 96 : 12;
    const plotW = W - L - R;
    const slot = plotW / Math.max(n, 1);

    // stacked bars: each bar series' base and end at every index, positive
    // values stacking up from the baseline and negative ones down
    const stacks = [];
    {
        const sides = new Map();
        for (const s of series) {
            if (s.type !== 'bar') { stacks.push(null); continue; }
            const key = s.stack || s.name;
            const side = sides.get(key) || { up: new Array(n).fill(0), down: new Array(n).fill(0) };
            sides.set(key, side);
            const y0 = [], y1 = [];
            for (let i = 0; i < n; i++) {
                const v = defined(s.values[i]) ? s.values[i] : 0;
                const run = v >= 0 ? side.up : side.down;
                y0.push(run[i]); run[i] += v; y1.push(run[i]);
            }
            stacks.push({ y0, y1 });
        }
    }
    const stackKey = (s) => s.stack || s.name;
    // whether a bar segment is the outermost on its side of the baseline
    const isEnd = (k, i) => {
        const v = series[k].values[i];
        return !series.some((t, j) => j > k && t.type === 'bar' && stackKey(t) === stackKey(series[k]) && defined(t.values[i]) && t.values[i] !== 0 && (t.values[i] >= 0) === (v >= 0));
    };

    const all = series.flatMap((s, k) => (stacks[k] ? stacks[k].y1 : s.values.filter(defined))).concat(0);
    const max = Math.max(...all), min = Math.min(...all);
    const step = niceStep(max - min);
    const lo = Math.floor(min / step) * step;
    const hi = Math.max(lo + step, Math.ceil(max / step) * step);
    const x = band ? (i) => L + (i + 0.5) * slot : (i) => L + (i / Math.max(n - 1, 1)) * plotW;
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    // a bar is at most 24 px wide and never fills its slot
    const barW = Math.max(2, Math.min(slot * 0.72, 24));
    const GAP = 2, radius = Math.min(4, barW / 2);

    const indexAt = useCallback((clientX) => {
        const svg = hostRef.current?.querySelector('svg');
        if (!svg) return null;
        const r = svg.getBoundingClientRect();
        const px = ((clientX - r.left) / r.width) * W;
        const raw = band ? Math.floor((px - L) / slot) : Math.round(((px - L) / plotW) * (n - 1));
        const k = Math.max(0, Math.min(n - 1, raw));
        return { k, left: (x(k) / W) * r.width, width: r.width };
    }, [W, L, plotW, slot, band, n]); // eslint-disable-line react-hooks/exhaustive-deps

    const onPointerMove = (e) => { const h = indexAt(e.clientX); if (h) setHover(h); };
    // a touch's readout stays after the finger lifts (its pointerleave is ignored)
    const onPointerLeave = (e) => { if (e.pointerType === 'touch') return; setHover(null); };
    const onLeave = () => setHover(null);
    // keyboard focus opens the readout at the latest point; a click already has one
    const onFocus = (e) => {
        if (hover || !e.currentTarget.matches(':focus-visible')) return;
        const r = hostRef.current?.querySelector('svg')?.getBoundingClientRect();
        setHover({ k: n - 1, left: r ? (x(n - 1) / W) * r.width : 0, width: r?.width ?? 0 });
    };
    const onKeyDown = (e) => {
        if (e.key === 'Escape') { setHover(null); return; }
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const svg = hostRef.current?.querySelector('svg');
        const r = svg?.getBoundingClientRect();
        const k = Math.max(0, Math.min(n - 1, (hover?.k ?? (e.key === 'ArrowRight' ? -1 : n)) + (e.key === 'ArrowRight' ? 1 : -1)));
        setHover({ k, left: r ? (x(k) / W) * r.width : 0, width: r?.width ?? 0 });
    };

    // the readout, unless the series shrank under it
    const shown = hover && hover.k < n ? hover : null;
    const open = shown != null;

    // a tap elsewhere closes a readout a touch left open
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (!hostRef.current?.contains(e.target)) setHover(null); };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
    }, [open]);

    // the tooltip beside the crosshair, kept inside the chart: to the right
    // of the point, else to its left, else as far right as it fits
    const tipLeft = (left, hostW, tw) => {
        let l = left + TIP_GAP;
        if (l + tw > hostW) l = left - TIP_GAP - tw;
        if (l < 0) l = Math.max(0, Math.min(hostW - tw, left - tw / 2));
        return l;
    };
    useEffect(() => {
        const tip = tipRef.current;
        if (!tip || !shown) return;
        tipWidthRef.current = tip.offsetWidth || tipWidthRef.current;
        tip.style.left = `${tipLeft(shown.left, shown.width, tipWidthRef.current)}px`;
    });

    const gridValues = [];
    for (let v = lo; v <= hi + step / 1e6; v += step) gridValues.push(v);
    // x labels: one per 80 px or so, at most six
    const maxLabels = Math.max(2, Math.min(6, Math.floor(plotW / 80)));
    const every = Math.max(1, Math.ceil(n / maxLabels));

    const pathOf = (values) => {
        let d = '', isOpen = false;
        values.forEach((v, i) => {
            if (!defined(v)) { isOpen = false; return; }
            d += `${isOpen ? 'L' : 'M'}${f1(x(i))},${f1(y(v))}`;
            isOpen = true;
        });
        return d;
    };
    const areaOf = (values) => {
        const idx = values.map((v, i) => (defined(v) ? i : -1)).filter((i) => i >= 0);
        if (!idx.length) return '';
        const first = idx[0], last = idx[idx.length - 1];
        return `${pathOf(values)}L${f1(x(last))},${f1(y(lo))}L${f1(x(first))},${f1(y(lo))}Z`;
    };
    // a bar segment from its base to its end, lifted off the segment beneath
    // it by the surface gap, the outermost segment's end rounded
    const barOf = (i, baseV, endV, rounded) => {
        if (endV === baseV) return null;
        const up = endV > baseV;
        const yEnd = y(endV);
        const yBase = y(baseV) + (baseV === 0 ? 0 : up ? -GAP : GAP);
        const h = Math.abs(yBase - yEnd);
        if (h <= 0.5) return null;
        const x0 = x(i) - barW / 2, x1 = x0 + barW;
        if (!rounded || h <= radius) return `M${f1(x0)},${f1(yBase)}L${f1(x0)},${f1(yEnd)}L${f1(x1)},${f1(yEnd)}L${f1(x1)},${f1(yBase)}Z`;
        const r = radius, d = up ? 1 : -1, sweep = up ? 1 : 0;
        return `M${f1(x0)},${f1(yBase)}L${f1(x0)},${f1(yEnd + d * r)}A${r},${r} 0 0 ${sweep} ${f1(x0 + r)},${f1(yEnd)}L${f1(x1 - r)},${f1(yEnd)}A${r},${r} 0 0 ${sweep} ${f1(x1)},${f1(yEnd + d * r)}L${f1(x1)},${f1(yBase)}Z`;
    };
    const lastIndex = (values) => { for (let i = values.length - 1; i >= 0; i--) if (defined(values[i])) return i; return -1; };

    const tipRows = shown ? series.filter((s) => defined(s.values[shown.k]) && (s.type !== 'bar' || s.values[shown.k] !== 0)) : [];

    return (
        <div
            className={`xy-chart ${className}`}
            ref={hostRef}
            tabIndex={0}
            role="group"
            aria-label={aria}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onLeave}
        >
            {/* the wrapper carries the chart's name; the tooltip reads the values */}
            <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
                {band && shown && <rect className="xy-band" x={L + shown.k * slot} y={T} width={slot} height={H - T - B} />}
                {gridValues.map((v) => (
                    <g key={v}>
                        <line className={lo < 0 && Math.abs(v) < step / 1e6 ? 'xy-grid xy-zero' : 'xy-grid'} x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
                        <text className="xy-axis" x={L - 7} y={y(v) + 3.5} textAnchor="end">{axisFmt(v)}</text>
                    </g>
                ))}
                {labels.map((label, i) => (i % every === 0 ? (
                    <text key={i} className="xy-axis" x={x(i)} y={H - 7} textAnchor={i === 0 && !band ? 'start' : 'middle'}>{label}</text>
                ) : null))}
                {marks.map((m) => (defined(m.index) && m.index >= 0 && m.index < n ? (
                    <g key={`${m.label}-${m.index}`}>
                        <line className="xy-mark" x1={x(m.index)} x2={x(m.index)} y1={T} y2={H - B} />
                        <text
                            className="xy-mark-label"
                            x={x(m.index) + (x(m.index) < L + plotW / 2 ? 6 : -6)}
                            y={T + 11}
                            textAnchor={x(m.index) < L + plotW / 2 ? 'start' : 'end'}
                        >
                            {m.label}
                        </text>
                    </g>
                ) : null))}
                {series.map((s, k) => (s.type === 'bar' ? (
                    <g key={s.name} fillOpacity={s.opacity ?? 1}>
                        {stacks[k].y1.map((endV, i) => {
                            const d = barOf(i, stacks[k].y0[i], endV, isEnd(k, i));
                            return d ? <path key={i} d={d} fill={s.color} /> : null;
                        })}
                    </g>
                ) : (
                    <g key={s.name}>
                        {s.type === 'area' && <path d={areaOf(s.values)} fill={s.color} fillOpacity="0.12" />}
                        <path
                            d={pathOf(s.values)}
                            fill="none"
                            stroke={s.color}
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            strokeDasharray={s.type === 'dash' ? '6 5' : undefined}
                        />
                    </g>
                )))}
                {series.map((s) => {
                    if (s.type === 'bar') return null;
                    const i = lastIndex(s.values);
                    if (i < 0) return null;
                    return (
                        <g key={`${s.name}-end`}>
                            <circle cx={x(i)} cy={y(s.values[i])} r="4" fill={s.color} className="xy-dot" />
                            {s.end && (compact
                                ? <text className="xy-end" x={x(i)} y={y(s.values[i]) - 12} textAnchor="end">{s.end}</text>
                                : <text className="xy-end" x={x(i) + 10} y={y(s.values[i]) + 4}>{s.end}</text>)}
                        </g>
                    );
                })}
                {shown && !band && <line className="xy-hair" x1={x(shown.k)} x2={x(shown.k)} y1={T} y2={H - B} />}
                {shown && !band && tipRows.map((s) => (
                    <circle key={`${s.name}-shown`} cx={x(shown.k)} cy={y(s.values[shown.k])} r="4" fill={s.color} className="xy-dot" />
                ))}
                <rect
                    className="xy-hit"
                    x={L}
                    y={T}
                    width={plotW}
                    height={H - T - B}
                    onPointerMove={onPointerMove}
                    onPointerDown={onPointerMove}
                    onPointerLeave={onPointerLeave}
                />
            </svg>
            {shown && (
                <div ref={tipRef} className="xy-tip" style={{ left: tipLeft(shown.left, shown.width, tipWidthRef.current) }} role="status">
                    <p className="xy-tip-label">{(tipLabels || labels)[shown.k]}</p>
                    {tipRows.length === 0 && <div><span>Nothing this period</span></div>}
                    {tipRows.map((s) => (
                        <div key={s.name}>
                            <i
                                className={s.type === 'dash' ? 'is-dash' : s.type === 'bar' ? 'is-rect' : ''}
                                style={s.type === 'bar' ? { background: s.color, opacity: s.opacity ?? 1 } : { borderColor: s.color }}
                            />
                            <span>{s.name}</span>
                            <b>{(s.fmt || fmt)(s.values[shown.k])}</b>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
