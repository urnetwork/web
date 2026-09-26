import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import {
    LanguageProvider,
    resolveInitialLang,
    applyHtmlAttributes
} from './i18n';

// Resolve the visitor's language *before* React mounts so the very
// first paint already has the correct <html lang> / <html dir>. When the
// resolution moves the URL — a stored or browser language adds its /<lang>
// prefix to a translated page, and an English-only page drops one — sync it
// via replaceState (no extra history entry), keeping the page itself.
const initial = resolveInitialLang();
applyHtmlAttributes(initial.code);
if (initial.path !== window.location.pathname) {
    window.history.replaceState(null, '', initial.path + window.location.search + window.location.hash);
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <LanguageProvider>
            <App />
        </LanguageProvider>
    </React.StrictMode>
);
