/**
 * React island for the Hero simulation + StatsPanel + Nav.
 * This is the main interactive island on the home page.
 *
 * The block clock and the operator-feed totals are fetched here and fed
 * to both the simulation (block toast) and the stats panel.
 */
import React from 'react';
import Nav from '@react/components/Nav.jsx';
import Hero from '@react/components/Hero.jsx';
import StatsPanel from '@react/components/StatsPanel.jsx';
import { useBlockClock, useNetworkTotals } from '@react/lib/network.js';
import { useDisclaimerVisible } from '@react/components/Disclaimer.jsx';
import { LanguageProvider } from '@react/i18n/index.jsx';

export default function HeroIsland({ lang }) {
    const block = useBlockClock();
    const network = useNetworkTotals();
    const disclaimerVisible = useDisclaimerVisible();

    return (
        <LanguageProvider initialLang={lang}>
            <Nav disclaimerVisible={disclaimerVisible} />
            <Hero block={block} network={network} />
            <StatsPanel
                block={block}
                network={network}
                anchorId="whitepaper"
                disclaimerVisible={disclaimerVisible}
            />
        </LanguageProvider>
    );
}
