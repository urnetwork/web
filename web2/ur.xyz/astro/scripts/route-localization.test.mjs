import assert from 'node:assert/strict';
import test from 'node:test';

import {
    basePathFor,
    hasLocalizedVersion,
    langForPath,
    publicPathFor,
    resolveLanguageDestination,
    routeAvailability,
} from '../src/lib/route-localization.js';

test('localized metadata is emitted only for routes with translated pages', () => {
    for (const path of ['/', '/operators', '/miners', '/validators', '/research']) {
        assert.equal(hasLocalizedVersion(path), true, path);
        assert.equal(hasLocalizedVersion(`/de${path === '/' ? '' : path}`), true, `/de${path}`);
    }

    for (const path of ['/about', '/build', '/docs', '/docs/litepaper', '/investors', '/terms', '/privacy', '/vdp', '/audits/report.pdf', '/future-page']) {
        assert.equal(hasLocalizedVersion(path), false, path);
        assert.equal(hasLocalizedVersion(`/es${path}`), false, `/es${path}`);
    }
});

test('language destinations preserve page identity and URL state', () => {
    assert.deepEqual(
        resolveLanguageDestination('https://ur.xyz/operators?view=map#europe', 'de'),
        {
            kind: 'translated',
            basePath: '/operators',
            canonicalPath: '/operators',
            requestedLang: 'de',
            href: '/de/operators?view=map#europe',
        },
    );
    assert.equal(resolveLanguageDestination('/es/operators', 'en').href, '/operators');
    assert.equal(resolveLanguageDestination('/de', 'ar').href, '/ar');
    assert.equal(resolveLanguageDestination('/future-page?x=1#keep', 'de').href, '/future-page?x=1#keep');
    assert.equal(routeAvailability('/future-page').kind, 'unknown');
});

test('English-only routes never manufacture localized pages', () => {
    for (const path of [
        '/about',
        '/build',
        '/docs',
        '/docs/protocol/protocol-research',
        '/investors',
        '/investors/deck',
        '/investors/our-letter-to-bittensor',
        '/terms',
        '/privacy',
        '/vdp',
    ]) {
        assert.equal(routeAvailability(path).kind, 'english-only', path);
        assert.equal(resolveLanguageDestination(path, 'ar').href, path, path);
    }
});

test('legacy aliases resolve to the corresponding English document', () => {
    assert.equal(resolveLanguageDestination('/docs/whitepaper#intro', 'de').href, '/docs/litepaper#intro');
    assert.equal(
        resolveLanguageDestination('/investors/august-investment-letter', 'ar').href,
        '/investors/our-letter-to-bittensor',
    );
});

test('route metadata normalizes build paths and locale prefixes', () => {
    assert.equal(publicPathFor('/de/research.html?preview=1#top'), '/de/research');
    assert.equal(publicPathFor('/index.html'), '/');
    assert.equal(langForPath('/ar/terms.html'), 'ar');
    assert.equal(langForPath('/about'), 'en');
    assert.equal(basePathFor('/zh/operators.html'), '/operators');
    assert.equal(basePathFor('/es'), '/');
});
