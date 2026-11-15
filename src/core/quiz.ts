import type { Entry } from './types';

/** Returns a number in [0, 1). Injected so quizzes are deterministic in tests. */
export type Rng = () => number;

/** What the learner is asked: hear a clip and pick the glyph, or see a glyph and pick its sound. */
export type QuestionKind = 'hear-pick-glyph' | 'see-pick-sound';

export interface Question {
  kind: QuestionKind;
  /** The correct letter's entry id. */
  letterId: string;
  /** Entry ids in display order; contains letterId exactly once. */
  optionIds: string[];
}

/** Small deterministic generator (mulberry32). */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates on a copy. */
export function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build one question. Wrong options come from the target's own lesson first
 * (the letters most easily confused with it), then from earlier lessons.
 * With fewer candidates than optionCount the question simply has fewer options.
 */
export function buildQuestion(
  kind: QuestionKind,
  target: Entry,
  pools: { sameLesson: Entry[]; earlier: Entry[] },
  rng: Rng,
  optionCount = 4,
): Question {
  const taken = new Set<string>([target.id]);
  const pick = (pool: Entry[], need: number): Entry[] => {
    const out: Entry[] = [];
    for (const e of shuffle(pool, rng)) {
      if (out.length >= need) break;
      if (taken.has(e.id)) continue;
      taken.add(e.id);
      out.push(e);
    }
    return out;
  };
  const need = Math.max(0, optionCount - 1);
  const fromLesson = pick(pools.sameLesson, need);
  const fromEarlier = pick(pools.earlier, need - fromLesson.length);
  const optionIds = shuffle([target, ...fromLesson, ...fromEarlier], rng).map((e) => e.id);
  return { kind, letterId: target.id, optionIds };
}

export function isCorrect(q: Question, chosenId: string): boolean {
  return chosenId === q.letterId;
}
