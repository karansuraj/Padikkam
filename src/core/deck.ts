import type { Entry } from './types';

export interface ValidationIssue {
  id: string;
  problem: string;
}

// Malayalam block is U+0D00 to U+0D7F. Zero-width joiner/non-joiner (U+200C,
// U+200D) are legitimately used inside Malayalam words (chillu letters,
// conjunct control), so they are allowed.
const MALAYALAM_CHAR = /[ഀ-ൿ‌‍]/;
const LATIN_ONLY = /^[\x20-\x7E]+$/;

/**
 * Sanity checks for hand-edited or LLM-generated deck files. This does not
 * check that the Malayalam is correct, only that the data is well formed.
 */
export function validateDeck(entries: Entry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.id)) issues.push({ id: e.id, problem: 'duplicate id' });
    seen.add(e.id);
    if (!MALAYALAM_CHAR.test(e.ml)) {
      issues.push({ id: e.id, problem: 'ml field has no Malayalam characters' });
    }
    if (e.roman && !LATIN_ONLY.test(e.roman)) {
      issues.push({ id: e.id, problem: 'roman field should be plain ASCII' });
    }
    if (!e.en.trim()) issues.push({ id: e.id, problem: 'missing English gloss' });
    if (e.register === 'spoken' && e.provenance === 'unverified' && e.kind !== 'letter') {
      // Not an error, but spoken Malayalam is where models are weakest.
      issues.push({ id: e.id, problem: 'spoken entry still unverified' });
    }
  }
  return issues;
}

/** Pick entries for a session without mixing registers unless asked to. */
export function filterByRegister(entries: Entry[], register: Entry['register'] | 'both'): Entry[] {
  return register === 'both' ? entries : entries.filter((e) => e.register === register);
}
