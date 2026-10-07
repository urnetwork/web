// The docs search shared by the SPA's explorer and the static docs pages'
// search box (src/lib/docs-search.js): the index the static build publishes
// as /docs-search.json keeps each word once, and matches what the full text
// would match.
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSearchIndex, searchDocs } from '../src/lib/docs-search.js';

const docs = [
    { slug: 'miner', path: 'miner/README.md', title: 'How to run a miner', text: 'A miner supplies an exit. The miner registers a payout wallet; the miner claims rewards.' },
    { slug: 'validator', path: 'validator/README.md', title: 'How to run a validator', text: 'A validator measures miners and submits weights through commit-reveal.' },
    { slug: 'legal/terms', path: 'legal/terms.md', title: 'Terms of Service', text: 'These terms govern the site.' },
];
const hrefOf = (d) => (d.slug === 'legal/terms' ? '/terms' : `/docs/${d.slug}`);

test('an entry leads to the document\'s URL and keeps each word of what a reader sees once', () => {
    const [miner] = buildSearchIndex(docs, hrefOf);
    assert.equal(miner.href, '/docs/miner');
    assert.equal(miner.subtitle, '/docs/miner');
    const words = miner.haystack.split(' ');
    assert.equal(new Set(words).size, words.length);
    assert.ok(words.includes('miner/readme.md') && words.includes('wallet;'));
});

test('a query matches what the full text matches, every token within a word', () => {
    const index = buildSearchIndex(docs, hrefOf);
    const full = (q) => docs.filter((d) => q.toLowerCase().split(/\s+/).filter(Boolean)
        .every((t) => `${d.title} ${d.path} ${d.text}`.toLowerCase().includes(t))).map((d) => d.slug).sort();
    for (const q of ['miner', 'valid', 'commit-reveal', 'payout wallet', 'wallet;', 'terms', 'readme', 'nothing-like-this']) {
        assert.deepEqual(searchDocs(index, q)?.map((e) => e.slug).sort() ?? [], full(q), q);
    }
});

test('results rank title matches first, and an empty query lists nothing', () => {
    const index = buildSearchIndex(docs, hrefOf);
    assert.deepEqual(searchDocs(index, 'miner').map((e) => e.slug), ['miner', 'validator']);
    assert.equal(searchDocs(index, '   '), null);
    const many = buildSearchIndex(Array.from({ length: 30 }, (_, i) => ({ slug: `d${i}`, path: `d${i}.md`, title: `Doc ${i}`, text: 'shared' })), (d) => `/docs/${d.slug}`);
    assert.equal(searchDocs(many, 'shared').length, 24);
});
