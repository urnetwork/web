import React from 'react';
import URSimulation from '../URSimulation';
import './Hero.css';

/**
 * Hero
 *
 * Full-bleed simulation that lives directly under the navigation header.
 * The StatsPanel is rendered separately at the App level so it can detach
 * and animate independently as the user scrolls.
 */
export default function Hero({ onStats }) {
    return (
        <section className="hero" aria-label="Network simulation">
            <URSimulation onStats={onStats} />
            <div className="hero-fade" aria-hidden="true" />
        </section>
    );
}
