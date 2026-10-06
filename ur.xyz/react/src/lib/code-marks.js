// How the docs draw code. A reader does three things with the text in a
// block: types some of it as written, replaces some of it with their own
// value, and reads the rest as explanation. So a block carries two marks and
// no other colour: a placeholder (`<your operator id>`) and a comment
// (`# to the end of the line`). There is no colouring by grammar.
//
// Pure code, no React: lib/markdown.jsx draws with it, and
// tests/code-marks.test.mjs runs it over every code line in docs/.

// The languages in which `#` starts a comment and `<name>` is a placeholder
// by convention: the shell and the configuration formats the guides use, and
// plain text (a directory tree with notes). Elsewhere `<` and `>` are
// operators or tags and `#` is not a comment, so those blocks stay unmarked.
const MARKED = new Set([
    'bash', 'sh', 'shell', 'zsh', 'console',
    'yaml', 'yml', 'toml', 'ini', 'conf', 'dotenv', 'env',
    'text', '',
]);

// What the bar above a block calls it. An unlisted language is shown as written.
const LABELS = {
    bash: 'Shell', sh: 'Shell', shell: 'Shell', zsh: 'Shell', console: 'Shell',
    yaml: 'YAML', yml: 'YAML', toml: 'TOML', ini: 'INI', conf: 'Conf',
    dotenv: 'Env', env: 'Env', json: 'JSON', text: 'Text', '': 'Text',
};

/** The name a block's bar shows for a fence language. */
export function codeLabel(lang) {
    const key = String(lang || '').toLowerCase();
    return LABELS[key] ?? lang;
}

/**
 * True when a block draws with box-drawing characters (a directory tree, a
 * frame). Its lines are set at the face's own line height so the rules join.
 */
export function isDiagram(source) {
    return /[─-╿]/.test(source);
}

// A value the reader must replace: angle brackets around a name or a phrase
// that has at least one letter (`<rate>`, `<32-byte hotkey>`, `<the Redis
// password>`). A here-document (`<<'EOF'`), a redirection (`< file`) and a
// comparison (`a < 5`) do not match.
const PLACEHOLDER = /<(?=[^<>\n]*[A-Za-z])[A-Za-z0-9][^<>\n]{0,78}>/g;

// A quote opens a string only where a string can start: at the start of the
// line or after a space, `=`, `:`, `(`, `[`, `,` or `{`. So the apostrophe in
// "policy's" opens nothing.
const OPENS_STRING = ' \t=:([,{';

/** Where a comment starts on a line, or -1. A `#` inside a quoted string is not one. */
function commentStart(line, lang) {
    let quote = null;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        const prev = i ? line[i - 1] : ' ';
        if (quote) {
            if (c === '\\' && quote === '"') { i++; continue; }
            if (c === quote) quote = null;
            continue;
        }
        if ((c === '"' || c === "'") && OPENS_STRING.includes(prev)) { quote = c; continue; }
        // `#` at the start of the line or after a space: not `$#`, `${#x}` or a URL fragment
        if (c === '#' && (i === 0 || prev === ' ' || prev === '\t')) return i;
        // an INI comment may also start the line with `;`
        if (c === ';' && (lang === 'ini' || lang === 'conf') && line.slice(0, i).trim() === '') return i;
    }
    return -1;
}

/**
 * One line of a block as the pieces to draw:
 * [{ type: 'text' | 'placeholder' | 'comment', text }]. The pieces always join
 * back to the line exactly: a mark changes how text looks, never what it says.
 */
export function markLine(line, lang) {
    const key = String(lang || '').toLowerCase();
    if (!MARKED.has(key)) return line ? [{ type: 'text', text: line }] : [];
    const at = commentStart(line, key);
    const code = at < 0 ? line : line.slice(0, at);
    const out = [];
    let last = 0;
    for (const m of code.matchAll(PLACEHOLDER)) {
        if (m.index > last) out.push({ type: 'text', text: code.slice(last, m.index) });
        out.push({ type: 'placeholder', text: m[0] });
        last = m.index + m[0].length;
    }
    if (last < code.length) out.push({ type: 'text', text: code.slice(last) });
    if (at >= 0) out.push({ type: 'comment', text: line.slice(at) });
    return out;
}

// ── Wrapping ────────────────────────────────────────────────────────────
// A line too long for its block wraps; it never makes the page or the block
// scroll sideways. A wrapped part hangs two columns past its line's own
// indentation, beside a thin rule, so it never reads as a line of its own
// (in YAML, two more spaces would be a nested key). Where a line breaks is
// chosen, not left to the browser:
//
//   • between words first;
//   • inside a word only when the word cannot fit a line at all, and then
//     after `/`, `=`, `,`, `:` and the like, so a path, a URL or a flag
//     breaks where a reader expects;
//   • never right after a hyphen in a word that fits, so `--config` and
//     `operator-gas-authority.yml` stay whole (Chromium would otherwise break
//     after any `-` or `?`, stranding `--` at the end of a line);
//   • never between `#` and the comment's first word, between a list's `-`
//     and its item, or before a trailing `\` continuation.
//
// A directory tree drawn with box-drawing characters wraps under the entry's
// name, and the tree's vertical rules continue beside the wrapped part.

/** The fewest columns a block has: a 320px phone shows 27 characters of code. */
export const MIN_COLUMNS = 27;

// characters a word may break after when it has to (the browser offers none of these)
const BREAK_AFTER = new Set(['/', '=', ',', ';', '&', '|', ':', '_', '.']);
// characters after which Chromium breaks a word by itself (measured)
const BROWSER_BREAKS = /[-?]/;
// box-drawing characters whose vertical stroke continues below them
const CONTINUING = new Set(['│', '├', '┃', '┣', '║', '╟', '╠', '┆', '┊']);
const BOX = /^[\s\u2500-\u257f]+/;

/**
 * How a line wraps. `hang` is the column its wrapped parts start at; `rule`
 * the column of the rule beside them (null for none); `connectors` the
 * columns of a tree's vertical rules that continue beside them.
 */
export function lineShape(line, diagram = false) {
    const indent = line.match(/^ */)[0].length;
    if (diagram) {
        const prefix = (line.match(BOX) || [''])[0];
        if (/[\u2500-\u257f]/.test(prefix)) {
            const connectors = [];
            [...prefix].forEach((ch, i) => { if (CONTINUING.has(ch)) connectors.push(i); });
            return { hang: prefix.length, rule: null, connectors };
        }
    }
    return { hang: indent + 2, rule: indent, connectors: [] };
}

// Where a word too long for any line may break: after a BREAK_AFTER
// character, never inside `//` or `::`, not right after `://`, never so that
// a part is a lone character, and at a `.` neither between digits (127.0.0.1)
// nor before a short extension or name (claim.yml, github.com, example.net).
function cutsIn(word) {
    const cuts = [];
    let last = 0;
    for (let i = 1; i < word.length; i++) {
        const prev = word[i - 1];
        const next = word[i];
        if (!BREAK_AFTER.has(prev)) continue;
        if (prev === next) continue;
        if (prev === ':' && next === '/') continue;
        if (prev === '.' && (/\d/.test(word[i - 2] || '') || /\d/.test(next) || /^[A-Za-z0-9]{1,4}(?![A-Za-z0-9])/.test(word.slice(i)))) continue;
        if (i - last < 2 || word.length - i < 2) continue;
        cuts.push(i);
        last = i;
    }
    return cuts;
}

/**
 * One line as the runs to draw. A run is free text (`kind: null`), a unit
 * held on one line (`'keep'`), or a unit that moves to the next line whole
 * and breaks inside only when it is longer than a line (`'word'`, drawn as
 * an inline block). Its items are text (`{ text, mark }`, mark being
 * 'comment', 'placeholder' or null), a place the line may break
 * (`{ wbr: true }`), and inside a `'word'` a part held on one line
 * (`{ keep: true, items }`). The items' text joins back to the line exactly.
 */
export function wrapLine(line, lang, shape = lineShape(line)) {
    // the mark under each character
    const marks = new Array(line.length).fill(null);
    let col = 0;
    for (const piece of markLine(line, lang)) {
        if (piece.type !== 'text') marks.fill(piece.type, col, col + piece.text.length);
        col += piece.text.length;
    }
    // the longest unit that always fits a wrapped part, on the narrowest screen
    const fits = Math.max(8, MIN_COLUMNS - shape.hang);

    // one unit per word, then the glue: a comment's `#` with its first word,
    // a list's `-` with its item, a trailing `\\` with the word before it
    let units = [...line.matchAll(/\S+/g)].map((m) => ({ from: m.index, to: m.index + m[0].length, words: [[m.index, m.index + m[0].length]] }));
    const merge = (i) => {
        const [a, b] = [units[i], units[i + 1]];
        units.splice(i, 2, { from: a.from, to: b.to, words: [...a.words, ...b.words], glue: true });
    };
    for (let i = 0; i < units.length - 1; i++) {
        const text = line.slice(units[i].from, units[i].to);
        if (/^[#;]+$/.test(text) && marks[units[i].from] === 'comment') merge(i);
    }
    const first = units[0];
    if (first && line.slice(first.from, first.to) === '-' && units.length > 1) merge(0);
    // a comment after code is one unit: it moves to the next row whole rather
    // than leave its first words at the end of the code's row
    const opening = units.findIndex((u) => marks[u.from] === 'comment');
    if (opening > 0) {
        const tail = units.splice(opening);
        units.push({ from: tail[0].from, to: tail[tail.length - 1].to, words: tail.flatMap((u) => u.words), glue: true, comment: true });
    }
    const last = units[units.length - 1];
    if (last && units.length > 1 && line.slice(last.from, last.to) === '\\' && line[last.from - 1] === ' ') merge(units.length - 2);

    const items = (from, to, cuts = new Set(), keeps = []) => {
        const out = [];
        let i = from;
        while (i < to) {
            const keep = keeps.find(([a]) => a === i);
            if (keep) { out.push({ keep: true, items: items(keep[0], keep[1]) }); i = keep[1]; if (i < to && cuts.has(i)) out.push({ wbr: true }); continue; }
            let j = i + 1;
            while (j < to && marks[j] === marks[i] && !cuts.has(j) && !keeps.some(([a]) => a === j)) j++;
            out.push({ text: line.slice(i, j), mark: marks[i] });
            if (j < to && cuts.has(j)) out.push({ wbr: true });
            i = j;
        }
        return out;
    };

    const runs = [];
    let at = 0;
    for (const unit of units) {
        if (unit.from > at) runs.push({ kind: null, items: items(at, unit.from) });
        const text = line.slice(unit.from, unit.to);
        if (text.length <= fits && unit.comment) {
            runs.push({ kind: 'keep', items: items(unit.from, unit.to) });
        } else if (text.length <= fits) {
            // a word the browser could split at a hyphen, or a glued pair, is held whole
            runs.push({ kind: unit.glue || BROWSER_BREAKS.test(text) ? 'keep' : null, items: items(unit.from, unit.to) });
        } else {
            // too long for the narrowest line: it may break, at the places a reader
            // expects. A word that opens its line flows in it (it cannot move to a
            // new row anyway, and its row is wider than a hanging one); any other
            // moves to the next row whole, as an inline block whose own wrapped
            // part hangs two columns further, so what it holds must fit that.
            const opens = !unit.comment && line.slice(0, unit.from).trim() === '';
            const limit = opens ? fits : fits - 2;
            const cuts = new Set();
            const keeps = [];
            const parts = [];
            for (const [from, to] of unit.words) {
                let a = from;
                const own = [];
                for (const cut of cutsIn(line.slice(from, to))) { own.push([a, from + cut]); a = from + cut; cuts.add(from + cut); }
                own.push([a, to]);
                parts.push(own);
            }
            const hold = (a, b) => { if (b - a <= limit && !keeps.some(([x, y]) => a < y && x < b)) { for (let k = a + 1; k < b; k++) cuts.delete(k); keeps.push([a, b]); } };
            // the glue holds the marker or the continuation with the nearest part of its word
            if (unit.glue && parts.length > 1) {
                if (/^[#;-]/.test(text)) hold(unit.from, parts[1][0][1]);
                if (unit.comment && parts.length === 1) hold(unit.from, unit.to);
                if (text.endsWith('\\')) hold(parts[parts.length - 2][parts[parts.length - 2].length - 1][0], unit.to);
            }
            for (const own of parts) for (const [a, b] of own) if (BROWSER_BREAKS.test(line.slice(a, b))) hold(a, b);
            keeps.sort((x, y) => x[0] - y[0]);
            runs.push({ kind: opens ? null : 'word', items: items(unit.from, unit.to, cuts, keeps) });
        }
        at = unit.to;
    }
    if (at < line.length) runs.push({ kind: null, items: items(at, line.length) });

    // free runs side by side are one run, and text side by side under one mark is one item
    const merged = [];
    for (const run of runs) {
        const prev = merged[merged.length - 1];
        if (prev && prev.kind === null && run.kind === null) prev.items.push(...run.items);
        else merged.push({ kind: run.kind, items: [...run.items] });
    }
    for (const run of merged) {
        if (run.kind !== null) continue;
        const joined = [];
        for (const item of run.items) {
            const prev = joined[joined.length - 1];
            if (prev && 'text' in prev && 'text' in item && prev.mark === item.mark) prev.text += item.text;
            else joined.push({ ...item });
        }
        run.items = joined;
    }
    return merged;
}

/**
 * Inline code as parts: a chip moves to the next line whole, so its text only
 * needs break points for a chip longer than the line, after `/`, `=`, `:`
 * and the like.
 */
export function wrapInline(text) {
    const parts = [];
    const pieces = text.split(/(\s+)/);
    for (const piece of pieces) {
        if (!piece) continue;
        if (/^\s+$/.test(piece) || piece.length <= 12) { parts.push({ text: piece, keep: false }); continue; }
        let at = 0;
        for (const cut of cutsIn(piece)) { parts.push({ text: piece.slice(at, cut), keep: false }, { wbr: true }); at = cut; }
        parts.push({ text: piece.slice(at), keep: false });
    }
    return parts;
}
