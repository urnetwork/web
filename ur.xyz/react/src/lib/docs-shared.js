// Slug, visibility and publication rules for the docs corpus, in ONE place.
// Its consumers used to carry verbatim copies with only a comment keeping them
// in sync: react/src/lib/docs.js (routing), scripts/generate-agent-assets.mjs
// (the docs-md mirror) and astro/scripts/page-dates.mjs (dating a new page).
// Pure code — no data imports — so any of them can load it.

// Documents the corpus holds but the site does not publish: no page, no stub,
// no markdown twin. Empty since the 2026-09-25 restructure removed the retired
// documents instead of hiding them; a document dropped into docs/ that must not
// publish goes here.
export const HIDDEN_DOC_SLUGS = new Set([]);

// The corpus, in the order the sidebar, the landing and the llms files list
// it: the three role guides, then the litepaper. A document not named here is
// listed after them, so a new document is never silently missing.
export const DOC_ORDER = Object.freeze(['miner', 'validator', 'operator', 'litepaper']);

// Published (the page, its /<lang>/docs stub and its markdown twin) but listed
// nowhere on the site: not in the sidebar, the landing, the docs index
// structured data, search or the llms files. The account-deletion walkthrough
// is linked from the app-store listings, not from the site.
export const UNLISTED_DOC_SLUGS = new Set(['support/delete']);

export function slugFor(filePath) {
    // Drop the extension; collapse README.md into the parent directory.
    let s = filePath.replace(/\.md$/i, '');
    s = s.replace(/\/README$/i, '');
    if (s === 'README') s = '';
    return s;
}

// Documents in the corpus that are published as their own page rather than
// under /docs. The legal documents render at /terms, /privacy and /vdp (the
// generated react/src/data/legal.js); /docs/legal/* was a second, indexable
// copy of each. They stay in the docs sidebar and search, linking to their page,
// but get no /docs page, no /<lang>/docs stub and no docs-md twin.
export const DOC_PAGE_PATHS = Object.freeze({
    'legal/terms': '/terms',
    'legal/privacy': '/privacy',
    'legal/vdp': '/vdp',
});

/** The URL a document is published at. */
export function docPath(slug) {
    if (DOC_PAGE_PATHS[slug]) return DOC_PAGE_PATHS[slug];
    return slug ? `/docs/${slug}` : '/docs';
}

/**
 * Split optional YAML front matter off a document. Only flat `key: value`
 * lines are read: a document may set `title` (the whole <title>) and
 * `description` (the meta description) when the ones derived from its heading
 * and first paragraph read badly in a search result.
 */
export function splitFrontMatter(source) {
    const text = String(source || '').replace(/\r\n?/g, '\n');
    const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!m) return { meta: {}, body: text };
    const meta = {};
    for (const line of m[1].split('\n')) {
        const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
        if (!kv) continue;
        meta[kv[1]] = kv[2].trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
    }
    return { meta, body: text.slice(m[0].length) };
}
