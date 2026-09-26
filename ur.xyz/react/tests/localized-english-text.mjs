// English text on localized pages — a guard against copy that never reached
// the dictionaries.
//
// Every translated page (/<lang>/…) is compared with its English twin in the
// BUILT output. Text a visitor meets on the localized page (text nodes, SVG
// labels, the <title>, and the accessible names in aria-label / alt / title /
// placeholder) is split into sentences, and a sentence fails the page when it
// is English that the translation should have replaced:
//
//   • prose leak: the sentence appears verbatim on the English twin and reads
//     as English prose (it carries a lowercase word, so it is not a bare brand
//     or code name like "Bittensor", "MASA L2 2025" or "transport.go");
//   • label leak: the sentence equals an English dictionary value that this
//     language translates differently everywhere it occurs, e.g. a hard-coded
//     "Operators" on a German page whose dictionary says "Betreiber".
//
// It also asserts <html lang> matches the page language, that no localized
// page carries NUL bytes (streamed React SSR once split a multibyte character
// across its flush boundary and left \0 in the zh and ar pages), and that no
// dictionary placeholder ({code}, {date}, …) reaches the visible text of a
// translated page or its English twin unreplaced.
//
// Usage: node tests/localized-english-text.mjs [buildDir]
//        (default ../astro/build/$UR_ENV, UR_ENV defaulting to main)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    LOCALIZED_BASE_PATHS,
    NON_EN_SITE_LANG_CODES,
} from '../../astro/src/lib/route-localization.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UR_ENV = process.env.UR_ENV || 'main';
const BUILD = path.resolve(process.argv[2] || path.join(__dirname, '../../astro/build', UR_ENV));
const I18N = path.join(__dirname, '../src/i18n');

// Sentences deliberately left in English in every language. Keep this short:
// each entry is a decision, not a convenience.
const ALLOWED_ENGLISH = new Set([
    // the paper's published title (research.publications.items[0].title)
    'Whole Internet Encryption for the whole world',
]);

// Accessible text a visitor meets without it being a text node.
const TEXT_ATTRIBUTES = ['aria-label', 'alt', 'title', 'placeholder', 'aria-description', 'aria-roledescription'];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(text) {
    return text.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, body) => {
        if (body[0] === '#') {
            const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : Number(body.slice(1));
            return String.fromCodePoint(code);
        }
        return ENTITIES[body.toLowerCase()] ?? entity;
    });
}

const normalize = (text) => decode(text).replace(/[\s ]+/g, ' ').trim();

// Sentence split: after terminal punctuation (Latin, CJK, Arabic) + space, or
// right after CJK terminal punctuation, which takes no space.
function sentences(text) {
    return text
        .split(/(?<=[.!?؟])\s+|(?<=[。！？])/u)
        .map((s) => s.trim())
        .filter(Boolean);
}

/** The text a visitor meets on a built page, as { source, text } sentences. */
function pageText(html) {
    const title = normalize((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const body = html
        .replace(/<head\b[\s\S]*?<\/head>/i, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');

    const out = [];
    if (title) for (const s of sentences(title)) out.push({ source: '<title>', text: s });
    for (const tag of body.matchAll(/<[a-z][^>]*>/gi)) {
        for (const attribute of tag[0].matchAll(/\s([a-z-]+)="([^"]*)"/gi)) {
            if (!TEXT_ATTRIBUTES.includes(attribute[1].toLowerCase())) continue;
            const text = normalize(attribute[2]);
            if (text) for (const s of sentences(text)) out.push({ source: `@${attribute[1]}`, text: s });
        }
    }
    // Every tag is a boundary: an inline link inside a sentence yields its own
    // fragment, which is still compared.
    for (const chunk of body.split(/<[^>]*>/)) {
        const text = normalize(chunk);
        if (text) for (const s of sentences(text)) out.push({ source: 'text', text: s });
    }
    return out;
}

function flatten(value, prefix = '', out = new Map()) {
    if (typeof value === 'string') out.set(prefix, value);
    else if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${prefix}.${i}`, out));
    else if (value && typeof value === 'object') {
        for (const [key, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
}

async function dictionary(code) {
    return flatten((await import(path.join(I18N, `${code}.js`))).default);
}

// "reads as English prose": a whitespace-delimited all-lowercase ASCII word.
// A dot inside a token (llms.txt, ur.io, transport.go) makes it a name, not a
// word, so trailing punctuation only counts when a space or the end follows.
const PROSE_WORD = /(?:^|[\s(“"'])[a-z]{2,}(?=$|[\s)”"']|[,.;:!?](?:$|\s))/;

const fileFor = (lang, base) => {
    if (lang === 'en') return base === '/' ? 'index.html' : `${base.slice(1)}.html`;
    return base === '/' ? `${lang}.html` : `${lang}${base}.html`;
};

async function main() {
    if (!fs.existsSync(path.join(BUILD, 'index.html'))) {
        console.error(`localized-english-text: no build at ${BUILD}`);
        process.exit(2);
    }

    const en = await dictionary('en');
    const enValueKeys = new Map();
    for (const [key, value] of en) {
        if (!enValueKeys.has(value)) enValueKeys.set(value, []);
        enValueKeys.get(value).push(key);
    }

    const failures = [];
    // an unreplaced dictionary placeholder in visible text, e.g. "{code}"
    const placeholders = (route, html) => {
        for (const { source, text } of pageText(html)) {
            for (const token of text.match(/\{[a-z][A-Za-z]*\}/g) || []) {
                failures.push(`/${route} ${source}: placeholder ${token} left in "${text}"`);
            }
        }
    };
    for (const base of LOCALIZED_BASE_PATHS) {
        const twinFile = path.join(BUILD, fileFor('en', base));
        if (fs.existsSync(twinFile)) placeholders(base === '/' ? '' : base.slice(1), fs.readFileSync(twinFile, 'utf8'));
    }

    let pagesChecked = 0;
    for (const lang of NON_EN_SITE_LANG_CODES) {
        const dict = await dictionary(lang);
        for (const base of LOCALIZED_BASE_PATHS) {
            const twinFile = path.join(BUILD, fileFor('en', base));
            const pageFile = path.join(BUILD, fileFor(lang, base));
            const route = lang + (base === '/' ? '' : base);
            if (!fs.existsSync(pageFile)) {
                failures.push(`/${route}: not built (${path.relative(BUILD, pageFile)})`);
                continue;
            }
            const raw = fs.readFileSync(pageFile);
            if (raw.includes(0)) failures.push(`/${route}: contains NUL bytes`);
            const html = raw.toString('utf8');
            const htmlLang = (html.match(/<html[^>]*\slang="([^"]*)"/i) || [])[1];
            if (htmlLang !== lang) failures.push(`/${route}: <html lang="${htmlLang}">, expected "${lang}"`);
            placeholders(route, html);

            const english = new Set(pageText(fs.readFileSync(twinFile, 'utf8')).map((s) => s.text));
            const seen = new Set();
            for (const { source, text } of pageText(html)) {
                const id = `${source}\u0000${text}`;
                if (seen.has(id) || ALLOWED_ENGLISH.has(text)) continue;
                seen.add(id);
                const prose = english.has(text) && PROSE_WORD.test(text);
                const keys = enValueKeys.get(text);
                const label = keys && keys.every((key) => dict.has(key) && dict.get(key) !== text);
                if (prose || label) {
                    const why = label ? `English for ${keys.join(', ')}` : 'identical to the English page';
                    failures.push(`/${route} ${source}: "${text}" (${why})`);
                }
            }
            pagesChecked += 1;
        }
    }

    console.log(`localized-english-text: ${pagesChecked} localized pages compared with their English twins (${BUILD})`);
    if (failures.length) {
        console.error(`\n${failures.length} problem(s): English text or placeholders on the translated pages:`);
        for (const failure of failures) console.error(`  ${failure}`);
        process.exit(1);
    }
    console.log('localized-english-text: OK');
}

main().catch((error) => {
    console.error(`localized-english-text: ${error.stack || error.message}`);
    process.exit(1);
});
