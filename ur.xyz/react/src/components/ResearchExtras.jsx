import React, { useEffect, useState } from 'react';
import './ResearchExtras.css';
import { openResearchArea, researchAreaId } from './research-areas.js';

/**
 * Research page extras — the algo-competition card, the algorithm areas,
 * the anonymization and researchers notes, and the audits foot.
 *
 * Every component here is prop-driven (dict passed as `t`, or the
 * competition's own strings as `copy`), so the Astro build renders them per
 * language and the React SPA reuses them under its LanguageProvider. The
 * competition card is the one with state (its live/upcoming/ended pill reads
 * the visitor's clock), so the Astro pages hydrate it with just its strings.
 * The areas are native <details> — their content is in the HTML and works
 * with no JS; the one behavior (a /research#<id> deep link opens its area)
 * is a mount effect here and an inline script on the static pages
 * (research-areas.js), so they hydrate nothing.
 */

// The current competition runs on Apex (Bittensor SN1): six weekly rounds
// from the start date. The card's art, its title and its button link to the
// competition page.
export const APEX_COMPETITION = Object.freeze({
    url: 'https://apex.macrocosmos.ai/competitions/14',
    startsAt: '2026-09-28',
    rounds: 6,
    roundDays: 7,
});
export const APEX_COMPETITION_URL = APEX_COMPETITION.url;
export const MASA_2025_AUDIT_URL = '/audits/masa-l2-2025.pdf';
// the code the competition optimizes, linked from the card's body
export const UR_CODE_URL = 'https://github.com/urnetwork';
// the published report of each audit, by the item id in research.audits
const AUDIT_REPORT_URLS = { 'masa-l2-2025': MASA_2025_AUDIT_URL };

const DAY_MS = 86_400_000;
/** 'upcoming' | 'live' | 'ended' at time `now` (ms): live from the start date (UTC) for rounds × roundDays days. */
export function competitionPhase(now, { startsAt, rounds, roundDays } = APEX_COMPETITION) {
    const start = Date.parse(`${startsAt}T00:00:00Z`);
    const end = start + rounds * roundDays * DAY_MS;
    if (now < start) return 'upcoming';
    return now < end ? 'live' : 'ended';
}

// The competition's preview art (public/apex-sim-latency.*), remapped from
// its white ground to the site's #101010 and #F8F8F8 so it sits inside the
// card as drawn. A 900px webp serves phones; the jpg is the fallback. It is the
// first thing on the research page and its largest paint, so it loads eagerly
// and at high priority. The dictionary may word its alt text
// (research.competition.imageAlt); English is the fallback.
const APEX_HERO = {
    webp: '/apex-sim-latency.webp',
    webpSmall: '/apex-sim-latency-900.webp',
    jpg: '/apex-sim-latency.jpg',
    width: 1672,
    height: 941,
    alt: 'Two nodes joined by routes through a barrier: the Apex sim-latency competition',
};

const external = { target: '_blank', rel: 'noopener noreferrer' };

/**
 * The card's body: the dictionary sentence with its `{code}` placeholder
 * replaced by a link to the code (labelled by research.competition.codeLabel).
 * Without a label the string is shown as written.
 */
function competitionBody(body, codeLabel) {
    const text = String(body || '');
    if (!codeLabel || !text.includes('{code}')) return text;
    return text.split('{code}').flatMap((part, i) => (i === 0 ? [part] : [
        <a key={i} className="research-competition-code" href={UR_CODE_URL} {...external}>{codeLabel}</a>,
        part,
    ]));
}

/**
 * Gold competition card at the top of the research page: the art, the
 * eyebrow with the competition's status, the title, the body and the button.
 * The body carries a link of its own, so the card is not one big link (anchors
 * cannot nest): the art, the title and the button each link to the
 * competition. The title renders once the dictionary has one
 * (research.competition.title).
 *
 * The status pill follows the visitor's clock. The first render uses
 * `initialPhase` (the Astro page passes the phase at build time, so the
 * hydrating render matches the HTML) or, in the SPA, the phase now; the
 * effect then sets the phase from the clock of the browser showing it.
 */
export function ResearchCompetition({ t, copy, initialPhase }) {
    const c = copy || t.research.competition;
    const [phase, setPhase] = useState(() => initialPhase || competitionPhase(Date.now()));
    useEffect(() => { setPhase(competitionPhase(Date.now())); }, []);
    const status = { live: c.statusLive, upcoming: c.statusUpcoming, ended: c.statusEnded }[phase];
    const statusText = status ? status.replace('{date}', APEX_COMPETITION.startsAt) : (c.statusLive || 'Live');
    return (
        <div className="research-competition">
            <a className="research-competition-hero" href={APEX_COMPETITION_URL} {...external}>
                <picture>
                    <source
                        type="image/webp"
                        srcSet={`${APEX_HERO.webpSmall} 900w, ${APEX_HERO.webp} ${APEX_HERO.width}w`}
                        sizes="(max-width: 800px) 100vw, 800px"
                    />
                    <img
                        src={APEX_HERO.jpg}
                        width={APEX_HERO.width}
                        height={APEX_HERO.height}
                        alt={c.imageAlt || APEX_HERO.alt}
                        loading="eager"
                        fetchpriority="high"
                    />
                </picture>
            </a>
            <div className="research-competition-row">
                <div className="research-competition-copy">
                    <div className="research-competition-head">
                        <span className="research-competition-eyebrow">{c.eyebrow}</span>
                        {/* data-volatile: its text follows the clock, not an edit, so the
                            sitemap's content fingerprint skips it (astro/scripts/page-dates.mjs) */}
                        <span className="research-competition-status" role="status" data-phase={phase} data-volatile="">
                            {phase === 'live' && <i className="research-competition-pulse" aria-hidden="true" />}
                            {statusText}
                        </span>
                    </div>
                    {c.title && (
                        <h2 className="research-competition-title">
                            <a href={APEX_COMPETITION_URL} {...external}>{c.title}</a>
                        </h2>
                    )}
                    <p className="research-competition-body">{competitionBody(c.body, c.codeLabel)}</p>
                </div>
                <a className="research-competition-cta" href={APEX_COMPETITION_URL} {...external}>{c.cta}</a>
            </div>
        </div>
    );
}

/**
 * A dictionary sentence with one `{placeholder}` replaced by a link; shown
 * as written when the label is missing or the placeholder is absent.
 */
function withLink(text, placeholder, href, label, className) {
    const s = String(text || '');
    if (!label || !s.includes(placeholder)) return s;
    return s.split(placeholder).flatMap((part, i) => (i === 0 ? [part] : [
        <a key={i} className={className} href={href}>{label}</a>,
        part,
    ]));
}

/**
 * The algorithm areas, one native <details> each. Closed: the tag, the title
 * and the one-line body (the former card). Open: the current approach, the
 * implementation links and the research directions. The summary carries the
 * area's h2 (a summary may hold heading content) and the subsections are h3s,
 * so the page outline stays h1 → h2 → h3. Each area is addressable by its
 * id; the effect opens the one a /research#<id> visit names (the static
 * pages run the same function from an inline script instead).
 */
export function ResearchAreas({ t }) {
    const labels = t.research.areaLabels;
    useEffect(() => {
        const open = () => openResearchArea(window.location.hash);
        open();
        window.addEventListener('hashchange', open);
        return () => window.removeEventListener('hashchange', open);
    }, []);
    return (
        <div className="research-areas">
            {t.research.papers.map(p => (
                <details className="research-area" id={researchAreaId(p.tag)} key={p.tag}>
                    <summary className="research-area-summary">
                        <span className="card-eyebrow research-area-tag">{p.tag}</span>
                        <h2 className="card-title research-area-title">{p.title}</h2>
                        <span className="card-body research-area-lead">{p.body}</span>
                    </summary>
                    <div className="research-area-body">
                        <h3 className="research-area-subtitle">{labels.approach}</h3>
                        <p>{p.approach}</p>
                        <h3 className="research-area-subtitle">{labels.implementation}</h3>
                        <ul className="research-area-links">
                            {p.links.map(l => (
                                <li key={l.href}>
                                    <a className="card-link" href={l.href} {...external}>{l.label}</a>
                                </li>
                            ))}
                        </ul>
                        <h3 className="research-area-subtitle">{labels.directions}</h3>
                        <p>{p.directions}</p>
                    </div>
                </details>
            ))}
        </div>
    );
}

/**
 * The page-level notes after the areas: how the block exports are
 * anonymized, and the program for researchers and builders (its `{vdp}`
 * placeholder renders as the link to the Vulnerability Disclosure Program).
 */
export function ResearchNotes({ t }) {
    const { anonymization: a, researchers: r } = t.research;
    return (
        <>
            <div className="research-subsection" id="anonymization">
                <h2 className="research-subsection-title">{a.title}</h2>
                <p className="research-subsection-body">{a.body}</p>
            </div>
            <div className="research-subsection" id="researchers">
                <h2 className="research-subsection-title">{r.title}</h2>
                <p className="research-subsection-body">{withLink(r.body, '{vdp}', '/vdp', r.vdpLabel, 'research-subsection-link')}</p>
            </div>
        </>
    );
}

/** Audits and papers at the bottom of the research page. */
export function ResearchFoot({ t }) {
    const a = t.research.audits;
    return (
        <div className="research-subsection">
            <h2 className="research-subsection-title">{a.title}</h2>
            <p className="research-subsection-note">{a.intro}</p>
            <ul className="research-audits">
                {a.items.map(item => {
                    const href = AUDIT_REPORT_URLS[item.id];
                    return (
                        <li
                            key={item.id}
                            className={'research-audit' + (item.pending ? ' research-audit--pending' : '')}
                        >
                            <span className="research-audit-tag">{item.tag || a.tag}</span>
                            {href ? (
                                <a
                                    className="research-audit-link"
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {item.name}
                                </a>
                            ) : (
                                <span className="research-audit-name">{item.name}</span>
                            )}
                            <span className="research-audit-firm">{item.firm}</span>
                            {item.status && <span className="research-audit-status">{item.status}</span>}
                            {item.scope && <span className="research-audit-detail">{item.scope}</span>}
                            {item.note && <span className="research-audit-detail">{item.note}</span>}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
