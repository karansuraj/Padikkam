import { describe, expect, it } from 'vitest';
import { buildReviewQueue } from './review-queue';
import { newCardState, review } from './srs';
import type { CardState, Entry } from './types';

const NOW = new Date('2026-11-15T12:00:00Z');
const day = 24 * 3600_000;

const entry = (n: number): Entry => ({
  id: `word:L${n}`,
  kind: 'word',
  register: 'neutral',
  ml: 'അ',
  roman: 'a',
  en: `word ${n}`,
  provenance: 'dataset',
  tags: [],
});
const deck = (n: number) => Array.from({ length: n }, (_, i) => entry(i + 1));
const stateDue = (id: string, daysAgo: number): CardState =>
  newCardState(id, new Date(NOW.getTime() - daysAgo * day));

describe('buildReviewQueue', () => {
  it('puts due reviews first, earliest due first', () => {
    const d = deck(5);
    const states = new Map([
      ['word:L2', stateDue('word:L2', 1)],
      ['word:L4', stateDue('word:L4', 3)],
    ]);
    const q = buildReviewQueue(d, states, NOW);
    expect(q.map((e) => e.id).slice(0, 2)).toEqual(['word:L4', 'word:L2']);
  });

  it('leaves out cards that are not due yet', () => {
    const d = deck(3);
    const notDue = review(newCardState('word:L1', NOW), 'good', NOW);
    const q = buildReviewQueue(d, new Map([['word:L1', notDue]]), NOW);
    expect(q.map((e) => e.id)).toEqual(['word:L2', 'word:L3']);
  });

  it('never-seen cards keep deck order after the due ones', () => {
    const d = deck(4);
    const q = buildReviewQueue(d, new Map([['word:L3', stateDue('word:L3', 1)]]), NOW);
    expect(q.map((e) => e.id)).toEqual(['word:L3', 'word:L1', 'word:L2', 'word:L4']);
  });

  it('caps never-seen cards at maxNew (default 10): 300 new cards give exactly 10', () => {
    expect(buildReviewQueue(deck(300), new Map(), NOW)).toHaveLength(10);
    expect(buildReviewQueue(deck(300), new Map(), NOW, 3)).toHaveLength(3);
  });

  it('the cap applies to new cards only, not to due reviews', () => {
    const d = deck(40);
    const states = new Map(d.slice(0, 25).map((e) => [e.id, stateDue(e.id, 2)] as const));
    const q = buildReviewQueue(d, states, NOW);
    expect(q).toHaveLength(25 + 10);
  });

  it('an empty deck gives an empty queue', () => {
    expect(buildReviewQueue([], new Map(), NOW)).toEqual([]);
  });
});
