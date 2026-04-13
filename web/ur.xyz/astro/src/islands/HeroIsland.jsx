/**
 * React island for the Hero simulation + StatsPanel + Nav stats bridge.
 * This is the main interactive island on the home page.
 */
import React, { useCallback, useState } from 'react';
import Nav from '@react/components/Nav.jsx';
import Hero from '@react/components/Hero.jsx';
import StatsPanel from '@react/components/StatsPanel.jsx';
import { useDisclaimerVisible } from '@react/components/Disclaimer.jsx';
import { LanguageProvider } from '@react/i18n/index.jsx';

const INITIAL_STATS = {
    totalFeesUr: 0,
    dataPB: 0,
    displayedNetworks: 250000,
    blockHeight: 0,
    totalSupply: 10000000,
    urDistributed: 0,
    urAbsorbed: 0,
    totalHeldUr: 0
};

export default function HeroIsland() {
    const [stats, setStats] = useState(INITIAL_STATS);
    const handleStats = useCallback(next => setStats(next), []);
    const disclaimerVisible = useDisclaimerVisible();

    return (
        <LanguageProvider>
            <Nav stats={stats} disclaimerVisible={disclaimerVisible} />
            <Hero onStats={handleStats} />
            <StatsPanel stats={stats} anchorId="whitepaper" />
        </LanguageProvider>
    );
}
