// Pure helpers for picking a beginner deck out of cached Wikidata lexeme rows.
// No network, no file access: easy to test and safe to rerun.

/** Wikidata lexical categories we accept: noun, verb, adjective, adverb, pronoun, numeral. */
const ELIGIBLE_CATEGORIES = new Set(['Q1084', 'Q24905', 'Q34698', 'Q380057', 'Q36224', 'Q63116']);
const DEFAULT_SPEAKER_ORDER = ['Vis M', 'BhagyaMohan', 'Adithyak1997', 'Netha Hussain', 'Akbarali'];
const MALAYALAM = /[ഀ-ൿ]/;

const last = (url) => url.slice(url.lastIndexOf('/') + 1);

/** SPARQL JSON bindings to plain rows. */
export function parseRows(bindings) {
  return bindings.map((b) => {
    const commonsFile = decodeURIComponent(last(b.audio.value));
    const m = /^LL-Q36236 \(mal\)-(.+?)-/.exec(commonsFile);
    return {
      lexeme: last(b.l.value),
      lemma: b.lemma.value,
      rep: b.rep.value,
      categoryQid: last(b.cat.value),
      commonsFile,
      speaker: m ? m[1] : null,
      glosses: b.glosses.value.split(' | ').map((g) => g.trim()).filter(Boolean),
    };
  });
}

/** Lowercase, drop a leading to/a/an/the and a trailing parenthetical. */
export function normalizeGloss(gloss) {
  return gloss
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/^(to|a|an|the)\s+/, '')
    .trim();
}

const numericId = (lexeme) => Number(lexeme.slice(1));

const NUMERAL = 'Q63116';
const splitPieces = (gloss) => gloss.split(/[;,]/);

/**
 * Pick one word per headword. Returns what was selected plus what needs a
 * human: headwords with no match, headwords with several different words,
 * and "weak" candidates.
 *
 * A match is STRONG when the headword is the first meaning in one of the
 * word's glosses (numerals: any meaning). A headword that only shows up as a
 * later meaning ("title, heading; head") is WEAK: it is listed in `weak` and
 * used only if its lexeme is in `approved`. Lexemes in `excluded` are ignored.
 * `topicCategories` limits a topic to certain word types (Wikidata category ids).
 */
export function matchHeadwords(
  rows,
  topics,
  { speakerOrder = DEFAULT_SPEAKER_ORDER, approved = new Set(), excluded = new Set(), topicCategories = {} } = {},
) {
  const rank = (speaker) => {
    const i = speakerOrder.indexOf(speaker);
    return i === -1 ? speakerOrder.length : i;
  };

  const eligible = rows.filter(
    (r) =>
      ELIGIBLE_CATEGORIES.has(r.categoryQid) &&
      !excluded.has(r.lexeme) &&
      /\.wav$/i.test(r.commonsFile) && // only formats every platform can bundle and play
      MALAYALAM.test(r.lemma) &&
      !/\s/.test(r.lemma) &&
      r.rep === r.lemma,
  );

  // Index each lexeme once, with its best recording.
  const byLexeme = new Map();
  for (const r of eligible) {
    const best = byLexeme.get(r.lexeme);
    const better =
      !best || rank(r.speaker) < rank(best.speaker) || (rank(r.speaker) === rank(best.speaker) && r.commonsFile < best.commonsFile);
    if (better) byLexeme.set(r.lexeme, r);
  }
  const lexemes = [...byLexeme.values()].map((r) => ({
    ...r,
    firstPieces: new Set(r.glosses.map((g) => normalizeGloss(splitPieces(g)[0]))),
    allPieces: new Set(r.glosses.flatMap(splitPieces).map(normalizeGloss)),
  }));

  const order = (a, b) =>
    rank(a.speaker) - rank(b.speaker) ||
    a.glosses.length - b.glosses.length ||
    numericId(a.lexeme) - numericId(b.lexeme);

  const selected = [];
  const unmatched = [];
  const ambiguous = [];
  const weak = [];
  const taken = new Set();

  for (const [topic, headwords] of Object.entries(topics)) {
    for (const headword of headwords) {
      const wants = headword.split('/').map(normalizeGloss); // alternatives: "mango/mango fruit"
      const allowed = topicCategories[topic]; // e.g. verbs: only real verbs
      const free = lexemes.filter((l) => !taken.has(l.lexeme) && (!allowed || allowed.includes(l.categoryQid)));
      const isStrong = (l) =>
        wants.some((w) => (l.categoryQid === NUMERAL ? l.allPieces.has(w) : l.firstPieces.has(w)));
      const strong = free.filter(isStrong).sort(order);
      const weakCandidates = strong.length
        ? []
        : free.filter((l) => wants.some((w) => l.allPieces.has(w))).sort(order);
      const pool = strong.length ? strong : weakCandidates.filter((l) => approved.has(l.lexeme));

      if (pool.length === 0) {
        unmatched.push({ topic, headword });
        for (const l of weakCandidates) {
          weak.push({ topic, headword, lexeme: l.lexeme, lemma: l.lemma, en: l.glosses.join('; ') });
        }
        continue;
      }
      const pick = pool[0];
      taken.add(pick.lexeme);
      selected.push({
        lexeme: pick.lexeme,
        ml: pick.lemma,
        en: pick.glosses.join('; '),
        topic,
        commonsFile: pick.commonsFile,
        speaker: pick.speaker,
        categoryQid: pick.categoryQid,
      });
      const lemmas = [...new Set(pool.map((c) => c.lemma))];
      if (lemmas.length > 1) ambiguous.push({ topic, headword, candidates: lemmas });
    }
  }
  return { selected, unmatched, ambiguous, weak };
}
