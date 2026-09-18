/**
 * React island for the operator directory table on the operators page —
 * each operator's stats are read live from its public feed.
 */
import React from 'react';
import OperatorsDirectory from '@react/components/OperatorsDirectory.jsx';
import { LanguageProvider } from '@react/i18n/index.jsx';

export default function OperatorsDirectoryIsland({ lang }) {
    return (
        <LanguageProvider initialLang={lang}>
            <OperatorsDirectory />
        </LanguageProvider>
    );
}
