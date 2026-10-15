/**
 * React island for the Hero simulation + StatsPanel + Nav.
 * This is the main interactive island on the home page.
 *
 * The operator-feed totals are fetched here and fed to both the
 * simulation (its epoch toast) and the stats panel; the panel also takes
 * the clock its settlement epoch is read from.
 */
import React from 'react';
import Nav from '@react/components/Nav.jsx';
import Hero from '@react/components/Hero.jsx';
import StatsPanel from '@react/components/StatsPanel.jsx';
import { useClock, useNetworkTotals } from '@react/lib/network.js';
import { useDisclaimerVisible } from '@react/components/Disclaimer.jsx';
import { LanguageProvider } from '@react/i18n/index.jsx';

export default function HeroIsland({ lang }) {
    const now = useClock();
    const network = useNetworkTotals();
    const disclaimerVisible = useDisclaimerVisible();

    return (
        <LanguageProvider initialLang={lang}>
            <Nav disclaimerVisible={disclaimerVisible} />
            <Hero network={network} />
            <StatsPanel
                now={now}
                network={network}
                anchorId="stats-anchor"
                disclaimerVisible={disclaimerVisible}
            />
        </LanguageProvider>
    );
}
