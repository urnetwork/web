/**
 * React island for the cinematic launch-film overlay on the home page.
 *
 * Auto-opens on a visitor's first view (localStorage remembers a dismissal)
 * and re-opens whenever the URL hash is #launch-video — which is where the
 * static footer's "Launch video" link on every page points.
 */
import React from 'react';
import LaunchVideo from '@react/components/LaunchVideo.jsx';
import { LanguageProvider } from '@react/i18n/index.jsx';

export default function LaunchVideoIsland({ lang }) {
    return (
        <LanguageProvider initialLang={lang}>
            <LaunchVideo />
        </LanguageProvider>
    );
}
