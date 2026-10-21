// A multi-page guide's chapters (DOC_CHAPTERS, docs-shared.js) are files in
// docs/<guide>/, and the reading order puts each guide's chapters right after it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DOC_CHAPTERS, DOC_ORDER, chapterSlugs, isChapterSlug, withChapters } from '../src/lib/docs-shared.js';

const DOCS_DIR = fileURLToPath(new URL('../../docs/', import.meta.url));

test('every chapter is a document in its guide\'s folder', () => {
    for (const guide of Object.keys(DOC_CHAPTERS)) {
        assert.ok(DOC_ORDER.includes(guide), `${guide}: chapters for a guide that is not in DOC_ORDER`);
        assert.ok(existsSync(`${DOCS_DIR}${guide}/README.md`), `${guide}: no docs/${guide}/README.md`);
        for (const slug of chapterSlugs(guide)) {
            assert.ok(existsSync(`${DOCS_DIR}${slug}.md`), `${slug}: no docs/${slug}.md`);
        }
    }
});

test('the reading order follows each guide with its chapters', () => {
    const order = withChapters(DOC_ORDER);
    for (const guide of Object.keys(DOC_CHAPTERS)) {
        const at = order.indexOf(guide);
        assert.deepEqual(order.slice(at + 1, at + 1 + chapterSlugs(guide).length), chapterSlugs(guide));
    }
    assert.equal(order.length, new Set(order).size, 'a slug appears twice in the reading order');
});

test('only chapters count as chapters', () => {
    assert.ok(isChapterSlug('miner/install'));
    for (const slug of DOC_ORDER) assert.ok(!isChapterSlug(slug), `${slug} is a guide, not a chapter`);
    assert.ok(!isChapterSlug('support/delete'));
});
