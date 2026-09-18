// Slug + visibility rules for the docs corpus, in ONE place. Three consumers
// used to carry verbatim copies with only a comment keeping them in sync:
// react/src/lib/docs.js (routing), scripts/generate-agent-assets.mjs (the
// docs-md mirror + llms.txt), and now astro.config.mjs (sitemap lastmod).
// Pure code — no data imports — so any of them can load it.

export const HIDDEN_DOC_SLUGS = new Set([
    'edgeos',
    'routeros',
    'rpi',
    'economic-model/economic-model',
    'cli',
    'archive/whitepaper',
    'mcp/SKILL',
    'mcp/SKILL2',
    'router/testing-notes',
    'changelog/2024-10-31-inspect/inspect',
    'changelog/2024-10-31-tether/tether',
    'changelog/2024-10-31-update-1/update-1',
]);

export function slugFor(filePath) {
    // Drop the extension; collapse README.md into the parent directory.
    let s = filePath.replace(/\.md$/i, '');
    s = s.replace(/\/README$/i, '');
    if (s === 'README') s = '';
    return s;
}
