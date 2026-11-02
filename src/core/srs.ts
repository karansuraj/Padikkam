import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type Grade as FsrsGrade,
} from 'ts-fsrs';
import type { CardState, Grade } from './types';

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

const GRADE_TO_RATING: Record<Grade, FsrsGrade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function toCard(s: CardState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.lastReview === null ? undefined : new Date(s.lastReview),
  };
}

function fromCard(entryId: string, c: Card): CardState {
  return {
    entryId,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as CardState['state'],
    lastReview: c.last_review ? c.last_review.getTime() : null,
  };
}

/** A brand-new card, due immediately. */
export function newCardState(entryId: string, now: Date = new Date()): CardState {
  return fromCard(entryId, createEmptyCard(now));
}

/** Apply a review and return the next state. Pure: does not mutate the input. */
export function review(state: CardState, grade: Grade, now: Date = new Date()): CardState {
  const { card } = scheduler.next(toCard(state), now, GRADE_TO_RATING[grade]);
  return fromCard(state.entryId, card);
}

/** Preview the next due date for each grade, to label the answer buttons. */
export function previewIntervals(
  state: CardState,
  now: Date = new Date(),
): Record<Grade, number> {
  const card = toCard(state);
  const out = {} as Record<Grade, number>;
  for (const g of Object.keys(GRADE_TO_RATING) as Grade[]) {
    out[g] = scheduler.next(card, now, GRADE_TO_RATING[g]).card.due.getTime();
  }
  return out;
}

export function isDue(state: CardState, now: Date = new Date()): boolean {
  return state.due <= now.getTime();
}
