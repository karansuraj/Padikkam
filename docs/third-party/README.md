# Third-party material in writing practice

## Noto Sans Malayalam (letter outlines and tracing targets)

- Source: https://github.com/notofonts/malayalam, release `NotoSansMalayalam-v2.104`
  (`NotoSansMalayalam/unhinted/ttf/NotoSansMalayalam-Regular.ttf`).
- Licence: SIL Open Font License 1.1, Copyright 2022 The Noto Project Authors. Full text in
  `NotoSansMalayalam-OFL.txt` next to this file. The font has no reserved font name.
- Used for: `scripts/glyph/NotoSansMalayalam-Regular.ttf` (the font file, unmodified), and
  `src/data/glyph-targets.ts` (outlines and centrelines derived from it by `scripts/gen-glyph-targets.mjs`).
- Regenerate: `npm run gen:glyphs` (add `-- --preview out.svg` to get an overlay sheet of all letters to inspect).
- Caveat: the centreline is the printed letter's skeleton. It is not a handwriting model and it carries no
  stroke order. The app does not claim or check an order.

## University of Texas at Austin, Malayalam: "The Malayalam Script"

- Source: https://malayalam.la.utexas.edu/resources/the-malayalam-script/ (Donald R. Davis, Jr.).
- Licence: the site states that all its resources are licensed under CC BY 4.0
  (https://creativecommons.org/licenses/by/4.0/). Attribution is shown on the Credits screen.
- Used for: `assets/video/strokes/*.mp4`, 50 short clips of letters being written by hand (about 1.3 MB),
  copied unchanged on 2026-11-15 with the user's permission. Mapped to letters in `src/data/stroke-clips.ts`
  by comparing each clip's final frame with the glyph. 50 of the 58 letters have a clip; the chillu letters and
  ഩ ഺ റ്റ do not. The site's `ah` clip (അഃ, not one of our 58 letters) was dropped, and its
  consonant-plus-vowel-signs demo (`ka-w-vowels`) was never fetched.
- The clips show how a letter is written by hand. They are a reference only and are never scored.

## SMC mlmash (consulted, not used)

https://gitlab.com/smc/mlmash (MIT). It ships Manjari font outlines and a free-draw canvas but no stroke order
data, so nothing from it is bundled.

## Where credits show up in the app

The Credits screen lists every source with what it is used for, who made it, its licence and a link. The list is
data in `src/data/credit-sources.ts` (tested by `src/core/credit-sources.test.ts`), plus the per-clip audio list from
`src/data/audio-credits.json`. Add a new third-party resource to both this file and `credit-sources.ts`.

Also credited there: Wikidata lexemes (CC0) for the starter word list and English meanings, and the FSRS algorithm via
`ts-fsrs` (MIT) for review scheduling.
