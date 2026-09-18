import React from 'react';
import { useLanguage } from '../i18n';
import './HomepageIntro.css';

export default function HomepageIntro({ copy = null }) {
    const { t } = useLanguage();
    const content = copy || t;

    return (
        <section id="stats-anchor" className="homepage-intro" aria-labelledby="homepage-intro-title">
            <div className="homepage-intro-inner">
                <h1 id="homepage-intro-title">{content.nav.tagline}</h1>
                <p>{content.homepage.intro}</p>
            </div>
        </section>
    );
}
