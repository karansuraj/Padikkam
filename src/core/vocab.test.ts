import { describe, expect, it } from 'vitest';
import { validateDeck } from './deck';
import { transliterate } from './translit';
import { LETTERS } from '../data/letters';
import { TOPICS, VOCAB, VOCAB_BY_ID } from '../data/vocab';

describe('vocab deck', () => {
  it('has a real starter deck', () => {
    expect(VOCAB.length).toBeGreaterThan(250);
  });

  it('entries are valid (validateDeck reports nothing)', () => {
    expect(validateDeck(VOCAB)).toEqual([]);
  });

  it('ids are unique and look like word:L<digits>', () => {
    const ids = VOCAB.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^word:L\d+$/);
    expect(VOCAB_BY_ID.get(ids[0])).toBe(VOCAB[0]);
  });

  it('every word is a neutral, dataset-sourced word with a plain ASCII romanization from the transliterator', () => {
    for (const e of VOCAB) {
      expect(e.kind).toBe('word');
      expect(e.register).toBe('neutral');
      expect(e.provenance).toBe('dataset');
      expect(e.roman).toBe(transliterate(e.ml));
      expect(e.roman).toMatch(/^[\x20-\x7E]+$/);
      expect(e.source).toMatch(/Wikidata lexeme L\d+/);
    }
  });

  it('audio paths look like words/L<digits>.wav (Ogg is not bundled or played on every platform)', () => {
    for (const e of VOCAB) expect(e.audio).toMatch(/^words\/L\d+\.wav$/);
  });

  it('no word is just a letter of the alphabet', () => {
    const letters = new Set(LETTERS.map((l) => l.ml));
    for (const e of VOCAB) expect(letters.has(e.ml), e.ml).toBe(false);
  });

  it('every topic has entries and every entry is in exactly one topic', () => {
    expect(TOPICS.length).toBeGreaterThan(5);
    const all = TOPICS.flatMap((t) => t.entryIds);
    for (const t of TOPICS) expect(t.entryIds.length, t.id).toBeGreaterThan(0);
    expect(all).toHaveLength(VOCAB.length);
    expect(new Set(all)).toEqual(new Set(VOCAB.map((e) => e.id)));
  });

  it('topic titles are readable, not raw ids', () => {
    for (const t of TOPICS) expect(t.title, t.id).not.toMatch(/_/);
  });
});
