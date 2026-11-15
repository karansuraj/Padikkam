import { readFileSync } from 'node:fs';

/** The operator contact for the User-Agent: env var first, then the gitignored .env.wikimedia.local. */
export function loadContact(root) {
  if (process.env.WIKIMEDIA_CONTACT) return process.env.WIKIMEDIA_CONTACT;
  try {
    const line = readFileSync(`${root}.env.wikimedia.local`, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('WIKIMEDIA_CONTACT='));
    if (line) return line.slice('WIKIMEDIA_CONTACT='.length).trim();
  } catch {}
  throw new Error('Set WIKIMEDIA_CONTACT or create .env.wikimedia.local (gitignored). See docs/wikimedia-fetching.md.');
}
