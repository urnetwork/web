/**
 * Minimal block-style YAML parser tailored for the URnetwork OpenAPI
 * document at build/bringyour.yml. It is intentionally a small subset of
 * YAML — just enough to round-trip the spec we ship — so we can avoid
 * pulling a full YAML library into the bundle.
 *
 * Supported:
 *   - Block mappings ("key: value", nested by indentation)
 *   - Block sequences ("- item", "- key: value")
 *   - Literal block scalars ("key: |" with an indented body)
 *   - Flow scalars (numbers, booleans, null, quoted/unquoted strings)
 *   - Flow-style empty {} and inline arrays [a, b, c] / []
 *   - Comments (anywhere a "#" appears outside of quotes)
 *
 * NOT supported (the OpenAPI document does not use them):
 *   anchors / aliases, folded scalars (>), tagged scalars, multiple
 *   documents, complex flow mappings.
 */

export function parseYaml(text) {
    const rawLines = text.split('\n');

    // Pre-process: strip end-of-line comments, compute indent, mark blank
    // lines. We keep the original raw line so literal block scalars can
    // recover the un-stripped contents at the right column.
    const lines = rawLines.map((raw, i) => {
        const stripped = stripComment(raw);
        return {
            raw,
            text: stripped,
            indent: leadingSpaces(stripped),
            blank: stripped.trim() === '',
            lineNum: i + 1
        };
    });

    const pos = { i: 0 };
    const value = parseValue(lines, pos);
    return value === null ? {} : value;
}

function leadingSpaces(s) {
    let n = 0;
    while (s[n] === ' ') n++;
    return n;
}

function stripComment(line) {
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === "'" && !inDouble) inSingle = !inSingle;
        else if (c === '"' && !inSingle) inDouble = !inDouble;
        else if (c === '#' && !inSingle && !inDouble) {
            // Only treat as a comment if # is at the start of the line or
            // preceded by whitespace; otherwise it might be inside a value
            // such as "#/components/schemas/Foo".
            if (i === 0 || /\s/.test(line[i - 1])) {
                return line.slice(0, i).replace(/\s+$/, '');
            }
        }
    }
    return line.replace(/\s+$/, '');
}

/**
 * Skip blank lines and decide whether the next line begins a sequence
 * or a mapping, then dispatch to the appropriate parser.
 */
function parseValue(lines, pos) {
    while (pos.i < lines.length && lines[pos.i].blank) pos.i++;
    if (pos.i >= lines.length) return null;

    const line = lines[pos.i];
    const text = line.text.slice(line.indent);

    if (text === '-' || text.startsWith('- ')) {
        return parseSequence(lines, pos, line.indent);
    }
    return parseMapping(lines, pos, line.indent);
}

function parseMapping(lines, pos, indent) {
    const map = {};
    while (pos.i < lines.length) {
        if (lines[pos.i].blank) { pos.i++; continue; }
        const line = lines[pos.i];
        if (line.indent < indent) break;
        // A line indented MORE than `indent` is leftover content from
        // the previous key's value — usually the spec uses "|" inline
        // in a scalar to mark "this description continues on the next
        // line", which is non-standard YAML. Skip it and keep going so
        // the next sibling key still gets parsed.
        if (line.indent > indent) { pos.i++; continue; }

        const text = line.text.slice(line.indent);
        if (text === '-' || text.startsWith('- ')) break;

        const colonIdx = findColon(text);
        if (colonIdx === -1) break;

        const key = unquote(text.slice(0, colonIdx).trim());
        const valuePart = text.slice(colonIdx + 1).trim();
        pos.i++;

        if (valuePart === '') {
            // Value lives on subsequent indented lines.
            let lookahead = pos.i;
            while (lookahead < lines.length && lines[lookahead].blank) lookahead++;
            if (lookahead >= lines.length || lines[lookahead].indent <= indent) {
                map[key] = null;
            } else {
                pos.i = lookahead;
                map[key] = parseValue(lines, pos);
            }
            continue;
        }

        if (valuePart === '|' || valuePart === '|-' || valuePart === '|+') {
            map[key] = readLiteralBlock(lines, pos, indent, valuePart);
            continue;
        }

        if (valuePart === '{}') { map[key] = {}; continue; }
        if (valuePart === '[]') { map[key] = []; continue; }

        if (valuePart.startsWith('[') && valuePart.endsWith(']')) {
            map[key] = parseFlowSequence(valuePart);
            continue;
        }

        // Plain scalar — possibly continued on subsequent lines indented
        // deeper than this key. We fold continuation lines with spaces
        // (the standard YAML rule for multi-line plain scalars), and then
        // collapse the non-standard " |" line-break sentinel that the
        // OpenAPI spec uses inside descriptions into actual newlines.
        let scalar = parseScalar(valuePart);
        if (typeof scalar === 'string' && pos.i < lines.length) {
            const buf = [scalar];
            while (pos.i < lines.length) {
                if (lines[pos.i].blank) break;
                const next = lines[pos.i];
                if (next.indent <= indent) break;
                buf.push(next.text.slice(next.indent));
                pos.i++;
            }
            if (buf.length > 1) {
                scalar = buf
                    .join(' ')
                    .replace(/ \|(?= |$)/g, '\n')
                    .replace(/[ \t]+/g, ' ')
                    .replace(/\n /g, '\n')
                    .trim();
            }
        }
        map[key] = scalar;
    }
    return map;
}

function parseSequence(lines, pos, indent) {
    const arr = [];
    while (pos.i < lines.length) {
        if (lines[pos.i].blank) { pos.i++; continue; }
        const line = lines[pos.i];
        if (line.indent < indent) break;
        // Same rationale as parseMapping — skip continuation content the
        // value parser couldn't consume rather than abandoning the seq.
        if (line.indent > indent) { pos.i++; continue; }

        const text = line.text.slice(line.indent);
        if (text !== '-' && !text.startsWith('- ')) break;

        const itemContent = text === '-' ? '' : text.slice(2);

        if (itemContent === '') {
            // Item value lives on subsequent indented lines.
            pos.i++;
            arr.push(parseValue(lines, pos));
            continue;
        }

        // "- key: value" — the dash starts a mapping whose first key is
        // inline. We splice the line so the key sits at indent+2 and let
        // parseMapping consume that line plus any subsequent siblings.
        const colon = findColon(itemContent);
        if (colon !== -1) {
            const childIndent = indent + 2;
            const padded = ' '.repeat(childIndent) + itemContent;
            lines[pos.i] = {
                raw: lines[pos.i].raw,
                text: padded,
                indent: childIndent,
                blank: false,
                lineNum: lines[pos.i].lineNum
            };
            arr.push(parseMapping(lines, pos, childIndent));
            continue;
        }

        // "- scalar"
        arr.push(parseScalar(itemContent));
        pos.i++;
    }
    return arr;
}

/**
 * Read a literal block scalar ("|"). The block content is every line
 * indented strictly more than the parent key. We use the indent of the
 * first non-blank content line as the strip column so leading whitespace
 * relative to the block is preserved.
 */
function readLiteralBlock(lines, pos, parentIndent, marker) {
    const out = [];
    let blockIndent = -1;
    while (pos.i < lines.length) {
        const l = lines[pos.i];
        if (l.blank) {
            out.push('');
            pos.i++;
            continue;
        }
        if (blockIndent === -1) {
            if (l.indent <= parentIndent) break;
            blockIndent = l.indent;
        }
        if (l.indent < blockIndent) break;
        out.push(l.raw.slice(blockIndent).replace(/\s+$/, ''));
        pos.i++;
    }
    // Strip trailing blank lines, then re-add a single trailing newline
    // unless the strip indicator ("|-") was set.
    while (out.length && out[out.length - 1] === '') out.pop();
    let body = out.join('\n');
    if (marker !== '|-' && body) body += '\n';
    return body;
}

/**
 * Find the first ":" that ends a YAML mapping key — i.e. one that is
 * either at end of line or followed by whitespace, and that is not
 * inside a quoted string.
 */
function findColon(s) {
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === "'" && !inDouble) inSingle = !inSingle;
        else if (c === '"' && !inSingle) inDouble = !inDouble;
        else if (c === ':' && !inSingle && !inDouble) {
            const next = s[i + 1];
            if (next === undefined || next === ' ' || next === '\t') return i;
        }
    }
    return -1;
}

function parseScalar(s) {
    if (s === '' || s === '~' || s === 'null') return null;
    if (s === 'true') return true;
    if (s === 'false') return false;

    if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
        return s.slice(1, -1).replace(/\\(.)/g, (_m, c) => {
            if (c === 'n') return '\n';
            if (c === 't') return '\t';
            if (c === 'r') return '\r';
            return c;
        });
    }
    if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) {
        return s.slice(1, -1).replace(/''/g, "'");
    }
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
    return s;
}

function parseFlowSequence(s) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    // Naive split — sufficient because the OpenAPI spec only uses simple
    // enum-style flow sequences like [quality, speed].
    return inner.split(',').map(x => parseScalar(x.trim()));
}

function unquote(s) {
    if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
    if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
    return s;
}
