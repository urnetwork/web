/**
 * React island wrapper for the Nav component.
 * Provides LanguageProvider context and passes stats through.
 */
import React from 'react';
import Nav from '@react/components/Nav.jsx';
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

export default function NavIsland({ stats, activeRoute }) {
    const disclaimerVisible = useDisclaimerVisible();

    return (
        <LanguageProvider>
            <Nav stats={stats || INITIAL_STATS} disclaimerVisible={disclaimerVisible} activeRoute={activeRoute} />
        </LanguageProvider>
    );
}
