/**
 * The docs search, shared by the SPA's explorer (components/Explorer.jsx),
 * which builds the index from the corpus it bundles, and the static build,
 * which publishes the index as /docs-search.json (astro/src/pages/
 * docs-search.json.js) for its search island to fetch on first use.
 *
 * An entry is one listed document: its slug, the URL it is published at, its
 * title, a subtitle for the result list (that URL), and a haystack of the
 * lowercased words a reader sees (title, source path and text). A query
 * matches when every whitespace-separated token occurs in the haystack, so
 * the haystack keeps each distinct word once: a token has no whitespace, so it
 * occurs in the text exactly when it occurs within one of its words.
 */

/** The search index of `docs` (lib/docs.js entries); `hrefOf(doc)` is where a result leads. */
export function buildSearchIndex(docs, hrefOf) {
    return docs.map((d) => {
        const href = hrefOf(d);
        const words = new Set(`${d.title} ${d.path} ${d.text}`.toLowerCase().split(/\s+/).filter(Boolean));
        return { slug: d.slug, href, title: d.title, subtitle: href, haystack: [...words].join(' ') };
    });
}

/**
 * Score an entry against the query: each token must appear at least once for
 * the entry to match, with extra weight for matches in the title and the
 * subtitle.
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

/** The best 24 matches for `query`, best first, or null for an empty query (show the list instead). */
export function searchDocs(index, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return null;
    return index
        .map((entry) => ({ entry, score: scoreEntry(entry, q) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 24)
        .map((r) => r.entry);
}
