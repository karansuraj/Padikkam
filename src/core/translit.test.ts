import { describe, expect, it } from 'vitest';
import { transliterate } from './translit';
import { LETTERS } from '../data/letters';

describe('transliterate: letters', () => {
  it('agrees with the letters table for every non-chillu letter', () => {
    for (const l of LETTERS.filter((x) => !x.tags.includes('chillu'))) {
      expect(transliterate(l.ml), `${l.ml} (${l.id})`).toBe(l.roman);
    }
  });

  it('chillu letters are bare consonants', () => {
    expect(['ൺ', 'ൻ', 'ർ', 'ൽ', 'ൾ'].map(transliterate)).toEqual(['N', 'n', 'r', 'l', 'L']);
  });
});

describe('transliterate: words', () => {
  const vectors: [string, string][] = [
    ['അമ്മ', 'amma'],
    ['വെള്ളം', 'veLLam'],
    ['നമസ്കാരം', 'namaskaaram'],
    ['വീട്', 'viiTu'],
    ['ചോറ്', 'chooRu'],
    ['പേര്', 'peeru'],
    ['നന്ദി', 'nandi'],
    ['ഭക്ഷണം', 'bhakShaNam'],
    ['ഇല്ല', 'illa'],
    ['ആന', 'aana'],
    ['അവൻ', 'avan'],
    // found by the review: these read wrongly in the first version
    ['നായ്', 'naay'],
    ['കായ്', 'kaay'],
    ['മെയ്', 'mey'],
    ['കാറ്റ്', 'kaattu'],
    ['ചുറ്റിക', 'chuttika'],
    ['എന്റെ', 'ente'],
  ];
  for (const [ml, roman] of vectors) {
    it(`${ml} gives ${roman}`, () => expect(transliterate(ml)).toBe(roman));
  }

  it('a final virama before a space also reads as u', () => {
    expect(transliterate('പേര് വീട്')).toBe('peeru viiTu');
  });

  it('a virama before a following consonant joins them with no vowel', () => {
    expect(transliterate('ക്ക')).toBe('kka');
  });
});

describe('transliterate: odd input', () => {
  it('drops zero-width joiners and non-joiners', () => {
    expect(transliterate('അമ്മ‍')).toBe('amma');
    expect(transliterate('ക്‌ക')).toBe('kka');
  });

  it('a legacy chillu (consonant, virama, ZWJ) is a bare consonant, not consonant plus u', () => {
    expect(transliterate('ന്‍')).toBe('n');
  });

  it('passes digits, Latin text and punctuation through, and maps Malayalam digits', () => {
    expect(transliterate('abc 123, ok!')).toBe('abc 123, ok!');
    expect(transliterate('൧൨൩')).toBe('123');
  });

  it('returns an empty string for an empty string and does not throw on unknown marks', () => {
    expect(transliterate('')).toBe('');
    expect(() => transliterate('ഽ')).not.toThrow();
  });
});
