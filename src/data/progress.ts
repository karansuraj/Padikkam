import { getDb } from './db';

/** Ids of lessons the learner has passed. Empty on a fresh install. */
export async function getPassedLessonIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ lesson_id: string }>('SELECT lesson_id FROM lesson_progress');
  return new Set(rows.map((r) => r.lesson_id));
}

/** Record a passed lesson. Safe to call again: it just refreshes the timestamp. */
export async function markLessonPassed(lessonId: string, now: Date = new Date()): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO lesson_progress (lesson_id, passed_at) VALUES (?, ?)',
    lessonId,
    now.getTime(),
  );
}
