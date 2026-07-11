import React from 'react';
import './ResearchExtras.css';
import { blockNumberAt } from '../lib/network';

/**
 * Research page extras — the algo-competition banner, the algorithm cards
 * with per-block dataset links, and the audits / papers foot.
 *
 * Every component here is prop-driven (dict passed as `t`, no hooks), so
 * the Astro build renders them statically per language and the React SPA
 * reuses them under its LanguageProvider.
 */

// The current competition runs on Apex (Bittensor SN1). Its dedicated
// competition page is still launching — update this URL when it goes live.
export const APEX_COMPETITION_URL = 'https://app.macrocosmos.ai/apex';

// Per-block anonymized datasets for each algorithm area, published on the
// primary operator's public stats host under a fixed convention:
//   /datasets/<algo-tag>/block-<n>.json
const DATASET_BASE = 'https://main-grafana.ur.io/datasets';

function datasetUrl(tag, block) {
    const slug = String(tag).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${DATASET_BASE}/${slug}/block-${block}.json`;
}

/** The previous (completed) blocks, newest first — at most `count`. */
function previousBlocks(count = 3) {
    const current = blockNumberAt();
    const blocks = [];
    for (let b = current - 1; b >= Math.max(1, current - count); b--) {
        blocks.push(b);
    }
    return blocks;
}

/** Gold competition banner at the top of the research page. */
export function ResearchCompetition({ t }) {
    const c = t.research.competition;
    return (
        <div className="research-competition">
            <div className="research-competition-eyebrow">{c.eyebrow}</div>
            <p className="research-competition-body">{c.body}</p>
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

/**
 * The algorithm-area cards, each with its source link and dataset links
 * for the previous three blocks.
 */
export function ResearchCardGrid({ t }) {
    const blocks = previousBlocks();
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
                    {blocks.length > 0 && (
                        <div className="card-datasets">
                            <span className="card-datasets-label">{t.research.datasetsLabel}</span>
                            {blocks.map(b => (
                                <a
                                    key={b}
                                    className="card-dataset"
                                    href={datasetUrl(p.tag, b)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {t.research.datasetBlock.replace('{n}', b)}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

/** Audits and papers at the bottom of the research page. */
export function ResearchFoot({ t }) {
    const a = t.research.audits;
    const p = t.research.publications;
    return (
        <>
            <div className="research-subsection">
                <h3 className="research-subsection-title">{a.title}</h3>
                <p className="research-subsection-note">{a.intro}</p>
                <ul className="research-audits">
                    {a.items.map(name => (
                        <li key={name} className="research-audit">
                            <span className="research-audit-tag">{a.tag}</span>
                            {name}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="research-subsection">
                <h3 className="research-subsection-title">{p.title}</h3>
                <ul className="research-papers">
                    {p.items.map(paper => (
                        <li key={paper.title} className="research-paper">
                            <span className="research-paper-title">{paper.title}</span>
                            {paper.href ? (
                                <a
                                    className="card-link research-paper-link"
                                    href={paper.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    arXiv
                                </a>
                            ) : (
                                <span className="research-paper-soon">{p.comingSoon}</span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}
