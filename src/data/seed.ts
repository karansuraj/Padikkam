import type { Entry } from '../core/types';

/**
 * Tiny starter deck so the app has something to show. Letters live in
 * letters.ts, which the script trainer teaches. The full curriculum
 * should live in data files that are reviewed before they are merged.
 *
 * Provenance is 'unverified' on purpose. Check each line with a native speaker
 * or a trusted textbook, then bump it to 'native' or 'self'.
 */
export const SEED: Entry[] = [
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
