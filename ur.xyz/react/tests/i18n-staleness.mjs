// Dictionary staleness check for the ur.xyz translations.
//
// en.js is the canonical copy; ru/ar/zh/de/es mirror it key for key. A
// translation goes stale silently when the English under it changes (the
// research competition copy kept "by the end of the month with the 25 launch"
// in five languages long after English moved on). So every translated key
// records the hash of the English it was translated from, in
// src/i18n/source-hashes.json next to the dictionaries, and this check fails
// when:
//
//   • a key exists in English but not in a translation, or the reverse;
//   • English changed after the translation was made (the recorded hash no
//     longer matches the current English);
//   • a translated key has no recorded source at all (a new key).
//
// After updating a translation to the current English, record it:
//
//   node tests/i18n-staleness.mjs --accept de miners.intro nav.tagline
//   node tests/i18n-staleness.mjs --accept de          (every key of de — after a full review)
//   node tests/i18n-staleness.mjs --accept all         (every key of every language — seeding)
//
// Usage: node tests/i18n-staleness.mjs [--accept <lang|all> [key ...]]
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const I18N = path.join(__dirname, '../src/i18n');
const STORE = path.join(I18N, 'source-hashes.json');
const LANGS = ['ru', 'ar', 'zh', 'de', 'es'];

function flatten(value, prefix = '', out = new Map()) {
    if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${prefix}.${i}`, out));
    else if (value && typeof value === 'object') {
        for (const [key, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${key}` : key, out);
    } else out.set(prefix, value);
    return out;
}

async function dictionary(code) {
    return flatten((await import(path.join(I18N, `${code}.js`))).default);
}

const hash = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 12);

function readStore() {
    if (!fs.existsSync(STORE)) return {};
    return JSON.parse(fs.readFileSync(STORE, 'utf8'));
}

function writeStore(store) {
    const out = {
        about: 'sha256 (first 12 hex) of the English each translation was made from, per language and key. '
            + 'Checked by tests/i18n-staleness.mjs; after updating a translation run '
            + '`node tests/i18n-staleness.mjs --accept <lang> <key> ...` (from react/).',
    };
    for (const lang of LANGS) {
        const entries = Object.entries(store[lang] || {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        out[lang] = Object.fromEntries(entries);
    }
    fs.writeFileSync(STORE, `${JSON.stringify(out, null, 2)}\n`);
}

async function main() {
    const en = await dictionary('en');
    const english = new Map([...en].filter(([, value]) => typeof value === 'string'));
    const store = readStore();

    const acceptAt = process.argv.indexOf('--accept');
    if (acceptAt !== -1) {
        const target = process.argv[acceptAt + 1];
        const keys = process.argv.slice(acceptAt + 2);
        const langs = target === 'all' ? LANGS : [target];
        if (!target || langs.some((lang) => !LANGS.includes(lang))) {
            console.error(`i18n-staleness: --accept takes one of ${LANGS.join(', ')} or all`);
            process.exit(2);
        }
        for (const key of keys) {
            if (!english.has(key)) {
                console.error(`i18n-staleness: ${key} is not an English string key`);
                process.exit(2);
            }
        }
        for (const lang of langs) {
            const recorded = store[lang] || {};
            for (const key of keys.length ? keys : english.keys()) recorded[key] = hash(english.get(key));
            // drop keys English no longer has
            for (const key of Object.keys(recorded)) if (!english.has(key)) delete recorded[key];
            store[lang] = recorded;
        }
        writeStore(store);
        console.log(`i18n-staleness: recorded ${keys.length || english.size} key(s) for ${langs.join(', ')}`);
        return;
    }

    const problems = [];
    for (const lang of LANGS) {
        const dict = await dictionary(lang);
        const recorded = store[lang] || {};
        const stale = [];
        for (const key of en.keys()) if (!dict.has(key)) problems.push(`${lang}: missing ${key} (in en.js)`);
        for (const key of dict.keys()) if (!en.has(key)) problems.push(`${lang}: ${key} is not in en.js`);
        for (const [key, value] of english) {
            if (!dict.has(key)) continue;
            if (!(key in recorded)) {
                problems.push(`${lang}: ${key} has no recorded English source (new key?)`);
                stale.push(key);
            } else if (recorded[key] !== hash(value)) {
                problems.push(`${lang}: ${key} is stale: English changed after it was translated`);
                stale.push(key);
            }
        }
        for (const key of Object.keys(recorded)) {
            if (!english.has(key)) problems.push(`${lang}: source-hashes.json records ${key}, which en.js no longer has`);
        }
        if (stale.length) {
            problems.push(`  → once ${lang}.js matches the current English: node tests/i18n-staleness.mjs --accept ${lang} ${stale.join(' ')}`);
        }
    }

    if (problems.length) {
        console.error(`i18n-staleness: ${problems.filter((p) => !p.startsWith('  →')).length} problem(s)`);
        for (const problem of problems) console.error(`  ${problem}`);
        process.exit(1);
    }
    console.log(`i18n-staleness: ${english.size} English strings, ${LANGS.length} translations, all current`);
}

main().catch((error) => {
    console.error(`i18n-staleness: ${error.stack || error.message}`);
    process.exit(1);
});
