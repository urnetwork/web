import React from 'react';
import './Section.css';

/**
 * Section
 *
 * Generic wrapper providing consistent layout and rhythm for every content
 * section on the page. Each Section has an anchor `id` so the Nav can scroll
 * to it, an `eyebrow` slug, a `title`, and `children` for the body.
 *
 * The whitepaper section receives `variant="whitepaper"` which leaves room
 * at the top for the morphing StatsPanel to dock into.
 */
export default function Section({ id, eyebrow, title, children, variant }) {
    return (
        <section id={id} className={`section ${variant ? `section-${variant}` : ''}`}>
            <div className="section-inner">
                <header className="section-header">
                    {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
                    <h2 className="section-title">{title}</h2>
                    <div className="section-rule" aria-hidden="true" />
                </header>
                <div className="section-body">
                    {children}
                </div>
            </div>
        </section>
    );
}
