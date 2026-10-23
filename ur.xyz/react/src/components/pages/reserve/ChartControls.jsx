import React from 'react';

// The chart windows: trailing days of the live history, or everything
// (the live history and the projection after it).
export const RANGES = [
    { id: '7d', label: '7D', days: 7 },
    { id: '30d', label: '30D', days: 30 },
    { id: 'all', label: 'All', days: null },
];

/** 7D | 30D | All, shared by both balance charts. */
export function RangeToggle({ range, onChange }) {
    return (
        <span className="reserve-unit reserve-range" role="group" aria-label="Chart window">
            {RANGES.map((r) => (
                <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => onChange(r.id)}>{r.label}</button>
            ))}
        </span>
    );
}

/** Widens a chart card to the full row and back. */
export function ExpandButton({ expanded, onToggle, label }) {
    return (
        <button type="button" className="reserve-expand" aria-expanded={expanded} onClick={onToggle}>
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {expanded
                    ? <path d="M6.5 2.5v4h-4M9.5 13.5v-4h4M6.5 6.5L2 2M9.5 9.5L14 14" />
                    : <path d="M2.5 6.5v-4h4M13.5 9.5v4h-4M2.5 2.5L7 7M13.5 13.5L9 9" />}
            </svg>
            <span>{expanded ? 'Collapse' : 'Expand'}</span>
            <span className="reserve-visually-hidden"> {label}</span>
        </button>
    );
}
