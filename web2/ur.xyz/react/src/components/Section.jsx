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
export default function Section({ id, eyebrow, title, children, variant, headingLevel = 'h2' }) {
    // "h1" on the page-level section; .section-title zeroes margins, so the
    // levels render identically.
    const Heading = headingLevel;
    return (
        <section id={id} className={`section ${variant ? `section-${variant}` : ''}`}>
            <div className="section-inner">
                <header className="section-header">
                    {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
                    <Heading className="section-title">{title}</Heading>
                    <div className="section-rule" aria-hidden="true" />
                </header>
                <div className="section-body">
                    {children}
                </div>
            </div>
        </section>
    );
}
