import { describe, expect, it } from 'vitest';
import { buildQuestion, isCorrect, seededRng, shuffle } from './quiz';
import { LETTER_BY_ID, LETTERS } from '../data/letters';
import { LESSONS } from '../data/lessons';
import type { Entry } from './types';

const byIds = (ids: string[]): Entry[] => ids.map((id) => LETTER_BY_ID.get(id)!);
const l03 = byIds(LESSONS[2].letterIds); // ka group, 5 letters
const earlier = byIds([...LESSONS[0].letterIds, ...LESSONS[1].letterIds]);
const target = l03[0];

describe('seededRng and shuffle', () => {
  it('seededRng is deterministic, in [0,1), and differs by seed', () => {
    const a = seededRng(7), b = seededRng(7), c = seededRng(8);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(xs).not.toEqual(Array.from({ length: 5 }, () => c()));
  });

  it('shuffle returns a permutation and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, seededRng(1));
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(input);
  });
});

describe('buildQuestion', () => {
  const kinds = ['hear-pick-glyph', 'see-pick-sound'] as const;

  it('carries kind and letterId, and options contain the answer exactly once', () => {
    for (const kind of kinds) {
      const q = buildQuestion(kind, target, { sameLesson: l03, earlier }, seededRng(3));
      expect(q.kind).toBe(kind);
      expect(q.letterId).toBe(target.id);
      expect(q.optionIds.filter((id) => id === target.id)).toHaveLength(1);
      expect(q.optionIds).toHaveLength(4);
    }
  });

  it('options are unique even when the pools overlap or include the target', () => {
    for (let seed = 0; seed < 30; seed++) {
      const q = buildQuestion('see-pick-sound', target, { sameLesson: l03, earlier: [...earlier, ...l03] }, seededRng(seed));
      expect(new Set(q.optionIds).size).toBe(q.optionIds.length);
    }
  });

  it('takes distractors from sameLesson before earlier', () => {
    const q = buildQuestion('hear-pick-glyph', target, { sameLesson: l03, earlier }, seededRng(5));
    const lessonIds = new Set(l03.map((l) => l.id));
    expect(q.optionIds.every((id) => lessonIds.has(id))).toBe(true);
  });

  it('falls back to earlier when sameLesson is too small', () => {
    const q = buildQuestion('hear-pick-glyph', target, { sameLesson: [target], earlier }, seededRng(5));
    const earlierIds = new Set(earlier.map((l) => l.id));
    const distractors = q.optionIds.filter((id) => id !== target.id);
    expect(distractors).toHaveLength(3);
    expect(distractors.every((id) => earlierIds.has(id))).toBe(true);
  });

  it('shrinks when there are fewer candidates than optionCount, never repeating', () => {
    const q = buildQuestion('hear-pick-glyph', target, { sameLesson: [target, l03[1]], earlier: [] }, seededRng(2));
    expect(q.optionIds.sort()).toEqual([target.id, l03[1].id].sort());
  });

  it('every real lesson can build a 4-option question for every letter', () => {
    let earlierSoFar: Entry[] = [];
    for (const lesson of LESSONS) {
      const mates = byIds(lesson.letterIds);
      for (const t of mates) {
        const q = buildQuestion('see-pick-sound', t, { sameLesson: mates, earlier: earlierSoFar }, seededRng(9));
        expect(q.optionIds.length).toBeGreaterThanOrEqual(4);
        expect(q.optionIds).toContain(t.id);
      }
      earlierSoFar = [...earlierSoFar, ...mates];
    }
    expect(earlierSoFar).toHaveLength(LETTERS.length);
  });
});

describe('isCorrect', () => {
  it('is true only for the target letter', () => {
    const q = buildQuestion('hear-pick-glyph', target, { sameLesson: l03, earlier }, seededRng(1));
    expect(isCorrect(q, target.id)).toBe(true);
    expect(isCorrect(q, l03[1].id)).toBe(false);
  });
});
