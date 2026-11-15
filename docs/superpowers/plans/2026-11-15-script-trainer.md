# Script Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A staged-lessons Malayalam script trainer: 11 lessons over 58 letters, recorded audio, two-direction quizzes, FSRS-backed practice.

**Architecture:** Pure logic (questions, lessons, scoring, unlocking, grading) in `src/core`, tested in Node. Letter data, the audio map and SQLite progress in `src/data`. Expo Router screens in `src/app` that only wire those together.

**Tech Stack:** Expo SDK 58, Expo Router, `expo-audio`, `expo-sqlite`, `ts-fsrs`, Vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-11-15-script-trainer-design.md`

## Global Constraints

- `src/core` has no React Native or Expo imports.
- Every letter entry: `kind: 'letter'`, `register: 'formal'`, `provenance: 'unverified'`. Never mark model-generated text as verified.
- `roman` is plain ASCII (`validateDeck` enforces it) and unique per letter; retroflex letters use capitals (`ta` vs `Ta`).
- Audio: 58 WAV clips in `assets/audio/letters/`, named `u<hex codepoints joined by _>.wav`, described by `manifest.json`. Credits must show speaker, licence and source page.
- Before using any Expo API (`expo-audio`, Expo Router), read the SDK 58 docs at `https://docs.expo.dev/versions/v58.0.0/` and follow them over memory.
- Do not commit unless the user asks. Stage nothing. Leave `package.json` and the lockfile changes as they are.
- Done means `npm test` and `npm run typecheck` both pass, plus a check on the phone via the running dev server (`exp://192.168.1.129:8081`).

## Review Focus

- Audio fails to load or play (muted, missing, slow): the tap does nothing harmful and the screen stays usable.
- A lesson smaller than 4 letters in the option pool (first lesson has no earlier letters): options never repeat and never run short of the answer.
- Double-tapping an answer: the question is graded once.
- Practice opened with nothing due, or with no passed lessons: a friendly empty state, no crash.
- Opening `/lesson/l05` while it is locked: blocked, not playable.

## File Structure

| File | Responsibility |
|---|---|
| `src/core/types.ts` (modify) | add `Lesson` |
| `src/core/quiz.ts` | rng, shuffle, `buildQuestion`, `isCorrect` |
| `src/core/lesson.ts` | lesson quiz, scoring, unlocking, practice quiz |
| `src/core/grade.ts` | answer to FSRS state |
| `src/data/letters.ts` | 58 `Entry` records |
| `src/data/lessons.ts` | the 11 lessons |
| `src/data/audio.ts` | generated `require` map |
| `scripts/gen-audio-map.mjs` | generates `audio.ts` from `manifest.json` |
| `src/data/progress.ts` | `lesson_progress` table access |
| `src/hooks/useLetterAudio.ts` | play a letter clip |
| `src/app/*` | home, review, letters, lesson, practice, credits |

---

### Task 1: Letters and lessons data

**Files:**
- Modify: `src/core/types.ts`, `src/data/seed.ts`
- Create: `src/data/letters.ts`, `src/data/lessons.ts`
- Test: `src/core/script-data.test.ts`

**Interfaces:**
- Produces: `interface Lesson { id: string; title: string; letterIds: string[] }`; `LETTERS: Entry[]`; `LETTER_BY_ID: Map<string, Entry>`; `LESSONS: Lesson[]`.
- Letter id is `letter:` + lowercase 4-digit hex of each code point joined by `_` (so ക is `letter:0d15`, റ്റ is `letter:0d31_0d4d_0d31`). `audio` is `letters/u<same hex>.wav`.

- [ ] **Step 1: Write the failing tests** in `src/core/script-data.test.ts`:
  - `has 58 letters, all formal, unverified, kind letter`
  - `roman is ASCII and unique`
  - `ids and audio paths derive from code points` (check ക and റ്റ explicitly)
  - `letters match manifest.json exactly` (read `assets/audio/letters/manifest.json`; the set of `ml` equals the set of manifest `letter`)
  - `every letter is in exactly one lesson; lesson sizes are [6,8,5,5,5,5,5,4,4,6,5]; ids are l01..l11`
  - `validateDeck(LETTERS) reports no problems`
- [ ] **Step 2:** Run `npx vitest run src/core/script-data.test.ts`. Expected: FAIL, modules not found.
- [ ] **Step 3:** Add `Lesson` to `types.ts`. Implement `letters.ts` with the 58 letters from the manifest (14 vowels, 39 consonants, 5 chillus `ൺ ൻ ർ ൽ ൾ`), each with an ASCII `roman` you choose (builder's call, unique, capitals for retroflex), a short `en` such as `consonant ka`, `tags: ['script', <group>]`, and `source` naming the Commons title and licence. Implement `lessons.ts` with these groups, titles in English:
  - l01 `അ ആ ഇ ഈ ഉ ഊ`; l02 `ഋ എ ഏ ഐ ഒ ഓ ഔ അം`; l03 `ക ഖ ഗ ഘ ങ`; l04 `ച ഛ ജ ഝ ഞ`; l05 `ട ഠ ഡ ഢ ണ`; l06 `ത ഥ ദ ധ ന`; l07 `പ ഫ ബ ഭ മ`; l08 `യ ര ല വ`; l09 `ശ ഷ സ ഹ`; l10 `ള ഴ റ റ്റ ഩ ഺ`; l11 `ൺ ൻ ർ ൽ ൾ`.
  Remove the two `letter:` entries from `SEED` (the trainer replaces them; they used different ids).
- [ ] **Step 4:** Run `npm test`. Expected: all pass, including the existing deck tests.

### Task 2: Audio map generator

**Files:**
- Create: `scripts/gen-audio-map.mjs`, `src/data/audio.ts` (generated)
- Modify: `package.json` (script `"gen:audio": "node scripts/gen-audio-map.mjs"`)
- Test: `src/core/audio-map.test.ts`

**Interfaces:**
- Produces: `AUDIO: Record<string, number>` keyed by an entry's `audio` path (`letters/u0d15.wav`), values from literal `require('../../assets/audio/letters/<file>')`.

- [ ] **Step 1: Write the failing test** `audio map covers exactly the letters' audio paths and every file exists`: parse `src/data/audio.ts` as text for its keys, compare with `LETTERS.map(l => l.audio)`, and check each file exists under `assets/audio/`. Add `every manifest entry lists speaker, licence and source page`.
- [ ] **Step 2:** Run it. Expected: FAIL, file missing.
- [ ] **Step 3:** Write `gen-audio-map.mjs` (reads the manifest, writes `audio.ts` with a "generated, do not edit" header, literal `require` paths). Run `npm run gen:audio`.
- [ ] **Step 4:** Run `npm test`. Expected: pass.

### Task 3: Question builder

**Files:**
- Create: `src/core/quiz.ts`
- Test: `src/core/quiz.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Rng = () => number;
  export type QuestionKind = 'hear-pick-glyph' | 'see-pick-sound';
  export interface Question { kind: QuestionKind; letterId: string; optionIds: string[] }
  export function seededRng(seed: number): Rng;
  export function shuffle<T>(xs: readonly T[], rng: Rng): T[];
  export function buildQuestion(
    kind: QuestionKind, target: Entry,
    pools: { sameLesson: Entry[]; earlier: Entry[] },
    rng: Rng, optionCount?: number, // default 4
  ): Question;
  export function isCorrect(q: Question, chosenId: string): boolean;
  ```

- [ ] **Step 1: Write the failing tests:** `options contain the answer exactly once`; `options are unique`; `distractors come from sameLesson before earlier`; `shrinks gracefully when the pool is smaller than optionCount (never repeats, still contains the answer)`; `seededRng is deterministic`; `isCorrect`.
- [ ] **Step 2:** Run `npx vitest run src/core/quiz.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Mulberry32-style seeded rng; Fisher-Yates shuffle that returns a copy.
- [ ] **Step 4:** Run it. Expected: pass.

### Task 4: Lessons, scoring, unlocking, practice, grading

**Files:**
- Create: `src/core/lesson.ts`, `src/core/grade.ts`
- Test: `src/core/lesson.test.ts`

**Interfaces:**
- Consumes: `Lesson`, `Question`, `buildQuestion`, `shuffle`, `Rng`, `review`, `newCardState`, `isDue`.
- Produces:
  ```ts
  export const PASS_RATIO = 0.8;
  export function buildLessonQuiz(lesson: Lesson, lessons: Lesson[], letters: Map<string, Entry>, rng: Rng): Question[]; // 2 per letter, one of each kind, shuffled
  export function scoreQuiz(answers: boolean[]): { correct: number; total: number; passed: boolean };
  export function unlockedLessonIds(lessons: Lesson[], passed: ReadonlySet<string>): Set<string>; // first always; next only after previous passed
  export function buildPracticeQuiz(dueIds: string[], lessons: Lesson[], passed: ReadonlySet<string>, letters: Map<string, Entry>, rng: Rng, max?: number): Question[]; // only letters from passed lessons, default max 10
  // grade.ts
  export function gradeAnswer(prev: CardState | undefined, letterId: string, correct: boolean, now?: Date): CardState; // good / again
  ```

- [ ] **Step 1: Write the failing tests:** `lesson quiz has 2 questions per letter, both kinds`; `every lesson quiz question has 4 options except where fewer letters exist` (loop all 11 lessons using real data); `score passes at exactly 80% (4 of 5) and fails at 3 of 5`; `only the first lesson is unlocked with nothing passed`; `passing a lesson unlocks only the next one`; `practice excludes letters from unpassed lessons and returns [] when nothing qualifies`; `gradeAnswer maps correct to good, wrong to again, creates new state when prev is undefined, does not mutate prev`.
- [ ] **Step 2:** Run `npx vitest run src/core/lesson.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. `earlier` pool = letters of all lessons before the target's lesson.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: pass.

### Task 5: Lesson progress storage

**Files:**
- Modify: `src/data/db.ts` (add `CREATE TABLE IF NOT EXISTS lesson_progress (lesson_id TEXT PRIMARY KEY NOT NULL, passed_at INTEGER NOT NULL)` to the migration)
- Create: `src/data/progress.ts`

**Interfaces:**
- Produces: `getPassedLessonIds(): Promise<Set<string>>`; `markLessonPassed(lessonId: string, now?: Date): Promise<void>` (idempotent, `INSERT OR REPLACE`).

- [ ] **Step 1:** Implement both with `getDb()`. expo-sqlite cannot run in Node, so there is no unit test; the check is Task 9 on the phone.
- [ ] **Step 2:** Run `npm run typecheck`. Expected: pass.

### Task 6: Home, review move, audio hook, letters screen

**Files:**
- Modify: `src/app/index.tsx` (becomes Home); `src/app/_layout.tsx` (register screen titles)
- Create: `src/app/review.tsx` (the current review screen, moved unchanged), `src/hooks/useLetterAudio.ts`, `src/app/letters.tsx`

**Interfaces:**
- Produces: `useLetterAudio(): { play: (letterId: string) => void }`, never throws; a missing or failed clip is swallowed and logged.
- `letters.tsx`: lesson list (locked, current, passed from `unlockedLessonIds` + `getPassedLessonIds`) and a reference grid of all 58 letters that plays audio on tap. Locked rows are not pressable.

- [ ] **Step 1:** Read the SDK 58 `expo-audio` docs, then implement the hook with `AUDIO[entry.audio]`.
- [ ] **Step 2:** Move review, build Home (links: Letters, Practice, Review cards, Credits), build the letters screen.
- [ ] **Step 3:** Run `npm run typecheck`; bundle check: `curl` the Android bundle URL from the dev server and expect HTTP 200.

### Task 7: Lesson screen

**Files:**
- Create: `src/app/lesson/[id].tsx`, `src/components/QuizView.tsx` (shared by Task 8)

**Interfaces:**
- Produces: `QuizView({ questions, onAnswer, onFinish }: { questions: Question[]; onAnswer: (q: Question, correct: boolean) => void; onFinish: (answers: boolean[]) => void })`. It owns the single-grade guard and the audio autoplay.
- Consumes: `LESSONS`, `buildLessonQuiz`, `scoreQuiz`, `gradeAnswer`, `saveCardState`, `getAllCardStates`, `markLessonPassed`, `useLetterAudio`.
- Flow: intro steps (glyph, play button, `roman`, `en`), then the quiz (autoplay clip for `hear-pick-glyph`; show glyph for `see-pick-sound` with a replay button), then a result. Pass: mark passed. Fail: "Try again" builds a fresh shuffled quiz.
- Guards: unknown or locked lesson id redirects to `/letters`; each question is graded once even if the answer is tapped twice; each answer saves `gradeAnswer` state immediately.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npm run typecheck`, bundle check as in Task 6.

### Task 8: Practice and credits

**Files:**
- Create: `src/app/practice.tsx`, `src/app/credits.tsx`

- [ ] **Step 1:** `practice.tsx`: due letters (`isDue` over saved states, restricted by `buildPracticeQuiz`); empty state when there are none, with a link to Letters. Reuse `QuizView` from Task 7 for the questions; do not copy it.
- [ ] **Step 2:** `credits.tsx`: reads the manifest and shows "Audio by <speaker>, <licence>, via Lingua Libre / Wikimedia Commons" with the licence link and each source page; notes the clips are unverified learning aids.
- [ ] **Step 3:** `npm run typecheck`, bundle check.

### Task 9: Verify

- [ ] **Step 1:** `npm test` and `npm run typecheck` pass; `npx expo lint` if configured, otherwise say it was not run.
- [ ] **Step 2:** On the phone via Expo Go: lesson 1 plays audio, a passing quiz unlocks lesson 2 and survives closing and reopening the app, a failed quiz does not unlock, Practice shows the empty state before any lesson is passed, Credits renders.
- [ ] **Step 3:** Report to the user what was and was not checked, and that the clips and romanization are unverified.
