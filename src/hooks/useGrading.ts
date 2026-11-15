import { useCallback, useRef } from 'react';
import { gradeAnswer } from '../core/grade';
import type { Question } from '../core/quiz';
import type { CardState } from '../core/types';
import { getAllCardStates, saveCardState } from '../data/db';

/**
 * Keeps every letter's FSRS state in memory and writes each graded answer to
 * SQLite right away. Save failures are logged and never block the quiz.
 */
export function useGrading() {
  const states = useRef<Map<string, CardState>>(new Map());

  const load = useCallback(async (): Promise<Map<string, CardState>> => {
    states.current = await getAllCardStates();
    return states.current;
  }, []);

  const onAnswer = useCallback(async (q: Question, correct: boolean) => {
    try {
      const next = gradeAnswer(states.current.get(q.letterId), q.letterId, correct);
      states.current = new Map(states.current).set(q.letterId, next);
      await saveCardState(next);
    } catch (e) {
      console.warn('Could not save answer', e);
    }
  }, []);

  return { load, onAnswer };
}
