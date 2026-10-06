import React from 'react';

/**
 * A part-to-whole bar: the segments in proportion, 2 px of surface between
 * them, and a key beneath with every segment's value and share, so nothing
 * is read from colour alone. Segments with no value stay in the key as a
 * zero and leave the bar.
 */
export default function SplitBar({ title, meta, segments, fmt, note }) {
    const total = segments.reduce((s, x) => s + Math.max(0, x.value || 0), 0);
    const shown = segments.filter((s) => (s.value || 0) > 0);
    const share = (v) => (total > 0 ? v / total : 0);
    const pctOf = (v) => `${(share(v) * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
    const summary = segments.map((s) => `${s.label} ${pctOf(s.value || 0)}`).join(', ');

    return (
        <div className="reserve-split">
            <div className="reserve-split-head">
                <span>{title}</span>
                {meta && <b>{meta}</b>}
            </div>
            <div className="reserve-split-bar" role="img" aria-label={`${title}: ${summary}`}>
                {shown.map((s) => (
                    <i
                        key={s.label}
                        className={s.className || ''}
                        style={{ flexBasis: `${share(s.value) * 100}%`, background: s.color }}
                        title={`${s.label}: ${fmt(s.value)} (${pctOf(s.value)})`}
                    />
                ))}
            </div>
            <ul className="reserve-split-key">
                {segments.map((s) => (
                    <li key={s.label}>
                        <i className={s.className || ''} style={{ background: s.color }} aria-hidden="true" />
                        <span>{s.label}</span>
                        <b>{fmt(s.value || 0)} · {pctOf(s.value || 0)}</b>
                    </li>
                ))}
            </ul>
            {note && <p className="reserve-split-note">{note}</p>}
        </div>
    );
}
