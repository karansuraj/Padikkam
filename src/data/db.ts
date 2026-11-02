import * as SQLite from 'expo-sqlite';
import type { CardState } from '../core/types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Open (once) and migrate the local database. All learner data stays on device. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('padikkam.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS card_state (
          entry_id       TEXT PRIMARY KEY NOT NULL,
          due            INTEGER NOT NULL,
          stability      REAL NOT NULL,
          difficulty     REAL NOT NULL,
          elapsed_days   INTEGER NOT NULL,
          scheduled_days INTEGER NOT NULL,
          learning_steps INTEGER NOT NULL,
          reps           INTEGER NOT NULL,
          lapses         INTEGER NOT NULL,
          state          INTEGER NOT NULL,
          last_review    INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_card_state_due ON card_state(due);
      `);
      return db;
    })();
  }
  return dbPromise;
}

interface Row {
  entry_id: string;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: number | null;
}

const fromRow = (r: Row): CardState => ({
  entryId: r.entry_id,
  due: r.due,
  stability: r.stability,
  difficulty: r.difficulty,
  elapsedDays: r.elapsed_days,
  scheduledDays: r.scheduled_days,
  learningSteps: r.learning_steps,
  reps: r.reps,
  lapses: r.lapses,
  state: r.state as CardState['state'],
  lastReview: r.last_review,
});

export async function saveCardState(s: CardState): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO card_state
     (entry_id, due, stability, difficulty, elapsed_days, scheduled_days,
      learning_steps, reps, lapses, state, last_review)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    s.entryId, s.due, s.stability, s.difficulty, s.elapsedDays, s.scheduledDays,
    s.learningSteps, s.reps, s.lapses, s.state, s.lastReview,
  );
}

export async function getAllCardStates(): Promise<Map<string, CardState>> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT * FROM card_state');
  return new Map(rows.map((r) => [r.entry_id, fromRow(r)]));
}
