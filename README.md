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
npm run serve     # build, then serve the app and the sync server together
```

### Putting it on your phone

`npm run build`, serve `dist/` over HTTPS (or `http://localhost`), open it in
Chrome on Android and choose **Add to home screen**. After the first load it
works with no network: cards, progress, statistics and device voices are all
local.

## Syncing the phone with the laptop

The app is still local-first: every device studies from its own IndexedDB and
works with no network at all. Sync is an optional extra that lets two devices
agree, and it runs on your own machine — there is no cloud account.

On the laptop:

```bash
npm run serve
```

That builds the app and starts the sync server, which serves both the app and
the API from one address. It prints a token and the addresses it is reachable
on:

```text
  token   3f9c…             <- goes into every device, once
  http://192.168.1.20:4180  <- open this on the phone
```

On the phone, open that address over the same Wi-Fi, go to **Cards → Sync with
another device**, paste the token, and press **Sync now**. Do the same on the
laptop at `http://localhost:4180`. From then on each device sends everything it
holds and takes back whatever is newer.

What to expect:

- Cards, decks, categories, card and deck progress, alphabet progress and
  settings all travel.
- Where the same row was changed on both devices, **the later change wins**.
  There is no field-by-field merge, so editing one card on both devices between
  syncs loses the earlier edit.
- Deletions travel too, and are remembered, so a card deleted on the laptop
  does not reappear from the phone.
- A **study session in progress does not sync** — it stays on the device it was
  started on. So does your chosen Hebrew and Arabic voice, since a voice
  installed on Windows does not exist on Android.
- Sync only ever happens when you press the button. Nothing runs in the
  background.

The server keeps its copy in `server/data/store.json` and its token in
`server/data/token.txt`. Both are git-ignored. `GET /api/backup` with the token
downloads the whole thing as JSON. Set `LEVANTRY_SYNC_TOKEN` to pin your own
token and `PORT` to move it off 4180.

Reaching it from outside the house needs a tunnel (`cloudflared tunnel --url
http://localhost:4180`) pointed at that one port — which also gets you HTTPS,
and so the service worker and **Add to home screen**.

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
- `src/services/sync/` — the optional device sync: `protocol.ts` is the wire
  format shared with the server, `reconcile.ts` holds every rule that decides
  which version of a row survives (and is where the tests are), `collections.ts`
  says what each table's key and change stamp are, `client.ts` is the plumbing
- `server/` — the sync server itself: dependency-free Node, a JSON store behind
  an atomic rename, and static serving of `dist/` so devices need one address
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

| | Provider | Dialect chosen by | Default voice |
|---|---|---|---|
| Hebrew | Google Cloud Text-to-Speech | locale `he-IL` | `he-IL-Wavenet-A` |
| Arabic | Gemini TTS | a written instruction | `Kore` |

No vendor sells a Palestinian voice. Azure's Jordanian `ar-JO-SanaNeural` was
the nearest neighbour and stood in for one; Gemini's voices carry no locale at
all and take their accent from what they are told, so the instruction can name
Palestinian outright:

> Say the following in everyday spoken Palestinian Levantine Arabic, in the
> accent of a native speaker from Jerusalem…

That instruction is `GEMINI_ARABIC_STYLE`, and it counts as part of the voice:
editing it re-records every Arabic clip. A Modern Standard Arabic voice is
never asked for, and the vocabulary itself is never rewritten towards MSA.

The Azure path is shelved rather than removed — `ARABIC_TTS_PROVIDER=azure`
brings it back, which is how the two accents get compared. Every voice is set
through the environment.

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

`ffmpeg` is required for Arabic and recommended for Hebrew. Gemini returns raw
PCM samples rather than a finished file, so without ffmpeg there is nothing to
encode them into the MP3 the app plays and the Arabic half of the run fails
with that reason. Google's Hebrew arrives as MP3 and still generates.

ffmpeg also trims the silence at each end and pulls every provider to the same
loudness (-16 LUFS, mono, 24 kHz), so Hebrew and Arabic do not jump in volume.
Speed is never altered.

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

**The Arabic must be checked by a Palestinian Levantine speaker before it is
treated as final**, and doubly so now that the accent is asked for in words
rather than selected from a list: an instruction can be ignored in a way a
locale cannot. Record fixes in `src/constants/pronunciationOverrides.ts`, which
replaces the text sent to the provider without touching what the learner reads,
then re-run with `--force`. Change the visible wording only when the visible
wording is itself wrong. Where a whole run leans MSA, the fix is
`GEMINI_ARABIC_STYLE`, not 477 overrides.

### Credentials

Keys live in `.env` and are used only by the generation scripts. They are not
imported by any file under `src/`, never reach the bundle, and `.env`, service
account JSON and `audio-report.json` are all git-ignored. The generated MP3s
are committed; the credentials that made them are not.

## Privacy

There is no account, no analytics and no telemetry. Nothing leaves the device
unless you press export — or turn on sync, in which case your cards go to the
sync server you are running yourself, on your own network, guarded by a token
only your devices have. There is no third party in the path either way.

Back up regularly from **Cards → Import, export and backup**: JSON for a full
backup, CSV for bulk card editing. A snapshot is taken automatically before any
restore or destructive action.
