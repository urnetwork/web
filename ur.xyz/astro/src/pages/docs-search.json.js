// /docs-search.json: the docs search index the static docs pages' search box
// fetches on first use (islands/DocsSearchIsland.jsx). The listed documents,
// each leading to the URL it is published at (an unlisted document is not
// searchable, as in the sidebar).
import { listedDocs } from '@react/lib/docs.js';
import { docPath } from '@react/lib/docs-shared.js';
import { buildSearchIndex } from '@react/lib/docs-search.js';

export function GET() {
    const index = buildSearchIndex(listedDocs, (d) => docPath(d.slug));
    return new Response(JSON.stringify(index), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
}
