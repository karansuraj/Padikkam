import { newCardState, review } from './srs';
import type { CardState } from './types';

/**
 * Turn a quiz answer into the letter's next FSRS state: right is "good",
 * wrong is "again". Pure; a letter never seen before starts as a new card.
 */
export function gradeAnswer(
  prev: CardState | undefined,
  letterId: string,
  correct: boolean,
  now: Date = new Date(),
): CardState {
  return review(prev ?? newCardState(letterId, now), correct ? 'good' : 'again', now);
}
