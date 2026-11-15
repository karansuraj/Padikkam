import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateDeck } from './deck';
import { LETTERS, LETTER_BY_ID } from '../data/letters';
import { LESSONS } from '../data/lessons';

const hex = (s: string) =>
  [...s].map((c) => c.codePointAt(0)!.toString(16).padStart(4, '0')).join('_');

const manifest: { letter: string }[] = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../assets/audio/letters/manifest.json', import.meta.url)),
    'utf8',
  ),
);

describe('letters', () => {
  it('has 58 letters, all formal, unverified, kind letter', () => {
    expect(LETTERS).toHaveLength(58);
    for (const l of LETTERS) {
      expect(l.kind).toBe('letter');
      expect(l.register).toBe('formal');
      expect(l.provenance).toBe('unverified');
    }
  });

  it('roman is ASCII and unique', () => {
    const romans = LETTERS.map((l) => l.roman);
    for (const r of romans) expect(r).toMatch(/^[\x20-\x7E]+$/);
    expect(new Set(romans).size).toBe(romans.length);
  });

  it('ids and audio paths derive from code points', () => {
    for (const l of LETTERS) {
      expect(l.id).toBe(`letter:${hex(l.ml)}`);
      expect(l.audio).toBe(`letters/u${hex(l.ml)}.wav`);
    }
    expect(LETTER_BY_ID.get('letter:0d15')?.ml).toBe('ക');
    expect(LETTER_BY_ID.get('letter:0d31_0d4d_0d31')?.ml).toBe('റ്റ');
  });

  it('letters match manifest.json exactly', () => {
    expect(new Set(LETTERS.map((l) => l.ml))).toEqual(new Set(manifest.map((m) => m.letter)));
  });

  it('validateDeck reports no problems', () => {
    expect(validateDeck(LETTERS)).toEqual([]);
  });
});

describe('lessons', () => {
  it('has 11 lessons l01..l11 with the planned sizes', () => {
    expect(LESSONS.map((l) => l.id)).toEqual(
      Array.from({ length: 11 }, (_, i) => `l${String(i + 1).padStart(2, '0')}`),
    );
    expect(LESSONS.map((l) => l.letterIds.length)).toEqual([6, 8, 5, 5, 5, 5, 5, 4, 4, 6, 5]);
  });

  it('puts every letter in exactly one lesson', () => {
    const all = LESSONS.flatMap((l) => l.letterIds);
    expect(all).toHaveLength(58);
    expect(new Set(all)).toEqual(new Set(LETTERS.map((l) => l.id)));
  });
});
