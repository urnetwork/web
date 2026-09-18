import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import {
    LanguageProvider,
    resolveInitialLang,
    applyHtmlAttributes,
    pathForLang
} from './i18n';

// Resolve the visitor's language *before* React mounts so the very
// first paint already has the correct <html lang> / <html dir>. If the
// resolution chose a non-default language that the URL doesn't yet
// reflect, sync the URL via replaceState (no extra history entry).
const initial = resolveInitialLang();
applyHtmlAttributes(initial.code);
if (!initial.fromUrl && initial.code !== 'en') {
    window.history.replaceState(null, '', pathForLang(initial.code));
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <LanguageProvider>
            <App />
        </LanguageProvider>
    </React.StrictMode>
);
