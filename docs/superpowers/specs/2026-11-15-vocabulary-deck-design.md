# Vocabulary deck with romanization and audio: design (short)

Status: approach approved in conversation on 2026-11-15. Not yet committed.

## Intent

The learner (no Malayalam yet) wants to speak with family, understand, read, travel
in Kerala and watch films. This slice gives them a first real vocabulary: about 300
beginner words, each with Malayalam script, a Latin (romanized) pronunciation, an English
meaning and a recorded clip, grouped by topic. Spoken-register family phrases and
pronunciation visuals (tongue placement) come later.

## Goals

- ~300 curated beginner words from open data, so the Malayalam and its meaning are not model-written.
- Every word and phrase gets a romanization from a tested, rule-based transliterator that uses the
  same ASCII scheme as the letters.
- Audio for those words, fetched with the polite client only (`docs/wikimedia-fetching.md`).
- Words grouped by topic (family, food, numbers, pronouns, body, greetings, places and travel, time,
  colours, common verbs and adjectives, film and music). Topics are the seed of goal-based learning paths.
- Browse a topic, hear each word, reveal romanization and meaning; the flashcard review uses the new deck.

## Non-goals

- Spoken-register phrases and a family verification mode (next slice).
- Pronunciation and tongue-placement visuals (after that).
- Word quizzes (later), proper nouns, multi-word entries, or the full 4,269 words.
- Converting audio to a smaller format (note the size; decide later).

## Anti-goals

- Presenting dictionary forms as spoken Malayalam, or model text as verified.
- Any request to Wikimedia that bypasses the polite client, or that retries after a 429.

## Constraints

- `AGENTS.md`: `src/core` has no React Native imports; Malayalam content has `register` and `provenance`.
- Data: Wikidata lexemes (CC0), pulled once and cached in `.wikimedia-cache/` (git-ignored). 5,594
  rows / 4,269 lexemes have audio and an English gloss. Almost all audio is Lingua Libre WAV (CC BY-SA 4.0,
  ~90 KB each) from five speakers; 12 clips are CC0 Ogg.
- Rate limits: serial, 12 to 18 s between downloads, daily cap 150 downloads, stop on first 429.
  A real download run needs the user's go-ahead (size and time stated first).

## Approaches considered

1. **Curate from the dataset by headword (chosen).** A topic file lists English headwords; a tested
   matcher picks lexemes whose gloss matches, preferring common categories and one speaker per word,
   and reports unmatched or ambiguous headwords for a human to resolve.
2. Take the first N rows. Cheap, but a third are proper nouns and most are not beginner words.
3. Model-written deck. Fast, but breaks the verified-content rule.

## Design

- **Register**: add `'neutral'` (dictionary or citation form, not labelled formal or spoken).
  `filterByRegister` returns neutral entries for `formal`, `spoken` and `both`. These words are
  `provenance: 'dataset'`. (My call: the data carries no register label and claiming `formal` would be untrue.)
- **`src/core/translit.ts`**: `transliterate(ml: string): string`. Consonant base = the letter's roman
  without its trailing `a`; inherent `a`; vowel signs; virama removes the vowel; a word-final virama
  reads as `u`; chillus map to bare `n N r l L`; anusvara `m`; visarga `h`. Must agree with the letters
  table: `transliterate(letter.ml) === letter.roman` for every non-chillu letter.
- **`tools/deck/`**: `topics.json` (topic to English headwords), `match.mjs` (pure matcher),
  `build-vocab.mjs` (reads the cached rows, writes `src/data/vocab-data.json` and a report).
- **`src/data/vocab.ts`**: maps `vocab-data.json` to `Entry` records (`id: word:L<id>`, kind `word`, roman via
  `transliterate`, tags = topic, `source` = Wikidata lexeme and audio file credit).
- **`tools/wikimedia/fetch-audio.mjs`**: dry run by default; `--go --limit N`. Looks up sha1, licence and
  URL in small batches through the client, downloads to `assets/audio/words/<lexeme>.wav`, verifies the file,
  writes `manifest.json`, resumes, stops on `BlockedError`.
- **App**: `/words` (topic list), `/words/[topic]` (word cards with play, romanization, meaning),
  Review switches to the vocab deck with a play button, Credits lists word-audio speakers and licences.
  Words with no downloaded clip simply hide the play button.

## Left to the builder

The topic headword lists (about 300), matcher scoring details, card styling.

## Known risks

- Gloss matching can pick the wrong sense; the report lists ambiguous matches and the learner or family should check.
- Dictionary forms differ from everyday speech (for example verbs listed in an infinitive form).
- Several speakers means mixed accents; the matcher prefers one speaker per word, not one per deck.
- ~300 WAV clips are about 27 MB.
