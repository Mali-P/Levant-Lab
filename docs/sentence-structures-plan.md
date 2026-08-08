# Sentence structures — plan

Teaching *frames* ("I want ___", "Do you want ___?", "Where is ___?") rather
than one more fixed card, with the speaker's and the listener's gender driving
the wording throughout. Female speaker stays the default; a learner who says she
is a man, or who is addressing a man, gets her app rewritten around that.

## What already exists

The speaker/listener axis is built and shipped. It is not a gap — it is the
foundation this feature sits on.

- `SpeechPerspective` and the canonical female-first order
  (`SPEECH_PERSPECTIVES`), markers, labels and settings copy — [index.ts:65-101](../src/types/index.ts#L65-L101).
- `SpeechForms` on each `LanguageSide`, with `sameAs` pointers and
  `notApplicable`, so content never asserts a distinction the language does not
  make — [index.ts:127-179](../src/types/index.ts#L127-L179).
- Resolution and collapsing: `resolveVariant` follows pointers, `speechWordForms`
  groups perspectives that come out word for word identical, and `wordForms`
  falls back to the grammatical pair — [wordForms.ts:67-214](../src/utils/wordForms.ts#L67-L214).
- Authoring shorthand in the seed: `toL` / `bySp` / `both4` for the three shapes
  the languages actually make — [seed.ts:66-178](../src/constants/seed.ts#L66-L178).
- Grading filtered to enabled perspectives — [validate.ts:34-63](../src/services/answerValidation/validate.ts#L34-L63).
- Audio: one clip per *distinct spoken form*, all four perspectives generated so
  a learner can switch at any time — [paths.ts:126-164](../src/services/audio/paths.ts#L126-L164).
- Editor support per perspective — [CardEditorScreen.tsx:107-230](../src/app/CardEditorScreen.tsx#L107-L230).
- Settings: four checkboxes, defaulting to `['femaleToMale', 'femaleToFemale']`,
  refusing to clear the last one — [SettingsScreen.tsx:36-95](../src/app/SettingsScreen.tsx#L36-L95).

The nearest thing to sentence structures today is content, not machinery: the
`WANT_DECKS` — "I want and I need", "You, he and she", "Saying what you want" —
described in the source itself as "the sentence frames a learner leans on before
she has many words to put in them" ([seed.ts:606-665](../src/constants/seed.ts#L606-L665)),
plus the hand-written `My sentences` deck. Every one of those is a fixed string.
"I want water" and "I want to eat" are separate cards that share a frame nothing
in the codebase knows about.

## The two gaps

1. **No frame with a slot.** There is no way to say "this is `بدّي` plus a thing"
   and let the learner drill it against thirty nouns she already knows.
2. **Identity is expressed as a four-way checkbox, not as who you are.** Settings
   asks the learner to tick perspectives. Nothing records that she is a woman.
   Two consequences: the grammatical `forms` pair is hardcoded feminine-first for
   everyone ([wordForms.ts:192-213](../src/utils/wordForms.ts#L192-L213)), so a
   male learner is led by a form he does not say; and the listener choice cannot
   be changed mid-session without re-deriving four checkboxes in your head.

## Phase 0 — learner identity

Independent of everything below, worth shipping on its own.

Add to `Settings`:

```ts
/** Who the learner is. Female is the default this app is written for. */
learnerGender: 'female' | 'male';
/** Who she is practising speaking to. Never empty. */
listenerGenders: ('female' | 'male')[];
```

`speechPerspectives` stays as the derived, canonical field — every consumer
(grading, audio, `WordForms`, `StudyCard`) keeps reading it unchanged. A
`derivePerspectives(gender, listeners)` helper in `settingsStore` computes it and
`normalisePerspectives` keeps enforcing canonical order and non-emptiness.

- Settings UI becomes two questions: *I am a…* and *I practise speaking to…*,
  with the existing four toggles kept behind an "advanced" disclosure for anyone
  who genuinely wants ♀→♂ and ♂→♂ and nothing else.
- Migration: an install with an explicit `speechPerspectives` list infers
  `learnerGender` from whether any female-speaker perspective is on, and
  `listenerGenders` from the listeners present. Absent both, default to
  `female` + both listeners.
- **Ordering fix**: `wordForms` currently returns the grammatical pair
  feminine-first always. It takes the learner's gender and leads with the form
  she says, defaulting female. This is the change that makes "shift around for a
  male user" true on the existing paired cards, not just on the new ones.
- Tests: `wordForms.test.ts` gains male-learner ordering cases; a new
  `settingsStore` test covers derivation and the migration inference.

## Phase 1 — the pattern data model

The design decision that saves the most work: **a pattern side is a
`LanguageSide` whose `script` contains `{slot}` placeholders.** Everything —
`speechForms`, `sameAs`, `notApplicable`, perspective collapsing, per-form audio
paths, the editor, grading — then applies to frames with no second
implementation.

```ts
export type PatternSlot = {
  id: string;                 // 'object'
  label: string;              // 'a thing you want'
  /** Cards eligible to fill it. */
  fillers: { tags?: string[]; deckIds?: string[] };
  /** Whether the filler's own gender changes the frame around it. */
  agreement?: 'none' | 'fillerGender';
};

export type SentencePattern = {
  id: string;
  categoryId: string;
  order?: number;
  audioId?: string;
  /** 'I want {object}' */
  english: string;
  hebrew: LanguageSide;       // script: 'אני רוצה {object}'
  arabic: ArabicHalf;         // script: 'بدّي {object}'
  slots: PatternSlot[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

Seed authoring reuses `toL` / `bySp` / `both4` verbatim —
`bySp(['אני רוצה {object}', 'ani rotsa {object}'], ['אני רוצה {object}', 'ani rotse {object}'])`
is already valid input to `speechSide`.

New: `src/features/patterns/` with `patterns.ts` (types plus a `p()` seed helper
mirroring `c()`), and a Dexie table plus a version bump in
[db.ts](../src/services/database/db.ts).

**Constraint for v1**, stated up front: only patterns whose slot is a
free-standing word. Palestinian Arabic that fuses the object onto the verb as a
suffix (`اشتقتلك`) is out of scope — a frame cannot hold it honestly, and
inventing one would teach a shape that does not exist.

## Phase 2 — substitution and grading

`src/features/patterns/render.ts`:

- `patternForms(side, slots, filler, perspectives)` → `WordForm[]`. Calls the
  existing `wordForms`, then substitutes each `{slot}` with the filler's own
  resolved form for the same perspective. Feminine/masculine fillers pick the
  form matching `learnerGender` for a self-referential slot, and the noun's own
  gender otherwise.
- Missing filler → the frame renders with the slot shown as a labelled blank, so
  a pattern is legible on its own before any word is dropped into it.
- `agreement: 'fillerGender'` selects between two frame variants held as the
  side's `forms` pair — how "I want a big *one*" agrees. Patterns without
  agreement declared are rendered strictly, so a nonsensical combination is
  impossible rather than merely unlikely.

`src/features/patterns/grade.ts` wraps `checkLanguage`: expected answers are the
substituted templates across *enabled perspectives only*, so the guarantee
already documented in `validate.ts` — never marked wrong for failing to produce a
perspective you are not studying, never quietly credited for it — carries over
unchanged.

Tests: `render.test.ts`, `grade.test.ts`, colocated, vitest, matching the
existing style.

## Phase 3 — practice

Three modes, in ascending order of what they teach:

1. **Frame recall** — English frame → Hebrew + Arabic frame. Reuses
   `buildPromptPlan` with the slot rendered as a blank.
2. **Slot drill** — pattern plus a filler card the learner has already met →
   produce the whole sentence. This is where a pattern earns its keep: thirty
   sentences out of one frame and words already in the deck.
3. **Perspective flip** — the same sentence asked twice, second time as *"now say
   it to a man."* Graded against that one perspective only. This is the drill
   that actually teaches the axis, and nothing in the app does it today.

Mode 3 is only offered where the pattern genuinely varies — a frame that resolves
to one wording across the learner's perspectives never asks her to flip it.

New `PatternScreen` for browsing and learning a frame; the drills route through
the existing `StudyScreen` session machinery so mode, retry pile, and perfect
runs all behave the same. `StudyCard` already takes `perspectives` as a prop and
needs no change.

## Phase 4 — audio

- Bundled clip for the bare frame per distinct spoken form, straight through
  `clipsForSide`; the `{slot}` is stripped before it reaches the provider so the
  clip says `بدّي` and stops.
- Assembled sentences use device speech (`useSpeech`) rather than concatenating
  two mp3s, which would audibly seam.
- Optionally pre-generate a small set of high-value whole sentences later; the
  manifest already keys by form name and needs no schema change to hold them.

## Phase 5 — persistence

`PatternProgress` keyed by `patternId`, mirroring `CardProgress`: per-language
counters, both-correct streak, mastery. **Not keyed by perspective** — the same
invariant `Settings.speechPerspectives` documents today, so widening or narrowing
the perspective setting never costs a learner a single score.

Then: a `patterns` collection in [collections.ts](../src/services/sync/collections.ts)
with tombstones, a `BackupFile` version bump plus a load path for v1 files, and
pattern editing in the card editor (which already renders per-perspective inputs
and needs only slot fields added).

## Phase 6 — starter content

Frames that pay off against decks that already exist:

| Frame | Slot source | Axis |
| --- | --- | --- |
| I want ___ / I don't want ___ | food, household, transport nouns | speaker |
| I need ___ | same | speaker |
| I have ___ | same | neither (Heb. `יש לי`, Ar. `عندي`) |
| Do you want ___? | same | listener |
| Where is ___? | places, household | listener |
| How much is ___? | food, shopping | neither |
| I am ___ | adjectives | speaker |
| Can I ___? | verbs | speaker |
| This is ___ | nouns | neither |

Each entry gets the same treatment the existing seed gives its cards: a note
where the two languages diverge, and no fabricated variant where a language makes
one form serve everyone.

## Risks

- **Agreement.** Hebrew adjectives agree with the noun; "I want a big cat" is two
  gender decisions, not one. Phase 2's strict rendering is the guard — a pattern
  that has not declared its agreement cannot be combined with a filler that
  requires one.
- **Combinatorial audio.** Deliberately not solved by pre-generation; frames are
  recorded, sentences are spoken.
- **Content correctness.** Every frame needs a native check before it ships. A
  wrong frame is worse than a wrong card because it multiplies across every
  filler. The history already shows this class of bug being caught — a masculine
  verb on a sentence spoken by a woman to her mother
  ([seed.ts:702-710](../src/constants/seed.ts#L702-L710)).

## Suggested order

Phase 0 alone is a shippable improvement to the whole existing card set. Phases
1–2 are the substance and are testable with no UI. Phase 3 is the first thing a
learner sees. 4–6 can follow in any order.
