#!/usr/bin/env node
/**
 * sync-operators — publish the network operator list.
 *
 * Copies operators.yml from the sn repo into the site, byte for byte, and fans
 * it out to both app public/ directories, so the site serves it at
 * https://ur.xyz/operators.yml:
 *
 *   sn/operators.yml ──▶ operators/operators.yml       (canonical tracked copy)
 *                        astro/public/operators.yml
 *                        react/public/operators.yml
 *
 * Miners (`provider provide --all-operators`) and validators
 * (`validator run --operators-refresh`) fetch the published list and parse it
 * strictly (package operatorlist in the sn repo; the contract is
 * sn/docs/OPERATOR-DISCOVERY.md). The copies are never rewritten, so the
 * digest a client reports is sha256 of sn/operators.yml.
 *
 * The sn checkout is located via $SN_DIR (default: ../../sn, as for
 * sync-price.mjs). When the sn repo is not present, the checked-in copy is
 * kept and re-published to both public/ directories.
 *
 * Nothing in the build runs this. Like sync-price.mjs, run it by hand when
 * sn/operators.yml changes and commit the three copies:
 *
 *   node scripts/sync-operators.mjs
 *   SN_DIR=/path/to/sn node scripts/sync-operators.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from '../react/src/lib/yaml.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SN_DIR = process.env.SN_DIR || path.resolve(ROOT, '../../sn');

// operatorlist.Schema and operatorlist.MaximumBytes in the sn repo.
const SCHEMA = 'urnetwork-operators-v1';
const MAXIMUM_BYTES = 64 * 1024;
// The top-level schema line, which web/nginx-smoke-test.sh also looks for in
// the served file.
const SCHEMA_LINE = new RegExp(`^schema: ${SCHEMA}(?:[ \\t]+(?:#.*)?)?\\r?$`, 'm');

const CANONICAL = path.join(ROOT, 'operators', 'operators.yml');
const PUBLIC_DIRS = [
    path.join(ROOT, 'astro', 'public'),
    path.join(ROOT, 'react', 'public')
];

function log(msg) {
    console.log(`[sync-operators] ${msg}`);
}

function fail(msg) {
    console.error(`[sync-operators] ${msg}`);
    process.exit(1);
}

/** The current list, as bytes: prefer the sn repo, fall back to the tracked copy. */
function loadList() {
    const snFile = path.join(SN_DIR, 'operators.yml');
    if (fs.existsSync(snFile)) {
        log(`reading ${snFile}`);
        return fs.readFileSync(snFile);
    }
    if (fs.existsSync(CANONICAL)) {
        log(`sn repo not found at ${SN_DIR}; keeping checked-in operators/operators.yml`);
        return fs.readFileSync(CANONICAL);
    }
    fail(`no operators.yml at ${snFile} and no checked-in copy at ${CANONICAL}`);
}

/**
 * Fail loudly rather than publish a list every client would refuse. The sn
 * parser stays the authority on domains, URLs and uniqueness (sn's tests run
 * it on operators.yml); this keeps an empty, oversized or foreign file off the
 * site. Returns the operator count.
 */
function validate(bytes) {
    if (bytes.length === 0 || bytes.length > MAXIMUM_BYTES) {
        fail(`operators.yml is ${bytes.length} bytes, outside 1 to ${MAXIMUM_BYTES} — not publishing`);
    }
    const text = bytes.toString('utf8');
    if (!SCHEMA_LINE.test(text)) {
        fail(`operators.yml has no top-level "schema: ${SCHEMA}" line — not publishing`);
    }
    let list;
    try {
        list = parseYaml(text);
    } catch (err) {
        fail(`operators.yml does not parse (${err.message}) — not publishing`);
    }
    const operators = list.operators;
    const valid = list.schema === SCHEMA && Array.isArray(operators) && operators.length > 0 &&
        operators.every(o => o && typeof o === 'object' &&
            ['domain', 'api_url', 'connect_url'].every(k => typeof o[k] === 'string' && o[k] !== ''));
    if (!valid) {
        fail('operators.yml needs a non-empty "operators" list, each with domain, api_url and connect_url — not publishing');
    }
    return operators.length;
}

function main() {
    const bytes = loadList();
    const count = validate(bytes);

    fs.mkdirSync(path.dirname(CANONICAL), { recursive: true });
    fs.writeFileSync(CANONICAL, bytes);

    for (const dir of PUBLIC_DIRS) {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'operators.yml'), bytes);
        log(`published ${path.relative(ROOT, dir)}/operators.yml`);
    }

    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    log(`${count} ${count === 1 ? 'operator' : 'operators'}, sha256 ${digest}`);
}

main();
