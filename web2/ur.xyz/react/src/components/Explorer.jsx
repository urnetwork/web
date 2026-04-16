import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Explorer.css';
import { docs as ALL_DOCS, docGroups } from '../lib/docs';
import { buildPath, navigate, useRoute } from '../router';
import { useLanguage } from '../i18n';

/**
 * Explorer
 *
 * Two-pane chrome shared by `/docs` and `/api`. The left rail is the
 * sidebar (search input + grouped link list); the right pane is whatever
 * page-specific body the caller passes as `children`.
 *
 *   • `kind`         — 'docs' or 'api', selects the active sidebar entry
 *                      and which group list to render.
 *   • `apiGroups`    — sidebar groups for the API view (computed by the
 *                      OpenAPI normalizer in ApiExplorer).
 *   • `apiOperations`— flat operation list, for the search index.
 *   • `children`     — main pane content.
 *
 * The component owns the search index because both pages share it: a
 * docs result navigates to `/docs/<slug>` and an API result navigates
 * to `/api#<operationId>`.
 */
export default function Explorer({ kind, apiGroups, apiOperations, children }) {
    const route = useRoute();
    const { code } = useLanguage();
    const [query, setQuery] = useState('');

    const searchIndex = useMemo(
        () => buildSearchIndex(ALL_DOCS, apiOperations || []),
        [apiOperations]
    );

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return null;
        return searchIndex
            .map(entry => ({ entry, score: scoreEntry(entry, q) }))
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 24)
            .map(r => r.entry);
    }, [query, searchIndex]);

    const onPickDoc = (slug) => {
        navigate(buildPath({ name: 'docs', slug }, code));
    };
    const onPickApi = (anchor) => {
        navigate(buildPath({ name: 'api' }, code));
        // Defer to next paint so the new page mounts before we scroll.
        requestAnimationFrame(() => {
            const el = document.getElementById(anchor);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };
    const onPickResult = (entry) => {
        if (entry.kind === 'doc') onPickDoc(entry.slug);
        else onPickApi(entry.anchor);
        setQuery('');
    };

    const isApiActive = kind === 'api';
    const activeDocSlug = kind === 'docs' ? (route.slug || '') : null;

    return (
        <div className="explorer">
            <aside className="explorer-sidebar" aria-label="Documentation navigation">
                <div className="explorer-search">
                    <input
                        type="search"
                        className="explorer-search-input"
                        placeholder="Search docs and API"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Search docs and API"
                    />
                </div>

                {results && (
                    <div className="explorer-results" role="listbox" aria-label="Search results">
                        {results.length === 0 && (
                            <div className="explorer-results-empty">No matches.</div>
                        )}
                        {results.map((r, i) => (
                            <button
                                key={`${r.kind}:${r.kind === 'doc' ? r.slug : r.anchor}:${i}`}
                                type="button"
                                className="explorer-result"
                                onClick={() => onPickResult(r)}
                            >
                                <span className={`explorer-result-kind kind-${r.kind}`}>
                                    {r.kind === 'doc' ? 'DOC' : r.method}
                                </span>
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
                        <button
                            type="button"
                            className={`explorer-link explorer-link-api ${isApiActive ? 'is-active' : ''}`}
                            onClick={() => navigate(buildPath({ name: 'api' }, code))}
                        >
                            <span className="explorer-link-eyebrow">API</span>
                            <span className="explorer-link-title">REST reference</span>
                        </button>

                        {kind === 'api' && Array.isArray(apiGroups) && apiGroups.map(group => (
                            <div key={group.id} className="explorer-group">
                                <div className="explorer-group-label">{group.label}</div>
                                <ul className="explorer-group-list">
                                    {group.operations.map(op => (
                                        <li key={op.id}>
                                            <a
                                                href={`#${op.id}`}
                                                className="explorer-group-link"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    onPickApi(op.id);
                                                }}
                                            >
                                                <span className={`explorer-method method-${op.method.toLowerCase()}`}>{op.method}</span>
                                                <span className="explorer-op-path">{op.path}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        {docGroups.map(group => (
                            <div key={group.id} className="explorer-group">
                                <div className="explorer-group-label">{group.label}</div>
                                <ul className="explorer-group-list">
                                    {group.docs.map(d => (
                                        <li key={d.slug || '_root'}>
                                            <button
                                                type="button"
                                                className={`explorer-doc-link ${kind === 'docs' && d.slug === activeDocSlug ? 'is-active' : ''}`}
                                                onClick={() => onPickDoc(d.slug)}
                                            >
                                                {d.title}
                                            </button>
                                        </li>
                                    ))}
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

/**
 * Build a flat search index. Each entry is either a doc (slug, title,
 * preview text) or an API operation (method, path, summary, description).
 * The renderer hands these straight to the result list so we don't need
 * to re-resolve identifiers later.
 */
function buildSearchIndex(docs, ops) {
    const out = [];
    for (const d of docs) {
        out.push({
            kind: 'doc',
            slug: d.slug,
            title: d.title,
            subtitle: d.path,
            haystack: `${d.title} ${d.path} ${d.text}`.toLowerCase()
        });
    }
    for (const op of ops) {
        const desc = (op.description || '').replace(/\s+/g, ' ').trim();
        out.push({
            kind: 'api',
            anchor: op.id,
            method: op.method,
            title: op.path,
            subtitle: op.operationId || (desc.length > 80 ? desc.slice(0, 78) + '…' : desc),
            haystack: `${op.method} ${op.path} ${op.operationId || ''} ${desc}`.toLowerCase()
        });
    }
    return out;
}

/**
 * Score an entry against the search query. Each whitespace-separated
 * token must appear at least once for the entry to match; extra weight
 * is awarded for matches in the title and for token-prefix matches in
 * the path / operation id, which is what most people search for.
 */
function scoreEntry(entry, q) {
    const tokens = q.split(/\s+/).filter(Boolean);
    if (!tokens.length) return 0;
    let score = 0;
    for (const tok of tokens) {
        if (!entry.haystack.includes(tok)) return 0;
        if (entry.title.toLowerCase().includes(tok)) score += 4;
        if (entry.subtitle && entry.subtitle.toLowerCase().includes(tok)) score += 2;
        score += 1;
    }
    return score;
}
