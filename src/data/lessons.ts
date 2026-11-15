import type { Lesson } from '../core/types';
import { letterId } from './letters';

const lesson = (id: string, title: string, letters: string[]): Lesson => ({
  id,
  title,
  letterIds: letters.map(letterId),
});

/** Teaching order: vowels, then consonants by place of articulation, then chillus. */
export const LESSONS: Lesson[] = [
  lesson('l01', 'Vowels 1', ['അ', 'ആ', 'ഇ', 'ഈ', 'ഉ', 'ഊ']),
  lesson('l02', 'Vowels 2', ['ഋ', 'എ', 'ഏ', 'ഐ', 'ഒ', 'ഓ', 'ഔ', 'അം']),
  lesson('l03', 'Consonants: ka group', ['ക', 'ഖ', 'ഗ', 'ഘ', 'ങ']),
  lesson('l04', 'Consonants: cha group', ['ച', 'ഛ', 'ജ', 'ഝ', 'ഞ']),
  lesson('l05', 'Consonants: Ta group', ['ട', 'ഠ', 'ഡ', 'ഢ', 'ണ']),
  lesson('l06', 'Consonants: ta group', ['ത', 'ഥ', 'ദ', 'ധ', 'ന']),
  lesson('l07', 'Consonants: pa group', ['പ', 'ഫ', 'ബ', 'ഭ', 'മ']),
  lesson('l08', 'Consonants: ya ra la va', ['യ', 'ര', 'ല', 'വ']),
  lesson('l09', 'Consonants: sha Sha sa ha', ['ശ', 'ഷ', 'സ', 'ഹ']),
  lesson('l10', 'Special consonants', ['ള', 'ഴ', 'റ', 'റ്റ', 'ഩ', 'ഺ']),
  lesson('l11', 'Chillu letters', ['ൺ', 'ൻ', 'ർ', 'ൽ', 'ൾ']),
];
