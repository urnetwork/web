import React from 'react';
import URSimulation from '../URSimulation';
import { useLanguage } from '../i18n';
import './Hero.css';

/**
 * Hero
 *
 * Full-bleed simulation that lives directly under the navigation header.
 * The StatsPanel is rendered separately at the App level so it can detach
 * and animate independently as the user scrolls.
 */
export default function Hero({ block, network }) {
    const { t } = useLanguage();
    return (
        <section className="hero" aria-label={t.sim.heroAria}>
            <URSimulation block={block} network={network} />
        </section>
    );
}
