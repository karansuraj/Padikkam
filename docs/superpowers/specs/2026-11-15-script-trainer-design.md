# Script trainer: design (short)

Status: approved in conversation on 2026-11-15 (approach and design). Not yet committed.

## Intent

The learner knows no Malayalam script. They want to learn to recognise and
hear the letters, with real recorded audio, and to be quizzed so missed
letters come back via the existing FSRS scheduler. Built for one learner first.

## Goals

- Teach the 58 letters in small lessons, listening first.
- Quiz in both directions: hear a letter and pick the glyph, or see a glyph
  and pick its sound.
- Feed every answer into the existing FSRS state so weak letters resurface.
- Keep quiz and lesson logic pure and tested in `src/core` (no React Native).
- Show audio credits for the bundled clips.

## Non-goals

- Stroke order, writing practice, words and sentences (later roadmap items).
- Text-to-speech or any network call at runtime.
- Verifying the Malayalam. All letter entries stay `provenance: 'unverified'`.

## Anti-goals

- Any lesson that mixes registers or marks model-generated text as verified.
- Quiz options whose romanization is identical (that makes the question unfair).

## Constraints

- Expo SDK 58, Expo Router, `expo-audio`, `expo-sqlite`, `ts-fsrs` (already installed).
- `AGENTS.md`: Malayalam content carries `register` and `provenance`; `src/core`
  has no React Native imports; run `npm test` and `npm run typecheck` before done.
- Audio: 58 WAV clips (5.4 MB) in `assets/audio/letters/`, named by code point
  (`u0d15.wav`), with `manifest.json`. 57 are CC BY-SA 4.0, one is CC0, all by
  speaker "Vis M" via Lingua Libre on Wikimedia Commons. Attribution is required
  and the clips must stay under the same licence if converted or trimmed.

## Approaches considered

1. **Staged lessons (chosen).** About 10 lessons of 4 to 8 letters in the
   traditional order. Meet each letter, then a two-direction quiz. Passing
   unlocks the next lesson. Best fit for a learner starting from zero.
2. Free-explore grid plus a quiz over any selection. Cheaper, but no guidance.
3. Quiz-only drills. Simplest, but nowhere to study a letter first.

## Design

**Data (`src/data`)**
- `letters.ts`: 58 `Entry` records, `kind: 'letter'`, `register: 'formal'`,
  `provenance: 'unverified'`, ASCII `roman` that is unique per letter (capitals
  separate retroflex from dental, e.g. `ta` vs `Ta`), and `audio` set to the
  clip key. `source` names the clip's Commons title and licence.
- `lessons.ts`: ordered lessons, each a list of letter ids. Every letter appears
  in exactly one lesson.
- `audio.ts`: a static map from clip key to `require('../../assets/audio/letters/...')`
  (Metro needs literal paths). Generated from `manifest.json` by a small script.

**Core (`src/core`, pure)**
- `quiz.ts`: build a question (`hear-pick-glyph` or `see-pick-sound`) with one
  correct option and distractors drawn from the same lesson first, then from
  earlier lessons; options never share a romanization.
- `lesson.ts`: build a lesson quiz (each letter in both directions, shuffled),
  score it, pass at 80% or more, decide which lessons are unlocked.
- Grading maps a correct answer to FSRS `good` and a wrong one to `again`, using
  the existing `review()`.

**Storage**
- Per-letter FSRS state reuses the existing `card_state` table.
- One small new table, `lesson_progress(lesson_id, passed_at)`, created with
  `CREATE TABLE IF NOT EXISTS` in `getDb()`.

**Screens (`src/app`, Expo Router)**
- `index.tsx`: becomes a home with links. The current flashcard review moves to
  `review.tsx` unchanged.
- `letters.tsx`: lesson list with locked, current and passed states, plus a
  reference grid of all letters that plays audio on tap.
- `lesson/[id].tsx`: step through the letters (glyph, play button, romanization),
  then run the quiz, then show the result.
- `practice.tsx`: a quiz over letters that are due, from passed lessons only.
- `credits.tsx`: audio attribution read from `manifest.json`.

## Left to the builder

Exact lesson grouping edge cases (chillus and the rarer letters last), the
romanization table, layout and styling, shuffle seeding for deterministic tests.

## Known risks

- I cannot listen to the clips. A clip may say the letter name rather than the
  bare sound; the learner should check a few and report.
- One speaker means one accent.
- Letter romanization and glosses are model-written and unverified.

## Tests (Vitest, in `src/core`)

Every letter is in exactly one lesson; every letter's audio key exists in the
manifest; romanizations are unique; question options are unique and contain the
answer once; distractors prefer the same lesson; the 80% pass rule; unlock order;
grading maps to FSRS and does not mutate input; `validateDeck` passes.
