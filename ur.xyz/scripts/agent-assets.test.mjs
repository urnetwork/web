// The agent assets an LLM tool reads out of context: the markdown twins and
// llms.txt / llms-full.txt (scripts/generate-agent-assets*.mjs).
//
//   node --test ../scripts/agent-assets.test.mjs      (from astro/, as `make gates` runs it)
//
// buildLlms runs against a minimal synthetic build (the pages it reads heads
// from, the machine-readable files) and the real docs corpus, so the checks
// are on what the generator writes, not on a particular day's content.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DOC_ORDER } from '../react/src/lib/docs-shared.js';
import { absoluteLinks, absoluteUrl, publishedImages } from './agent-markdown.mjs';
import { buildLlms } from './generate-agent-assets-llms.mjs';

test('absoluteLinks resolves root-relative and relative targets the way the page does', () => {
    const md = [
        'See the [operator list](/operators.yml) and [the validator guide](/docs/validator#before-you-start).',
        '![Android screenshot](DeleteAccountAndroid.webp)',
        '[a sibling guide](../validator/README.md "Validator")',
    ].join('\n');
    assert.equal(absoluteLinks(md, '/docs/support/delete.md'), [
        'See the [operator list](https://ur.xyz/operators.yml) and [the validator guide](https://ur.xyz/docs/validator#before-you-start).',
        '![Android screenshot](https://ur.xyz/docs/support/DeleteAccountAndroid.webp)',
        '[a sibling guide](https://ur.xyz/docs/validator/README.md "Validator")',
    ].join('\n'));
});

test('absoluteLinks leaves anchors, schemes and fenced code as written', () => {
    const md = [
        '[jump](#safety-rules) [mail](mailto:notice@example.invalid) [web](https://example.invalid/a) [proto](//example.invalid/b)',
        '```sh',
        'echo "[not a link](/inside/code)"',
        '```',
        '[after the fence](/docs)',
    ].join('\n');
    assert.equal(absoluteLinks(md, '/docs/miner/README.md'), md.replace('](/docs)', '](https://ur.xyz/docs)'));
    assert.equal(absoluteUrl('#x', '/docs/a.md'), '#x');
});

test('publishedImages is what the documents show, resolved as their pages resolve it', () => {
    const docs = [
        { rel: 'support/delete.md', body: '![a](shot.webp)\n\n```md\n![in code](code-only.webp)\n```\n![b](../shared/diagram.svg "Diagram")' },
        { rel: 'miner/README.md', body: '![remote](https://example.invalid/x.png) ![site](/docs/support/shot.webp) [a link](not-an-image.png)' },
    ];
    assert.deepEqual(publishedImages(docs), ['shared/diagram.svg', 'support/shot.webp']);
});

/** A synthetic build: the pages buildLlms reads and the machine-readable files. */
function fixtureBuild(run) {
    const dist = mkdtempSync(path.join(tmpdir(), 'ur-agent-assets-'));
    const page = (urlPath, title, description, graph = []) => {
        const file = path.join(dist, urlPath === '/' ? 'index.html' : `${urlPath.slice(1)}.html`);
        mkdirSync(path.dirname(file), { recursive: true });
        const ld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
        writeFileSync(file, `<!doctype html><html lang="en"><head><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="https://ur.xyz${urlPath}"><script type="application/ld+json">${ld}</script></head><body><main><h1>${title}</h1></main></body></html>`);
    };
    const file = (rel, text) => {
        mkdirSync(path.dirname(path.join(dist, rel)), { recursive: true });
        writeFileSync(path.join(dist, rel), text);
    };
    try {
        page('/', 'UR | Fixture home', 'Fixture home description.');
        for (const slug of DOC_ORDER) {
            page(`/docs/${slug}`, `Fixture ${slug} — UR Docs`, `Fixture ${slug} description.`, [{ '@type': 'TechArticle', dateModified: '2026-01-02' }]);
        }
        file('.well-known/security.txt', 'Contact: mailto:security@example.invalid\nContact: https://ur.xyz/vdp\n');
        file('operators.yml', 'operators: []\n');
        file('price.yml', 'sn: 25\n');
        file('price.rss', '<rss version="2.0"></rss>\n');
        run(buildLlms(dist));
    } finally {
        rmSync(dist, { recursive: true, force: true });
    }
}

test('llms.txt lists the machine-readable files, the source repository and the security contact', () => {
    fixtureBuild(({ llms }) => {
        const machine = llms.slice(llms.indexOf('## Machine-readable'), llms.indexOf('## Pages'));
        for (const url of [
            'https://ur.xyz/operators.yml',
            'https://ur.xyz/price.yml',
            'https://ur.xyz/price.rss',
            'https://ur.xyz/.well-known/security.txt',
            'mailto:security@example.invalid',
            'https://github.com/urfoundation/sn)',
            'https://github.com/urfoundation/sn/blob/main/WHITEPAPER.md',
        ]) {
            assert.ok(machine.includes(url), `the Machine-readable section does not list ${url}`);
        }
    });
});

test('llms-full.txt marks each document with its page and says where each docs document lives', () => {
    fixtureBuild(({ full }) => {
        // a document's own horizontal rule (the litepaper has one) is not a boundary
        assert.ok(!/\n\n---\n\n<!-- source:/.test(full), 'a --- separator is still written between documents');
        for (const slug of DOC_ORDER) {
            const url = `https://ur.xyz/docs/${slug}`;
            const header = new RegExp(`<!-- source: ${url} -->\\n\\n# [^\\n]+\\n\\nSource: ${url} · Markdown: https://ur.xyz/docs-md/${slug}\\.md · Updated: 2026-01-02\\n`);
            assert.match(full, header, `${slug}: no source marker and Source line under its H1`);
        }
        const marks = full.match(/^<!-- source: \S+ -->$/gm) || [];
        assert.ok(marks.length > DOC_ORDER.length, 'the investor materials carry no source marker');
    });
});

test('llms-full.txt carries no link relative to a page', () => {
    fixtureBuild(({ full }) => {
        const prose = full.replace(/^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm, '');
        const relative = [...prose.matchAll(/\]\(([^)\s]+)/g)].map((m) => m[1]).filter((t) => !/^(?:https?:|mailto:|#)/.test(t));
        assert.deepEqual(relative, []);
    });
});
