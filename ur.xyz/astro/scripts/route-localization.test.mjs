import assert from 'node:assert/strict';
import test from 'node:test';

import {
    LOCALIZED_BASE_PATHS,
    basePathFor,
    hasLocalizedVersion,
    langForPath,
    localizedPathFor,
    publicPathFor,
    storedLanguageRedirectScript,
    storedLanguageTarget,
} from '../src/lib/route-localization.js';

const TRANSLATED = ['/', '/operators', '/miners', '/validators', '/research'];
// English-only by design: the legal documents (a translated contract would be
// a different contract), the docs, and the about / build / investor pages.
const ENGLISH_ONLY = [
    '/terms', '/privacy', '/vdp',
    '/about', '/build', '/docs', '/docs/litepaper', '/investors', '/investors/deck', '/investors/letter-to-tokenholders-september-2026',
    '/audits/report.pdf', '/future-page',
];

test('localized metadata is emitted only for routes with translated pages', () => {
    assert.deepEqual([...LOCALIZED_BASE_PATHS], TRANSLATED);
    for (const path of TRANSLATED) {
        assert.equal(hasLocalizedVersion(path), true, path);
        assert.equal(hasLocalizedVersion(`/de${path === '/' ? '' : path}`), true, `/de${path}`);
    }

    for (const path of ENGLISH_ONLY) {
        assert.equal(hasLocalizedVersion(path), false, path);
        assert.equal(hasLocalizedVersion(`/es${path}`), false, `/es${path}`);
    }
});

test('route metadata normalizes build paths and locale prefixes', () => {
    assert.equal(publicPathFor('/de/research.html?preview=1#top'), '/de/research');
    assert.equal(publicPathFor('/index.html'), '/');
    assert.equal(langForPath('/ar/miners.html'), 'ar');
    assert.equal(langForPath('/about'), 'en');
    assert.equal(basePathFor('/zh/operators.html'), '/operators');
    assert.equal(basePathFor('/es'), '/');
});

test('a language switch keeps the page when it is translated, else lands on that language home', () => {
    assert.equal(localizedPathFor('/miners', 'de'), '/de/miners');
    assert.equal(localizedPathFor('/de/miners', 'en'), '/miners');
    assert.equal(localizedPathFor('/de/miners.html', 'ar'), '/ar/miners');
    assert.equal(localizedPathFor('/', 'zh'), '/zh');
    assert.equal(localizedPathFor('/ru', 'en'), '/');
    assert.equal(localizedPathFor('/terms', 'de'), '/de');
    assert.equal(localizedPathFor('/docs/litepaper', 'es'), '/es');
    assert.equal(localizedPathFor('/about', 'en'), '/');
    assert.equal(localizedPathFor('/miners', 'xx'), '/miners');
});

test('a stored language choice moves only bare URLs of translated pages', () => {
    assert.equal(storedLanguageTarget('/miners', 'de'), '/de/miners');
    assert.equal(storedLanguageTarget('/', 'ar'), '/ar');
    assert.equal(storedLanguageTarget('/index.html', 'zh'), '/zh');
    // English never redirects; nor does an unknown or missing choice
    assert.equal(storedLanguageTarget('/miners', 'en'), null);
    assert.equal(storedLanguageTarget('/miners', null), null);
    assert.equal(storedLanguageTarget('/miners', 'xx'), null);
    // a /<lang>/ URL names its language and wins
    assert.equal(storedLanguageTarget('/de/miners', 'es'), null);
    assert.equal(storedLanguageTarget('/de', 'es'), null);
    // pages without a translation stay put
    for (const path of ENGLISH_ONLY) assert.equal(storedLanguageTarget(path, 'de'), null, path);
    // no loop: every target is itself a URL the rule leaves alone
    for (const path of TRANSLATED) {
        const target = storedLanguageTarget(path, 'ru');
        assert.equal(storedLanguageTarget(target, 'ru'), null, target);
    }
});

test('the inline redirect script agrees with storedLanguageTarget', () => {
    const script = storedLanguageRedirectScript();
    const run = (pathname, stored, { search = '', hash = '', throws = false } = {}) => {
        let replaced = null;
        const localStorage = { getItem: () => { if (throws) throw new Error('blocked'); return stored; } };
        const location = { pathname, search, hash, replace: (url) => { replaced = url; } };
        new Function('localStorage', 'location', script)(localStorage, location);
        return replaced;
    };
    for (const lang of [null, 'en', 'de', 'ar', 'xx']) {
        for (const path of [...TRANSLATED, ...ENGLISH_ONLY, '/de/miners', '/zh', '/index.html', '/miners.html', '/miners/']) {
            assert.equal(run(path, lang), storedLanguageTarget(path, lang), `${lang} ${path}`);
        }
    }
    assert.equal(run('/research', 'es', { search: '?q=1', hash: '#papers' }), '/es/research?q=1#papers');
    assert.equal(run('/research', 'es', { throws: true }), null);
});
