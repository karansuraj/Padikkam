import { isDue } from './srs';
import type { CardState, Lesson } from './types';

/** Writing is its own skill, so it gets its own FSRS card per letter, apart from the recognition card. */
export const writeCardId = (letterId: string): string => `write:${letterId}`;

/** Letters of the lessons the learner has passed, in lesson order. */
export function letterIdsOfPassedLessons(lessons: Lesson[], passed: ReadonlySet<string>): string[] {
  return lessons.filter((l) => passed.has(l.id)).flatMap((l) => l.letterIds);
}

/**
 * Which letters to write now: those whose writing card is due (earliest first),
 * then letters never written, in the order given, at most `max` in all.
 */
export function buildWriteSession(
  letterIds: string[],
  states: Map<string, CardState>,
  now: Date,
  max = 5,
): string[] {
  const due: { id: string; at: number; index: number }[] = [];
  const fresh: string[] = [];
  letterIds.forEach((id, index) => {
    const state = states.get(writeCardId(id));
    if (!state) fresh.push(id);
    else if (isDue(state, now)) due.push({ id, at: state.due, index });
  });
  due.sort((a, b) => a.at - b.at || a.index - b.index);
  return [...due.map((d) => d.id), ...fresh].slice(0, Math.max(0, max));
}
