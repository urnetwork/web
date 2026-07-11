/**
 * React island wrapper for the Nav component.
 * Provides LanguageProvider context.
 */
import React from 'react';
import Nav from '@react/components/Nav.jsx';
import { useDisclaimerVisible } from '@react/components/Disclaimer.jsx';
import { LanguageProvider } from '@react/i18n/index.jsx';

export default function NavIsland({ activeRoute, lang }) {
    const disclaimerVisible = useDisclaimerVisible();

    return (
        <LanguageProvider initialLang={lang}>
            <Nav disclaimerVisible={disclaimerVisible} activeRoute={activeRoute} />
        </LanguageProvider>
    );
}
