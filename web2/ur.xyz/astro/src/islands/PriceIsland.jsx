/**
 * React island for the published price page. The tier table needs the
 * client to resolve live USD equivalents from the subnet's pool feed.
 */
import React from 'react';
import PriceSection from '@react/components/PriceSection.jsx';
import { LanguageProvider } from '@react/i18n/index.jsx';

export default function PriceIsland({ lang }) {
    return (
        <LanguageProvider initialLang={lang}>
            <PriceSection />
        </LanguageProvider>
    );
}
