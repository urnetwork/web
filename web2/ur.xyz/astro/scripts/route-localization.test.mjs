import assert from 'node:assert/strict';
import test from 'node:test';

import {
    basePathFor,
    hasLocalizedVersion,
    langForPath,
    publicPathFor,
} from '../src/lib/route-localization.js';

test('localized metadata is emitted only for routes with translated pages', () => {
    for (const path of ['/', '/operators', '/miners', '/validators', '/research', '/terms', '/privacy', '/vdp']) {
        assert.equal(hasLocalizedVersion(path), true, path);
        assert.equal(hasLocalizedVersion(`/de${path === '/' ? '' : path}`), true, `/de${path}`);
    }

    for (const path of ['/about', '/build', '/docs', '/docs/litepaper', '/investors', '/audits/report.pdf', '/future-page']) {
        assert.equal(hasLocalizedVersion(path), false, path);
        assert.equal(hasLocalizedVersion(`/es${path}`), false, `/es${path}`);
    }
});

test('route metadata normalizes build paths and locale prefixes', () => {
    assert.equal(publicPathFor('/de/research.html?preview=1#top'), '/de/research');
    assert.equal(publicPathFor('/index.html'), '/');
    assert.equal(langForPath('/ar/terms.html'), 'ar');
    assert.equal(langForPath('/about'), 'en');
    assert.equal(basePathFor('/zh/operators.html'), '/operators');
    assert.equal(basePathFor('/es'), '/');
});
