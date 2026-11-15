# Letter tracing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the learner trace Malayalam letters on a canvas, scored against a tunable stray-distance corridor, with a "watch how it's written" clip, graded through FSRS.

**Architecture:** Pure scorer in `src/core/trace.ts` compares the learner's strokes with a per-letter skeleton (centreline of the Noto Sans Malayalam glyph, generated offline by a script). A react-native-svg canvas with PanResponder collects strokes in canvas fractions. Writing results use separate FSRS cards (`write:<letterId>`). UT Austin hand-writing MP4s are shown as an order reference only and are never scored.

**Tech Stack:** Expo SDK 58, Expo Router, `react-native-svg` 15.16.0, `expo-video` ~58.0.13, `ts-fsrs`, Vitest, `opentype.js` (dev only, build script).

**Spec:** `docs/superpowers/specs/2026-11-15-letter-tracing-design.md`

## Global Constraints

- `src/core` has no React Native imports (AGENTS.md).
- Versions come from `node_modules/expo/bundledNativeModules.json`; `expo install` fails here, so use `npm install <pkg>@<version>`.
- Read the SDK 58 docs (https://docs.expo.dev/versions/v58.0.0/) before writing `expo-video` code.
- Coordinates are fractions of the canvas side. Defaults: tolerance 0.08, minCoverage 0.8, minPrecision 0.8, spacing 0.01.
- No stroke order or direction is scored or claimed in the UI.
- No requests to Wikimedia or Wikidata hosts. Do not touch `assets/audio/words/`, `src/data/audio*`, `tools/wikimedia/`, `.wikimedia-cache/`, `.env.wikimedia.local`.
- Attribution: Noto Sans Malayalam (OFL 1.1, "Copyright 2022 The Noto Project Authors") and UT Austin Malayalam clips (CC BY 4.0, Donald R. Davis, Jr., https://malayalam.la.utexas.edu) appear in `docs/third-party/` and on the Credits screen.
- Run `npm test` and `npm run typecheck` before declaring done. No commits unless the user asks (the commit steps below mean "stage a commit if asked").

## Review Focus

- Learner lifts the finger between strokes (multi-stroke letters): stroke count and order must not change the score. Tested in Task 1.
- A scribble that covers the whole canvas must not pass even though coverage is 100%. Task 1.
- Touch points outside 0..1 (finger drags off the canvas) or `NaN`: must not crash; off-canvas ink counts as stray. Task 1.
- A tiny dot or a letter drawn tiny in a corner: fails in Trace mode with a "too small or short" message; passes in From memory mode only after `fitToTarget`. Task 1.
- Every one of the 58 letters has a non-empty skeleton that passes against itself and fails against a different letter. Task 3.
- A letter with no clip must not show a broken watch button. Task 4.

---

### Task 1: Trace scorer (core)

**Files:**
- Create: `src/core/trace.ts`
- Test: `src/core/trace.test.ts`

**Interfaces:**
- Produces:
  - `type Point = { x: number; y: number }`, `type Stroke = Point[]`, `interface TraceTarget { strokes: Stroke[] }`
  - `interface TraceOptions { tolerance: number; minCoverage: number; minPrecision: number; spacing: number; minInkRatio: number }` and `const DEFAULT_TRACE_OPTIONS: TraceOptions` (0.08, 0.8, 0.8, 0.01, 0.25)
  - `type TraceFeedback = 'empty' | 'too-short' | 'strayed' | 'incomplete' | 'good' | 'great'`
  - `interface TraceResult { coverage: number; precision: number; overshoot: number; score: number; passed: boolean; feedback: TraceFeedback }`
  - `scoreTrace(target: TraceTarget, strokes: Stroke[], options?: Partial<TraceOptions>): TraceResult`
  - `fitToTarget(strokes: Stroke[], target: TraceTarget): Stroke[]`
  - `resample(stroke: Stroke, spacing: number): Point[]`

- [ ] **Step 1: Write the failing tests** in `src/core/trace.test.ts`, using plain fixtures (a horizontal line target `(0.2,0.5)->(0.8,0.5)` and an L-shaped two-segment target). Tests:
  - `perfect trace passes with score 100 and feedback 'great'`
  - `trace shifted by 0.04 (inside tolerance) passes`; `shifted by 0.2 fails with feedback 'strayed'`
  - `scribble over the whole canvas has coverage ~1, precision < 0.5, fails 'strayed'`
  - `half of the target traced fails 'incomplete' with coverage ~0.5 and precision ~1`
  - `empty strokes and strokes of empty arrays give feedback 'empty', score 0`
  - `single point and a stroke shorter than minInkRatio of target length give 'too-short', never passed`
  - `stroke far outside the region gives coverage 0, precision 0`
  - boundary: a trace offset exactly `tolerance` is inside, offset `tolerance + 0.01` is outside (assert precision 1 vs < 1)
  - `two strokes drawn in either order and split mid-way give identical results`
  - `NaN and out-of-range points do not throw; off-canvas points reduce precision`
  - `fitToTarget moves and scales a small copy in the corner so it passes; empty input returns empty`
  - `custom tolerance is respected`
- [ ] **Step 2: Run** `npx vitest run src/core/trace.test.ts`. Expected: FAIL, module missing.
- [ ] **Step 3: Implement** `src/core/trace.ts` per the Interfaces. Approach: resample target and learner strokes at `spacing`; coverage = share of target samples with a learner sample within `tolerance` (inclusive); precision = share of learner samples whose distance to any target segment is `<= tolerance`; score = round(100 * harmonic mean); passed = coverage ≥ minCoverage and precision ≥ minPrecision and ink length ≥ minInkRatio × target length; feedback `great` at score ≥ 90, `good` otherwise on pass; fail picks `strayed` when precision < minPrecision else `incomplete`; `empty` for no valid points; `too-short` when ink length is below the minimum. Drop non-finite points first. `fitToTarget` uniformly scales and translates the learner's ink bounding box to the target's bounding box centre.
- [ ] **Step 4: Run** `npx vitest run src/core/trace.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `src/core/trace.ts src/core/trace.test.ts` ("Add trace scorer").

### Task 2: Glyph generation library (outline, raster, skeleton)

**Files:**
- Create: `scripts/glyph-lib.mjs`, `scripts/glyph-lib.test.mjs`
- Modify: `package.json` (devDependency `opentype.js`, script `gen:glyphs`)

**Interfaces:**
- Produces (all pure, no font needed):
  - `flattenCommands(commands, steps = 12): number[][][]` — opentype path commands (`M L Q C Z`) to polygons of `[x, y]`.
  - `fitPolygons(polygons, box = 0.08): { polygons: number[][][]; scale: number }` — flip Y, scale uniformly, centre in the unit square with margin `box`.
  - `fillPolygons(polygons, size): Uint8Array` — non-zero winding fill into a `size × size` bitmap over the unit square.
  - `thin(bitmap, size): Uint8Array` — Zhang-Suen thinning.
  - `skeletonPolylines(thinned, size, spurLength): [number, number][][]` — pixel graph to polylines in unit coordinates, short terminal branches pruned, then Douglas-Peucker simplified (epsilon 0.004).
  - `pathData(polygons): string` — SVG path `d` in a 0..100 viewBox, rounded to 1 decimal.

- [ ] **Step 1: `npm install -D opentype.js`** (registry reachable; record the version added). Add `"gen:glyphs": "node scripts/gen-glyph-targets.mjs"`.
- [ ] **Step 2: Write failing tests** in `scripts/glyph-lib.test.mjs` on tiny synthetic shapes: a filled square's thinning is a single connected pixel cluster inside the square; a thick plus sign yields polylines whose endpoints are near the four arm tips; a spur of length below `spurLength` on a line is pruned, a longer one is kept; `fillPolygons` of a counter-wound hole leaves the hole empty; `flattenCommands` on a `Q` curve ends at the curve end; `fitPolygons` output lies within `[box, 1 - box]`.
- [ ] **Step 3: Run** `npx vitest run scripts/glyph-lib.test.mjs`. Expected: FAIL.
- [ ] **Step 4: Implement** `scripts/glyph-lib.mjs` per the Interfaces. The thinning and polyline walk algorithms were spiked and work on `ക` and `ഴ`; use 8-connectivity and treat pixels with 1 neighbour as endpoints and ≥3 as junctions.
- [ ] **Step 5: Run** the same test. Expected: PASS.
- [ ] **Step 6: Commit** ("Add glyph generation library").

### Task 3: Glyph targets for the 58 letters

**Files:**
- Create: `scripts/gen-glyph-targets.mjs`, `scripts/glyph/NotoSansMalayalam-Regular.ttf`, `docs/third-party/NotoSansMalayalam-OFL.txt`, `docs/third-party/README.md`, `src/data/glyph-targets.ts` (generated), `src/data/glyphs.ts`, `src/core/glyph-data.test.ts`
- Modify: `README.md` (credits line)

**Interfaces:**
- Consumes: `flattenCommands`, `fitPolygons`, `fillPolygons`, `thin`, `skeletonPolylines`, `pathData` from Task 2; `scoreTrace`, `TraceTarget` from Task 1.
- Produces:
  - `GLYPH_TARGETS: Record<string, { d: string; strokes: [number, number][][] }>` keyed by letter id (`letter:0d15`) in `src/data/glyph-targets.ts`.
  - `getGlyph(letterId: string): { d: string; target: TraceTarget } | undefined` in `src/data/glyphs.ts`.

- [ ] **Step 1: Write the failing test** `src/core/glyph-data.test.ts`: every id in `LETTERS` has a `getGlyph` result; `d` non-empty; each target has ≥ 1 stroke with ≥ 2 points, all coordinates in `[0, 1]`; for each letter, `scoreTrace(own.target, own.target.strokes).passed` is true; and for each letter, scoring a *different* letter's strokes fails at least 90% of the time over all pairs (assert the ratio, since some small marks can legitimately resemble each other).
- [ ] **Step 2: Run** `npx vitest run src/core/glyph-data.test.ts`. Expected: FAIL.
- [ ] **Step 3: Put the font and licence in the repo.** Copy `NotoSansMalayalam-Regular.ttf` (unhinted TTF, v2.104, from `https://github.com/notofonts/malayalam/releases/download/NotoSansMalayalam-v2.104/NotoSansMalayalam-v2.104.zip`) to `scripts/glyph/` and the zip's `OFL.txt` to `docs/third-party/NotoSansMalayalam-OFL.txt`. `docs/third-party/README.md` records both sources and licences (also the UT clips, see Task 4).
- [ ] **Step 4: Implement** `scripts/gen-glyph-targets.mjs`: parse the TTF with `opentype.parse`, for each letter in `src/data/letters.ts` (import the generated list by reading the file's `ml` strings through a small TS-free regex, or add a plain JSON export if cleaner) lay out its code points left to right using advance widths, run the Task 2 pipeline at `size = 256`, spur length 8 px, and write `src/data/glyph-targets.ts` with a generated-file header, coordinates rounded to 3 decimals. Implement `src/data/glyphs.ts` converting tuples to `TraceTarget`.
- [ ] **Step 5: Run** `npm run gen:glyphs`, then render a contact sheet (a throwaway HTML or SVG in the scratchpad, not committed) of all 58 outlines with skeletons overlaid and look at it. Fix spur length or thinning for any letter whose skeleton is clearly wrong (stray branches, missing loops, broken parts).
- [ ] **Step 6: Run** `npx vitest run src/core/glyph-data.test.ts`. Expected: PASS.
- [ ] **Step 7: Commit** ("Add glyph targets for the 58 letters").

### Task 4: Stroke-order clips (reference only)

**Files:**
- Create: `src/data/stroke-clips.ts`, `src/core/stroke-clips.test.ts`
- Already present (downloaded with permission): `assets/video/strokes/*.mp4` (51 files, 1.3 MB, CC BY 4.0)
- Modify: `docs/third-party/README.md`

**Interfaces:**
- Produces: `STROKE_CLIPS: Record<string, number>` (letter id to `require()` asset id) and `clipFor(letterId: string): number | undefined` in `src/data/stroke-clips.ts`.

- [ ] **Step 1: Build the mapping.** UT clip names follow the page's alphabetical chart: vowels `a aa i ii u uu ri e ee ai o oo au am ah`; consonants `ka kha ga gha nra | ca cha ja jha nya | tra trha dra drha nna | ta tha da dha na | pa pha ba bha ma | ya ra la va sha shha sa ha lra lla raa`. Map each to a letter by Unicode order (`nra` is ങ, `nya` ഞ, `tra`/`trha`/`dra`/`drha`/`nna` are ട ഠ ഡ ഢ ണ, `lra` ള, `lla` ഴ, `raa` റ). Letters with no clip (chillu letters, conjunct letters, anything unmatched) are simply absent.
- [ ] **Step 2: Verify the mapping by eye.** With `ffmpeg`, grab each clip's last frame into a contact sheet in the scratchpad and compare with the glyph each clip is mapped to. Fix any mismatch before writing the table.
- [ ] **Step 3: Write the failing test** `src/core/stroke-clips.test.ts`: every key in `STROKE_CLIPS` is a real letter id; every `require('../../assets/video/strokes/<name>.mp4')` path in the source file exists on disk (read the source text with `fs`, regex the paths); `clipFor` of an unmapped letter is `undefined`.
- [ ] **Step 4: Run** it. Expected: FAIL.
- [ ] **Step 5: Implement** `src/data/stroke-clips.ts` with literal `require` calls (Metro needs literals) and `clipFor`.
- [ ] **Step 6: Run** `npx vitest run src/core/stroke-clips.test.ts`. Expected: PASS.
- [ ] **Step 7: Commit** ("Add stroke-order clips from UT Austin (CC BY 4.0)").

### Task 5: Writing cards and session (core + storage glue)

**Files:**
- Create: `src/core/write.ts`, `src/core/write.test.ts`, `src/hooks/useWriteGrading.ts`

**Interfaces:**
- Consumes: `isDue` from `src/core/srs.ts`; `gradeAnswer` from `src/core/grade.ts`; `getAllCardStates`, `saveCardState` from `src/data/db.ts`.
- Produces:
  - `writeCardId(letterId: string): string` returns `write:<letterId>`.
  - `buildWriteSession(letterIds: string[], states: Map<string, CardState>, now: Date, max = 5): string[]` — due writing cards (earliest first), then letters never written, in the given order, capped at `max`.
  - `useWriteGrading(): { load(): Promise<Map<string, CardState>>; onResult(letterId: string, passed: boolean): Promise<void> }`; save failures are logged, never thrown.

- [ ] **Step 1: Write failing tests** in `src/core/write.test.ts`: `writeCardId` format; due writing cards come before unseen ones; not-yet-due cards are excluded; cap respected; empty input gives empty; recognition cards (`letter:…` ids in `states`) never count as writing cards; grading a pass with `gradeAnswer(undefined, writeCardId(id), true)` returns a `good` review (reps 1, state ≥ 1).
- [ ] **Step 2: Run** `npx vitest run src/core/write.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/core/write.ts` and `src/hooks/useWriteGrading.ts` (mirror `src/hooks/useGrading.ts`).
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** ("Add writing cards and session builder").

### Task 6: Drawing canvas and write screen

**Files:**
- Create: `src/components/TraceCanvas.tsx`, `src/components/StrokeClip.tsx`, `src/app/write.tsx`
- Modify: `package.json` (`react-native-svg` 15.16.0, `expo-video` ~58.0.13), `src/app/lesson/[id].tsx` ("Trace it" button on the intro card), `src/app/index.tsx` (Writing practice card), `src/app/credits.tsx` (Noto and UT credits), `src/app/_layout.tsx` only if a new route needs a title

**Interfaces:**
- Consumes: `getGlyph`, `scoreTrace`, `fitToTarget`, `DEFAULT_TRACE_OPTIONS`, `clipFor`, `buildWriteSession`, `useWriteGrading`, `useLetterAudio`, `getPassedLessonIds`, `LESSONS`, `LETTER_BY_ID`.
- Produces:
  - `TraceCanvas` props: `{ size: number; guidePath?: string; skeleton?: Stroke[]; onChange(strokes: Stroke[]): void; disabled?: boolean }`, with an imperative `clear()` via `ref`. Strokes are reported in canvas fractions; points closer than 0.004 are dropped; touches are captured so nothing scrolls.
  - `StrokeClip` props: `{ letterId: string }`, renders nothing when `clipFor` is undefined.
  - `/write?letter=<id>` traces one letter; `/write` runs `buildWriteSession` over letters of passed lessons (all lessons open if none passed is not allowed; show the empty state instead).

- [ ] **Step 1: Install** `npm install react-native-svg@15.16.0 expo-video@~58.0.13` and confirm both versions equal `bundledNativeModules.json`. Read the SDK 58 `expo-video` docs and the `react-native-svg` usage in the Expo docs before writing code.
- [ ] **Step 2: Implement `TraceCanvas`** with `PanResponder` (`onStartShouldSetPanResponder` true, capture true, terminate request refused), square `Svg`, light grid with centre lines, optional faint guide `Path` (fill from `guidePath` at viewBox 0..100), the learner's strokes as round-capped polylines, and an optional skeleton overlay in a different colour.
- [ ] **Step 3: Implement `StrokeClip`** with `useVideoPlayer` and `VideoView`, a "Watch how it's written" toggle that plays looped, muted, inline.
- [ ] **Step 4: Implement `write.tsx`** with phases: loading, empty, write (Trace / From memory toggle, Check, Clear), result (score, one feedback line per `TraceFeedback`, skeleton overlay on the attempt, Try again, Next), done. A fixed note: "Stroke order and direction are not checked." After Check call `onResult(letterId, passed)` once per attempt result shown (not on Clear). From memory runs `fitToTarget` before `scoreTrace` and hides the guide until Check.
- [ ] **Step 5: Wire entry points**: "Trace it" on the lesson intro card pushing `/write?letter=<id>`; "Writing practice" card on the home screen; credits entries linking to the two licences. Lesson quiz flow and unlock logic stay unchanged.
- [ ] **Step 6: Run** `npm run typecheck` and `npx expo lint` (if configured; else skip and say so). Expected: no errors.
- [ ] **Step 7: Commit** ("Add tracing canvas, write screen and entry points").

### Task 7: Verification and review

- [ ] **Step 1:** `npm test` and `npm run typecheck`. Expected: all pass.
- [ ] **Step 2:** Start a second Metro from the worktree on port 8082 (`npx expo start --lan --port 8082 --offline`, background) and `curl` the Android entry bundle (`/node_modules/expo-router/entry.bundle?platform=android&dev=true`); expect HTTP 200. Stop it afterwards. The dev server on 8081 serves the main checkout and is not used.
- [ ] **Step 3:** Run an independent whole-change review (superpowers:requesting-code-review) against `origin/main`; apply fixes, re-run steps 1 and 2.
- [ ] **Step 4:** Write a short hand-over note to the shared notes folder with what was verified, what was not (touch feel on a phone), and any follow-ups (path extraction from the clips for ordered strokes).
- [ ] **Step 5:** Offer to open a PR; do not push or commit unless asked.
