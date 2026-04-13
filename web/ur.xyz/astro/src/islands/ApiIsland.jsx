/**
 * React island for the API Explorer page.
 * Fully client-rendered since it has search, sidebar, and interactive details.
 */
import React from 'react';
import ApiExplorer from '@react/components/ApiExplorer.jsx';
import { LanguageProvider } from '@react/i18n/index.jsx';

export default function ApiIsland({ activeRoute }) {
    return (
        <LanguageProvider>
            <ApiExplorer activeRoute={activeRoute} />
        </LanguageProvider>
    );
}
