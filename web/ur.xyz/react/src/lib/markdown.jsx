import React, { Fragment } from 'react';

/**
 * Tiny markdown renderer for the docs corpus shipped at /docs.
 *
 * Why a hand-rolled renderer? The docs only need a small slice of
 * CommonMark (headings, lists, links, code, simple tables, blockquotes,
 * horizontal rules, paragraphs) and we'd rather not pull a 30kB
 * dependency for it. The renderer is intentionally forgiving — anything
 * it does not recognise (raw HTML, footnotes, etc.) collapses to plain
 * text instead of erroring out.
 *
 * Block-level handling lives in `parseBlocks` and inline handling in
 * `renderInline`. Both return React nodes so the result composes
 * naturally with the rest of the site.
 */

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const HR_RE      = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;
const ULIST_RE   = /^(\s*)[-*+]\s+(.*)$/;
const OLIST_RE   = /^(\s*)\d+\.\s+(.*)$/;
const FENCE_RE   = /^```\s*([a-zA-Z0-9_+-]*)\s*$/;
const QUOTE_RE   = /^>\s?(.*)$/;
const TABLE_SEP  = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/;

export function Markdown({ source, baseHref }) {
    if (!source) return null;
    const blocks = parseBlocks(source);
    return (
        <div className="md">
            {blocks.map((b, i) => renderBlock(b, i, baseHref))}
        </div>
    );
}

function parseBlocks(src) {
    // Strip carriage returns and yaml front-matter, if any. None of the
    // shipped docs use front-matter today but it is cheap to be tolerant.
    let text = src.replace(/\r\n?/g, '\n');
    if (text.startsWith('---\n')) {
        const end = text.indexOf('\n---', 4);
        if (end !== -1) text = text.slice(end + 4).replace(/^\n+/, '');
    }

    const lines = text.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) { i++; continue; }

        // Fenced code block
        const fence = line.match(FENCE_RE);
        if (fence) {
            const lang = fence[1] || '';
            const buf = [];
            i++;
            while (i < lines.length && !FENCE_RE.test(lines[i])) {
                buf.push(lines[i]);
                i++;
            }
            if (i < lines.length) i++; // consume closing fence
            blocks.push({ type: 'code', lang, content: buf.join('\n') });
            continue;
        }

        // Heading
        const h = line.match(HEADING_RE);
        if (h) {
            blocks.push({ type: 'heading', level: h[1].length, text: h[2].trim() });
            i++;
            continue;
        }

        // Horizontal rule
        if (HR_RE.test(line)) {
            blocks.push({ type: 'hr' });
            i++;
            continue;
        }

        // Blockquote
        if (QUOTE_RE.test(line)) {
            const buf = [];
            while (i < lines.length && QUOTE_RE.test(lines[i])) {
                buf.push(lines[i].match(QUOTE_RE)[1]);
                i++;
            }
            blocks.push({ type: 'quote', content: buf.join('\n') });
            continue;
        }

        // Pipe table — needs a separator row directly under the header
        if (line.includes('|') && lines[i + 1] && TABLE_SEP.test(lines[i + 1])) {
            const rows = [splitRow(line)];
            i += 2; // skip header + separator
            while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
                rows.push(splitRow(lines[i]));
                i++;
            }
            blocks.push({ type: 'table', rows });
            continue;
        }

        // Lists (we don't track nesting beyond a flat list — adequate for
        // these docs and keeps the parser simple).
        if (ULIST_RE.test(line)) {
            const items = [];
            while (i < lines.length && ULIST_RE.test(lines[i])) {
                items.push(lines[i].match(ULIST_RE)[2]);
                i++;
                // Allow simple paragraph continuations on the next indented line.
                while (i < lines.length && /^\s{2,}\S/.test(lines[i])) {
                    items[items.length - 1] += ' ' + lines[i].trim();
                    i++;
                }
            }
            blocks.push({ type: 'ulist', items });
            continue;
        }
        if (OLIST_RE.test(line)) {
            const items = [];
            while (i < lines.length && OLIST_RE.test(lines[i])) {
                items.push(lines[i].match(OLIST_RE)[2]);
                i++;
                while (i < lines.length && /^\s{2,}\S/.test(lines[i])) {
                    items[items.length - 1] += ' ' + lines[i].trim();
                    i++;
                }
            }
            blocks.push({ type: 'olist', items });
            continue;
        }

        // Paragraph: collect until a blank line or another block start.
        const para = [];
        while (i < lines.length && lines[i].trim() && !startsBlock(lines[i], lines[i + 1])) {
            para.push(lines[i]);
            i++;
        }
        if (para.length) blocks.push({ type: 'paragraph', text: para.join(' ') });
    }

    return blocks;
}

/**
 * True when `line` is the first line of a new block (so a paragraph
 * collector should stop here). The `next` line is needed to detect
 * tables, which require a separator row right after the header.
 */
function startsBlock(line, next) {
    if (!line) return false;
    if (HEADING_RE.test(line)) return true;
    if (HR_RE.test(line)) return true;
    if (FENCE_RE.test(line)) return true;
    if (QUOTE_RE.test(line)) return true;
    if (ULIST_RE.test(line)) return true;
    if (OLIST_RE.test(line)) return true;
    if (line.includes('|') && next && TABLE_SEP.test(next)) return true;
    return false;
}

function splitRow(line) {
    // Strip leading/trailing pipes, then split. Cells keep their
    // surrounding whitespace trimmed because that is how readers expect
    // pipe tables to render.
    return line
        .replace(/^\s*\|/, '')
        .replace(/\|\s*$/, '')
        .split('|')
        .map(c => c.trim());
}

function renderBlock(block, idx, baseHref) {
    switch (block.type) {
        case 'heading': {
            const Tag = `h${Math.min(6, Math.max(1, block.level))}`;
            const id = slugify(block.text);
            return <Tag key={idx} id={id} className={`md-h md-h${block.level}`}>{renderInline(block.text, baseHref)}</Tag>;
        }
        case 'paragraph':
            return <p key={idx} className="md-p">{renderInline(block.text, baseHref)}</p>;
        case 'hr':
            return <hr key={idx} className="md-hr" />;
        case 'quote':
            return (
                <blockquote key={idx} className="md-quote">
                    {parseBlocks(block.content).map((b, j) => renderBlock(b, j, baseHref))}
                </blockquote>
            );
        case 'code':
            return (
                <pre key={idx} className="md-pre"><code className={`md-code md-lang-${block.lang || 'text'}`}>{block.content}</code></pre>
            );
        case 'ulist':
            return (
                <ul key={idx} className="md-ul">
                    {block.items.map((it, j) => <li key={j}>{renderInline(it, baseHref)}</li>)}
                </ul>
            );
        case 'olist':
            return (
                <ol key={idx} className="md-ol">
                    {block.items.map((it, j) => <li key={j}>{renderInline(it, baseHref)}</li>)}
                </ol>
            );
        case 'table': {
            const [head, ...body] = block.rows;
            return (
                <div key={idx} className="md-table-wrap">
                    <table className="md-table">
                        <thead>
                            <tr>{head.map((c, j) => <th key={j}>{renderInline(c, baseHref)}</th>)}</tr>
                        </thead>
                        <tbody>
                            {body.map((row, j) => (
                                <tr key={j}>
                                    {row.map((c, k) => <td key={k}>{renderInline(c, baseHref)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }
        default:
            return null;
    }
}

/**
 * Inline rendering. Walks the string and emits React nodes for the
 * supported inline constructs in order of priority. Anything that does
 * not match falls through as a plain text node. We strip raw HTML tags
 * but keep their text content so the colored `<span>` decorations in
 * the changelog read as normal sentences.
 */
function renderInline(input, baseHref) {
    if (!input) return null;
    const text = stripHtmlTags(input);
    const out = [];
    let i = 0;
    let key = 0;

    const push = (node) => out.push(<Fragment key={key++}>{node}</Fragment>);

    while (i < text.length) {
        // Inline code
        if (text[i] === '`') {
            const end = text.indexOf('`', i + 1);
            if (end !== -1) {
                push(<code className="md-icode">{text.slice(i + 1, end)}</code>);
                i = end + 1;
                continue;
            }
        }

        // Image: ![alt](url)
        if (text[i] === '!' && text[i + 1] === '[') {
            const m = text.slice(i).match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
            if (m) {
                const url = resolveHref(m[2], baseHref);
                push(<img className="md-img" src={url} alt={m[1] || ''} loading="lazy" />);
                i += m[0].length;
                continue;
            }
        }

        // Link: [text](url)
        if (text[i] === '[') {
            const m = text.slice(i).match(/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
            if (m) {
                const href = resolveHref(m[2], baseHref);
                const external = /^(https?:|mailto:)/i.test(href);
                push(
                    <a
                        className="md-link"
                        href={href}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                    >
                        {renderInline(m[1], baseHref)}
                    </a>
                );
                i += m[0].length;
                continue;
            }
        }

        // Bold: **text**
        if (text[i] === '*' && text[i + 1] === '*') {
            const end = text.indexOf('**', i + 2);
            if (end !== -1) {
                push(<strong className="md-strong">{renderInline(text.slice(i + 2, end), baseHref)}</strong>);
                i = end + 2;
                continue;
            }
        }

        // Italic: *text* or _text_  (no boundary checks; covers our docs).
        if ((text[i] === '*' || text[i] === '_') && text[i + 1] !== text[i]) {
            const ch = text[i];
            const end = text.indexOf(ch, i + 1);
            // Reject empty or multi-line spans, plus the obvious "list dash" case.
            if (end !== -1 && end > i + 1 && !text.slice(i + 1, end).includes('\n')) {
                push(<em className="md-em">{renderInline(text.slice(i + 1, end), baseHref)}</em>);
                i = end + 1;
                continue;
            }
        }

        // Plain text — accumulate up to the next interesting character.
        let j = i + 1;
        while (j < text.length && '`*_[!'.indexOf(text[j]) === -1) j++;
        push(text.slice(i, j));
        i = j;
    }

    return out;
}

function stripHtmlTags(s) {
    // Removes <tag …> and </tag>, leaving the text contents in place.
    // Also normalizes &amp; / &lt; / &gt; / &quot; / &nbsp; / &#39; to
    // their literal forms so they read naturally in our renderer.
    return s
        .replace(/<\/?[a-zA-Z][^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

/**
 * Resolve a relative href against the source doc's base path. Absolute
 * URLs and root-relative paths pass through unchanged. Anything that
 * looks like a relative image path is dropped — we don't ship the
 * images alongside the bundle, so a broken alt-text-only link is the
 * least-bad outcome.
 */
function resolveHref(href, baseHref) {
    if (!href) return '#';
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
    if (href.startsWith('//') || href.startsWith('#')) return href;
    if (href.startsWith('/')) return href;
    if (!baseHref) return href;
    // Relative — anchor to the doc's base path.
    return baseHref.replace(/\/[^/]*$/, '/') + href;
}

function slugify(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

/**
 * Lightweight plain-text extraction used by the search index. Keeps it
 * in sync with what the renderer actually displays so search results
 * match the visible text.
 */
export function markdownToText(src) {
    if (!src) return '';
    return src
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
        .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Pull the first level-1 heading out of a markdown source so the docs
 * sidebar can title each entry without us having to maintain a separate
 * registry. Falls back to the file name when no heading is found.
 */
export function extractTitle(src, fallback) {
    if (src) {
        for (const line of src.split('\n')) {
            const m = line.match(HEADING_RE);
            if (m) return m[2].trim().replace(/<[^>]+>/g, '');
        }
    }
    return fallback;
}
