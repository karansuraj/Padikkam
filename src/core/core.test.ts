import { describe, expect, it } from 'vitest';
import { isDue, newCardState, previewIntervals, review } from './srs';
import { filterByRegister, validateDeck } from './deck';
import { SEED } from '../data/seed';

const T0 = new Date('2026-11-03T00:00:00Z');

describe('srs', () => {
  it('new cards are due immediately', () => {
    const c = newCardState('word:x', T0);
    expect(isDue(c, T0)).toBe(true);
    expect(c.state).toBe(0);
  });

  it('good pushes the due date into the future and does not mutate input', () => {
    const c = newCardState('word:x', T0);
    const frozen = JSON.stringify(c);
    const next = review(c, 'good', T0);
    expect(JSON.stringify(c)).toBe(frozen);
    expect(next.due).toBeGreaterThan(T0.getTime());
    expect(next.reps).toBe(1);
    expect(next.lastReview).toBe(T0.getTime());
  });

  it('easy schedules later than again', () => {
    const c = newCardState('word:x', T0);
    const p = previewIntervals(c, T0);
    expect(p.easy).toBeGreaterThan(p.again);
  });

  it('a lapse is counted when a review card is failed', () => {
    let c = newCardState('word:x', T0);
    c = review(c, 'good', T0);
    c = review(c, 'good', new Date(c.due));
    const failed = review(c, 'again', new Date(c.due));
    expect(failed.lapses).toBe(c.lapses + 1);
  });

  it('state survives a JSON round trip (what SQLite will do)', () => {
    const c = review(newCardState('word:x', T0), 'good', T0);
    const back = JSON.parse(JSON.stringify(c));
    expect(review(back, 'good', new Date(c.due)).reps).toBe(2);
  });
});

describe('deck', () => {
  it('seed deck is well formed', () => {
    expect(validateDeck(SEED).filter((i) => i.problem !== 'spoken entry still unverified')).toEqual([]);
  });

  it('flags duplicates and missing Malayalam', () => {
    const bad = [SEED[0], { ...SEED[0] }, { ...SEED[1], id: 'x', ml: 'abc' }];
    const problems = validateDeck(bad).map((i) => i.problem);
    expect(problems).toContain('duplicate id');
    expect(problems).toContain('ml field has no Malayalam characters');
  });

  it('keeps registers separate', () => {
    const mixed = [...SEED, { ...SEED[2], id: 'phrase:sukhamano', register: 'spoken' as const }];
    expect(filterByRegister(mixed, 'spoken')).toHaveLength(1);
    expect(filterByRegister(mixed, 'both')).toHaveLength(mixed.length);
  });
});
