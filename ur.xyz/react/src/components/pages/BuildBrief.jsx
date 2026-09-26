import React from 'react';

/**
 * BuildBrief — the opportunity readout beside the model, the "selected layer"
 * caption and the opportunity brief panel of the "Build on UR" page.
 *
 * Ported from astro/public/build.html. The text the standalone page's script
 * wrote into `data-*` hooks on every opportunity change is rendered from the
 * selected opportunity here; the version-11/12 editions (`builder`) move the
 * layer caption into the model stage and the brief's prev/next nav into the
 * brief head, exactly as the script re-parented them.
 */

const position = (o, count) => `${o.n} / ${String(count).padStart(2, '0')}`;

/**
 * The "selected layer" caption: the focused component, or the whole system.
 * Its title is an h4 inside an opportunity readout (h3) and an h3 on the
 * builder editions' stage, under the section's h2.
 */
export function ArchitectureReadout({ className = 'architecture-readout', headingLevel = 'h4', name, detail, short, color, onClose }) {
    const Heading = headingLevel;
    return (
        <div className={className} aria-live="polite" aria-atomic="true" style={{ '--component-color': color }} onClick={(e) => e.stopPropagation()}>
            <div className="architecture-readout-head">
                <small>SELECTED LAYER</small>
                <button className="architecture-readout-close" type="button" aria-label="Close selected layer details" onClick={onClose}>
                    <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3l12 12M15 3L3 15" /></svg>
                </button>
            </div>
            <Heading>{name}</Heading>
            <p>{detail}</p>
            <b>{short}</b>
        </div>
    );
}

/**
 * The readout panel (a tabpanel for the opportunity tabs). `readout` carries
 * the category/title/teaser shown — version 12 words them from BUILD_V12.
 * `layer` is the ArchitectureReadout props; it renders here for version 10 and
 * on the stage for the builder editions. `triggerOpen`/`toggleOpen` are the two
 * brief buttons' own expanded states (see Build.jsx). Every opportunity has its
 * own panel in the page (`id`, labelled by its tab); all but the selected one
 * are `hidden`.
 */
export function Readout({ id, labelledBy, briefId, hidden, op, readout, isV11, builder, layer, triggerOpen, toggleOpen, briefLabel, onOpenBrief, onToggleBrief }) {
    return (
        <aside className="readout" id={id} role="tabpanel" aria-labelledby={labelledBy} hidden={hidden} aria-live="polite">
            <div className="readout-top"><span>EXAMPLE {op.n}</span><span>{isV11 ? 'SIX STARTING POINTS' : 'ONE OF MANY'}</span></div>
            <div className="readout-category">{readout.category.toUpperCase()}</div>
            <h3>{readout.title}</h3>
            <p className="readout-lede">{readout.teaser}</p>
            <div className="profile">
                <div><b>DEMAND SHAPE</b><span>{op.demandProfile}</span></div>
                <div><b>NETWORK RELIANCE</b><span>{op.reliance}</span></div>
            </div>
            <div className="readout-explainer">
                <article><b>THE PRODUCT</b><p>{op.proposition}</p></article>
                <article><b>HOW IT USES SN25</b><p>{op.inherits}</p></article>
            </div>
            {!builder && <ArchitectureReadout {...layer} />}
            <button className="readout-brief" type="button" aria-expanded={triggerOpen} aria-controls={briefId} onClick={onOpenBrief}>
                {briefLabel}<span aria-hidden="true">{triggerOpen ? '−' : '+'}</span>
            </button>
            <button className="brief-toggle" type="button" aria-expanded={toggleOpen} aria-controls={briefId} onClick={onToggleBrief}>
                <span>{toggleOpen ? 'CLOSE OPPORTUNITY BRIEF' : 'READ FULL OPPORTUNITY BRIEF'}</span><i aria-hidden="true">{toggleOpen ? '−' : '+'}</i>
            </button>
        </aside>
    );
}

function BriefNav({ pos, onPrev, onNext, children }) {
    return (
        <nav className="brief-nav" aria-label="Move between opportunity briefs">
            <button type="button" onClick={onPrev}>← PREVIOUS</button>
            <span>{pos}</span>
            <button type="button" onClick={onNext}>NEXT →</button>
            {children}
        </nav>
    );
}

/**
 * The opportunity brief: editorial story + rail, the structured chapters and
 * the prev/next navigation. `v12` is the BUILD_V12 entry for the opportunity
 * when the page runs as version 12 (its copy replaces the editorial story and
 * rail metadata), otherwise null. Like the readouts, every opportunity's brief
 * is in the page and all but the selected one are `hidden`.
 */
export function BriefPanel({ id, hidden, panelRef, op, v12, opportunities, builder, open, briefMode, onBriefMode, onPrev, onNext, onClose }) {
    const count = opportunities.length;
    const index = opportunities.indexOf(op);
    const prev = opportunities[(index - 1 + count) % count];
    const next = opportunities[(index + 1) % count];
    const pos = position(op, count);
    const number = v12
        ? `OPPORTUNITY ${String(index + 1).padStart(2, '0')} / ${v12.category.toUpperCase()}`
        : `OPPORTUNITY ${op.n} / ${op.category.toUpperCase()}`;
    const story = v12
        ? [
            ['01 / OPPORTUNITY', v12.opportunityTitle, v12.opportunity],
            ['02 / WHY UR', v12.sn25Title, v12.sn25],
            ['03 / THE OPERATOR OWNS', 'What remains with the operator', v12.owns],
        ]
        : [
            ['01 / THE OPPORTUNITY', op.editorialOpportunityTitle, op.editorialThesis],
            [`02 / ${op.editorialProblemLabel}`, op.editorialProblemTitle, op.editorialWhy],
            ['03 / WHY SN25', op.editorialSn25Title, op.editorialUnlock],
        ];
    const rail = v12
        ? [
            ['POTENTIAL CUSTOMER', v12.customer],
            ['DEMAND SHAPE', v12.demand],
            ['NETWORK USE', v12.networkUse],
            ['DEMAND SHAPE', op.demandProfile],
        ]
        : [
            ['POTENTIAL CUSTOMER', op.customer],
            ['WHAT THE OPERATOR OWNS', op.owns],
            ['WHERE IT COULD GO', op.editorialOpen],
            ['DEMAND SHAPE', op.demandProfile],
        ];
    const hops = op.traffic.split('→').map((x) => x.trim());
    const close = <button className="brief-close" type="button" onClick={onClose}>CLOSE BRIEF</button>;

    return (
        <section className="brief-panel" id={id} hidden={hidden} data-open={String(open)} ref={panelRef}>
            <div className="brief-inner"><div className="brief-content">
                <header className="brief-head">
                    <div><small>{number}</small><h3>{v12 ? v12.title : op.title}</h3><p>{op.teaser}</p></div>
                    <div className="brief-tags">
                        <span>{op.demandProfile.toUpperCase()}</span>
                        <span>{op.reliance.toUpperCase()} NETWORK RELIANCE</span>
                        <span>{op.networkUse.toUpperCase()}</span>
                    </div>
                    {builder ? <BriefNav pos={pos} onPrev={onPrev} onNext={onNext}>{close}</BriefNav> : close}
                </header>
                <div className="brief-compare">
                    <span>COMPARE BRIEF TREATMENTS</span>
                    <div role="tablist" aria-label="Brief treatment">
                        <button type="button" role="tab" aria-selected={briefMode === 'editorial'} onClick={() => onBriefMode('editorial')}>EDITORIAL</button>
                        <button type="button" role="tab" aria-selected={briefMode === 'structured'} onClick={() => onBriefMode('structured')}>STRUCTURED</button>
                    </div>
                </div>
                <div className="editorial-brief" data-brief-format="editorial">
                    <article className="editorial-story">
                        {story.map(([label, title, body]) => (
                            <section key={label}><b>{label}</b><div><h4>{title}</h4><p>{body}</p></div></section>
                        ))}
                    </article>
                    <aside className="editorial-rail">
                        <span>ONE OF MANY POSSIBILITIES</span>
                        {!builder && <BriefNav pos={pos} onPrev={onPrev} onNext={onNext} />}
                        <blockquote>{op.editorialThesis}</blockquote>
                        <dl>
                            {rail.map(([dt, dd], i) => <div key={i}><dt>{dt}</dt><dd>{dd}</dd></div>)}
                        </dl>
                    </aside>
                </div>
                <nav className="brief-footer-nav" aria-label="Continue through opportunity briefs">
                    <button type="button" onClick={onPrev}><small>← PREVIOUS EXAMPLE</small><strong>{prev.title}</strong></button>
                    <span><b>{pos}</b><small>INSPIRATION EXAMPLES</small></span>
                    <button type="button" onClick={onNext}><small>NEXT EXAMPLE →</small><strong>{next.title}</strong></button>
                </nav>
                <div className="brief-grid" data-brief-format="structured">
                    <section className="brief-chapter">
                        <header className="brief-chapter-head"><b>01 / OPPORTUNITY</b><h4>What the product could become</h4></header>
                        <div className="brief-chapter-grid triple">
                            <article className="brief-block"><h4>Potential customer</h4><p>{op.customer}</p></article>
                            <article className="brief-block"><h4>The problem</h4><p>{op.problem}</p></article>
                            <article className="brief-block"><h4>Product proposition</h4><p>{op.proposition}</p></article>
                        </div>
                    </section>
                    <section className="brief-chapter">
                        <header className="brief-chapter-head"><b>02 / IN USE</b><h4>How demand reaches the network</h4></header>
                        <div className="brief-chapter-grid">
                            <article className="brief-block"><h4>Concrete usage scenario</h4><p>{op.scenario}</p></article>
                            <article className="brief-block full">
                                <h4>How demand moves through the network</h4>
                                <div className="traffic-path">
                                    {hops.map((hop, i) => (
                                        <React.Fragment key={i}><span>{hop}</span>{i < hops.length - 1 && <i aria-hidden="true" />}</React.Fragment>
                                    ))}
                                </div>
                            </article>
                        </div>
                    </section>
                    <section className="brief-chapter">
                        <header className="brief-chapter-head"><b>03 / BOUNDARY</b><h4>What you build. What SN25 provides.</h4></header>
                        <div className="brief-chapter-grid">
                            <article className="brief-block"><h4>What the operator owns</h4><p>{op.owns}</p></article>
                            <article className="brief-block"><h4>What UR / SN25 supplies</h4><p>{op.inherits}</p></article>
                            <article className="brief-block"><h4>Where the value exchange happens</h4><p>{op.value}</p></article>
                            <article className="brief-block">
                                <h4>Important constraints and open questions</h4>
                                <ul className="constraints">{op.constraints.map((c) => <li key={c}>{c}</li>)}</ul>
                            </article>
                        </div>
                    </section>
                </div>
            </div></div>
        </section>
    );
}
