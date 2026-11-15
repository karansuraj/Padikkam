import { buildQuestion, shuffle, type Question, type QuestionKind, type Rng } from './quiz';
import type { Entry, Lesson } from './types';

/** A lesson quiz passes at this share of correct answers or higher. */
export const PASS_RATIO = 0.8;

const KINDS: QuestionKind[] = ['hear-pick-glyph', 'see-pick-sound'];

function entries(ids: string[], letters: Map<string, Entry>): Entry[] {
  return ids.map((id) => letters.get(id)).filter((e): e is Entry => e !== undefined);
}

/** Wrong-answer pools for a lesson: its own letters, then letters from earlier lessons. */
function poolsFor(lesson: Lesson, lessons: Lesson[], letters: Map<string, Entry>) {
  const index = lessons.findIndex((l) => l.id === lesson.id);
  return {
    sameLesson: entries(lesson.letterIds, letters),
    earlier: entries(lessons.slice(0, Math.max(index, 0)).flatMap((l) => l.letterIds), letters),
  };
}

/** Every letter of the lesson, once in each direction, shuffled. */
export function buildLessonQuiz(
  lesson: Lesson,
  lessons: Lesson[],
  letters: Map<string, Entry>,
  rng: Rng,
): Question[] {
  const pools = poolsFor(lesson, lessons, letters);
  const questions = pools.sameLesson.flatMap((target) =>
    KINDS.map((kind) => buildQuestion(kind, target, pools, rng)),
  );
  return shuffle(questions, rng);
}

export function scoreQuiz(answers: boolean[]): { correct: number; total: number; passed: boolean } {
  const correct = answers.filter(Boolean).length;
  const total = answers.length;
  return { correct, total, passed: total > 0 && correct / total >= PASS_RATIO };
}

/** The first lesson is always open; each next one opens only after the previous is passed. */
export function unlockedLessonIds(lessons: Lesson[], passed: ReadonlySet<string>): Set<string> {
  const unlocked = new Set<string>();
  let open = true;
  for (const lesson of lessons) {
    if (open) unlocked.add(lesson.id);
    open = open && passed.has(lesson.id);
  }
  return unlocked;
}

/** One question per due letter, limited to letters from lessons already passed. */
export function buildPracticeQuiz(
  dueIds: string[],
  lessons: Lesson[],
  passed: ReadonlySet<string>,
  letters: Map<string, Entry>,
  rng: Rng,
  max = 10,
): Question[] {
  const eligible = shuffle(dueIds, rng)
    .map((id) => ({ entry: letters.get(id), lesson: lessons.find((l) => l.letterIds.includes(id)) }))
    .filter((x): x is { entry: Entry; lesson: Lesson } =>
      x.entry !== undefined && x.lesson !== undefined && passed.has(x.lesson.id))
    .slice(0, Math.max(0, max));
  return eligible.map(({ entry, lesson }) =>
    buildQuestion(KINDS[rng() < 0.5 ? 0 : 1], entry, poolsFor(lesson, lessons, letters), rng),
  );
}
