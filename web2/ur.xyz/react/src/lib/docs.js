import rawDocs from 'virtual:ur-docs';
import { extractTitle, markdownToText } from './markdown.jsx';

/**
 * Build the docs registry from the virtual module emitted at build time
 * by `urXyzContent` in vite.config.js. Each entry exposes:
 *
 *   slug:    URL-safe identifier (e.g. "protocol/protocol-research")
 *   path:    original on-disk relative path inside docs/
 *   title:   first H1 in the markdown, or a humanised file name fallback
 *   group:   top-level folder name, used to bucket entries in the sidebar
 *   content: raw markdown
 *   text:    plain-text version used by the search index
 *
 * The list is sorted alphabetically by slug; groups are then derived in
 * a deterministic order matching how the docs/ directory is laid out.
 */

const RAW_DOCS = Array.isArray(rawDocs) ? rawDocs : [];

/**
 * Folders we deliberately want at the top of the sidebar. Anything not
 * named here is appended in alphabetical order so new docs always show
 * up without us having to maintain a manifest.
 */
const GROUP_PRIORITY = [
    'protocol',
    'economic-model',
    'sdk',
    'cli',
    'provider',
    'router',
    'routeros',
    'rpi',
    'edgeos',
    'mcp',
    'changelog',
    'audits',
    'trust-and-safety',
    'support',
    'legal',
    'archive',
    'ama',
    'presentations',
    'res'
];

const GROUP_LABELS = {
    'protocol':         'Protocol',
    'economic-model':   'Economic model',
    'sdk':              'SDK',
    'cli':              'CLI',
    'provider':         'Provider',
    'router':           'Router',
    'routeros':         'RouterOS',
    'rpi':              'Raspberry Pi',
    'edgeos':           'EdgeOS',
    'mcp':              'MCP',
    'changelog':        'Changelog',
    'audits':           'Audits',
    'trust-and-safety': 'Trust & safety',
    'support':          'Support',
    'legal':            'Legal',
    'archive':          'Archive',
    'ama':              'AMA',
    'presentations':    'Presentations',
    'res':              'Resources',
    '_root':            'Overview'
};

function slugFor(filePath) {
    // Drop the extension; collapse README.md into the parent directory.
    let s = filePath.replace(/\.md$/i, '');
    s = s.replace(/\/README$/i, '');
    if (s === 'README') s = '';
    return s;
}

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

function groupFor(filePath) {
    const parts = filePath.split('/');
    return parts.length > 1 ? parts[0] : '_root';
}

const DOCS = RAW_DOCS
    .map(({ path, content }) => {
        const slug = slugFor(path) || (path.endsWith('README.md') ? '' : path);
        return {
            slug,
            path,
            title: extractTitle(content, titleFromPath(path)),
            group: groupFor(path),
            content,
            text: markdownToText(content)
        };
    })
    .filter(d => d.slug !== undefined && d.slug !== null);

// De-duplicate by slug. The first entry wins which, given the sort order
// in the virtual module (walk-order), gives us the README before any
// numbered companion file in the same folder.
const seen = new Set();
const UNIQUE_DOCS = [];
for (const d of DOCS) {
    if (seen.has(d.slug)) continue;
    seen.add(d.slug);
    UNIQUE_DOCS.push(d);
}
UNIQUE_DOCS.sort((a, b) => a.slug.localeCompare(b.slug));

export const docs = UNIQUE_DOCS;

/**
 * Group docs into the sidebar buckets. Priority groups go first in the
 * order declared above; everything else is sorted alphabetically. Each
 * group's entries are sorted alphabetically by title.
 */
export const docGroups = (() => {
    const byGroup = new Map();
    for (const d of UNIQUE_DOCS) {
        if (!byGroup.has(d.group)) byGroup.set(d.group, []);
        byGroup.get(d.group).push(d);
    }
    for (const arr of byGroup.values()) {
        arr.sort((a, b) => a.title.localeCompare(b.title));
    }

    const order = [];
    for (const k of GROUP_PRIORITY) if (byGroup.has(k)) order.push(k);
    const remaining = [...byGroup.keys()]
        .filter(k => !GROUP_PRIORITY.includes(k))
        .sort();
    for (const k of remaining) order.push(k);

    return order.map(k => ({
        id: k,
        label: GROUP_LABELS[k] || humanise(k),
        docs: byGroup.get(k)
    }));
})();

export function findDoc(slug) {
    if (slug == null) return null;
    return UNIQUE_DOCS.find(d => d.slug === slug) || null;
}
