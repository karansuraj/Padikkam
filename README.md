# Padikkam

An open source Android app for learning Malayalam, built for one learner first.
Script trainer, spaced repetition, and (planned) AI conversation practice.

Status: early scaffold. The review loop and data model work; content is a tiny placeholder deck.

## Design decisions

- **Register is a first-class field.** Formal and spoken Malayalam differ a lot, so every entry is tagged `formal` or `spoken` and decks never mix them unless asked.
- **Provenance on every entry.** Model-generated Malayalam starts as `unverified` and only becomes `native` or `self` after a human checks it. LLMs are weakest on spoken Malayalam.
- **Local first.** Card state lives in on-device SQLite. Scheduling uses FSRS via `ts-fsrs`.
- **Pure core.** `src/core` has no React Native imports and is unit tested with Vitest.

## Layout

```
src/core    data model, FSRS wrapper, deck validation (tested)
src/data    SQLite storage, seed deck
src/app     Expo Router screens
```

## Develop

```bash
npm install
npm test            # unit tests for core logic
npm run typecheck
npx expo start      # needs a device or emulator
```

Install on an Android phone without a laptop toolchain: `npx eas-cli@latest build --platform android --profile preview` produces an APK you can sideload.

Note: with Expo SDK 58, install native packages with `npx expo install <pkg>` on a machine with normal internet access, so versions stay SDK-compatible.

## Roadmap

1. Script trainer: letters, sounds, audio, stroke order (see SMC's `mlmash`, MIT, for reference)
2. Real vocab deck, imported from a licensed source
3. TTS audio (Google Cloud ml-IN or Sarvam), cached on device
4. AI conversation practice through a small proxy, so API keys never ship in the app
5. Pronunciation feedback with a Malayalam-capable speech recognizer

## Content and licensing

Code is MIT. If you bundle a dataset, record its license and attribution in the entry's `source` field. Olam's English-Malayalam data is ODbL, which has share-alike and attribution terms, so check them before shipping it inside the app. Do not commit API keys or generated audio whose provider terms forbid redistribution.
