import { isDue } from './srs';
import type { CardState, Entry } from './types';

/**
 * Today's flashcards: every card that is due, earliest first, then at most
 * `maxNew` cards that have never been seen, in deck order. Without the cap a
 * 300-word deck would put 300 brand-new cards in front of the learner at once.
 */
export function buildReviewQueue(
  deck: Entry[],
  states: Map<string, CardState>,
  now: Date,
  maxNew = 10,
): Entry[] {
  const due: { entry: Entry; at: number; index: number }[] = [];
  const fresh: Entry[] = [];
  deck.forEach((entry, index) => {
    const state = states.get(entry.id);
    if (!state) fresh.push(entry);
    else if (isDue(state, now)) due.push({ entry, at: state.due, index });
  });
  due.sort((a, b) => a.at - b.at || a.index - b.index);
  return [...due.map((d) => d.entry), ...fresh.slice(0, Math.max(0, maxNew))];
}
