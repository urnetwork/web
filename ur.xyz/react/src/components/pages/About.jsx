import React, { useEffect, useRef } from 'react';
import Section from '../Section';
import { contributors } from '../../data/contributors';
import './About.css';

/**
 * AboutPage — the /about page body.
 *
 * Renders only what goes inside <main class="section-page">: the SPA's
 * SectionPage (App.jsx) and the Astro page (astro/src/pages/about.astro)
 * both provide the Disclaimer + Nav + Footer shell around it, so the two
 * renders share one source. The page is English-only, so no i18n lookup.
 *
 * Nothing here touches window/document during render — Astro server-renders
 * the component; the scroll-reveal behaviour lives in the effect below.
 */
export default function AboutPage({ route }) {
    const rootRef = useRef(null);

    // Scroll-reveal for the contributor rows: outside reduced motion, the
    // rows start hidden (html.has-reveal-motion, see About.css) and fade up
    // as they enter the viewport. Ported from the page's former inline script.
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;
        const revealItems = [...root.querySelectorAll('[data-reveal]')];
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion || !('IntersectionObserver' in window) || revealItems.length === 0) return undefined;

        document.documentElement.classList.add('has-reveal-motion');
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        revealItems.forEach((item) => revealObserver.observe(item));

        return () => {
            revealObserver.disconnect();
            // the SPA keeps the document across routes; leave no page class behind
            document.documentElement.classList.remove('has-reveal-motion');
        };
    }, []);

    return (
        <div className="about-page" ref={rootRef}>
            <Section id="about-ur" eyebrow="Protocol" title="About" headingLevel="h1">
                <div className="about-ur-copy">
                    <p>
                        UR is an open-source protocol for building private internet applications on a global network of independent bandwidth providers. The first application is live at <a href="https://ur.io" target="_blank" rel="noopener noreferrer">ur.io</a>, with more ways to use the network in development. We believe everyone has a right to privacy and strong encryption, and that the infrastructure protecting those rights should be open, resilient and accessible to all.
                    </p>
                </div>
            </Section>

            <Section id="core-contributors" eyebrow="People" title="Core Contributors">
                <div className="core-contributor-list" aria-label="UR Core Contributors">
                    {contributors.map((person, index) => (
                        <article key={person.id} className="core-contributor" data-reveal="">
                            <div className="core-contributor__portrait">
                                <img
                                    src={person.image}
                                    srcSet={person.imageSrcSet}
                                    sizes="(max-width: 520px) 72px, (max-width: 820px) 84px, 96px"
                                    alt={`${person.name}, ${person.role} at UR`}
                                    width="400"
                                    height="400"
                                    loading={index === 0 ? 'eager' : 'lazy'}
                                    decoding="async"
                                />
                            </div>
                            <div className="core-contributor__identity">
                                <h3>{person.name}</h3>
                                <p>{person.role}</p>
                                <a href={person.href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${person.name}'s ${person.platform} profile`}>
                                    {person.platform} <span aria-hidden="true">↗</span>
                                </a>
                            </div>
                            <p className="core-contributor__bio">{person.detail}</p>
                        </article>
                    ))}
                </div>
            </Section>

            <Section id="contribute" eyebrow="Contribute" title="Build UR with us">
                <div className="contribute-cta">
                    <p>UR is open source, with opportunities to contribute across the protocol, its applications and the network around them. If you want to contribute or explore joining the team, join us on Telegram.</p>
                    <a href="https://t.me/ursn25" target="_blank" rel="noopener noreferrer" aria-label="Join the UR community on Telegram">
                        <span>JOIN THE</span>
                        <span>COMMUNITY <i aria-hidden="true">↗</i></span>
                    </a>
                </div>
            </Section>
        </div>
    );
}
