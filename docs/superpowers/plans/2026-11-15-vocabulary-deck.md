# Vocabulary Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** About 300 curated beginner words with romanization, English meaning, topics and recorded audio, browsable in the app and used by the flashcard review.

**Architecture:** A pure transliterator and review-queue builder in `src/core`. Offline tools in `tools/deck` pick words from cached Wikidata rows. A gentle audio fetcher in `tools/wikimedia` goes through the existing polite client. `src/data/vocab.ts` turns the picked words into `Entry` records; new Expo Router screens show them.

**Tech Stack:** Expo SDK 58, Expo Router, `expo-audio`, `ts-fsrs`, Vitest, Node 22 ES modules for tools.

**Spec:** `docs/superpowers/specs/2026-11-15-vocabulary-deck-design.md`

## Global Constraints

- `src/core` has no React Native or Expo imports.
- Every Malayalam entry carries `register` and `provenance`. Deck words are `register: 'neutral'`, `provenance: 'dataset'`. Never mark model-generated text as verified.
- Romanization is plain ASCII and uses the same scheme as `src/data/letters.ts`.
- ALL requests to Wikimedia go through `tools/wikimedia/polite-client.mjs`. No curl, no direct `fetch`. Never retry a 429; never change the User-Agent to get around a block. Contact comes from the gitignored `.env.wikimedia.local`; never commit or print it.
- Downloads: serial, 12 to 18 s apart, 150 per day cap, stop at the first 429/503. **Do not run a real download (`--go`) in this plan.** Dry runs only; the user approves the real run afterwards with the size and time stated.
- Metadata requests to the Commons API go in batches of 10 titles with only the properties needed (`url|sha1|size|mime` and a filtered `extmetadata`).
- Do not commit unless the user asks. Done means `npm test` and `npm run typecheck` pass, the Android bundle builds, and the dry run of `fetch-audio` shows the plan.

## Review Focus

- A word whose clip is not downloaded yet: its card hides the play button, nothing crashes, Review still works with zero clips.
- `transliterate` on ZWJ/ZWNJ, spaces, digits, Latin text and an empty string: no crash, sensible output.
- `fetch-audio` hit by a 429 mid-run, or run twice quickly: the second run sends nothing while blocked, finished clips are not fetched again, the manifest is never half-written.
- A headword that matches the wrong sense or several words: reported, not silently chosen, and no lexeme lands in two topics.
- Review opened with ~300 never-seen cards: only a bounded number of new cards appear per session.

## File Structure

| File | Responsibility |
|---|---|
| `src/core/types.ts`, `deck.ts` (modify) | `Register` gains `'neutral'`; filtering |
| `src/core/translit.ts` | `transliterate` |
| `src/core/review-queue.ts` | `buildReviewQueue` |
| `tools/deck/topics.json` | topic to English headwords |
| `tools/deck/match.mjs` | pure row parsing and headword matching |
| `tools/deck/build-vocab.mjs` | cached rows to `src/data/vocab-data.json` plus a report |
| `tools/wikimedia/audio-plan.mjs` | pure planning, metadata lookup, verification, `fetchAll` |
| `tools/wikimedia/fetch-audio.mjs` | CLI for the above (dry run by default) |
| `src/data/vocab.ts` | `VOCAB`, `TOPICS`, `VOCAB_BY_ID` |
| `scripts/gen-audio-map.mjs` (modify) | letters and words in `audio.ts`; `audio-credits.json` |
| `src/app/words/*`, `review.tsx`, `credits.tsx`, `index.tsx` | screens |

---

### Task 1: Neutral register

**Files:** Modify `src/core/types.ts`, `src/core/deck.ts`; Test `src/core/core.test.ts`.

**Interfaces:** Produces `type Register = 'formal' | 'spoken' | 'neutral'`; `filterByRegister(entries: Entry[], register: Register | 'both'): Entry[]` where neutral entries are returned for `'formal'`, `'spoken'` and `'both'`.

- [ ] **Step 1: Write failing tests** in the `deck` describe: `neutral entries appear for formal, spoken and both`; `formal still excludes spoken entries`.
- [ ] **Step 2:** `npx vitest run src/core/core.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Update the doc comment on `Register`.
- [ ] **Step 4:** `npm test`. Expected: all pass.

### Task 2: Transliterator

**Files:** Create `src/core/translit.ts`; Test `src/core/translit.test.ts`.

**Interfaces:** Produces `transliterate(ml: string): string`. Consumes `LETTERS` from `src/data/letters.ts` to derive consonant bases (a consonant's base is its roman without the trailing `a`).

- [ ] **Step 1: Write failing tests:**
  - `agrees with the letters table`: for every letter that is not in the `chillu` group, `transliterate(l.ml) === l.roman` (this includes `അം` to `am`, `റ്റ` to `RRa`).
  - `chillu letters are bare consonants`: `ൺ ൻ ർ ൽ ൾ` give `N n r l L`.
  - Word vectors: `അമ്മ`=`amma`, `വെള്ളം`=`veLLam`, `നമസ്കാരം`=`namaskaaram`, `വീട്`=`viiTu`, `ചോറ്`=`chooRu`, `പേര്`=`peeru`, `നന്ദി`=`nandi`, `ഭക്ഷണം`=`bhakShaNam`, `ഇല്ല`=`illa`, `ആന`=`aana`.
  - `a final virama before a space also reads as u`: `പേര് വീട്` gives `peeru viiTu`.
  - Review Focus: ZWJ/ZWNJ (U+200D, U+200C) are dropped; digits, Latin text and punctuation pass through unchanged; `''` gives `''`.
- [ ] **Step 2:** `npx vitest run src/core/translit.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Vowel signs: `ാ aa, ി i, ീ ii, ു u, ൂ uu, ൃ ru, െ e, േ ee, ൈ ai, ൊ o, ോ oo, ൌ au, ൗ au`; independent vowels from the letters table; `ം m`, `ഃ h`; virama (`്`) drops the inherent `a`, and at the end of a word becomes `u`.
- [ ] **Step 4:** `npm test`. Expected: pass.

### Task 3: Starter deck builder

**Files:** Create `tools/deck/topics.json`, `tools/deck/match.mjs`, `tools/deck/build-vocab.mjs`; Test `tools/deck/match.test.mjs`; Generate `src/data/vocab-data.json`.

**Interfaces:**
- `parseRows(bindings): Row[]` where `Row = { lexeme: string /* "L1000678" */, lemma, rep, categoryQid, commonsFile /* decoded file name */, speaker: string|null, glosses: string[] }`.
- `normalizeGloss(g: string): string`: lowercase, trim, drop a leading `to `/`a `/`an `/`the `, drop a trailing parenthetical.
- `matchHeadwords(rows: Row[], topics: Record<string,string[]>, opts?: { speakerOrder?: string[] }): { selected: Selected[]; unmatched: {topic,headword}[]; ambiguous: {topic,headword,candidates: string[]}[] }` with `Selected = { lexeme, ml, en, topic, commonsFile, speaker, categoryQid }`.
- Eligible rows: category in noun `Q1084`, verb `Q24905`, adjective `Q34698`, adverb `Q380057`, pronoun `Q36224`, numeral `Q63116`; lemma has Malayalam characters and no space; `rep === lemma`. Pick order: earlier speaker in `speakerOrder` (default Vis M, BhagyaMohan, Adithyak1997, Netha Hussain, Akbarali), then fewer glosses, then lowest lexeme id. A lexeme is never selected twice (first topic wins).
- `vocab-data.json` entry: `{ id: "L1000678", ml, en, topic, audio: "words/L1000678.wav", commonsFile, speaker }`.

- [ ] **Step 1: Write failing tests:** `normalizeGloss`; `exact headword match`; `"to go" matches headword "go"`; `proper nouns, multi-word lemmas and rows whose form differs from the lemma are skipped`; `speaker preference`; `several different words for one headword are reported as ambiguous (the best is still selected)`; `unmatched headwords are reported`; `a lexeme is never in two topics`; `deterministic`.
- [ ] **Step 2:** `npx vitest run tools/deck`. Expected: FAIL.
- [ ] **Step 3:** Implement `match.mjs`. `build-vocab.mjs` reads the three cached query responses (find each file with `planQuery(endpoint, sparql, '.wikimedia-cache/queries').file` for `wikidata-words-p1..p3.rq`; exit with a clear message if one is missing; it makes no network request), runs the matcher, writes `src/data/vocab-data.json`, and prints and saves a report (selected count per topic, unmatched, ambiguous with candidate lemmas) to `.wikimedia-cache/vocab-report.txt`.
- [ ] **Step 4:** Write `topics.json`: about 300 headwords across family, food, numbers, pronouns, body, greetings, places and travel, time, colours, common verbs, adjectives, film and music. Run `node tools/deck/build-vocab.mjs`, read the report, and adjust headwords (synonyms, plural, verb forms) until at least 250 are selected. List what stayed unmatched in the ledger.
- [ ] **Step 5:** `npm test`. Expected: pass.

### Task 4: Gentle audio fetch tool (dry run only)

**Files:** Create `tools/wikimedia/audio-plan.mjs`, `tools/wikimedia/fetch-audio.mjs`; Test `tools/wikimedia/audio-plan.test.mjs`.

**Interfaces:**
- `planDownloads(vocab, destDir, exists = fs.existsSync): { todo: Item[]; done: Item[] }`, `Item = { id, commonsFile, dest }`, `dest = <destDir>/<id>.wav|ogg` by extension.
- `resolveFiles(client, titles: string[], cachePath: string): Promise<Map<string, {url, sha1, size, mime, license, licenseUrl, artist}>>`: batches of 10 titles (`File:<name>`), one `client.request` per batch to `https://commons.wikimedia.org/w/api.php` with `prop=imageinfo&iiprop=url|sha1|size|mime|extmetadata&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist`, results cached at `cachePath` so a rerun asks for nothing it already knows.
- `verifyAudio(bytes: Uint8Array, mime: string, sha1: string): { ok: boolean; reason?: string }` checks the `RIFF/WAVE` or `OggS` magic, the mime, and the sha1.
- `fetchAll({ client, vocab, destDir, manifestPath, metaPath, limit }): Promise<{ downloaded: number; skipped: number; failed: {id,reason}[]; stoppedBy?: string }>`: downloads at most `limit` items with `client.request(url)` (profile is chosen by host), verifies each, writes the file, then rewrites `manifest.json` atomically (temp file and rename) with `{ id, file, commonsFile, speaker, license, licenseUrl, sourcePage, sha1, bytes }`. A `BlockedError`, `CapReachedError` or `StoppedError` ends the run at once with `stoppedBy` set; a bad checksum skips that file and goes on.

- [ ] **Step 1: Write failing tests** with a fake client: `plan skips files already on disk`; `resolveFiles sends one request per 10 titles and caches`; `a second resolveFiles call with the same titles sends no request`; `fetchAll respects limit`; `fetchAll verifies sha1 and does not save a corrupt file`; `fetchAll writes the manifest with licence and speaker`; `a second fetchAll does not request files already downloaded`; `BlockedError mid-run stops with no further requests and the manifest keeps the finished clips`; `verifyAudio rejects an HTML error page saved as .wav`.
- [ ] **Step 2:** `npx vitest run tools/wikimedia/audio-plan`. Expected: FAIL.
- [ ] **Step 3:** Implement. `fetch-audio.mjs` is the CLI: with no flags it makes no request and prints the dry-run plan (items to fetch, items present, metadata batches, estimated minutes at the client's gap, files per day cap); `--go --limit N` runs `fetchAll` (default `N=25`).
- [ ] **Step 4:** `npm test`, then run `node tools/wikimedia/fetch-audio.mjs` (dry run) and capture the plan for the report. **Do not pass `--go`.**

### Task 5: Vocab data and audio map

**Files:** Create `src/data/vocab.ts`; Modify `scripts/gen-audio-map.mjs`, `src/data/audio.ts` (regenerated); Create `src/data/audio-credits.json` (generated); Test `src/core/vocab.test.ts`.

**Interfaces:** Produces `VOCAB: Entry[]` (`id: "word:L123"`, `kind: 'word'`, `register: 'neutral'`, `roman: transliterate(ml)`, `provenance: 'dataset'`, `tags: [topic]`, `audio: "words/L123.wav"` (or `.ogg`), `source` naming the Wikidata lexeme and audio file); `TOPICS: { id: string; title: string; entryIds: string[] }[]`; `VOCAB_BY_ID: Map<string, Entry>`.
`gen-audio-map.mjs` now also reads `assets/audio/words/manifest.json` if it exists, adds those clips to `AUDIO`, and writes `src/data/audio-credits.json` as `{ label, speaker, license, licenseUrl, sourcePage }[]` for letters and words.

- [ ] **Step 1: Write failing tests:** `vocab entries are valid (validateDeck reports nothing)`; `ids are unique and match word:L<digits>`; `roman is non-empty ASCII for every word`; `every topic has entries and every entry is in exactly one topic`; `no word is a letter or proper noun`; `audio-map covers letters plus any words in the words manifest` (update the existing audio map test; with no words manifest yet it must still pass).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `vocab.ts` over `vocab-data.json`; extend the generator; run `npm run gen:audio`.
- [ ] **Step 4:** `npm test`, `npm run typecheck`. Expected: pass.

### Task 6: Screens and review queue

**Files:** Create `src/core/review-queue.ts`, `src/app/words/index.tsx`, `src/app/words/[topic].tsx`; Modify `src/app/review.tsx`, `src/app/index.tsx`, `src/app/_layout.tsx`, `src/app/credits.tsx`, `src/hooks/useLetterAudio.ts`; Test `src/core/review-queue.test.ts`.

**Interfaces:** `buildReviewQueue(deck: Entry[], states: Map<string, CardState>, now: Date, maxNew = 10): Entry[]`: due reviews first (earliest due first), then up to `maxNew` never-seen entries in deck order.
`useLetterAudio().play(id)` also resolves ids from `VOCAB_BY_ID`, and logs and ignores an id with no clip.
`words/index.tsx`: topic list with counts. `words/[topic].tsx`: one row per word with Malayalam, romanization, English, and a play button only when `AUDIO[entry.audio]` exists. `review.tsx` runs on `[...SEED, ...VOCAB]` through `buildReviewQueue`, shows romanization after reveal and a play button when a clip exists. `credits.tsx` reads `audio-credits.json`. Home gets a Words link.

- [ ] **Step 1: Write failing tests:** `due reviews come first, earliest due first`; `new cards are capped at maxNew`; `never-seen cards keep deck order`; `an empty deck gives an empty queue`; `300 new cards give exactly 10`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the queue, then the screens and hook change. A topic or entry with no clip must hide the play button, not throw.
- [ ] **Step 4:** `npm test`, `npm run typecheck`, and the Android bundle check (`curl` the entry bundle URL from the dev server, expect HTTP 200).

### Task 7: Verify and report

- [ ] **Step 1:** `npm test`, `npm run typecheck`, bundle check. Confirm `git status` shows no `.env.wikimedia.local` or `.wikimedia-cache`.
- [ ] **Step 2:** Run the final dry run of `fetch-audio` and record: items to fetch, size estimate (items times about 90 KB), batches, estimated minutes, days needed at the cap.
- [ ] **Step 3:** Report to the user, and ask for approval to run the real download, stating the numbers from step 2.
