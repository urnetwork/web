/**
 * React island for the Docs Explorer page.
 * Fully client-rendered since it has search, sidebar, and dynamic content.
 */
import React from 'react';
import DocsExplorer from '@react/components/DocsExplorer.jsx';
import { LanguageProvider } from '@react/i18n/index.jsx';

export default function DocsIsland({ activeRoute, lang, initialSlug = null, images = null, updated = null }) {
    return (
        <LanguageProvider initialLang={lang}>
            <DocsExplorer activeRoute={activeRoute} initialSlug={initialSlug} images={images} updated={updated} />
        </LanguageProvider>
    );
}
