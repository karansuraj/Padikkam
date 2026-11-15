/**
 * Core data model. Pure TypeScript, no React Native imports, so it can be
 * unit tested in Node and reused by the content tooling.
 */

/**
 * Formal (literary / news / textbook) and spoken (everyday conversation)
 * Malayalam differ a lot in vocabulary, verb endings and pronunciation.
 * Every phrase carries a register so the two never get mixed up in a deck.
 */
export type Register = 'formal' | 'spoken' | 'neutral';
// 'neutral' means a dictionary or citation form that the source does not label
// as formal or spoken. It is never used to claim that something is verified.

/** Who vouched for this entry. Anything model-generated starts as 'unverified'. */
export type Provenance =
  | 'unverified' // LLM draft, nobody checked it
  | 'self' // checked by the learner against a trusted source
  | 'native' // checked by a native speaker or tutor
  | 'dataset'; // imported from a licensed dataset

export type CardKind = 'letter' | 'word' | 'phrase' | 'sentence';

export interface Entry {
  /** Stable id, never reused. Example: "word:namaskaram" */
  id: string;
  kind: CardKind;
  register: Register;
  /** Malayalam script. */
  ml: string;
  /** Romanization ("Manglish"), learner-facing aid only. */
  roman: string;
  en: string;
  provenance: Provenance;
  /** Free-form tags, e.g. "greetings", "food", "week-1". */
  tags: string[];
  /** Path (relative to assets/audio) of a recorded or generated clip. */
  audio?: string;
  /** Where this entry came from, for licensing and attribution. */
  source?: string;
  note?: string;
}

/** Serializable FSRS state, stored per entry in SQLite. Dates are epoch ms. */
export interface CardState {
  entryId: string;
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** 0 New, 1 Learning, 2 Review, 3 Relearning (matches ts-fsrs State). */
  state: 0 | 1 | 2 | 3;
  lastReview: number | null;
}

export type Grade = 'again' | 'hard' | 'good' | 'easy';

/** An ordered group of letters taught and quizzed together. */
export interface Lesson {
  /** Stable id such as "l01". */
  id: string;
  title: string;
  /** Entry ids, in teaching order. */
  letterIds: string[];
}
