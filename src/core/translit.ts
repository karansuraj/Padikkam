import { LETTERS } from '../data/letters';

/**
 * Rule-based Malayalam to Latin transliteration, in the same ASCII scheme as the
 * letters table (capitals for retroflex sounds, `zh`, `RR`, and so on).
 *
 * It is a learner aid, not a pronunciation guarantee: Malayalam spelling is
 * regular enough for rules, but the Latin form cannot show every sound.
 */

// A consonant's base is its roman without the inherent vowel: ka -> k, RRa -> RR.
const CONSONANT = new Map<string, string>();
const VOWEL = new Map<string, string>();
for (const l of LETTERS) {
  if (l.tags.includes('consonants')) CONSONANT.set(l.ml, l.roman.replace(/a$/, ''));
  if (l.tags.includes('vowels') && [...l.ml].length === 1) VOWEL.set(l.ml, l.roman);
}

// Inside words chillus are bare consonants ("chillu-n" is only a learner label).
const CHILLU = new Map<string, string>([
  ['ൺ', 'N'], ['ൻ', 'n'], ['ർ', 'r'], ['ൽ', 'l'], ['ൾ', 'L'],
]);

const VOWEL_SIGN = new Map<string, string>([
  ['ാ', 'aa'], ['ി', 'i'], ['ീ', 'ii'], ['ു', 'u'], ['ൂ', 'uu'], ['ൃ', 'ru'],
  ['െ', 'e'], ['േ', 'ee'], ['ൈ', 'ai'], ['ൊ', 'o'], ['ോ', 'oo'], ['ൌ', 'au'], ['ൗ', 'au'],
]);

const VIRAMA = '്';
const ZWJ = '‍';
const ZWNJ = '‌';
const IS_MALAYALAM = /[ഀ-ൿ]/;
const MALAYALAM_DIGIT_ZERO = 0x0d66;

export function transliterate(ml: string): string {
  const chars = [...ml];
  let out = '';
  let pendingA = false; // the last consonant has not yet had its vowel written
  let lastConsonant = ''; // the consonant just before a virama, for the final-ya rule

  const flush = () => {
    if (pendingA) out += 'a';
    pendingA = false;
  };

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const code = c.codePointAt(0)!;

    if (c === ZWJ || c === ZWNJ) continue;

    if (c === 'റ' && chars[i + 1] === VIRAMA && chars[i + 2] === 'റ') {
      // റ്റ is pronounced "tt", not "RR"
      flush();
      out += 'tt';
      pendingA = true;
      lastConsonant = 'റ';
      i += 2;
    } else if (c === 'ന' && chars[i + 1] === VIRAMA && chars[i + 2] === 'റ') {
      // ന്റ is pronounced "nt"
      flush();
      out += 'nt';
      pendingA = true;
      lastConsonant = 'റ';
      i += 2;
    } else if (CONSONANT.has(c)) {
      flush();
      out += CONSONANT.get(c);
      pendingA = true;
      lastConsonant = c;
    } else if (VOWEL_SIGN.has(c)) {
      pendingA = false; // the sign replaces the inherent vowel
      out += VOWEL_SIGN.get(c);
    } else if (c === VIRAMA) {
      pendingA = false;
      if (chars[i + 1] === ZWJ) continue; // legacy chillu: a bare consonant
      let j = i + 1;
      while (chars[j] === ZWNJ) j++;
      const atWordEnd = j >= chars.length || !IS_MALAYALAM.test(chars[j]);
      // A word-final virama is read as a short u, except after ya (നായ് is "naay").
      if (atWordEnd && lastConsonant !== 'യ') out += 'u';
    } else if (VOWEL.has(c)) {
      flush();
      out += VOWEL.get(c);
    } else if (CHILLU.has(c)) {
      flush();
      out += CHILLU.get(c);
    } else if (c === 'ം') {
      flush();
      out += 'm';
    } else if (c === 'ഃ') {
      flush();
      out += 'h';
    } else if (code >= MALAYALAM_DIGIT_ZERO && code <= MALAYALAM_DIGIT_ZERO + 9) {
      flush();
      out += String(code - MALAYALAM_DIGIT_ZERO);
    } else {
      flush();
      out += c;
    }
  }
  flush();
  return out;
}
