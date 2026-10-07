/**
 * Markdown for agents, shared by the two asset generators: the markdown twins
 * of the docs and legal pages (generate-agent-assets.mjs) and the documents
 * llms-full.txt embeds (generate-agent-assets-llms.mjs).
 *
 * A twin is read out of context: fetched on its own from /docs-md/, or
 * concatenated with other documents into llms-full.txt. A link that only
 * works relative to the page it came from (/docs/miner, or the delete
 * walkthrough's screenshots) points nowhere there, so every link and image
 * target is made absolute against https://ur.xyz, resolved the way the page
 * resolves it (react/src/lib/markdown.jsx resolveHref).
 */

import path from 'node:path';
import { docImages } from '../react/src/lib/docs-shared.js';

export const SITE = 'https://ur.xyz';

// a fenced code block, from its opening fence to the closing one
const FENCED = /^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm;
// an inline link or image target: ](target) or ](target "title")
const LINK_TARGET = /(\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** `md` with `rewrite` applied to the prose between fenced code blocks; the code is left as written. */
export function outsideCode(md, rewrite) {
    let out = '';
    let last = 0;
    for (const m of md.matchAll(FENCED)) {
        out += rewrite(md.slice(last, m.index)) + m[0];
        last = m.index + m[0].length;
    }
    return out + rewrite(md.slice(last));
}

/** The absolute URL of a link target written in a document whose page is `pagePath`. */
export function absoluteUrl(target, pagePath = '/') {
    // anchors, schemes (https:, mailto:) and protocol-relative targets stay as written
    if (target.startsWith('#') || target.startsWith('//') || HAS_SCHEME.test(target)) return target;
    return new URL(target, `${SITE}${pagePath}`).href;
}

/**
 * The image files the published documents show, as paths under docs/ (what
 * the build mirrors into public/docs/): each document's ![alt](src) resolved
 * as its page resolves it (docs-shared.js docImages). `docs` is the published
 * documents, [{ rel, body }] with `rel` the source path under docs/. An image
 * no document shows is not among them, so it is not published.
 */
export function publishedImages(docs) {
    const out = new Set();
    for (const { rel, body } of docs) {
        for (const src of docImages(body, `/docs/${rel}`)) {
            const file = path.posix.normalize(decodeURIComponent(src));
            if (file.startsWith('/docs/')) out.add(file.slice('/docs/'.length));
        }
    }
    return [...out].sort();
}

/**
 * `md` with every inline link and image target absolute. `pagePath` is the
 * path a relative target resolves against: the document's source path under
 * /docs, as the docs pages resolve it (/docs/support/delete.md resolves
 * "DeleteAccountAndroid.webp" to /docs/support/DeleteAccountAndroid.webp,
 * where the build mirrors the image).
 */
export function absoluteLinks(md, pagePath = '/') {
    return outsideCode(md, (prose) =>
        prose.replace(LINK_TARGET, (m, open, target, close) => `${open}${absoluteUrl(target, pagePath)}${close}`));
}
