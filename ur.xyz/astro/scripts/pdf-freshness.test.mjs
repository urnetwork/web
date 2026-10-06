import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { contentDay, investorLetterMetadata } from './pdf-freshness.mjs';

const metadata = (title = 'Original letter', other = 'Original deck') =>
  `const deck = { title: '${other}' };\nconst letter = {\n    title: '${title}',\n    date: '18 August 2026',\n};\n`;

function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'ur-pdf-freshness-'));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  const commit = (day) => {
    git('add', '.');
    execFileSync('git', ['-C', root, '-c', 'commit.gpgsign=false', 'commit', '-m', 'Fixture content'], {
      env: { ...process.env, GIT_AUTHOR_DATE: `${day}T12:00:00Z`, GIT_COMMITTER_DATE: `${day}T12:00:00Z` },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  };
  const write = (value) => {
    writeFileSync(path.join(root, 'investors.js'), value);
    const modified = new Date(2026, 0, 5, 12);
    utimesSync(path.join(root, 'investors.js'), modified, modified);
  };
  try {
    git('init');
    git('config', 'user.name', 'PDF freshness test');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'core.autocrlf', 'false');
    git('config', 'core.hooksPath', path.join(root, 'no-hooks'));
    write(metadata());
    writeFileSync(path.join(root, 'letter.jsx'), 'Original letter body');
    commit('2026-01-01');
    writeFileSync(path.join(root, 'letter.pdf'), 'Fixture PDF');
    commit('2026-01-03');
    run({ root, write, commit });
  } finally {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
    assert.ok(path.basename(resolved).startsWith('ur-pdf-freshness-'));
    rmSync(resolved, { recursive: true, force: true });
  }
}

test('another committed Investor Centre entry does not stale the letter PDF', () => fixture(({ root, write, commit }) => {
  write(metadata('Original letter', 'Updated deck'));
  commit('2026-01-04');
  assert.equal(contentDay(root, 'investors.js', investorLetterMetadata), '2026-01-01');
  assert.equal(contentDay(root, 'letter.pdf'), '2026-01-03');
}));

test('another uncommitted entry does not stale the letter PDF', () => fixture(({ root, write }) => {
  write(metadata('Original letter', 'Local deck edit'));
  assert.equal(contentDay(root, 'investors.js', investorLetterMetadata), '2026-01-01');
}));

test('committed edits to this letter metadata still stale its PDF', () => fixture(({ root, write, commit }) => {
  write(metadata('Updated letter'));
  commit('2026-01-05');
  assert.equal(contentDay(root, 'investors.js', investorLetterMetadata), '2026-01-05');
  assert.ok(contentDay(root, 'investors.js', investorLetterMetadata) > contentDay(root, 'letter.pdf'));
}));

test('uncommitted edits to this letter metadata still stale its PDF', () => fixture(({ root, write }) => {
  write(metadata('Updated letter'));
  assert.equal(contentDay(root, 'investors.js', investorLetterMetadata), '2026-01-05');
}));

test('reverting letter metadata is still a content change', () => fixture(({ root, write, commit }) => {
  write(metadata('Updated letter'));
  commit('2026-01-04');
  write(metadata());
  commit('2026-01-06');
  assert.equal(contentDay(root, 'investors.js', investorLetterMetadata), '2026-01-06');
}));

test('line endings do not change the selected letter metadata date', () => fixture(({ root, write }) => {
  write(metadata().replace(/\n/g, '\r\n'));
  assert.equal(contentDay(root, 'investors.js', investorLetterMetadata), '2026-01-01');
}));

test('letter body changes remain tracked independently', () => fixture(({ root, commit }) => {
  writeFileSync(path.join(root, 'letter.jsx'), 'Updated letter body');
  commit('2026-01-05');
  assert.ok(contentDay(root, 'letter.jsx') > contentDay(root, 'letter.pdf'));
}));

test('missing letter metadata fails explicitly', () => {
  assert.throws(() => investorLetterMetadata('const deck = {};'), /metadata not found/);
});
