import type { Entry } from '../core/types';

/**
 * Tiny starter deck so the app has something to show. The full curriculum
 * should live in data files that are reviewed before they are merged.
 *
 * Provenance is 'unverified' on purpose. Check each line with a native speaker
 * or a trusted textbook, then bump it to 'native' or 'self'.
 */
export const SEED: Entry[] = [
  {
    id: 'letter:a',
    kind: 'letter',
    register: 'formal',
    ml: 'അ',
    roman: 'a',
    en: 'vowel a (as in "about")',
    provenance: 'unverified',
    tags: ['script', 'vowels'],
  },
  {
    id: 'letter:ka',
    kind: 'letter',
    register: 'formal',
    ml: 'ക',
    roman: 'ka',
    en: 'consonant ka',
    provenance: 'unverified',
    tags: ['script', 'consonants'],
  },
  {
    id: 'phrase:namaskaram',
    kind: 'phrase',
    register: 'formal',
    ml: 'നമസ്കാരം',
    roman: 'namaskaram',
    en: 'hello (greeting)',
    provenance: 'unverified',
    tags: ['greetings', 'week-1'],
  },
];
