import React, { useMemo, useState } from 'react';
import './Explorer.css';
import { listedDocs, docGroups } from '../lib/docs';
import { DOC_PAGE_PATHS } from '../lib/docs-shared';
import { buildSearchIndex, searchDocs } from '../lib/docs-search';
import { buildPath, navigate, useRoute } from '../router';
import { useLanguage } from '../i18n';

/**
 * Where a document lives for a reader in `code`: /docs/<slug> (with the
 * language prefix the SPA routes), or the document's own page for the ones
 * published outside /docs (the legal documents, English-only at /terms, …).
 */
export function docHref(doc, code) {
    return DOC_PAGE_PATHS[doc.slug] || buildPath({ name: 'docs', slug: doc.slug }, code);
}

/** A click the page should route itself: not a new-tab, new-window or download click. */
export function isPlainClick(e) {
    return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/**
 * Explorer
 *
 * The two-pane chrome of /docs. The left rail is the sidebar (search input
 * and the grouped document list); the right pane is whatever page body the
 * caller passes as `children`. The static build renders the same markup
 * without React (astro/src/components/DocsShell.astro) and searches the same
 * index (lib/docs-search.js), published as /docs-search.json.
 *
 *   • `children`     — main pane content.
 *   • `initialSlug`  — the document the page was rendered for. During SSR the
 *                      router sees no URL, so the sidebar marks this one as
 *                      the current page; in the browser the URL wins.
 */
export default function Explorer({ children, initialSlug = null }) {
    const route = useRoute();
    const { code, t } = useLanguage();
    const [query, setQuery] = useState('');
    // On mobile the sidebar is collapsed by default so the content is the
    // first thing you see; this toggles it open.
    const [navOpen, setNavOpen] = useState(false);

    // what the sidebar lists (an unlisted document is not searchable either)
    const searchIndex = useMemo(() => buildSearchIndex(listedDocs, d => docHref(d, code)), [code]);

    const results = useMemo(() => searchDocs(searchIndex, query), [query, searchIndex]);

    const onPickDoc = (doc) => {
        setNavOpen(false);
        navigate(docHref(doc, code));
    };
    const onPickResult = (entry) => {
        onPickDoc(entry);
        setQuery('');
    };

    const activeDocSlug = route.slug ?? initialSlug ?? '';

    return (
        <div className={`explorer ${navOpen ? 'sidebar-open' : ''}`}>
            {/* Mobile-only handle: the sidebar is collapsed until tapped so the
                document is visible on load instead of a wall of nav. */}
            <button
                type="button"
                className="explorer-sidebar-toggle"
                aria-expanded={navOpen}
                aria-controls="explorer-sidebar"
                onClick={() => setNavOpen(o => !o)}
            >
                <span className="explorer-sidebar-toggle-label">
                    {t.nav.browseDocs} &middot; {t.nav.search}
                </span>
                <span className="explorer-sidebar-toggle-icon" aria-hidden="true">
                    {navOpen ? '✕' : '☰'}
                </span>
            </button>

            <aside id="explorer-sidebar" className="explorer-sidebar" aria-label="Documentation navigation">
                <div className="explorer-search">
                    <input
                        type="search"
                        className="explorer-search-input"
                        placeholder="Search docs"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Search docs"
                    />
                </div>

                {results && (
                    <div className="explorer-results" role="listbox" aria-label="Search results">
                        {results.length === 0 && (
                            <div className="explorer-results-empty">No matches.</div>
                        )}
                        {results.map((r, i) => (
                            <button
                                key={`${r.slug}:${i}`}
                                type="button"
                                className="explorer-result"
                                onClick={() => onPickResult(r)}
                            >
                                <span className="explorer-result-kind kind-doc">DOC</span>
                                <span className="explorer-result-body">
                                    <span className="explorer-result-title">{r.title}</span>
                                    {r.subtitle && (
                                        <span className="explorer-result-subtitle">{r.subtitle}</span>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {!results && (
                    <nav className="explorer-nav" aria-label="Documentation sections">
                        {docGroups.map(group => (
                            <div key={group.id} className="explorer-group">
                                <div className="explorer-group-label">{group.label}</div>
                                <ul className="explorer-group-list">
                                    {group.docs.map(d => {
                                        const current = d.slug === activeDocSlug;
                                        // a real link (crawlable, opens in a new tab), routed in place on a plain click
                                        return (
                                            <li key={d.slug || '_root'}>
                                                <a
                                                    href={docHref(d, code)}
                                                    className={`explorer-doc-link ${current ? 'is-active' : ''}`}
                                                    aria-current={current ? 'page' : undefined}
                                                    onClick={(e) => {
                                                        if (!isPlainClick(e)) return;
                                                        e.preventDefault();
                                                        onPickDoc(d);
                                                    }}
                                                >
                                                    {d.title}
                                                </a>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </nav>
                )}
            </aside>

            <main className="explorer-main">
                {children}
            </main>
        </div>
    );
}
