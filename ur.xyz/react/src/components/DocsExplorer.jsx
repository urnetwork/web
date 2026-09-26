import React, { useEffect } from 'react';
import Explorer, { docHref, isPlainClick } from './Explorer';
import Disclaimer, { useDisclaimerVisible } from './Disclaimer';
import Nav from './Nav';
import Footer from './Footer';
import { Markdown } from '../lib/markdown.jsx';
import { docsIndex, findDoc } from '../lib/docs';
import { buildPath, navigate, useRoute } from '../router';
import { useLanguage } from '../i18n';

/**
 * DocsExplorer
 *
 * Renders the /docs page. The shared `<Explorer>` chrome handles the
 * sidebar and search; this component owns the right pane: a landing
 * placeholder when no slug is selected, otherwise the markdown body of
 * the requested doc.
 */
export default function DocsExplorer({ activeRoute, initialSlug = null } = {}) {
    const route = useRoute();
    const { code } = useLanguage();

    // During SSR the router has no window and resolves no slug — the static
    // build passes the page's own slug so the document body ships as HTML
    // instead of the landing placeholder. On the client the router wins.
    const slug = route.slug ?? initialSlug;
    const doc = slug ? findDoc(slug) : null;

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
            <Nav disclaimerVisible={disclaimerVisible} activeRoute={activeRoute} />
            <Explorer kind="docs" initialSlug={initialSlug}>
                {!doc ? <DocsLanding code={code} /> : <DocBody doc={doc} />}
            </Explorer>
            <Footer />
        </div>
    );
}

/**
 * The /docs landing: the corpus, one entry per document with its front-matter
 * description, in the sidebar's order (the three role guides, then the
 * litepaper). An unlisted document (docs-shared.js) is not here.
 */
function DocsLanding({ code }) {
    const follow = (href) => (e) => {
        if (!isPlainClick(e)) return;
        e.preventDefault();
        navigate(href);
    };
    return (
        <>
            <header className="explorer-page-header">
                <span className="explorer-page-eyebrow">Documentation</span>
                <h1 className="explorer-page-title">URnetwork docs</h1>
                <p className="explorer-page-meta">
                    How to take part in the UR privacy network on Bittensor SN25, one guide
                    per role, and the litepaper that explains the mechanism they take part in.
                    Every document is also served as markdown.
                </p>
            </header>

            <div className="md">
                {docsIndex.map(d => {
                    const href = docHref(d, code);
                    const id = `docs-index-${d.slug.replace(/[^a-z0-9]+/gi, '-')}`;
                    return (
                        <section key={d.slug} className="docs-index-entry" aria-labelledby={id}>
                            <h2 id={id} className="md-h md-h2">
                                <a className="md-link" href={href} onClick={follow(href)}>{d.title}</a>
                            </h2>
                            {d.meta.description && <p className="md-p">{d.meta.description}</p>}
                        </section>
                    );
                })}
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
                <span className="explorer-page-eyebrow">Docs</span>
                <h1 className="explorer-page-title">{doc.title}</h1>
                <p className="explorer-page-meta">{doc.path}</p>
            </header>
            {/* the header's h1 is the document's title: drop the markdown's own
                "# Title" and nest the remaining headings beneath it */}
            <Markdown source={doc.content} baseHref={`/docs/${doc.path}`} dropTitle headingBase={1} />
        </article>
    );
}
