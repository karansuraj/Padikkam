# Letter tracing and handwriting practice: design

Status: draft for approval, 2026-11-15. Not yet committed.

## Intent

The learner knows no Malayalam script and has now met the letters by sight and
sound. They want to learn to write them, Duolingo style: draw on a canvas with a
finger, trace a faint guide, get friendly feedback, clear and retry. A tolerance
setting controls how far a stroke may stray from the target before it counts as
wrong.

## What data exists (checked 2026-11-15)

- **Stroke order as vector data: none found.** SMC `mlmash` (MIT) ships SVGs of
  Manjari font outlines (one closed contour per shape, plus debug `<text>` nodes)
  and a free drawing canvas. Its own README says outlined SVGs are not useful for
  stroke order. A GitHub repository search for Malayalam stroke order and
  handwriting datasets found nothing.
- **Stroke order as video: yes (added after review).** The University of Texas at
  Austin Malayalam site (`malayalam.la.utexas.edu/resources/the-malayalam-script/`,
  Donald R. Davis, Jr.) has a short "how to write it by hand" MP4 for 15 vowels
  and 36 consonants, 52 clips, about 1.3 MB in total. The site states that all
  its resources are CC BY 4.0. The page also says every basic consonant is
  written as one continuous pen movement. I have not yet watched or downloaded a
  clip, so I do not yet know how clean they are or which of our 58 letters they
  cover (the chillu letters look absent). They are a real source for order, but
  as video, not as paths.
  After the user approved the download (50 kept; the site also has `ah`, which is
  not one of our letters, and a consonant-plus-vowel-signs demo, neither bundled) I looked at `ka`: 502x270
  H.264, about 4.7 s, grey ink building up on a plain light background with no
  hand in frame. That makes the pen trail recoverable later (first frame at which
  each pixel turns to ink gives the order), but the handwritten form is not
  identical to the printed Noto form, so I keep the two apart. Clip-to-letter
  mapping follows the page's alphabetical chart order and is checked against a
  contact sheet of final frames before it is committed.
- **Decision on order:** the scorer stays order-free (we have no vetted vector
  path data). The clips are used as a "Watch how it's written" reference on the
  tracing screen (`expo-video`, bundled in Expo Go). If a spike shows the pen
  trail can be recovered cleanly from the frames, ordered and directed stroke
  paths become a possible later step; it is not part of this change.
  Letters without a clip show the tracing screen without the watch button and the
  UI never implies an order for them. Verified: 50 of 58 letters have a clip; the
  chillu letters and ഩ ഺ റ്റ do not.
- **Glyph outlines: yes.** Noto Sans Malayalam v2.104 (`notofonts/malayalam`,
  SIL OFL 1.1, copyright "The Noto Project Authors", no reserved font name).
  It is also the font Android falls back to for Malayalam, so the guide matches
  what the learner sees elsewhere in the app. All 58 letters are plain `cmap`
  entries (`അം` is two code points), so no text shaping is needed to get them.
- **Skeleton (centreline) of each glyph: derived by us.** A build script rasterises
  the outline and thins it (Zhang-Suen). I checked the result on `ക` and `ഴ` and
  it follows the stems and loops well. It will have small spurs on some letters;
  the build step prunes short branches and I review a printed overview of all 58.
  This skeleton is a good proxy for "the ink path of the printed letter". It is
  not how a native writer pens the letter (loops, entry and exit strokes differ).

## Goals

- Trace any of the 58 letters on a canvas with a faint guide glyph.
- Score the attempt with a tunable stray-distance threshold: coverage (how much of
  the letter was traced), overshoot (how much of the stroke strayed), pass or
  fail, and a friendly 0 to 100 score with plain feedback.
- Two modes: **Trace** (guide visible) and **From memory** (guide hidden, shown
  after you submit). Clear and retry in both.
- Reachable from a letter lesson and as its own practice session, graded with the
  existing FSRS scheduler.
- Scoring lives in `src/core` as pure, Node-tested TypeScript.

## Non-goals

- Stroke order or stroke direction checking (no source for it).
- Handwriting recognition, conjuncts, vowel signs, words.
- Gating lessons on writing. The existing quiz and unlock flow is unchanged.
- Any network call at runtime.

## Anti-goals

- Claiming a stroke order is correct. Never shown, never scored.
- A scorer so loose a scribble passes, or so strict the learner cannot pass with a
  fingertip on a phone.
- Shipping a native module that Expo Go lacks.

## Constraints

- Expo SDK 58. `react-native-svg` 15.16.0 is in `bundledNativeModules.json` and in
  Expo Go, so no development build is needed. It is not yet installed in this
  repo, so it is added to `package.json` at that exact pinned version.
- `AGENTS.md`: `src/core` has no React Native imports; `npm test` and
  `npm run typecheck` must pass.
- The workspace cannot reach api.expo.dev, so `expo install` is unusable; the
  version comes from `bundledNativeModules.json` and is installed with `npm`.
- No requests to Wikimedia or Wikidata hosts. Font and `mlmash` were read from
  GitHub and GitLab only.
- Font licence: OFL 1.1 permits embedding derived outlines with the copyright
  notice and licence text. Both go in `docs/third-party/` and the Credits screen.

## Approaches considered

1. **Tolerance corridor around the font skeleton (chosen).** Target is the glyph
   centreline as polylines. The "target region" is the skeleton thickened by the
   tolerance. Order-free, stroke-count-free, works for all 58 letters from one
   source. Weakness: a learner who writes the letter in a different but valid
   way (extra loop, different join) can be marked down.
2. **Filled outline as the target region** (stay inside the printed ink, cover the
   ink area). More literal to "stay inside the letter", but thick stems let a
   child scribble pass coverage and it needs a raster at scoring time. Worse
   feedback.
3. **Hand-authored stroke paths with order.** Right for a real Duolingo clone, but
   58 letters of model-authored stroke order would be unverifiable and I would be
   presenting guesses as fact. Rejected until a real source or a native writer
   supplies them. The data shape leaves room for it later.

## Design

### Data and build

- `scripts/gen-glyph-targets.mjs` (dev only, `npm run gen:glyphs`) reads the
  Noto Sans Malayalam TTF kept at `scripts/glyph/NotoSansMalayalam-Regular.ttf`,
  uses `opentype.js` (dev dependency) for outlines, then for each letter:
  fits the glyph into the unit square with a margin (uniform scale, centred),
  writes the outline as an SVG path (viewBox `0 0 100 100`), rasterises, thins,
  prunes spurs, and emits skeleton polylines in unit coordinates. (A stem width
  estimate was considered and dropped; nothing needs it.)
- Output: `src/data/glyph-targets.ts`, a generated file keyed by letter id
  (`letter:0d15`). Rasterise, thin and prune live in `scripts/glyph-lib.mjs` with
  its own Vitest tests (`scripts/glyph-lib.test.mjs`), so the generator is checked without the font.
- `docs/third-party/noto-sans-malayalam-OFL.txt` holds the licence. Entries get
  `source: 'Noto Sans Malayalam v2.104 (OFL 1.1)'` on the glyph data, not on the
  `Entry`, since the letter entries already carry their own provenance.

### Core (`src/core/trace.ts`, pure)

Coordinates are fractions of the canvas side, so tolerance is device independent.

```ts
type Point = { x: number; y: number };            // 0..1, canvas fractions
type Stroke = Point[];
interface TraceTarget { strokes: Stroke[] }        // skeleton polylines
interface TraceOptions {
  tolerance: number;     // max stray distance, default 0.06 (0.05 from memory)
  minCoverage: number;   // default 0.8 (0.85 from memory)
  minPrecision: number;  // default 0.8 (0.85 from memory)
  spacing: number;       // resample spacing, default 0.01
}
interface TraceResult {
  coverage: number;      // share of target covered (0..1)
  precision: number;     // share of the learner's ink that stayed in the corridor
  overshoot: number;     // 1 - precision
  score: number;         // 0..100, harmonic mean of coverage and precision
  passed: boolean;
  feedback: 'empty' | 'too-short' | 'strayed' | 'incomplete' | 'good' | 'great';
}
scoreTrace(target, strokes, options?): TraceResult
fitToTarget(strokes, target): Stroke[]   // From memory mode: scale and move
                                         // the learner's ink to the target's bounding box
```

Method: resample target and learner strokes at even spacing; coverage is the
share of target samples with a learner sample within `tolerance`; precision is
the share of learner samples within `tolerance` of any target segment. Stroke
count and order never matter. Empty input scores 0. Ink shorter than a
quarter of the target length (this covers a single point or a dot) is
`too-short`, never a pass. A zero, negative or NaN spacing falls back to the default. Tunable constants are exported so they can be adjusted after real use.

`fitToTarget` ignores strokes shorter than 0.02 (a resting finger or a tap) when it
sizes the ink, so one stray touch does not shrink the letter. It makes From memory fair: the learner cannot be expected to hit the
exact position and size, so their ink is scaled uniformly and moved onto the
target's bounding box first. Trace mode does not use it.

Grading reuses `gradeAnswer` unchanged: pass is `good`, fail is `again`, but only a
**From memory** Check is graded, and only the first one per letter per session
(review finding: Trace passes are near-automatic because the guide is on screen, so
grading them would inflate intervals without testing recall). Trace is practice.
New letters start in Trace mode; letters already written start From memory. The card
id is `write:<letterId>`, so writing and recognition keep separate schedules,
and the existing Practice screen (which only reads real letter ids) never sees
the writing cards. No schema change; `card_state` already stores any id.

### UI

- `src/components/TraceCanvas.tsx`: square `react-native-svg` canvas, light grid
  with centre lines, guide glyph path (hidden in From memory), the learner's
  strokes as paths, `PanResponder` for touch (no gesture-handler dependency, no
  root view wrapper). Points closer than a small distance are dropped. It
  reports strokes in canvas fractions. Moves are ignored while a second finger is
  down. The writing screen never scrolls (its canvas is sized to fit the screen and
  the clip opens in a modal) so a native ScrollView cannot steal a stroke; only
  the result screen scrolls.
- `src/app/write.tsx`: `/write?letter=<id>` traces one letter; `/write` runs a
  session over letters from passed lessons (due writing cards first, then new,
  small cap). Per letter: sound plays, canvas, Check, result card (score,
  feedback line, overlay of the target skeleton on the attempt after submit),
  Try again, Next. After a passing Trace a button offers From memory. A one-line
  note says stroke order is not checked. In From memory the clip stays hidden until
  after Check. Opened from a lesson, Finish goes back to that lesson.
- Entry points: a "Trace it" button on each letter card in the lesson intro; a
  "Writing practice" card on the home screen. The lesson quiz flow is untouched.
- Credits: the Credits screen is reorganised into one card per source (audio, word list, letter shapes,
  how-to-write clips, scheduling, consulted work), then the per-clip audio list. The writing screen keeps almost no
  helper text; the explanations live behind an info (i) button.

## Testing

- `src/core/trace.test.ts` with plain data: perfect trace; same stroke shifted
  inside and outside tolerance; scribble over the whole canvas; half of the
  target traced; empty input; a single point and a very short stroke; a stroke
  far away from the region; boundary cases at exactly tolerance and just over
  it; multi-stroke letter in either stroke order; `fitToTarget`.
- `src/core/glyph-data.test.ts`: all 58 letters have a target and an outline,
  coordinates are inside the unit square, and each letter's own skeleton
  scores a pass against itself while a different letter's skeleton does not.
- Generator tests for rasterise, thin and prune on tiny synthetic shapes.
- Not verifiable here: how the drawing feels on the phone. The user will try it
  through Expo Go.

## Measured defaults (added during the build)

Run on the 58 skeletons: a smooth wobble of up to 0.07 stands in for a finger trace, and every other letter's
skeleton stands in for "drew the wrong letter". Tolerance 0.08 let 18% of wrong-letter pairs pass, so it is
too loose without a guide. Trace mode (guide on screen) uses 0.06 / 0.8 / 0.8: every wobbly self trace passes.
From memory uses 0.05 / 0.85 / 0.85: about 1% of wrong-letter pairs pass and 97% of wobbly self traces do.
Only the first Check per letter in a session is graded, so retries do not stack "again" reviews.

## Left to the builder

Default tolerance and pass thresholds (set from a measurement, see below; tune on
device), spur-pruning length, grid styling, feedback wording, session length.

## Known risks

- The skeleton is the printed letter's centreline, not a handwriting model.
  Some learners will write a valid form that scores lower. Tolerance is the
  release valve.
- PanResponder drawing runs on the JS thread; it should be fine for letters, but
  I cannot measure lag on the phone. Moving to gesture-handler plus reanimated
  is the fallback if it feels laggy.
- Skeleton quality on the rare letters (`ഋ`, `ഴ`, chillus) gets a visual check
  but no native-speaker check.
