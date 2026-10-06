// Offline checks of how the docs draw code (src/lib/code-marks.js and the
// face in public/). A mark that swallowed a character would change a command a
// reader copies by eye, and a character missing from the cut-down face would
// draw in a fallback font and break the column grid. Neither fails loudly, so
// both are checked against every line of code in docs/.
//
// Usage: node --test tests/code-marks.test.mjs   (no network)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

import { MIN_COLUMNS, codeLabel, isDiagram, lineShape, markLine, wrapInline, wrapLine } from '../src/lib/code-marks.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(here, '../../docs');
const FONT = path.resolve(here, '../public/JetBrainsMono-Regular.woff2');
const LICENCE = path.resolve(here, '../public/JetBrainsMono-OFL.txt');

// every fenced block and inline code span in the markdown corpus
function corpus() {
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        if (e.name.startsWith('.')) return [];
        const p = path.join(dir, e.name);
        return e.isDirectory() ? walk(p) : e.name.endsWith('.md') ? [p] : [];
    });
    const lines = [];
    const spans = [];
    for (const file of walk(DOCS)) {
        let lang = null;
        let block = [];
        for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
            const fence = line.match(/^```\s*([a-zA-Z0-9_+-]*)\s*$/);
            if (fence) {
                if (lang === null) { lang = fence[1]; block = []; continue; }
                // a block's lines are drawn as a tree when any of them draws one
                const diagram = isDiagram(block.join('\n'));
                for (const text of block) lines.push({ file: path.relative(DOCS, file), lang, line: text, diagram });
                lang = null;
                continue;
            }
            if (lang !== null) block.push(line);
            else for (const m of line.matchAll(/`([^`]+)`/g)) spans.push(m[1]);
        }
    }
    return { lines, spans };
}

const { lines, spans } = corpus();

test('the corpus has code to check', () => {
    assert.ok(lines.length > 300, `only ${lines.length} code lines found under docs/`);
    assert.ok(spans.length > 300, `only ${spans.length} inline code spans found under docs/`);
});

test('marking a line never changes its text', () => {
    for (const { file, lang, line } of lines) {
        assert.equal(markLine(line, lang).map((piece) => piece.text).join(''), line, `${file} [${lang}]: ${line}`);
    }
});

// what a line's runs say, for the assertions below: «» a unit that moves whole,
// [] held on one line, | a place it may break
const runsText = (runs) => runs.map((run) => {
    const items = (list) => list.map((x) => (x.wbr ? '|' : x.keep ? `[${items(x.items)}]` : x.text)).join('');
    return run.kind === 'word' ? `«${items(run.items)}»` : run.kind === 'keep' ? `[${items(run.items)}]` : items(run.items);
}).join('');
const textOf = (runs) => runsText(runs).replace(/[«»[\]|]/g, '');

test('wrapping a line never changes its text', () => {
    for (const { file, lang, line, diagram } of lines) {
        const runs = wrapLine(line, lang, lineShape(line, diagram));
        const flat = (list) => list.map((x) => (x.wbr ? '' : x.keep ? flat(x.items) : x.text)).join('');
        assert.equal(runs.map((run) => flat(run.items)).join(''), line, `${file} [${lang}]: ${line}`);
    }
    for (const span of spans) assert.equal(wrapInline(span).map((x) => x.text || '').join(''), span);
});

test('nothing held on one line is wider than the narrowest screen allows', () => {
    // a held part longer than a wrapped row would push past the block's edge on a 320px phone
    for (const { file, lang, line, diagram } of lines) {
        const shape = lineShape(line, diagram);
        const fits = Math.max(8, MIN_COLUMNS - shape.hang);
        for (const run of wrapLine(line, lang, shape)) {
            const length = (list) => list.reduce((n, x) => n + (x.wbr ? 0 : x.keep ? length(x.items) : x.text.length), 0);
            if (run.kind === 'keep') assert.ok(length(run.items) <= fits, `${file}: "${line}" holds ${length(run.items)} > ${fits} columns`);
            for (const item of run.kind === 'word' ? run.items : []) {
                if (item.keep) assert.ok(length(item.items) <= fits - 2, `${file}: "${line}" holds ${length(item.items)} > ${fits - 2} columns inside a unit`);
            }
        }
    }
});

test('lines wrap where a reader expects', () => {
    const wrap = (line, lang = 'bash', diagram = false) => runsText(wrapLine(line, lang, lineShape(line, diagram)));
    // a flag is never split after its dashes, and a continuation stays with its word
    assert.equal(wrap('provider claim-daemon --config=/absolute/path/claim.yml \\'), 'provider [claim-daemon] «[--config=]|/absolute/|path/|[claim.yml \\]»');
    // a long word that opens its line flows in it, breaking after `=` and `/`
    assert.equal(wrap('  --durable-volumes=/absolute/path/reviewed-daemon-volumes.json \\'), '  [--durable-volumes=]|/absolute/|path/|reviewed-daemon-volumes.json \\');
    // a comment after code moves to the next row whole, its marker held with its first word
    assert.equal(wrap('root_key: "<hex secp256k1 key>"           # root signer: close, commit root, finalize', 'yaml'), 'root_key: "<hex secp256k1 key>"           «[# root] signer: close, commit root, finalize»');
    assert.equal(wrap('deposit_key: "<hex secp256k1 key>"        # deposit signer', 'yaml'), 'deposit_key: "<hex secp256k1 key>"        [# deposit signer]');
    // a list item keeps its dash; a short name or address never breaks
    assert.equal(wrap('  - min_conviction_rao: 0', 'yaml'), '  [- min_conviction_rao:] 0');
    assert.equal(wrap('authority: 127.0.0.1:6379', 'yaml'), 'authority: 127.0.0.1:6379');
    // no break before a short extension or name
    assert.equal(wrap('          connect.example.net.crt', 'text'), '          connect.|example.net.crt');
    // a tree's note wraps under the entry's name, beside the tree's continuing rule
    assert.deepEqual(lineShape('├── sn/                 # github.com/urfoundation/sn', true), { hang: 4, rule: null, connectors: [0] });
    assert.deepEqual(lineShape('│   └── connect/', true), { hang: 8, rule: null, connectors: [0] });
    assert.deepEqual(lineShape('    rate_denominator: 1'), { hang: 6, rule: 4, connectors: [] });
    assert.equal(textOf(wrapLine('', 'yaml')), '');
});

test('placeholders and comments are found where the guides use them', () => {
    const marks = lines.flatMap(({ lang, line }) => markLine(line, lang));
    const placeholders = marks.filter((m) => m.type === 'placeholder').map((m) => m.text);
    const comments = marks.filter((m) => m.type === 'comment').map((m) => m.text);
    assert.ok(placeholders.length >= 40, `${placeholders.length} placeholders marked`);
    assert.ok(comments.length >= 40, `${comments.length} comments marked`);
    for (const p of placeholders) assert.match(p, /^<[A-Za-z0-9][^<>]*>$/);
    for (const c of comments) assert.match(c, /^[#;]/);
});

test('every < left unmarked in a marked block is shell syntax, not a missed placeholder', () => {
    for (const { file, lang, line } of lines) {
        for (const piece of markLine(line, lang)) {
            if (piece.type !== 'text' || !piece.text.includes('<')) continue;
            // a here-document (<<'EOF', <<-EOF), a redirection (< file) or a comparison (a < 5)
            const rest = piece.text.replace(/<<-?\s*['"]?\w+['"]?/g, '').replace(/<\s/g, '');
            if (['json', 'html', 'xml', 'go', 'js', 'jsx', 'ts', 'kotlin', 'kt', 'python', 'py'].includes(lang)) continue;
            assert.ok(!rest.includes('<'), `${file} [${lang}] leaves "<" unmarked: ${line}`);
        }
    }
});

test('the marker reads shell and configuration lines as a reader does', () => {
    const kinds = (line, lang) => markLine(line, lang).map((p) => `${p.type}:${p.text}`);
    // a # inside a string, a URL fragment or $# is not a comment
    assert.deepEqual(kinds('echo "# not" # yes', 'bash'), ['text:echo "# not" ', 'comment:# yes']);
    assert.deepEqual(kinds('curl https://example.net/#part', 'bash'), ['text:curl https://example.net/#part']);
    assert.deepEqual(kinds('echo $# ${#x}', 'bash'), ['text:echo $# ${#x}']);
    // an apostrophe inside a comment opens no string
    assert.deepEqual(kinds("deposit_tiers:   # the signed policy's tier schedule", 'yaml'), ['text:deposit_tiers:   ', "comment:# the signed policy's tier schedule"]);
    // a placeholder inside a quoted value, and one with spaces
    assert.deepEqual(kinds('genesis_hash: "0x<native genesis hash>"', 'yaml'), ['text:genesis_hash: "0x', 'placeholder:<native genesis hash>', 'text:"']);
    // a here-document and a redirection are not placeholders
    assert.deepEqual(kinds("sudo python3 - <<'PY'", 'bash'), ["text:sudo python3 - <<'PY'"]);
    assert.deepEqual(kinds('wc -l < list.txt', 'bash'), ['text:wc -l < list.txt']);
    // INI comments may start with ;
    assert.deepEqual(kinds('; a note', 'ini'), ['comment:; a note']);
    // languages outside the shell and configuration formats are left unmarked
    assert.deepEqual(kinds('{ "a": "<b>" } # x', 'json'), ['text:{ "a": "<b>" } # x']);
    assert.deepEqual(markLine('', 'yaml'), []);
});

test('the bar names each language the guides use', () => {
    const used = new Set(lines.map((l) => l.lang));
    for (const lang of used) assert.ok(codeLabel(lang), `no label for "${lang}"`);
    assert.equal(codeLabel('bash'), 'Shell');
    assert.equal(codeLabel('YAML'), 'YAML');
    assert.equal(codeLabel(''), 'Text');
    assert.equal(codeLabel('go'), 'go');
    assert.ok(isDiagram('├── sn/'));
    assert.ok(!isDiagram('profile: mainnet'));
});

// The tables of a WOFF2 file that the code face's checks need (cmap, post,
// OS/2, head). None of them is transformed in WOFF2, so they come straight out
// of the Brotli stream.
function woff2Tables(file) {
    const buf = fs.readFileSync(file);
    assert.equal(buf.toString('latin1', 0, 4), 'wOF2', `${path.basename(file)} is not WOFF2`);
    const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB'];
    const numTables = buf.readUInt16BE(12);
    const compressedSize = buf.readUInt32BE(20);
    let p = 48;
    const varint = () => { let v = 0; for (let i = 0; i < 5; i++) { const b = buf[p++]; v = (v << 7) | (b & 0x7f); if (!(b & 0x80)) return v >>> 0; } throw new Error('bad UIntBase128'); };
    const dir = [];
    for (let i = 0; i < numTables; i++) {
        const flags = buf[p++];
        const tag = (flags & 0x3f) === 63 ? buf.toString('latin1', p, (p += 4)) : KNOWN[flags & 0x3f];
        const original = varint();
        const version = flags >> 6;
        const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
        dir.push({ tag, length: transformed ? varint() : original, transformed });
    }
    const data = zlib.brotliDecompressSync(buf.subarray(p, p + compressedSize));
    const tables = {};
    let offset = 0;
    for (const t of dir) { if (!t.transformed) tables[t.tag] = data.subarray(offset, offset + t.length); offset += t.length; }
    return tables;
}

function codepoints(cmap) {
    const set = new Set();
    for (let i = 0; i < cmap.readUInt16BE(2); i++) {
        const offset = cmap.readUInt32BE(8 + i * 8);
        const format = cmap.readUInt16BE(offset);
        if (format === 12) {
            for (let g = 0; g < cmap.readUInt32BE(offset + 12); g++) {
                const b = offset + 16 + g * 12;
                for (let c = cmap.readUInt32BE(b); c <= cmap.readUInt32BE(b + 4); c++) set.add(c);
            }
        } else if (format === 4) {
            const segX2 = cmap.readUInt16BE(offset + 6);
            const ends = offset + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
            for (let s = 0; s < segX2; s += 2) {
                const start = cmap.readUInt16BE(starts + s), end = cmap.readUInt16BE(ends + s), delta = cmap.readInt16BE(deltas + s), range = cmap.readUInt16BE(ranges + s);
                for (let c = start; c <= end && c !== 0xffff; c++) {
                    const glyph = range === 0 ? (c + delta) & 0xffff : cmap.readUInt16BE(ranges + s + range + (c - start) * 2);
                    if (glyph) set.add(c);
                }
            }
        }
    }
    return set;
}

test('the code face has every character the docs set in code', () => {
    const have = codepoints(woff2Tables(FONT).cmap);
    const missing = new Map();
    for (const text of [...lines.map((l) => l.line), ...spans]) {
        for (const ch of text) {
            const c = ch.codePointAt(0);
            if (c >= 0x20 && !have.has(c)) missing.set(ch, text);
        }
    }
    assert.equal(missing.size, 0, `not in JetBrainsMono-Regular.woff2: ${[...missing].map(([ch, text]) => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} in "${text.trim().slice(0, 60)}"`).join('; ')}`);
});

test('the code face is fixed-width at 0.6 em, so 15px code is 9px a character', () => {
    const t = woff2Tables(FONT);
    assert.ok(t.post.readUInt32BE(12) !== 0, 'post.isFixedPitch is not set');
    const unitsPerEm = t.head.readUInt16BE(18);
    const averageWidth = t['OS/2'].readInt16BE(2);
    assert.equal(averageWidth / unitsPerEm, 0.6);
});

test('the code face ships with its licence', () => {
    const licence = fs.readFileSync(LICENCE, 'utf8');
    assert.match(licence, /SIL OPEN FONT LICENSE Version 1\.1/);
    assert.match(licence, /JetBrains Mono Project Authors/);
});
