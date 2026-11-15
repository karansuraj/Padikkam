import { useCallback, useRef } from 'react';
import { gradeAnswer } from '../core/grade';
import type { CardState } from '../core/types';
import { writeCardId } from '../core/write';
import { getAllCardStates, saveCardState } from '../data/db';

/**
 * Like useGrading, but for writing: one FSRS card per letter under `write:<letterId>`.
 * A pass is "good", a fail is "again". Save failures are logged and never block the screen.
 */
export function useWriteGrading() {
  const states = useRef<Map<string, CardState>>(new Map());

  const load = useCallback(async (): Promise<Map<string, CardState>> => {
    states.current = await getAllCardStates();
    return states.current;
  }, []);

  const onResult = useCallback(async (letterId: string, passed: boolean) => {
    try {
      const id = writeCardId(letterId);
      const next = gradeAnswer(states.current.get(id), id, passed);
      states.current = new Map(states.current).set(id, next);
      await saveCardState(next);
    } catch (e) {
      console.warn('Could not save writing result', e);
    }
  }, []);

  return { load, onResult };
}
