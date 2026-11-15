import { describe, expect, it } from 'vitest';
import { gradeAnswer } from './grade';
import { newCardState, review } from './srs';
import type { CardState, Lesson } from './types';
import { buildWriteSession, letterIdsOfPassedLessons, writeCardId } from './write';

const NOW = new Date('2026-11-15T12:00:00Z');
const day = 24 * 3600_000;
const ids = ['letter:0d15', 'letter:0d16', 'letter:0d17', 'letter:0d18', 'letter:0d19', 'letter:0d1a'];

const dueState = (letterId: string, daysAgo: number): CardState =>
  newCardState(writeCardId(letterId), new Date(NOW.getTime() - daysAgo * day));

describe('writeCardId', () => {
  it('prefixes the letter id so writing and recognition keep separate schedules', () => {
    expect(writeCardId('letter:0d15')).toBe('write:letter:0d15');
  });
});

describe('buildWriteSession', () => {
  it('puts due writing cards first, earliest due first, then unseen letters in order', () => {
    const states = new Map([
      [writeCardId(ids[2]), dueState(ids[2], 1)],
      [writeCardId(ids[4]), dueState(ids[4], 5)],
    ]);
    expect(buildWriteSession(ids, states, NOW, 10)).toEqual([ids[4], ids[2], ids[0], ids[1], ids[3], ids[5]]);
  });

  it('leaves out writing cards that are not due yet', () => {
    const later = review(newCardState(writeCardId(ids[0]), NOW), 'good', NOW);
    const states = new Map([[writeCardId(ids[0]), later]]);
    expect(buildWriteSession(ids.slice(0, 3), states, NOW)).toEqual([ids[1], ids[2]]);
  });

  it('caps the session length, defaulting to 5', () => {
    expect(buildWriteSession(ids, new Map(), NOW)).toHaveLength(5);
    expect(buildWriteSession(ids, new Map(), NOW, 2)).toEqual([ids[0], ids[1]]);
    expect(buildWriteSession(ids, new Map(), NOW, 0)).toEqual([]);
  });

  it('returns nothing for no letters', () => {
    expect(buildWriteSession([], new Map(), NOW)).toEqual([]);
  });

  it('ignores recognition cards, which live under the bare letter id', () => {
    const states = new Map([[ids[0], dueState(ids[0], 3)]]); // entryId is write:..., but key is the bare id
    states.set(ids[1], newCardState(ids[1], new Date(NOW.getTime() - 3 * day)));
    // letter 0 and 1 have recognition state only: they still count as unseen for writing
    expect(buildWriteSession(ids.slice(0, 2), states, NOW)).toEqual([ids[0], ids[1]]);
  });
});

describe('letterIdsOfPassedLessons', () => {
  const lessons: Lesson[] = [
    { id: 'l01', title: 'One', letterIds: [ids[0], ids[1]] },
    { id: 'l02', title: 'Two', letterIds: [ids[2]] },
    { id: 'l03', title: 'Three', letterIds: [ids[3]] },
  ];

  it('lists letters of passed lessons only, in lesson order', () => {
    expect(letterIdsOfPassedLessons(lessons, new Set(['l02', 'l01']))).toEqual([ids[0], ids[1], ids[2]]);
    expect(letterIdsOfPassedLessons(lessons, new Set())).toEqual([]);
  });
});

describe('grading a writing result', () => {
  it('a pass is a good review on the write card and a fail comes back sooner', () => {
    const id = writeCardId(ids[0]);
    const pass = gradeAnswer(undefined, id, true, NOW);
    const fail = gradeAnswer(undefined, id, false, NOW);
    expect(pass.entryId).toBe('write:letter:0d15');
    expect(pass.reps).toBe(1);
    expect(fail.reps).toBe(1);
    expect(fail.due).toBeLessThan(pass.due);
  });
});
