import { describe, expect, it } from 'vitest';
import { matchHeadwords, normalizeGloss, parseRows } from './match.mjs';

const row = (o = {}) => ({
  lexeme: 'L1',
  lemma: 'അമ്മ',
  rep: 'അമ്മ',
  categoryQid: 'Q1084',
  commonsFile: 'LL-Q36236 (mal)-Vis M-അമ്മ.wav',
  speaker: 'Vis M',
  glosses: ['mother'],
  ...o,
});

describe('normalizeGloss', () => {
  it('lowercases, trims, drops a leading to/a/an/the and a trailing parenthetical', () => {
    expect(normalizeGloss('  To Go ')).toBe('go');
    expect(normalizeGloss('a lot')).toBe('lot');
    expect(normalizeGloss('The house (building)')).toBe('house');
    expect(normalizeGloss('mother')).toBe('mother');
  });
});

describe('parseRows', () => {
  it('turns a SPARQL binding into a row', () => {
    const [r] = parseRows([
      {
        l: { value: 'http://www.wikidata.org/entity/L1000678' },
        lemma: { value: 'വംശഹത്യ' },
        cat: { value: 'http://www.wikidata.org/entity/Q1084' },
        rep: { value: 'വംശഹത്യ' },
        audio: { value: 'http://commons.wikimedia.org/wiki/Special:FilePath/LL-Q36236%20%28mal%29-Vis%20M-%E0%B4%B5.wav' },
        glosses: { value: 'genocide | mass killing' },
      },
    ]);
    expect(r).toEqual({
      lexeme: 'L1000678',
      lemma: 'വംശഹത്യ',
      rep: 'വംശഹത്യ',
      categoryQid: 'Q1084',
      commonsFile: 'LL-Q36236 (mal)-Vis M-വ.wav',
      speaker: 'Vis M',
      glosses: ['genocide', 'mass killing'],
    });
  });

  it('has no speaker for a file that is not a Lingua Libre recording', () => {
    const [r] = parseRows([
      {
        l: { value: 'http://www.wikidata.org/entity/L2' },
        lemma: { value: 'പുഴ' },
        cat: { value: 'http://www.wikidata.org/entity/Q1084' },
        rep: { value: 'പുഴ' },
        audio: { value: 'http://commons.wikimedia.org/wiki/Special:FilePath/Ml-%E0%B4%AA%E0%B5%81%E0%B4%B4.ogg' },
        glosses: { value: 'river' },
      },
    ]);
    expect(r.speaker).toBeNull();
  });
});

describe('matchHeadwords', () => {
  const topics = { family: ['mother'] };

  it('selects the word whose gloss equals the headword', () => {
    const { selected, unmatched, ambiguous } = matchHeadwords([row()], topics);
    expect(selected).toEqual([
      {
        lexeme: 'L1',
        ml: 'അമ്മ',
        en: 'mother',
        topic: 'family',
        commonsFile: 'LL-Q36236 (mal)-Vis M-അമ്മ.wav',
        speaker: 'Vis M',
        categoryQid: 'Q1084',
      },
    ]);
    expect(unmatched).toEqual([]);
    expect(ambiguous).toEqual([]);
  });

  it('"to go" matches the headword "go", and glosses split on semicolons', () => {
    const rows = [
      row({ lexeme: 'L2', lemma: 'പോവുക', rep: 'പോവുക', categoryQid: 'Q24905', glosses: ['to go'] }),
      row({ lexeme: 'L3', lemma: 'ഒരുപാട്', rep: 'ഒരുപാട്', categoryQid: 'Q34698', glosses: ['numerous; a lot many'] }),
    ];
    const { selected } = matchHeadwords(rows, { verbs: ['go'], misc: ['numerous'] });
    expect(selected.map((s) => s.lexeme)).toEqual(['L2', 'L3']);
  });

  it('a headword that is only a LATER meaning is weak: reported, not selected, unless approved', () => {
    const rows = [row({ lexeme: 'L10', lemma: 'സഹോദരി', rep: 'സഹോദരി', glosses: ['female sibling, sister'] })];
    const plain = matchHeadwords(rows, { family: ['sister'] });
    expect(plain.selected).toEqual([]);
    expect(plain.weak).toEqual([{ topic: 'family', headword: 'sister', lexeme: 'L10', lemma: 'സഹോദരി', en: 'female sibling, sister' }]);
    const ok = matchHeadwords(rows, { family: ['sister'] }, { approved: new Set(['L10']) });
    expect(ok.selected.map((s) => s.lexeme)).toEqual(['L10']);
  });

  it('a strong match (headword is the first meaning) beats a weak one', () => {
    const rows = [
      row({ lexeme: 'L12', lemma: 'കരം', rep: 'കരം', glosses: ['tax; hand'] }),
      row({ lexeme: 'L13', lemma: 'കൈ', rep: 'കൈ', glosses: ['hand'] }),
    ];
    const { selected, weak } = matchHeadwords(rows, { body: ['hand'] });
    expect(selected.map((s) => s.lexeme)).toEqual(['L13']);
    expect(weak).toEqual([]); // a weak candidate is only reported when there is no strong one
  });

  it('numerals match on any meaning ("2, two; natural number")', () => {
    const rows = [row({ lexeme: 'L14', lemma: 'രണ്ട്', rep: 'രണ്ട്', categoryQid: 'Q63116', glosses: ['2, two; natural number between 1 and 3'] })];
    expect(matchHeadwords(rows, { numbers: ['two'] }).selected.map((s) => s.lexeme)).toEqual(['L14']);
  });

  it('excluded lexemes are never selected or reported', () => {
    const { selected, unmatched, weak } = matchHeadwords([row()], { family: ['mother'] }, { excluded: new Set(['L1']) });
    expect(selected).toEqual([]);
    expect(weak).toEqual([]);
    expect(unmatched).toEqual([{ topic: 'family', headword: 'mother' }]);
  });

  it('a headword may list alternatives with a slash ("mango/mango fruit")', () => {
    const rows = [row({ lexeme: 'L11', lemma: 'മാങ്ങ', rep: 'മാങ്ങ', glosses: ['mango fruit'] })];
    const { selected, unmatched } = matchHeadwords(rows, { food: ['mango/mango fruit'] });
    expect(selected.map((s) => s.lexeme)).toEqual(['L11']);
    expect(unmatched).toEqual([]);
    expect(matchHeadwords(rows, { food: ['mango'] }).unmatched).toEqual([{ topic: 'food', headword: 'mango' }]);
  });

  it('skips proper nouns, multi-word lemmas and rows whose form differs from the lemma', () => {
    const rows = [
      row({ lexeme: 'L4', categoryQid: 'Q147276' }),
      row({ lexeme: 'L5', lemma: 'എന്റെ അമ്മ', rep: 'എന്റെ അമ്മ' }),
      row({ lexeme: 'L6', rep: 'അമ്മയുടെ' }),
    ];
    const { selected, unmatched } = matchHeadwords(rows, topics);
    expect(selected).toEqual([]);
    expect(unmatched).toEqual([{ topic: 'family', headword: 'mother' }]);
  });

  it('prefers an earlier speaker, then fewer glosses, then the lowest lexeme id', () => {
    const rows = [
      row({ lexeme: 'L9', speaker: 'Adithyak1997' }),
      row({ lexeme: 'L8', speaker: 'Vis M', glosses: ['mother', 'maternal', 'origin'] }),
      row({ lexeme: 'L7', speaker: 'Vis M', glosses: ['mother'] }),
    ];
    const { selected } = matchHeadwords(rows, topics);
    expect(selected.map((s) => s.lexeme)).toEqual(['L7']);
  });

  it('reports several different words for one headword as ambiguous, still selecting the best', () => {
    const rows = [
      row({ lexeme: 'L1', lemma: 'അമ്മ', rep: 'അമ്മ' }),
      row({ lexeme: 'L2', lemma: 'മാതാവ്', rep: 'മാതാവ്' }),
    ];
    const { selected, ambiguous } = matchHeadwords(rows, topics);
    expect(selected).toHaveLength(1);
    expect(ambiguous).toEqual([{ topic: 'family', headword: 'mother', candidates: ['അമ്മ', 'മാതാവ്'] }]);
  });

  it('a topic can be limited to certain word types: a noun is not picked for a verbs topic', () => {
    const rows = [
      row({ lexeme: 'L20', lemma: 'പ്രണയം', rep: 'പ്രണയം', categoryQid: 'Q1084', glosses: ['love, romance'] }),
      row({ lexeme: 'L21', lemma: 'സ്നേഹിക്കുക', rep: 'സ്നേഹിക്കുക', categoryQid: 'Q24905', glosses: ['to love'] }),
    ];
    const opts = { topicCategories: { verbs: ['Q24905'] } };
    expect(matchHeadwords(rows, { verbs: ['love'] }, opts).selected.map((x) => x.lexeme)).toEqual(['L21']);
    expect(matchHeadwords([rows[0]], { verbs: ['love'] }, opts).unmatched).toEqual([{ topic: 'verbs', headword: 'love' }]);
    // topics with no restriction still accept either
    expect(matchHeadwords([rows[0]], { daily_life: ['love'] }, opts).selected.map((x) => x.lexeme)).toEqual(['L20']);
  });

  it('only considers words with a WAV clip (Ogg is not bundled or played everywhere)', () => {
    const rows = [row({ lexeme: 'L30', commonsFile: 'Ml-അമ്മ.ogg', speaker: null })];
    const { selected, unmatched } = matchHeadwords(rows, { family: ['mother'] });
    expect(selected).toEqual([]);
    expect(unmatched).toEqual([{ topic: 'family', headword: 'mother' }]);
    const both = [...rows, row({ lexeme: 'L30' })];
    expect(matchHeadwords(both, { family: ['mother'] }).selected[0].commonsFile).toMatch(/\.wav$/);
  });

  it('reports unmatched headwords', () => {
    const { unmatched } = matchHeadwords([row()], { family: ['mother', 'uncle'] });
    expect(unmatched).toEqual([{ topic: 'family', headword: 'uncle' }]);
  });

  it('never puts a lexeme in two topics: the first topic wins', () => {
    const { selected, unmatched } = matchHeadwords([row()], { family: ['mother'], people: ['mother'] });
    expect(selected.map((s) => s.topic)).toEqual(['family']);
    expect(unmatched).toEqual([{ topic: 'people', headword: 'mother' }]);
  });

  it('is deterministic regardless of row order', () => {
    const rows = [
      row({ lexeme: 'L2', lemma: 'മാതാവ്', rep: 'മാതാവ്' }),
      row({ lexeme: 'L1' }),
      row({ lexeme: 'L3', lemma: 'അമ്മേ', rep: 'അമ്മേ', speaker: 'Netha Hussain' }),
    ];
    const a = matchHeadwords(rows, topics);
    const b = matchHeadwords([...rows].reverse(), topics);
    expect(b).toEqual(a);
  });
});
