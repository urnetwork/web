import React from 'react';
import './ResearchExtras.css';

/**
 * Research page extras — the algo-competition banner, algorithm cards,
 * docs link, and audits foot.
 *
 * Every component here is prop-driven (dict passed as `t`, no hooks), so
 * the Astro build renders them statically per language and the React SPA
 * reuses them under its LanguageProvider.
 */

// The current competition runs on Apex (Bittensor SN1). Its dedicated
// competition page is still launching — update this URL when it goes live.
export const APEX_COMPETITION_URL = 'https://apex.macrocosmos.ai/';
export const MASA_2025_AUDIT_URL = '/audits/masa-l2-2025.pdf';

/** Gold competition banner at the top of the research page. */
export function ResearchCompetition({ t }) {
    const c = t.research.competition;
    return (
        <div className="research-competition">
            <div className="research-competition-copy">
                <div className="research-competition-eyebrow">{c.eyebrow}</div>
                <p className="research-competition-body">{c.body}</p>
            </div>
            <a
                className="research-competition-cta"
                href={APEX_COMPETITION_URL}
                target="_blank"
                rel="noopener noreferrer"
            >
                {c.cta}
            </a>
        </div>
    );
}

/** Link the overview page to the fuller protocol research documentation. */
export function ResearchDocsLink({ t, href = '/docs/protocol/protocol-research' }) {
    return (
        <a className="research-docs-link" href={href}>
            <span>{t.nav.docs}</span>
            <span aria-hidden="true">→</span>
        </a>
    );
}

/** The algorithm-area cards, each with its verified source link. */
export function ResearchCardGrid({ t }) {
    return (
        <div className="card-grid">
            {t.research.papers.map(p => (
                <div className="card" key={p.tag}>
                    <div className="card-eyebrow">{p.tag}</div>
                    <h3 className="card-title">{p.title}</h3>
                    <p className="card-body">{p.body}</p>
                    {p.href && (
                        <a
                            href={p.href}
                            className="card-link"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {p.linkLabel}
                        </a>
                    )}
                </div>
            ))}
        </div>
    );
}

/** Audits and papers at the bottom of the research page. */
export function ResearchFoot({ t }) {
    const a = t.research.audits;
    return (
        <div className="research-subsection">
            <h3 className="research-subsection-title">{a.title}</h3>
            <p className="research-subsection-note">{a.intro}</p>
            <ul className="research-audits">
                {a.items.map(name => (
                    <li key={name} className="research-audit">
                        <span className="research-audit-tag">{a.tag}</span>
                        {name === 'MASA L2 2025' ? (
                            <a
                                className="research-audit-link"
                                href={MASA_2025_AUDIT_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {name}
                            </a>
                        ) : name}
                    </li>
                ))}
            </ul>
        </div>
    );
}
