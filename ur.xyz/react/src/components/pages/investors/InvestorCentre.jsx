import React, { useEffect, useRef, useState } from 'react';
import { investorCentre, externalResources } from '../../../data/investors';
import './InvestorCentre.css';

/**
 * The Investor Centre (/investors): the featured document, the archive of
 * every investor document with a search and a type filter, the network and
 * research links, and the disclosure.
 *
 * Only the page body: the shell (nav, footer, <main class="section-page">)
 * comes from the SPA's SectionPage and from astro/src/pages/investors.astro.
 */

const { featured, deck, updates, materials, metrics } = investorCentre;
const SHOW_METRICS = false;

// Every document the centre lists, newest first and one row each: the dated
// updates plus the reference materials, which carry their own date or, for
// the deck, the deck's.
const archiveItems = [...updates, ...materials.map(item => ({
    ...item,
    date: item.date || (item.href === deck.href ? deck.date : 'Not dated'),
    dateIso: item.dateIso || (item.href === deck.href ? deck.dateIso : null),
    kind: item.href === deck.href ? deck.kind : 'Link',
    format: item.pdfHref ? 'PDF' : 'Web',
}))]
    .filter((item, index, items) => items.findIndex(candidate => candidate.href === item.href) === index)
    .sort((a, b) => (b.dateIso || '').localeCompare(a.dateIso || ''));
const archiveKinds = [...new Set(archiveItems.map(item => item.kind))];

// What the search box matches: the row's visible text, as the page's script
// matched each row's textContent before the port.
const rowText = (item) => [
    item.date,
    item.kind,
    item.title,
    item.readTime || item.detail || '',
    item.pdfHref ? 'PDF ↓' : 'Read →',
].join(' ').toLowerCase();

export default function InvestorCentre() {
    const [query, setQuery] = useState('');
    const [kind, setKind] = useState('all');
    const needle = query.trim().toLowerCase();
    const shown = archiveItems.map(item =>
        (!needle || rowText(item).includes(needle)) && (kind === 'all' || item.kind.toLowerCase() === kind));
    const shownCount = shown.filter(Boolean).length;

    return (
        <div className="investor-page">
            <header className="investor-hero investor-shell">
                <div className="investor-hero__title">
                    <span className="investor-eyebrow">Investors</span>
                    <h1>Investor Centre</h1>
                    <div className="investor-hero__rule" aria-hidden="true"></div>
                </div>
                <p className="investor-updated">
                    <span aria-hidden="true"></span>
                    Updated <time dateTime={investorCentre.updatedIso}>{investorCentre.updated}</time>
                </p>
            </header>

            <section className="investor-about investor-shell" aria-labelledby="about-ur">
                <h2 id="about-ur">About UR</h2>
                <div className="investor-about__copy">
                    {investorCentre.about.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                </div>
            </section>

            <div className="investor-views investor-shell" data-investor-views="">

                <section className="investor-library">
                    <div className="investor-section-heading">
                        <h2>Latest from UR</h2>
                        <span>Curated overview</span>
                    </div>

                    <a className="featured-letter" href={featured.href}>
                        <p className="resource-meta">
                            <time dateTime={featured.dateIso}>{featured.date}</time>
                            <span aria-hidden="true">·</span>
                            {featured.kind}
                            <span aria-hidden="true">·</span>
                            {featured.readTime}
                        </p>
                        <div className="featured-letter__content">
                            <h3>{featured.title}</h3>
                            <div className="featured-letter__details">
                                <p>{featured.summary}</p>
                                <span className="featured-letter__action">{featured.cta} <i aria-hidden="true">→</i></span>
                            </div>
                        </div>
                    </a>

                </section>

                <section className="investor-archive" id="announcements" aria-labelledby="all-investor-materials">
                    <div className="investor-archive__heading">
                        <div>
                            <h2 id="all-investor-materials">All investor materials</h2>
                            <p>Browse announcements, letters, decks and reference materials.</p>
                        </div>
                        <span>{`Updated ${investorCentre.updated}`}</span>
                    </div>

                    <div className="archive-controls" aria-label="Filter investor materials">
                        <label className="archive-search">
                            <span className="investor-sr-only">Search investor materials</span>
                            <input
                                type="search"
                                placeholder="Search titles"
                                data-archive-search=""
                                value={query}
                                onChange={event => setQuery(event.target.value)}
                            />
                        </label>
                        <label>
                            <span className="investor-sr-only">Filter by type</span>
                            <select data-archive-kind="" value={kind} onChange={event => setKind(event.target.value)}>
                                <option value="all">All types</option>
                                {archiveKinds.map(archiveKind => (
                                    <option key={archiveKind} value={archiveKind.toLowerCase()}>{archiveKind}</option>
                                ))}
                            </select>
                        </label>
                        <p className="archive-count" aria-live="polite"><strong data-archive-count="">{shownCount}</strong> items</p>
                    </div>

                    <div className="archive-list" data-archive-list="">
                        <div className="archive-row archive-row--heading" aria-hidden="true">
                            <span>Date</span><span>Title</span><span>Format</span>
                        </div>
                        {archiveItems.map((item, index) => (
                            <article
                                key={item.href}
                                className="archive-row"
                                data-archive-item=""
                                data-kind={item.kind.toLowerCase()}
                                hidden={!shown[index]}
                            >
                                <time dateTime={item.dateIso || undefined}>{item.date}</time>
                                <div className="archive-row__title">
                                    <a href={item.href}>{item.title}</a>
                                    <small>{item.readTime || item.detail}</small>
                                </div>
                                <div className="archive-row__format">
                                    {item.pdfHref
                                        ? <a href={item.pdfHref} download>PDF <span aria-hidden="true">↓</span></a>
                                        : <a href={item.href}>Read <span aria-hidden="true">→</span></a>}
                                </div>
                            </article>
                        ))}
                    </div>
                    <p className="archive-empty" data-archive-empty="" hidden={shownCount !== 0}>No investor materials match those filters.</p>
                </section>
            </div>

            {SHOW_METRICS && <InvestorMetrics />}

            <section className="investor-explore investor-shell" aria-label="Network and research resources">
                <div className="explore-panel">
                    <h2>Explore the network</h2>
                    <p>Follow network performance on the UR Dashboard and view subnet market data through TaoMarketCap and taostats.</p>
                    <nav className="network-links" aria-label="Network data sources">
                        <a href={externalResources.dashboard} target="_blank" rel="noopener noreferrer">
                            UR Dashboard <span aria-hidden="true">↗</span>
                        </a>
                        <a className="network-brand network-brand--tmc" href={externalResources.taoMarketCap} target="_blank" rel="noopener noreferrer">
                            <img src="/investors/taomarketcap.svg" alt="TaoMarketCap" />
                            <span aria-hidden="true">↗</span>
                        </a>
                        <a className="network-brand network-brand--taostats" href={externalResources.taostats} target="_blank" rel="noopener noreferrer">
                            <img src="/investors/taostats.svg" alt="taostats" />
                            <span aria-hidden="true">↗</span>
                        </a>
                    </nav>
                </div>

                <div className="explore-panel explore-panel--research">
                    <h2>Research UR</h2>
                    <p>Ask ChatGPT or Claude about UR's products, research, subnet development, published updates and public materials.</p>
                    <nav className="research-links" aria-label="Research UR with AI">
                        <a href={externalResources.chatgpt} target="_blank" rel="noopener noreferrer">
                            <img src="/investors/openai.svg" alt="" width="16" height="16" />
                            ChatGPT
                        </a>
                        <a href={externalResources.claude} target="_blank" rel="noopener noreferrer">
                            <img src="/investors/claude.svg" alt="" width="16" height="16" />
                            Claude
                        </a>
                    </nav>
                </div>
            </section>

            <aside className="investor-disclosure investor-shell" aria-label="Investment disclaimer">
                This material is provided for informational purposes only and does not constitute an offer, solicitation or investment advice.
            </aside>
        </div>
    );
}

// Kept behind SHOW_METRICS: the figures are a snapshot, not a feed.
function InvestorMetrics() {
    const sectionRef = useRef(null);

    // Count each figure up from zero when the section scrolls into view;
    // reduced motion, or no IntersectionObserver, prints the final values.
    useEffect(() => {
        const section = sectionRef.current;
        const counters = Array.from(section.querySelectorAll('[data-count]'));
        const format = (value, decimals) => value.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
        const targetOf = (element) => [Number(element.dataset.count), Number(element.dataset.decimals || 0)];
        const finish = (element) => {
            const [value, decimals] = targetOf(element);
            element.textContent = format(value, decimals);
        };
        let cancelled = false;
        const animate = (element) => {
            const [value, decimals] = targetOf(element);
            const duration = 900;
            const started = performance.now();
            const frame = (now) => {
                if (cancelled) return;
                const progress = Math.min((now - started) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                element.textContent = format(value * eased, decimals);
                if (progress < 1) requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        };

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
            counters.forEach(finish);
            return undefined;
        }
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            counters.forEach(animate);
            observer.disconnect();
        }, { threshold: 0.3 });
        observer.observe(section);
        return () => {
            cancelled = true;
            observer.disconnect();
        };
    }, []);

    return (
        <section className="investor-metrics investor-shell" aria-labelledby="metrics-title" ref={sectionRef}>
            <h2 id="metrics-title">Metrics</h2>
            <div className="investor-metric-grid">
                {metrics.map(metric => (
                    <article className="investor-metric" key={metric.label}>
                        <p className="investor-metric__label">{metric.label}</p>
                        <p className="investor-metric__value">
                            <strong>
                                <span data-count={metric.value} data-decimals={metric.decimals}>{metric.value}</span>
                                {metric.suffix && <span className="investor-metric__suffix"> {metric.suffix}</span>}
                            </strong>
                            {metric.usd && <small>({metric.usd})</small>}
                        </p>
                        <p className="investor-metric__context">{metric.context}</p>
                        <p className="investor-metric__change">{metric.change}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}
