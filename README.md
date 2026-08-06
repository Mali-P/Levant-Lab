# Levantry

Hebrew + Levantine Arabic flashcards, at [levantry.app](https://levantry.app).

A private, offline-first, mobile-first flashcard app for drilling **Hebrew and
Levantine Arabic at the same time**. A card only counts as correct when both
languages are recalled correctly.

Built as an installable PWA: React + TypeScript + Vite, IndexedDB via Dexie,
Zustand for state, Framer Motion for the card gestures.

## Running it

```bash
npm install
npm run dev       # development server
npm run build     # production build into dist/
npm run preview   # serve the production build
npm test          # unit tests for the study engine and validation
```

### Putting it on your phone

`npm run build`, serve `dist/` over HTTPS (or `http://localhost`), open it in
Chrome on Android and choose **Add to home screen**. After the first load it
works with no network: cards, progress, statistics and device voices are all
local.

## How the study loop works

- **Normal** — every card is shown once. Any card missed in either language
  goes to the retry pile, and the pile is replayed until the stack and the
  pile are both empty.
- **Hard** — one mistake in either language fails the run and reshuffles the
  whole deck. Completed perfect runs are kept. The deck passes only after the
  configured number of flawless runs (ten by default, so 10 cards x 10 runs =
  100 flawless answers).
- **Brutal** — as hard, but a mistake also resets completed perfect runs to
  zero, typing is mandatory and transliteration is hidden.

Hebrew and Arabic are always scored separately. A partially correct card is
never treated as mastered.

## Architecture

The study engine is deterministic and completely independent of the UI:

- `src/features/study/engine.ts` — session state machine, pure functions
- `src/features/study/prompts.ts` — prompt directions and per-language grading
- `src/services/answerValidation/` — normalisation and answer checking
- `src/features/review/mastery.ts` — mastery scoring, decay and review dates
- `src/services/database/` — Dexie schema, defaults and seeding
- `src/services/audio/` — clip paths and ids, the generated manifest, and the
  single-clip player that makes overlapping playback impossible
- `src/services/speech/` — `SpeechService` interface plus a Web Speech
  implementation, now only the fallback for cards with no bundled recording
- `src/stores/` — Zustand stores wiring the engine to persistence
- `src/app/` — screens; `src/components/` — presentation

Everything the engine does is covered by unit tests, including retry-pile
insertion and de-duplication, hard-mode reset, perfect-run counting, brutal
reset, answer normalisation and session restoration.

## Answer checking

Leading, trailing and repeated whitespace is ignored. Hebrew niqqud and Arabic
tashkeel are ignored by default, as is punctuation in either script. Arabic
letter variants that writers disagree on (hamza carriers, alef maqsura, ta
marbuta) are folded together, and each card can carry extra accepted spellings
and dialect forms. Every one of these is a setting.

`pronunciationText` on a card is what gets sent to text to speech, so you can
feed niqqud or a respelling to the voice without changing what you study.
Arabic audio reads the stored Levantine wording; it is never swapped for
Modern Standard Arabic.

## Pronunciation audio

Every word ships as an audio file. The app never calls a speech API: pressing a
speaker button plays a committed MP3, so pronunciation works with no network,
no credentials and no Docker.

The recordings are made once, by a developer, from two providers:

| | Provider | Locale | Default voice |
|---|---|---|---|
| Hebrew | Google Cloud Text-to-Speech | `he-IL` | `he-IL-Wavenet-A` |
| Arabic | Azure Speech | `ar-JO` | `ar-JO-SanaNeural` |

Jordanian is the closest dialect Azure offers to Palestinian Levantine. A
Modern Standard Arabic voice is never used, and the vocabulary itself is never
rewritten towards MSA. Both voices are set through the environment.

### Generating

Copy `.env.example` to `.env` and fill in the credentials, then:

```bash
npm run generate-audio                        # everything missing or stale
npm run generate-audio -- --language=hebrew   # one provider only
npm run generate-audio -- --language=arabic
npm run generate-audio -- --force             # ignore fingerprints, redo everything
npm run generate-audio -- --dry-run           # count the work, call nothing
npm run validate-audio                        # no credentials needed; safe in CI
```

A run prints how many Hebrew and Arabic clips were written, how many were
already current, and every blank entry, duplicate output path, API failure and
form still lacking a clip. It exits non-zero if any of those are outstanding,
and writes the same detail to `audio-report.json`.

Clips are skipped unless the file is missing or the voice or spoken text has
changed, so fixing one word does not re-bill the other 477.

Install `ffmpeg` before generating. It trims the silence at each end and pulls
both providers to the same loudness (-16 LUFS, mono, 24 kHz), so Hebrew and
Arabic do not jump in volume. Without it the run still succeeds, but says
clearly that the clips are raw. Speed is never altered.

### Layout

```
public/assets/audio/he/<audioId>_<form>.mp3
public/assets/audio/ar/<audioId>_<form>.mp3
```

`<form>` is `feminine`, `masculine` or `neutral`; a word with only one valid
form gets only that one, never a fabricated pair. `<audioId>` is the same
`category | deck | english` identity the seeder uses to recognise a word —
never the Hebrew or Arabic spelling, so respelling a word cannot orphan its
recordings.

`src/generated/audioManifest.ts` records what was made and is committed. The
seeder reads it and hangs each path on the individual form, so a card
advertises audio only when the build actually ships it; anything else falls
back to a device voice.

### Reviewing

Open `/audio-review` in the app. Every clip is playable beside its meaning, the
displayed word, its form, the transliteration, the exact text sent to the
provider and the voice that said it.

**The Arabic must be checked by a Palestinian or Jordanian Levantine speaker
before it is treated as final.** Record fixes in
`src/constants/pronunciationOverrides.ts`, which replaces the text sent to
Azure without touching what the learner reads, then re-run with `--force`.
Change the visible wording only when the visible wording is itself wrong.

### Credentials

Keys live in `.env` and are used only by the generation scripts. They are not
imported by any file under `src/`, never reach the bundle, and `.env`, service
account JSON and `audio-report.json` are all git-ignored. The generated MP3s
are committed; the credentials that made them are not.

## Privacy

There is no account, no server, no analytics and no telemetry. Nothing leaves
the device unless you press export. Back up regularly from **Cards → Import,
export and backup**: JSON for a full backup, CSV for bulk card editing. A
snapshot is taken automatically before any restore or destructive action.
