import React, { useCallback, useRef, useState } from 'react';

/**
 * A line/area chart in plain SVG for the reserve page: one y axis, solid
 * hairline gridlines, 2 px lines, a 12% wash under an area series, an end
 * marker with a surface ring (.xy-dot), and a crosshair tooltip that reads every series
 * at the hovered (or arrow-keyed) index. No dependencies; renders on the
 * server from its props, the hover state is client-only.
 *
 *   labels   x labels, one per index
 *   series   [{ name, color, type: 'area' | 'line' | 'dash', values, end? }]
 *            values may be undefined where a series has no point (the live
 *            series ends where the projection starts); `end` is a label
 *            drawn after the series' last point
 *   fmt      tooltip value formatter; axisFmt the y-axis one
 *   compact  the narrow-screen geometry: tighter margins, fewer x labels,
 *            and the end label above the last point instead of beside it.
 *            The page renders both and CSS shows the one that fits, so the
 *            text keeps its size at every width without measuring on mount.
 */

/** A round axis step giving about four intervals. */
export function niceStep(span) {
    const raw = Math.max(span, 1e-9) / 4;
    const pow = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw * 0.999) ?? raw;
}

const defined = (v) => typeof v === 'number' && Number.isFinite(v);

export default function XYChart({ labels, series, fmt, axisFmt, width = 960, height = 300, aria, compact = false, className = '' }) {
    const hostRef = useRef(null);
    const [hover, setHover] = useState(null); // { k, left }
    const n = labels.length;
    const W = width, H = height, L = compact ? 44 : 54, T = compact ? 30 : 16, B = 28;
    const R = compact ? 14 : series.some((s) => s.end) ? 112 : 12;

    const all = series.flatMap((s) => s.values.filter(defined)).concat(0);
    const max = Math.max(...all), min = Math.min(...all);
    const step = niceStep(max - min);
    const lo = Math.floor(min / step) * step;
    const hi = Math.max(lo + step, Math.ceil(max / step) * step);
    const x = (i) => L + (i / Math.max(n - 1, 1)) * (W - L - R);
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);

    const indexAt = useCallback((clientX) => {
        const svg = hostRef.current?.querySelector('svg');
        if (!svg) return null;
        const r = svg.getBoundingClientRect();
        const px = ((clientX - r.left) / r.width) * W;
        const k = Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1))));
        return { k, left: (x(k) / W) * r.width, width: r.width };
    }, [W, L, R, n]);

    const onPointerMove = (e) => { const h = indexAt(e.clientX); if (h) setHover(h); };
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

    const gridValues = [];
    for (let v = lo; v <= hi + step / 1e6; v += step) gridValues.push(v);
    const every = Math.max(1, Math.ceil(n / (compact ? 4 : 6)));

    const pathOf = (values) => {
        let d = '', open = false;
        values.forEach((v, i) => {
            if (!defined(v)) { open = false; return; }
            d += `${open ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
            open = true;
        });
        return d;
    };
    const areaOf = (values) => {
        const idx = values.map((v, i) => (defined(v) ? i : -1)).filter((i) => i >= 0);
        if (!idx.length) return '';
        const first = idx[0], last = idx[idx.length - 1];
        return `${pathOf(values)}L${x(last).toFixed(1)},${y(lo).toFixed(1)}L${x(first).toFixed(1)},${y(lo).toFixed(1)}Z`;
    };
    const lastIndex = (values) => { for (let i = values.length - 1; i >= 0; i--) if (defined(values[i])) return i; return -1; };

    const tipRows = shown ? series.filter((s) => defined(s.values[shown.k])) : [];
    const tipRight = shown ? shown.left > shown.width * 0.6 : false;

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
                {gridValues.map((v) => (
                    <g key={v}>
                        <line className="xy-grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
                        <text className="xy-axis" x={L - 8} y={y(v) + 3.5} textAnchor="end">{axisFmt(v)}</text>
                    </g>
                ))}
                {labels.map((label, i) => (i % every === 0 ? (
                    <text key={i} className="xy-axis" x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : 'middle'}>{label}</text>
                ) : null))}
                {series.map((s) => (
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
                ))}
                {series.map((s) => {
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
                {shown && <line className="xy-hair" x1={x(shown.k)} x2={x(shown.k)} y1={T} y2={H - B} />}
                {shown && tipRows.map((s) => (
                    <circle key={`${s.name}-shown`} cx={x(shown.k)} cy={y(s.values[shown.k])} r="4" fill={s.color} className="xy-dot" />
                ))}
                <rect
                    className="xy-hit"
                    x={L}
                    y={T}
                    width={W - L - R}
                    height={H - T - B}
                    onPointerMove={onPointerMove}
                    onPointerDown={onPointerMove}
                    onPointerLeave={onLeave}
                />
            </svg>
            {shown && (
                <div className="xy-tip" style={{ left: tipRight ? undefined : shown.left + 14, right: tipRight ? shown.width - shown.left + 14 : undefined }} role="status">
                    <p className="xy-tip-label">{labels[shown.k]}</p>
                    {tipRows.map((s) => (
                        <div key={s.name}>
                            <i className={s.type === 'dash' ? 'is-dash' : ''} style={{ borderColor: s.color }} />
                            <span>{s.name}</span>
                            <b>{fmt(s.values[shown.k])}</b>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
