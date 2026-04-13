import React, { useEffect } from 'react';
import Explorer from './Explorer';
import Disclaimer, { useDisclaimerVisible } from './Disclaimer';
import Nav from './Nav';
import Footer from './Footer';
import { Markdown } from '../lib/markdown.jsx';
import { docs as ALL_DOCS, docGroups, findDoc } from '../lib/docs';
import { buildPath, navigate, useRoute } from '../router';
import { useLanguage } from '../i18n';

const INITIAL_STATS = {
    totalFeesUr: 0,
    dataPB: 0,
    displayedNetworks: 250000,
    blockHeight: 0,
    totalSupply: 10000000,
    urDistributed: 0,
    urAbsorbed: 0,
    totalHeldUr: 0
};

/**
 * DocsExplorer
 *
 * Renders the /docs page. The shared `<Explorer>` chrome handles the
 * sidebar and search; this component owns the right pane: a landing
 * placeholder when no slug is selected, otherwise the markdown body of
 * the requested doc.
 */
export default function DocsExplorer({ activeRoute } = {}) {
    const route = useRoute();
    const { code } = useLanguage();

    const doc = route.slug ? findDoc(route.slug) : null;

    // If the URL points at a slug we don't have a doc for, fall back to
    // the docs landing rather than rendering nothing. We rewrite the URL
    // so refreshing the page also lands somewhere sensible.
    useEffect(() => {
        if (route.slug && !doc) {
            navigate(buildPath({ name: 'docs', slug: null }, code));
        }
    }, [route.slug, doc, code]);

    const disclaimerVisible = useDisclaimerVisible();

    return (
        <div className="app">
            <Disclaimer visible={disclaimerVisible} />
            <Nav stats={INITIAL_STATS} disclaimerVisible={disclaimerVisible} activeRoute={activeRoute} />
            <Explorer kind="docs">
                {!doc ? <DocsLanding /> : <DocBody doc={doc} />}
            </Explorer>
            <Footer />
        </div>
    );
}

function DocsLanding() {
    return (
        <>
            <header className="explorer-page-header">
                <span className="explorer-page-eyebrow">Documentation</span>
                <h1 className="explorer-page-title">URnetwork docs</h1>
                <p className="explorer-page-meta">
                    {ALL_DOCS.length} documents across {docGroups.length} sections.
                    Pick one from the sidebar, or jump straight to the API reference.
                </p>
            </header>

            <div className="md">
                <p className="md-p">
                    Welcome to the URnetwork docs. Everything that explains how
                    to hack on, run, or extend the network lives here, organised
                    by topic on the left. Use the search box to jump straight to
                    a doc or an API endpoint by name.
                </p>
                <p className="md-p">
                    The API reference is rendered from the OpenAPI document we
                    publish alongside the protocol. Open it from the top of the
                    sidebar.
                </p>
            </div>
        </>
    );
}

function DocBody({ doc }) {
    // Reset scroll on doc change so a long previous doc doesn't strand
    // the visitor in the middle of the new one.
    useEffect(() => {
        const main = document.querySelector('.explorer-main');
        if (main) main.scrollTop = 0;
        window.scrollTo(0, 0);
    }, [doc.slug]);

    return (
        <article>
            <header className="explorer-page-header">
                <span className="explorer-page-eyebrow">{doc.group === '_root' ? 'Docs' : prettyGroup(doc.group)}</span>
                <h1 className="explorer-page-title">{doc.title}</h1>
                <p className="explorer-page-meta">{doc.path}</p>
            </header>
            <Markdown source={doc.content} baseHref={`/docs/${doc.path}`} />
        </article>
    );
}

function prettyGroup(g) {
    return g
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}
