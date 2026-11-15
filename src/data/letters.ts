import type { Entry } from '../core/types';

/**
 * The 58 Malayalam letters that have a recorded clip in assets/audio/letters.
 *
 * Everything here is model-written and `unverified`: the romanization, the
 * English hints and which clip says what. Check them against a trusted source
 * or a native speaker before bumping provenance.
 *
 * Romanization is ASCII and unique per letter. Capitals mark retroflex or
 * otherwise distinct sounds (`ta` dental, `Ta` retroflex).
 */
type Group = 'vowels' | 'consonants' | 'chillu';

// [malayalam, roman, group]
const TABLE: [string, string, Group][] = [
  // vowels
  ['അ', 'a', 'vowels'],
  ['ആ', 'aa', 'vowels'],
  ['ഇ', 'i', 'vowels'],
  ['ഈ', 'ii', 'vowels'],
  ['ഉ', 'u', 'vowels'],
  ['ഊ', 'uu', 'vowels'],
  ['ഋ', 'ru', 'vowels'],
  ['എ', 'e', 'vowels'],
  ['ഏ', 'ee', 'vowels'],
  ['ഐ', 'ai', 'vowels'],
  ['ഒ', 'o', 'vowels'],
  ['ഓ', 'oo', 'vowels'],
  ['ഔ', 'au', 'vowels'],
  ['അം', 'am', 'vowels'],
  // velars
  ['ക', 'ka', 'consonants'],
  ['ഖ', 'kha', 'consonants'],
  ['ഗ', 'ga', 'consonants'],
  ['ഘ', 'gha', 'consonants'],
  ['ങ', 'nga', 'consonants'],
  // palatals
  ['ച', 'cha', 'consonants'],
  ['ഛ', 'chha', 'consonants'],
  ['ജ', 'ja', 'consonants'],
  ['ഝ', 'jha', 'consonants'],
  ['ഞ', 'nja', 'consonants'],
  // retroflexes
  ['ട', 'Ta', 'consonants'],
  ['ഠ', 'Tha', 'consonants'],
  ['ഡ', 'Da', 'consonants'],
  ['ഢ', 'Dha', 'consonants'],
  ['ണ', 'Na', 'consonants'],
  // dentals
  ['ത', 'ta', 'consonants'],
  ['ഥ', 'tha', 'consonants'],
  ['ദ', 'da', 'consonants'],
  ['ധ', 'dha', 'consonants'],
  ['ന', 'na', 'consonants'],
  // labials
  ['പ', 'pa', 'consonants'],
  ['ഫ', 'pha', 'consonants'],
  ['ബ', 'ba', 'consonants'],
  ['ഭ', 'bha', 'consonants'],
  ['മ', 'ma', 'consonants'],
  // approximants
  ['യ', 'ya', 'consonants'],
  ['ര', 'ra', 'consonants'],
  ['ല', 'la', 'consonants'],
  ['വ', 'va', 'consonants'],
  // sibilants and h
  ['ശ', 'sha', 'consonants'],
  ['ഷ', 'Sha', 'consonants'],
  ['സ', 'sa', 'consonants'],
  ['ഹ', 'ha', 'consonants'],
  // special consonants
  ['ള', 'La', 'consonants'],
  ['ഴ', 'zha', 'consonants'],
  ['റ', 'Ra', 'consonants'],
  ['റ്റ', 'RRa', 'consonants'],
  ['ഩ', 'nna', 'consonants'],
  ['ഺ', 'ttta', 'consonants'],
  // chillu letters (consonant with no vowel)
  ['ൺ', 'chillu-N', 'chillu'],
  ['ൻ', 'chillu-n', 'chillu'],
  ['ർ', 'chillu-r', 'chillu'],
  ['ൽ', 'chillu-l', 'chillu'],
  ['ൾ', 'chillu-L', 'chillu'],
];

const hex = (ml: string): string =>
  [...ml].map((c) => c.codePointAt(0)!.toString(16).padStart(4, '0')).join('_');

/** Entry id for a letter, derived from its code points so it never changes. */
export const letterId = (ml: string): string => `letter:${hex(ml)}`;

const SOURCE =
  'Audio: Lingua Libre via Wikimedia Commons, speaker Vis M (licence in assets/audio/letters/manifest.json)';

export const LETTERS: Entry[] = TABLE.map(([ml, roman, group]) => ({
  id: letterId(ml),
  kind: 'letter',
  register: 'formal',
  ml,
  roman,
  en:
    group === 'vowels'
      ? `vowel ${roman}`
      : group === 'chillu'
        ? `chillu letter, a bare consonant (${roman})`
        : `consonant ${roman}`,
  provenance: 'unverified',
  tags: ['script', group],
  audio: `letters/u${hex(ml)}.wav`,
  source: SOURCE,
}));

export const LETTER_BY_ID: Map<string, Entry> = new Map(LETTERS.map((l) => [l.id, l]));
