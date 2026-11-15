import { describe, expect, it } from 'vitest';
import { tidyGloss } from './gloss';
import { VOCAB } from '../data/vocab';

describe('tidyGloss', () => {
  it('leaves a short gloss alone', () => {
    expect(tidyGloss('mother')).toBe('mother');
    expect(tidyGloss('water; water for dinking')).toBe('water; water for dinking');
  });

  it('removes Wikidata editor notes that mention item ids', () => {
    expect(
      tidyGloss('market; mechanisms whereby supply and demand (for physical venues, use Q132510 or Q330284)'),
    ).toBe('market; mechanisms whereby supply and demand');
  });

  it('keeps at most the first three meanings', () => {
    expect(tidyGloss('a; b; c; d; e')).toBe('a; b; c');
  });

  it('shortens a very long gloss at a word boundary with an ellipsis', () => {
    const long = 'to bite; to snack; ' + 'word '.repeat(60); // the third meaning is very long
    const out = tidyGloss(long);
    expect(out.length).toBeLessThanOrEqual(90);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });

  it('trims whitespace and tolerates an empty gloss', () => {
    expect(tidyGloss('  big, large  ')).toBe('big, large');
    expect(tidyGloss('')).toBe('');
  });
});

describe('deck glosses shown to the learner', () => {
  it('are short and free of Wikidata ids', () => {
    for (const e of VOCAB) {
      expect(e.en.length, e.id).toBeLessThanOrEqual(90);
      expect(e.en, e.id).not.toMatch(/\bQ\d{3,}\b/);
      expect(e.en.trim(), e.id).not.toBe('');
    }
  });
});
