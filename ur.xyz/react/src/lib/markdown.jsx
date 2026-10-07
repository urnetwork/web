import React, { Fragment, useEffect, useRef, useState } from 'react';

import { codeLabel, isDiagram, lineShape, wrapInline, wrapLine } from './code-marks.js';
import { copyText } from './clipboard.js';

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

/**
 * `dropTitle` removes the document's first level-1 heading, for a page whose
 * own <h1> already shows the document title (the docs pages print it in their
 * header; the markdown's "# Title" made a second h1). `headingBase` renders the
 * headings as an outline beneath that level: each heading one level below the
 * heading it sits under, so a document that jumps from "#" to "###" does not
 * skip a level. The visual size still follows the markdown (md-h3 stays md-h3).
 * `images` maps an image's resolved src to its intrinsic { width, height },
 * which the <img> carries so the page reserves its box before it loads (the
 * static build reads the files; without a size the image is drawn as before).
 */
export function Markdown({ source, baseHref, dropTitle = false, headingBase = null, images = null }) {
    if (!source) return null;
    let blocks = parseBlocks(source);
    if (dropTitle) {
        const title = blocks.findIndex(b => b.type === 'heading' && b.level === 1);
        if (title !== -1) blocks = blocks.filter((_, i) => i !== title);
    }
    const levels = headingBase == null ? null : outlineLevels(blocks, headingBase);
    // what inline rendering resolves against: links and images, and the images' sizes
    const ctx = { baseHref, images };
    return (
        <div className="md">
            {blocks.map((b, i) => renderBlock(b, i, ctx, levels))}
        </div>
    );
}

/** Heading block → the level it renders at: no skips, nesting kept, never above `base`. */
function outlineLevels(blocks, base) {
    const levels = new Map();
    const open = [{ written: 0, level: base }];
    for (const b of blocks) {
        if (b.type !== 'heading') continue;
        while (open.length > 1 && open[open.length - 1].written >= b.level) open.pop();
        const level = Math.min(6, open[open.length - 1].level + 1);
        open.push({ written: b.level, level });
        levels.set(b, level);
    }
    return levels;
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

function renderBlock(block, idx, ctx, levels = null) {
    switch (block.type) {
        case 'heading': {
            const Tag = `h${levels?.get(block) ?? Math.min(6, Math.max(1, block.level))}`;
            const id = slugify(block.text);
            return <Tag key={idx} id={id} className={`md-h md-h${block.level}`}>{renderInline(block.text, ctx)}</Tag>;
        }
        case 'paragraph':
            return <p key={idx} className="md-p">{renderInline(block.text, ctx)}</p>;
        case 'hr':
            return <hr key={idx} className="md-hr" />;
        case 'quote':
            return (
                <blockquote key={idx} className="md-quote">
                    {parseBlocks(block.content).map((b, j) => renderBlock(b, j, ctx))}
                </blockquote>
            );
        case 'code':
            return <CodeBlock key={idx} lang={block.lang} source={block.content} />;
        case 'ulist':
            return (
                <ul key={idx} className="md-ul">
                    {block.items.map((it, j) => <li key={j}>{renderInline(it, ctx)}</li>)}
                </ul>
            );
        case 'olist':
            return (
                <ol key={idx} className="md-ol">
                    {block.items.map((it, j) => <li key={j}>{renderInline(it, ctx)}</li>)}
                </ol>
            );
        case 'table': {
            // On a phone each row is drawn as a stack, every value under its
            // column's name (data-label, Explorer.css). The roles keep it a table
            // for a screen reader once its parts are no longer laid out as one.
            const [head, ...body] = block.rows;
            const labels = head.map(plainText);
            return (
                <div key={idx} className="md-table-wrap">
                    <table className="md-table" role="table">
                        <thead role="rowgroup">
                            <tr role="row">{head.map((c, j) => <th key={j} role="columnheader">{renderInline(c, ctx)}</th>)}</tr>
                        </thead>
                        <tbody role="rowgroup">
                            {body.map((row, j) => (
                                <tr key={j} role="row">
                                    {row.map((c, k) => <td key={k} role="cell" data-label={labels[k] || undefined}>{renderInline(c, ctx)}</td>)}
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
 * A fenced block. The bar names the kind of text and copies it; the text
 * carries the two marks code-marks.js finds, a value to replace and a comment,
 * and nothing else is coloured. What is drawn is the source, character for
 * character, so selecting it copies the same text the button does.
 *
 * A long line wraps, at the places code-marks.js chooses, and its wrapped part
 * hangs beside a rule. Nothing is wider than the block, so it never scrolls;
 * should something ever be, the block becomes a tab stop, so it can be
 * scrolled from the keyboard (Safari does not make a scroller focusable).
 */
function CodeBlock({ lang, source }) {
    const [copied, setCopied] = useState(false);
    const [scrolls, setScrolls] = useState(false);
    const pre = useRef(null);
    const reset = useRef(0);

    useEffect(() => {
        const el = pre.current;
        if (!el) return undefined;
        const measure = () => setScrolls(el.scrollWidth > el.clientWidth + 1);
        measure();
        if (typeof ResizeObserver === 'undefined') return undefined;
        // the block's width changes with the window, the text's with the font arriving
        const watch = new ResizeObserver(measure);
        watch.observe(el);
        if (el.firstElementChild) watch.observe(el.firstElementChild);
        return () => watch.disconnect();
    }, [source]);

    useEffect(() => () => clearTimeout(reset.current), []);

    const copy = async () => {
        // say "Copied" only when it was; otherwise the text is left selected to copy by hand
        if (!(await copyText(source, pre.current && pre.current.firstElementChild))) return;
        setCopied(true);
        clearTimeout(reset.current);
        reset.current = setTimeout(() => setCopied(false), 2000);
    };

    const label = codeLabel(lang);
    const lines = source.split('\n');
    const diagram = isDiagram(source);

    return (
        <div className={`md-codeblock${diagram ? ' is-diagram' : ''}`}>
            <div className="md-codeblock-bar">
                <span className="md-codeblock-lang">{label}</span>
                <button type="button" className="md-codeblock-copy" data-state={copied ? 'copied' : undefined} onClick={copy}>
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {copied
                            ? <path d="M3.2 8.4l3 3 6.6-6.8" />
                            : <><rect x="5.5" y="5.5" width="8" height="8" rx="1.6" /><path d="M10.5 5.5V4.1a1.6 1.6 0 0 0-1.6-1.6H4.1a1.6 1.6 0 0 0-1.6 1.6v4.8a1.6 1.6 0 0 0 1.6 1.6h1.4" /></>}
                    </svg>
                    {/* both words are laid in one cell, so the button is the same size in either state */}
                    <span className="md-codeblock-copy-label">
                        <span data-shown={!copied}>Copy</span>
                        <span data-shown={copied}>Copied</span>
                    </span>
                    <span className="md-visually-hidden"> {label}</span>
                </button>
                <span className="md-visually-hidden" role="status">{copied ? 'Copied to the clipboard' : ''}</span>
            </div>
            <pre ref={pre} className="md-pre" tabIndex={scrolls ? 0 : undefined}>
                <code className={`md-code md-lang-${lang || 'text'}`} translate="no">
                    {lines.map((line, i) => (
                        <CodeLine key={i} line={line} lang={lang} diagram={diagram} last={i === lines.length - 1} />
                    ))}
                </code>
            </pre>
        </div>
    );
}

/**
 * One line of a block. Its wrapped parts hang at `--hang` columns; a rule at
 * `--rule` marks them, or, in a directory tree, the tree's own vertical rules
 * continue beside them (one background per rule, drawn in the text colour).
 */
function CodeLine({ line, lang, diagram, last }) {
    const shape = lineShape(line, diagram);
    const style = { '--hang': String(shape.hang) };
    if (shape.rule !== null) style['--rule'] = String(shape.rule);
    if (shape.connectors.length) {
        const each = (value) => shape.connectors.map(value).join(', ');
        style.backgroundImage = each(() => 'linear-gradient(currentColor, currentColor)');
        style.backgroundPosition = each((c) => `calc(${c}ch + 0.5ch - var(--tree-stroke) / 2) var(--line)`);
        style.backgroundSize = each(() => 'var(--tree-stroke) calc(100% - var(--line))');
        style.backgroundRepeat = 'no-repeat';
    }
    return (
        <span className={`md-code-line${shape.rule === null ? ' is-tree' : ''}`} style={style}>
            {wrapLine(line, lang, shape).map((run, i) => (run.kind
                ? <span key={i} className={run.kind === 'word' ? 'md-code-word' : 'md-code-keep'}>{codeItems(run.items)}</span>
                : <Fragment key={i}>{codeItems(run.items)}</Fragment>))}
            {last ? null : '\n'}
        </span>
    );
}

function codeItems(items) {
    return items.map((item, i) => {
        if (item.wbr) return <wbr key={i} />;
        if (item.keep) return <span key={i} className="md-code-keep">{codeItems(item.items)}</span>;
        if (item.mark) return <span key={i} className={`md-code-${item.mark}`}>{item.text}</span>;
        return <Fragment key={i}>{item.text}</Fragment>;
    });
}

/**
 * Inline rendering. Walks the string and emits React nodes for the
 * supported inline constructs in order of priority. Anything that does
 * not match falls through as a plain text node. We strip raw HTML tags
 * but keep their text content so the colored `<span>` decorations in
 * the changelog read as normal sentences. A code span is not stripped:
 * its `<domain>` is a placeholder, not a tag.
 */
function renderInline(input, ctx) {
    if (!input) return null;
    const text = stripOutsideCode(input, stripHtmlTags);
    const out = [];
    let i = 0;
    let key = 0;

    const push = (node) => out.push(<Fragment key={key++}>{node}</Fragment>);

    while (i < text.length) {
        // Inline code
        if (text[i] === '`') {
            const end = text.indexOf('`', i + 1);
            if (end !== -1) {
                push(<code className="md-icode" translate="no">{codeItems(wrapInline(text.slice(i + 1, end)))}</code>);
                i = end + 1;
                continue;
            }
        }

        // Image: ![alt](url)
        if (text[i] === '!' && text[i + 1] === '[') {
            const m = text.slice(i).match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
            if (m) {
                const url = resolveHref(m[2], ctx.baseHref);
                const size = ctx.images?.[url];
                push(<img className="md-img" src={url} alt={m[1] || ''} width={size?.width} height={size?.height} loading="lazy" decoding="async" />);
                i += m[0].length;
                continue;
            }
        }

        // Link: [text](url)
        if (text[i] === '[') {
            const m = text.slice(i).match(/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
            if (m) {
                const href = resolveHref(m[2], ctx.baseHref);
                const external = /^(https?:|mailto:)/i.test(href);
                push(
                    <a
                        className="md-link"
                        href={href}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                    >
                        {renderInline(m[1], ctx)}
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
                push(<strong className="md-strong">{renderInline(text.slice(i + 2, end), ctx)}</strong>);
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
                push(<em className="md-em">{renderInline(text.slice(i + 1, end), ctx)}</em>);
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

/** A table header cell as plain text, for the label a stacked row shows. */
function plainText(s) {
    return stripOutsideCode(s, (prose) => stripHtmlTags(prose).replace(/[*_]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'))
        .replace(/`/g, '')
        .trim();
}

/**
 * `strip(s)` with each code span set aside, then put back as written. A code
 * span is literal: read as markup, a placeholder in it was dropped as a tag
 * (`--operator=<domain>` showed as `--operator=`) and its underscores were
 * read as emphasis (the search text lost those of `--hotkey_seed_file`). The
 * spans wait under NUL-delimited indexes, so a construct around one (a link's
 * text) is still read whole. Backticks pair from the left, as renderInline
 * reads them.
 */
function stripOutsideCode(s, strip) {
    const spans = [];
    const prose = s.replace(/`[^`]*`/g, (span) => `\0${spans.push(span) - 1}\0`);
    return strip(prose).replace(/\0(\d+)\0/g, (_, i) => spans[i]);
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
 * match the visible text: a code span keeps its text as written, so
 * `--hotkey_seed_file=<path>` is found as it is typed.
 */
export function markdownToText(src) {
    if (!src) return '';
    const prose = (s) => s
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
        .replace(/<\/?[a-zA-Z][^>]*>/g, ' ');
    return stripOutsideCode(src.replace(/```[\s\S]*?```/g, ' '), prose)
        .replace(/`([^`]+)`/g, '$1')
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
        for (const line of src.replace(/\r\n?/g, '\n').split('\n')) {
            const m = line.match(/^#\s+(.+)$/);
            if (m) return m[1].trim().replace(/<[^>]+>/g, '');
        }
    }
    return fallback;
}
