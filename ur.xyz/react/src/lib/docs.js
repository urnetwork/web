import rawDocs from 'virtual:ur-docs';
import { extractTitle, markdownToText } from './markdown.jsx';
import {
    DOC_ORDER,
    DOC_PAGE_PATHS,
    HIDDEN_DOC_SLUGS,
    UNLISTED_DOC_SLUGS,
    docPath,
    slugFor,
    splitFrontMatter,
} from './docs-shared.js';

/**
 * The docs registry, built from the virtual module emitted at build time by
 * `urXyzContent` in vite.config.js. Each entry exposes:
 *
 *   slug:    URL-safe identifier (e.g. "miner", "support/delete")
 *   path:    original on-disk relative path inside docs/
 *   href:    the URL the document is published at (/docs/<slug>, or its own
 *            page for the documents in DOC_PAGE_PATHS)
 *   title:   first H1 in the markdown, or a humanised file name fallback
 *   meta:    the document's front matter (title / description overrides)
 *   content: the markdown, front matter removed
 *   text:    plain-text version used by the search index
 *
 * The corpus is four documents, the three role guides and the litepaper, in
 * DOC_ORDER (docs-shared.js). The legal documents, published as their own
 * pages, follow them in the sidebar. An unlisted document (UNLISTED_DOC_SLUGS)
 * is in `docs`, so its page and markdown twin build and findDoc resolves it,
 * but in none of the lists.
 */

const RAW_DOCS = Array.isArray(rawDocs) ? rawDocs : [];

const DOC_TITLE_OVERRIDES = {
    'legal/terms': 'Terms of Service',
    'legal/privacy': 'Privacy Policy',
    'legal/vdp': 'VDP'
};

function titleFromPath(filePath) {
    const base = filePath.replace(/\.md$/i, '').split('/').pop();
    if (base.toLowerCase() === 'readme') {
        const parent = filePath.split('/').slice(-2, -1)[0];
        return parent ? humanise(parent) : 'Overview';
    }
    return humanise(base);
}

function humanise(s) {
    return s
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

const BY_SLUG = new Map();
for (const { path, content: source } of RAW_DOCS) {
    const slug = slugFor(path);
    // The root README is the repository's index, not a page. The first file
    // per slug wins which, in the virtual module's walk order, is the README
    // before any numbered companion file in the same folder.
    if (!slug || BY_SLUG.has(slug) || HIDDEN_DOC_SLUGS.has(slug)) continue;
    const { meta, body } = splitFrontMatter(source);
    BY_SLUG.set(slug, {
        slug,
        path,
        href: docPath(slug),
        title: DOC_TITLE_OVERRIDES[slug] || extractTitle(body, titleFromPath(path)),
        meta,
        content: body,
        text: markdownToText(body)
    });
}

/** Every published document, the unlisted ones included, by slug. */
export const docs = [...BY_SLUG.values()].sort((a, b) => a.slug.localeCompare(b.slug));

/**
 * The documents the site lists, in list order: DOC_ORDER, then any other
 * document under /docs alphabetically, then the documents published as their
 * own pages (the legal documents).
 */
export const listedDocs = (() => {
    const listed = docs.filter(d => !UNLISTED_DOC_SLUGS.has(d.slug));
    const ordered = DOC_ORDER.map(slug => BY_SLUG.get(slug)).filter(Boolean);
    const rest = listed.filter(d => !DOC_ORDER.includes(d.slug) && !DOC_PAGE_PATHS[d.slug]);
    const ownPage = listed.filter(d => DOC_PAGE_PATHS[d.slug]);
    return [...ordered, ...rest, ...ownPage].filter(d => !UNLISTED_DOC_SLUGS.has(d.slug));
})();

/** The listed documents under /docs: what the landing and the docs index structured data list. */
export const docsIndex = listedDocs.filter(d => !DOC_PAGE_PATHS[d.slug]);

/** The sidebar: the corpus as one flat list, then the legal documents. */
export const docGroups = [
    { id: 'docs', label: 'Docs', docs: docsIndex },
    { id: 'legal', label: 'Legal', docs: listedDocs.filter(d => DOC_PAGE_PATHS[d.slug]) },
].filter(group => group.docs.length);

export function findDoc(slug) {
    if (slug == null) return null;
    return BY_SLUG.get(slug) || null;
}
