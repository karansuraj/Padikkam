@AGENTS.md

# Padikkam: handoff context

Personal Android app for the owner (Karan) to learn Malayalam, built to be open sourced (MIT). Started in a claude.ai session, continued here.

## Goal and constraints
- Android only. Install by APK (EAS Build preview profile) or USB debugging. No Apple developer account.
- Expo SDK 58, TypeScript, Expo Router, local SQLite, FSRS via ts-fsrs.
- Secrets (Claude, TTS, STT keys) must never ship in the app. Use a small proxy (Node or Lambda) when AI features arrive.
- Owner is a senior TypeScript/Node engineer, so skip basics. Direct communication, no hedging, no em dashes in docs or comments.

## What exists
- `src/core`: Entry/CardState types, FSRS wrapper (`srs.ts`), deck validation (`deck.ts`). Pure TS, tested with Vitest (8 tests).
- `src/data`: SQLite persistence (`db.ts`), 3-entry placeholder deck (`seed.ts`).
- `src/app`: Expo Router layout and a tap-to-reveal review screen. Never run on a device yet, only bundled with `expo export`.
- `react-dom` is pinned to exactly 19.3.0 because Expo SDK 58 pins react 19.3.0 and a newer react-dom breaks `npm install`.

## Key decisions
- Every entry has `register` (formal or spoken) and `provenance` (unverified, self, native, dataset). Model-written Malayalam is `unverified` until a human checks it. Models are weakest on spoken Malayalam, and the Malayalam-specific open LLMs are older, formal-skewed 7B models, so use Claude for conversation and treat output as a draft.
- Spoken vs formal is the central content problem. Never mix them in a session unless asked.

## Next steps, in order
1. Run it on the owner's phone (`npx expo start --android`), fix whatever breaks.
2. Script trainer: vowels, consonants, chillu letters, conjuncts, with audio. Use Noto Sans Malayalam. Reference SMC's mlmash (MIT, gitlab.com/smc/mlmash).
3. Real vocab deck from a licensed source (see docs/research.md for licensing).
4. TTS audio (Google Cloud ml-IN or Sarvam), cached on device.
5. AI conversation practice via proxy, with a spoken-register prompt.
6. Pronunciation feedback (Sarvam or Google STT, not Whisper).

## Open questions for the owner
- Speaking-first or reading-first? This decides the order of steps 2 and 5.
- Is there a native speaker or tutor available for spot checks?
