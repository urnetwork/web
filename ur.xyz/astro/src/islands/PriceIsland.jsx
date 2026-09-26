/**
 * React island for the published price page (/price). The page is built with
 * the sheet from price/price.yml, so the tier table and the initial-period
 * note are in the HTML; the client refreshes the sheet from /price.yml and
 * resolves the live USD equivalents from the operators' feeds.
 */
import React from 'react';
import PriceSection from '@react/components/PriceSection.jsx';
import { LanguageProvider } from '@react/i18n/index.jsx';

export default function PriceIsland({ lang, initialSheet = null }) {
    return (
        <LanguageProvider initialLang={lang}>
            <PriceSection initialSheet={initialSheet} />
        </LanguageProvider>
    );
}
