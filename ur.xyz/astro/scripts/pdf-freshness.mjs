import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export function investorLetterMetadata(source) {
  const match = source.replace(/\r\n/g, '\n').match(/^const letter = \{[\s\S]*?^\};/m);
  if (!match) throw new Error('August letter metadata not found in the investor registry');
  return match[0];
}

// A selector dates one document within a shared file. Walk its history until
// that document differs, ignoring commits and local edits to other entries.
// Without a selector, retain the whole-file date check for the letter body.
export function contentDay(root, rel, select) {
  const git = (args) => execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  const selected = select ? select(readFileSync(path.join(root, rel), 'utf8')) : null;
  try {
    if (select) {
      const history = git(['log', '--format=%H%x09%cs', '--', rel]);
      let lastMatchingDate;
      for (const entry of history.split('\n').filter(Boolean)) {
        const [revision, date] = entry.split('\t');
        const source = git(['show', `${revision}:./${rel}`]);
        let previous;
        try {
          previous = select(source);
        } catch {
          // The document had not yet been added to this historical version.
          break;
        }
        if (previous !== selected) break;
        lastMatchingDate = date;
      }
      if (lastMatchingDate) return lastMatchingDate;
    } else if (!git(['status', '--porcelain', '--', rel])) {
      const committed = git(['log', '-1', '--format=%cs', '--', rel]);
      if (committed) return committed;
    }
  } catch {
    // Without Git, fall back to the file's date.
  }
  const modified = statSync(path.join(root, rel)).mtime;
  return `${modified.getFullYear()}-${String(modified.getMonth() + 1).padStart(2, '0')}-${String(modified.getDate()).padStart(2, '0')}`;
}
