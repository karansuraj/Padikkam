import { describe, expect, it } from 'vitest';
import { buildLessonQuiz, buildPracticeQuiz, PASS_RATIO, scoreQuiz, unlockedLessonIds } from './lesson';
import { gradeAnswer } from './grade';
import { seededRng } from './quiz';
import { newCardState } from './srs';
import { LETTER_BY_ID } from '../data/letters';
import { LESSONS } from '../data/lessons';

const T0 = new Date('2026-11-15T10:00:00Z');

describe('buildLessonQuiz', () => {
  it('asks each letter once in each direction, for every lesson', () => {
    for (const lesson of LESSONS) {
      const qs = buildLessonQuiz(lesson, LESSONS, LETTER_BY_ID, seededRng(4));
      expect(qs).toHaveLength(lesson.letterIds.length * 2);
      for (const id of lesson.letterIds) {
        const kinds = qs.filter((q) => q.letterId === id).map((q) => q.kind).sort();
        expect(kinds, id).toEqual(['hear-pick-glyph', 'see-pick-sound']);
      }
    }
  });

  it('gives every question at least 4 options, including lesson 1 which has no earlier letters', () => {
    for (const lesson of LESSONS) {
      for (const q of buildLessonQuiz(lesson, LESSONS, LETTER_BY_ID, seededRng(11))) {
        expect(q.optionIds.length, `${lesson.id} ${q.letterId}`).toBeGreaterThanOrEqual(4);
        expect(new Set(q.optionIds).size).toBe(q.optionIds.length);
      }
    }
  });

  it('shuffles: different seeds give different orders', () => {
    const a = buildLessonQuiz(LESSONS[2], LESSONS, LETTER_BY_ID, seededRng(1)).map((q) => q.letterId + q.kind);
    const b = buildLessonQuiz(LESSONS[2], LESSONS, LETTER_BY_ID, seededRng(2)).map((q) => q.letterId + q.kind);
    expect(a).not.toEqual(b);
  });
});

describe('scoreQuiz', () => {
  it('passes at exactly 80% and fails below', () => {
    expect(PASS_RATIO).toBe(0.8);
    expect(scoreQuiz([true, true, true, true, false])).toEqual({ correct: 4, total: 5, passed: true });
    expect(scoreQuiz([true, true, true, false, false])).toEqual({ correct: 3, total: 5, passed: false });
  });

  it('an empty quiz never passes', () => {
    expect(scoreQuiz([])).toEqual({ correct: 0, total: 0, passed: false });
  });
});

describe('unlockedLessonIds', () => {
  it('only the first lesson is unlocked with nothing passed', () => {
    expect([...unlockedLessonIds(LESSONS, new Set())]).toEqual(['l01']);
  });

  it('passing a lesson unlocks only the next one', () => {
    expect([...unlockedLessonIds(LESSONS, new Set(['l01']))].sort()).toEqual(['l01', 'l02']);
  });

  it('a passed lesson does not unlock past a gap', () => {
    expect([...unlockedLessonIds(LESSONS, new Set(['l02']))]).toEqual(['l01']);
  });

  it('everything is unlocked once all are passed', () => {
    expect(unlockedLessonIds(LESSONS, new Set(LESSONS.map((l) => l.id))).size).toBe(LESSONS.length);
  });
});

describe('buildPracticeQuiz', () => {
  const l01 = LESSONS[0].letterIds;
  const l03 = LESSONS[2].letterIds;

  it('returns nothing when nothing is due or no lesson is passed', () => {
    expect(buildPracticeQuiz([], LESSONS, new Set(['l01']), LETTER_BY_ID, seededRng(1))).toEqual([]);
    expect(buildPracticeQuiz(l01, LESSONS, new Set(), LETTER_BY_ID, seededRng(1))).toEqual([]);
  });

  it('only asks about due letters from passed lessons', () => {
    const qs = buildPracticeQuiz([...l01, ...l03], LESSONS, new Set(['l01']), LETTER_BY_ID, seededRng(1));
    expect(qs.map((q) => q.letterId).sort()).toEqual([...l01].sort());
  });

  it('caps the number of questions and ignores unknown ids', () => {
    const qs = buildPracticeQuiz([...l01, 'letter:nope'], LESSONS, new Set(['l01']), LETTER_BY_ID, seededRng(1), 3);
    expect(qs).toHaveLength(3);
    expect(qs.every((q) => LETTER_BY_ID.has(q.letterId))).toBe(true);
  });
});

describe('gradeAnswer', () => {
  it('creates new state when there is none, and maps correct to good, wrong to again', () => {
    const good = gradeAnswer(undefined, 'letter:0d15', true, T0);
    const again = gradeAnswer(undefined, 'letter:0d15', false, T0);
    expect(good.entryId).toBe('letter:0d15');
    expect(good.reps).toBe(1);
    expect(good.due).toBeGreaterThan(T0.getTime());
    expect(again.due).toBeGreaterThan(T0.getTime());
    expect(again.due).toBeLessThan(good.due);
  });

  it('does not mutate the previous state', () => {
    const prev = newCardState('letter:0d15', T0);
    const frozen = JSON.stringify(prev);
    gradeAnswer(prev, 'letter:0d15', true, T0);
    expect(JSON.stringify(prev)).toBe(frozen);
  });
});
