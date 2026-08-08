# Sentence structures — plan

Teaching *frames* ("I want ___", "Do you want ___?", "Where is ___?") rather
than one more fixed card, with the speaker's and the listener's gender driving
the wording throughout. Female speaker stays the default; a learner who says she
is a man, or who is addressing a man, gets her app rewritten around that.

The content this machinery exists to carry — the phrase curriculum, its
categories, its build order and its axis tags — lives in
[sentence-curriculum.md](sentence-curriculum.md). Where the two disagree, the
curriculum is the requirement and this document is the answer to it; the
curriculum's closing section lists the four things it asks for that this plan
cannot yet represent.

## Architectural principle

> **Speech perspective answers "who is speaking to whom?" Grammatical agreement
> answers "what grammatical entity controls this form?" Never infer one from the
> other.**

And its companion, about where each answer is allowed to live:

> **Settings determine the learner's available practice perspectives. Sessions
> may select from them, but sessions never mutate Settings to represent a
> current prompt.**

And the boundary of the frame system itself, which is what keeps it from
becoming a grammar compiler:

> **Frames model productive lexical substitution, not arbitrary morphological
> composition. When replacing a slot changes morphology outside that slot, or
> when more than one independently controlled agreement region is required,
> author a whole card — unless that morphology is explicitly supported by the
> frame model.**

Everything below follows from those three sentences, so it is worth spelling out
what they forbid:

- A phrase being *addressed to* someone does not make it listener-varying.
  "Where is the bank?" is said to a person and is worded identically whoever
  that person is. The axis is a property of the wording, not of the social act.
- A phrase carrying a feminine/masculine `forms` pair does not tell you what
  decides between them. "tired" is decided by the speaker; "this" is decided by
  the noun after it; "big" is decided by the noun before it. Three different
  controllers, one identical-looking pair.
- A perspective is an *input* to agreement resolution — it names the speaker and
  the listener of the utterance being rendered — but agreement never selects a
  perspective, and a rendered form never revises who the learner is.
- Identity ("I am a woman") is not a practice selection ("the perspectives I
  drill"), and neither of those is a prompt's current framing ("say this next
  one to a man"). Three lifetimes — a person, a preference, a question — and a
  field for each. Storing one in another is the same inference bug in a
  different coat.
- What kind of word may fill a slot, what shape that word must take once it is
  in there, and what controls a gendered form elsewhere in the sentence are
  three separate questions. `role`, `realisation` and `agreement` answer one
  each, and none of them is derivable from the others.
- The English curriculum's controller tags (`[sp]`, `[li]`, `[sp·li]`, `[ref]`
  in [sentence-curriculum.md](sentence-curriculum.md)) are **analysis metadata
  about the English source**, not claims about Hebrew or Arabic morphology.
  *I want coffee* is `[sp]` in English semantics; Hebrew varies, Arabic may not.
  A tag may be used as a **lint hint** — "this side probably deserves an
  agreement review before it ships" — and must never be used as a generator for
  `LanguageSide.agreement`. Deriving a target-language axis from an English tag
  is the same inference bug the first principle names, one level further out.
- An English sentence that looks like a clean substitution is not therefore a
  frame. *I missed ___* slots trivially in English and fuses the object onto the
  verb in Palestinian Arabic (`اشتقتلك`). The third principle decides this, and
  it decides it per language.

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
- Settings asks the two human questions — *I am a…* and *I practise speaking
  to…* — and converts them to perspectives through
  [speechIdentity.ts](../src/utils/speechIdentity.ts) ([SettingsScreen.tsx:55-62](../src/app/SettingsScreen.tsx#L55-L62)).

The nearest thing to sentence structures today is content, not machinery: the
`WANT_DECKS` — "I want and I need", "You, he and she", "Saying what you want" —
described in the source itself as "the sentence frames a learner leans on before
she has many words to put in them" ([seed.ts:606-665](../src/constants/seed.ts#L606-L665)),
plus the hand-written `My sentences` deck. Every one of those is a fixed string.
"I want water" and "I want to eat" are separate cards that share a frame nothing
in the codebase knows about.

## The three gaps

1. **No frame with a slot.** There is no way to say "this is `بدّي` plus a thing"
   and let the learner drill it against thirty nouns she already knows.
2. **Identity is inferred, not recorded.** `speechPerspectives` is still the only
   stored field. `speakerOf` / `listenersOf` read the learner back out of it
   ([speechIdentity.ts:55-71](../src/utils/speechIdentity.ts#L55-L71)), and
   `speakerOf` has to guess — "Female wins where a hand-edited backup mixes the
   two". That guess is the principle above being violated in shipped code: a
   drill selection is being read as an identity. It also means the only way a
   drill could ask "say this one to a man" today is by writing the global
   setting — a session reaching into a preference, which the second principle
   forbids and which Phase 3 solves with session state instead.
3. **Agreement has no controller.** The grammatical `forms` pair is rendered
   feminine-first for everyone ([wordForms.ts:192-213](../src/utils/wordForms.ts#L192-L213)),
   because nothing in the type says what the pair is *for*. A male learner is
   led by a form he does not say, and a frame cannot state that its adjective
   agrees with the speaker while its demonstrative agrees with the noun.

## Phase 0 — learner identity, separated from drill configuration

Independent of everything below, worth shipping on its own.

### Stored shape

```ts
// --- Identity. Stable, answers a question about a person. ---

/** Who the learner is. Female is the default this app is written for. */
learnerGender: 'female' | 'male';

/** Who she is practising speaking to. Never empty. */
listenerGenders: ('female' | 'male')[];

/**
 * Whether she has actually answered the two questions, as opposed to having
 * been given the defaults. False lets Settings ask once instead of asserting a
 * guess back at her; it never changes what is rendered.
 */
identityConfirmed?: boolean;

// --- Practice selection. Persistent, but a preference rather than a fact. ---

/**
 * Perspectives to render and grade *instead of* the ones her identity implies.
 * Written by exactly two things: the advanced disclosure in Settings, and the
 * migration below where a legacy list cannot be read as an identity. Clearing
 * it returns her to herself; it is never written back into identity.
 *
 * Not written by a study session. A prompt's current framing lives on the
 * session (Phase 3), so the two writers here are both deliberate, persistent
 * learner choices and an override found on disk always means one of them.
 */
practicePerspectiveOverride?: SpeechPerspective[];
```

Three lifetimes, three homes: `learnerGender` / `listenerGenders` are who she
is, `practicePerspectiveOverride` is what she has chosen to drill, and
`PracticeContext.activePerspective` (Phase 3) is what this one question is
asking for. A crash can only ever lose the third.

`speechPerspectives` is **retired as a stored field**. Every consumer instead
reads one selector:

```ts
effectivePerspectives(settings) =
  settings.practicePerspectiveOverride
  ?? derivePerspectives(settings.learnerGender, settings.listenerGenders);
```

No derived mirror of `speechPerspectives` is kept in the row. A cached copy of a
derived value is exactly the stale-inference failure this phase exists to
remove; older builds reading a backup get the migration path below instead.

`derivePerspectives` moves to `('female'|'male')[]` listeners rather than the
current `'male' | 'female' | 'both'` union — the union cannot express the empty
case it is already relying on the caller to prevent, and an array makes
"never empty" a single guard shared with `normalisePerspectives`.
`speakerOf` / `listenersOf` are **deleted**, not adapted: nothing should be
reading an identity out of a perspective list once one is stored. The only
remaining caller is the one-shot migration.

### Migration

Read the legacy `speechPerspectives` once, and branch on whether it is
*derivable* — that is, whether it equals `derivePerspectives(g, ls)` for some
`g` and `ls`:

| Legacy list | `learnerGender` | `listenerGenders` | `practicePerspectiveOverride` | `identityConfirmed` |
| --- | --- | --- | --- | --- |
| absent | `female` | `['male','female']` | — | `false` |
| one speaker, e.g. `['f2m','f2f']` | that speaker | listeners present | — | `true` |
| mixed speakers, e.g. `['f2m','m2m']` | `female` (default) | `['male','female']` | **the legacy list, verbatim** | `false` |

The third row is the tightening. Today `speakerOf` would call that install
female and silently drop `maleToMale`; the learner would open the app and find a
perspective she was studying gone. Preserving it as an override changes nothing
she sees, commits to nothing about who she is, and leaves Settings free to ask
the question once — with a visible banner, *"You're practising ♀→♂ ♂→♂ —
[use my usual perspectives]"*, so the override is never invisible state.

A single-speaker list is safely derivable and is *not* stored as an override;
turning every install into an overridden one would make identity permanently
decorative.

### Settings UI

The two questions stay as they are today — *I am a…* and *I practise speaking
to…* — and now write the fields they are asking about rather than a derived
list. Behind an **advanced** disclosure sit the four perspective checkboxes,
which write `practicePerspectiveOverride` and nothing else; the disclosure opens
by default when an override is set, and carries the *[use my usual
perspectives]* control that clears it. `identityConfirmed: false` puts the two
questions in front of her once, unanswered rather than pre-answered.

Editing identity while an override is set changes what she would return to, not
what she sees now, and the banner says so instead of silently discarding either.

### Ordering, and what it is allowed to depend on

`wordForms` currently returns the grammatical pair feminine-first always. It
gains an explicit parameter:

```ts
wordForms(side, selected?, lead?: 'feminine' | 'masculine')
```

The caller passes `lead` from `learnerGender` — *identity*, not the perspective
being rendered, because which of her own forms a learner should see first is a
fact about her, and it should not flip while she is drilling a flip step.
Default stays `'feminine'`.

This is honest only for pairs that the speaker controls, which is most of them
and all the ones the ordering bug is visible on. Phase 1 adds the optional
declaration that makes it exact; until a side declares one, `lead` is a display
preference and never touches grading. See the audit for the limit this leaves.

### Tests

- `wordForms.test.ts`: male-learner ordering; `lead` ignored where the side has
  `speechForms`; grading unaffected by `lead`.
- `speechIdentity.test.ts`: `derivePerspectives` over both listener arrays;
  empty-listener guard.
- `settingsStore.test.ts`: all three migration rows; an override surviving a
  round trip; clearing an override restoring derived perspectives; identity
  edits *not* clearing an active override silently.

## Phase 1 — the pattern data model

The design decision that saves the most work: **a pattern side is a
`LanguageSide` whose `script` contains `{slot}` placeholders.** Everything —
`speechForms`, `sameAs`, `notApplicable`, perspective collapsing, per-form audio
paths, the editor, grading — then applies to frames with no second
implementation.

### Agreement controllers

Replacing `agreement?: 'none' | 'fillerGender'`, which could only say *whether*
something agreed and not *with what*:

```ts
/** What decides between a feminine and a masculine wording. */
export type AgreementController =
  /** One wording serves everyone. */
  | { kind: 'none' }
  /** The person speaking: 'I am tired' → עייפה / עייף. */
  | { kind: 'speaker' }
  /** The person addressed: 'do you want' → בת/בן, بدِّك / بدَّك. */
  | { kind: 'listener' }
  /**
   * A third party the sentence is *about*, who is neither speaking nor being
   * spoken to and is not a replaceable slot: 'she is tired' → עייפה,
   * 'my sister is busy', 'the man is tired'. The content declares the referent's
   * gender on the prompt, because the English already fixes it — 'she' and 'he'
   * are two prompts, not one prompt with a variant.
   */
  | { kind: 'referent' }
  /** A filler's own grammatical gender: 'this is ___' → זה / זאת. */
  | { kind: 'slot'; slotId: string }
  /** Fixed by the frame regardless of anyone: a set phrase. */
  | { kind: 'fixed'; gender: 'feminine' | 'masculine' };

export type AgreementContext = {
  /**
   * The perspective being rendered — the source of speaker and listener gender
   * for this utterance. During a flip step this is the flipped-to perspective,
   * not the learner's identity, because it is the utterance that agrees.
   */
  perspective: SpeechPerspective;
  /**
   * Gender of the third party the prompt is about, where it has one. Read from
   * the prompt's own `referentGender`, never from the perspective: the speaker,
   * the listener and the person under discussion are three different people.
   */
  referentGender?: 'feminine' | 'masculine';
  /** Grammatical gender of each filled slot, by slot id. */
  fillerGenders: Record<string, 'feminine' | 'masculine'>;
};

resolveAgreement(controller, ctx): 'feminine' | 'masculine' | null;
```

`null` means unresolvable — an unfilled controlling slot, or a filler whose own
`gender` the content never recorded. Callers must handle it as "cannot render
this yet", never as "pick feminine".

`AgreementController` is added as an optional field on `LanguageSide` too:

```ts
/**
 * What decides between `forms.feminine` and `forms.masculine`. Optional and
 * additive: absent means undeclared, which is read as speaker-controlled for
 * display ordering only and never for grading or for a flip step.
 */
agreement?: AgreementController;
```

That one field is what eventually lets the flip mechanic and the male-learner
ordering fix be *exact* on the existing card set rather than conventional, and
it costs nothing to add now and backfill deck by deck.

`referent` and `slot` are kept apart on purpose even though both point at "a
thing in the sentence". A `slot` controller names a *replaceable* position and
resolves against whatever filler is currently in it; a `referent` controller
names a person the sentence is about whom the content has already fixed. *This
is ___* is `slot` — the demonstrative changes with each noun dropped in. *She is
tired* is `referent` — nothing is replaceable, and the adjective still agrees.
Collapsing them would either force a fake slot onto a fixed card or make every
slot pretend to be a person.

The gender itself is stored on the prompt, alongside the existing fields, on
both content types:

```ts
/**
 * Gender of the third party this prompt is about, where it has one. Required
 * before any side may declare `{ kind: 'referent' }`; a seed test enforces the
 * pairing, and `resolveAgreement` returns `null` rather than guessing if it is
 * missing.
 */
referentGender?: 'feminine' | 'masculine';
```

This makes `[ref]` a first-class controller rather than a permanent special case
— which matters because the curriculum's §26 and §27 are *entirely* this, and it
recurs through *the woman is tired*, *my sister is busy*, *your brother is here*
and every third-person line in the emergency deck.

### Slots

```ts
export type SlotRole =
  | 'noun'        // a thing: water, a taxi
  | 'person'      // someone: my sister, the driver
  | 'place'       // somewhere: the bank, home
  | 'adjective'   // a quality: tired, big
  | 'infinitive'  // to do something: to eat, to leave
  | 'number';     // a count: three, twenty

/**
 * What grammatical shape the filler must take *in this position* — a separate
 * question from which words may go there and from what controls a gendered form
 * elsewhere. Deliberately named for the general problem rather than for
 * definiteness alone: required articles, preposition interaction,
 * construct-like forms, object-pronoun shapes and number requirements all
 * belong here as they arrive, and none of them belongs in `role` or
 * `agreement`.
 *
 * v1 realisation may alter definiteness only. Number-changing realisation is
 * deferred because number can participate in agreement and therefore requires
 * a shared grammatical-feature model.
 */
export type SlotRealisation = {
  /** 'definite' supplies the article: 'where is {place}' → החתול / القط. */
  definiteness?: 'bare' | 'definite';
};

export type PatternSlot = {
  id: string;                 // 'object'
  label: string;              // 'a thing you want'
  role: SlotRole;
  /** Cards eligible to fill it. Narrowed by `role` as well as by these. */
  fillers: { tags?: string[]; deckIds?: string[] };
  /**
   * Per language, because Hebrew and Palestinian Arabic do not always demand
   * the same transformation of the same word in the same frame. Absent means
   * the filler goes in exactly as the card has it.
   */
  hebrew?: { realisation?: SlotRealisation };
  arabic?: { realisation?: SlotRealisation };
  /**
   * What decides the form of the filler *word itself* when the filler carries a
   * pair. 'I am {adjective}' is { kind: 'speaker' }; 'I want a big {noun}' has
   * the adjective agreeing with { kind: 'slot', slotId: 'noun' }. Absent means
   * the filler has no pair to choose from, and a filler that does have one and
   * lands in a slot that declares nothing is refused rather than guessed.
   */
  agreesWith?: AgreementController;
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
  /**
   * A one-tuple, not an array. v1 renders, grades and speaks single-slot
   * frames, and the type says so rather than leaving a runtime assertion to
   * catch an author. Widening it to `PatternSlot[]` later is then a deliberate
   * schema expansion with rules written for it, not the removal of a guard.
   */
  slots: [PatternSlot];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

The frame's own agreement lives on the side, in the `agreement` field above, so
Hebrew can declare `{ kind: 'slot', slotId: 'thing' }` for *this is ___* while
Arabic declares its own independently. **Per language, always** — an axis is a
property of a wording, and the two languages disagree constantly (see Phase 6).

`role` is not cosmetic. It gates eligibility before tags do, so a `place` slot
cannot be filled from a food deck that happens to be tagged `noun`; it picks the
English blank a learner reads ("somewhere" vs "a thing"); and it is what makes
an `infinitive` slot refuse a noun, which is the single most likely way to
generate a sentence that is grammatical rubbish.

The three slot axes, kept apart on purpose:

```text
role         → what kind of lexical item may fill this slot
realisation  → what grammatical shape that item must take here
agreement    → what controls a gendered form, here or elsewhere in the sentence
```

*Where is the ___?* needs all three to stay separate to be authored honestly:
`role: 'place'`, both languages realising `definiteness: 'definite'`, and no
agreement anywhere. The previous model had only the third axis and so had to
call this frame listener-driven or nothing. Its English frame carries the
article, because the realisation leaves the slot no bare reading.

**Inherently definite fillers are a known hole.** A proper name or a word like
*home* is already definite, and `definiteness: 'definite'` must not mechanically
prefix it with an article. The renderer has to learn that from the filler, which
means cards eventually need lexical metadata:

```ts
lexical?: { inherentlyDefinite?: boolean };
```

v1 does not build it. Starter fillers for definite slots are restricted to
common nouns that take an article, and the restriction is a content rule with a
seed test behind it, not a silent assumption. The field is named here so that
adding it later is a fill-in rather than a redesign.

Seed authoring reuses `toL` / `bySp` / `both4` verbatim —
`bySp(['אני רוצה {object}', 'ani rotsa {object}'], ['אני רוצה {object}', 'ani rotse {object}'])`
is already valid input to `speechSide`.

New: `src/features/patterns/` with `patterns.ts` (types plus a `p()` seed helper
mirroring `c()`), and a Dexie table plus a version bump in
[db.ts](../src/services/database/db.ts).

**Constraints for v1**, stated up front:

- **Exactly one slot per pattern**, expressed as the `[PatternSlot]` tuple
  above. Every rendering, grading and audio rule below is written for one slot.
- **Definiteness is the only realisation operation**, and only where a starter
  frame needs it. `SlotRealisation` is a growth point, not a licence to author
  transformations the renderer has not implemented; an unrecognised key is a
  seed-time failure.
- **No number-changing realisation.** It was drafted and removed, because it
  breaks the one guarantee the three stages rest on. Definiteness is inert:
  nothing else in a sentence agrees with the article, so reshaping the filler
  after agreement has resolved cannot invalidate a decision already made.
  Number is not — *the big cat* → *the big cats* moves the adjective, and in
  fuller sentences the verb. A realisation stage that could change number would
  be silently editing an input to a stage that has already run, and the pipeline
  would emit grammatically impossible sentences. Making that safe means
  requested grammatical features distinct from surface transformation, with
  agreement reading the intended number before anything is rendered — a
  morphology model this app does not need yet. Deferred alongside construct
  state, preposition interaction and object-pronoun shapes.
- Only patterns whose slot is a free-standing word. Palestinian Arabic that
  fuses the object onto the verb as a suffix (`اشتقتلك`) is out of scope — a
  frame cannot hold it honestly, and inventing one would teach a shape that does
  not exist.
- At most one agreeing region per side, because a side has one `forms` pair.
  This is the third principle applied, not a temporary implementation limit, and
  it is the test an author runs before deciding a phrase is a frame at all:

  | Phrase | Verdict | Why |
  | --- | --- | --- |
  | `I like ___` | frame | one region, speaker-controlled |
  | `Do you want ___?` | frame | one region, listener-controlled |
  | `Where is the ___?` | frame | no region at all; a realisation, not an axis |
  | `I'm going to help you sit up` | **card** | speaker verb *and* listener object |
  | `I'm happy to see you` | **card** where both regions inflect in the target language |
  | `I missed ___` | **card** | Arabic fuses the object onto the verb |

  The last two are decided **per language**: a phrase may be a legitimate frame
  in Hebrew and a card in Arabic, and the honest answer is then to author it as
  a card in both rather than to ship a frame that only half works. Extending the
  model to named gendered regions is the escape hatch, and it is deliberately
  not v1 — see the audit.

## Phase 2 — substitution, agreement and grading

`src/features/patterns/render.ts`:

- `patternForms(side, slot, filler, perspectives, lead)` → `WordForm[]`.
  Calls the existing `wordForms` per perspective, then substitutes the `{slot}`
  with the filler's own resolved, realised form for that same perspective.
- **Three independent resolutions per rendered form**, in this order and never
  merged:
  1. *Perspective* picks the wording, through the existing `speechForms`
     machinery. Unchanged from cards.
  2. *Agreement* picks between `forms.feminine` and `forms.masculine` — for the
     frame via `side.agreement`, for the filler via `slot.agreesWith` — by
     calling `resolveAgreement` with the perspective from step 1 in the context.
  3. *Realisation* reshapes the chosen filler word for its position, per
     language, via `realise(form, slot[language].realisation)` — in v1, the
     article for `definiteness: 'definite'` and nothing else.
  Each step reads the ones before it and none reads the ones after: agreement
  never revises a perspective, and realisation never revises a gender.
  Realisation runs last because it operates on a word that has already been
  chosen, and running it earlier would mean articling a form that gets
  discarded. The stage is safe in that position only because every operation it
  is allowed to perform is inert with respect to agreement — which is why
  `number` is not one of them.
- Missing filler → the frame renders with the slot shown as a labelled blank
  from its `role`, so a pattern is legible on its own before any word is dropped
  into it. A frame whose `side.agreement` is `{ kind: 'slot' }` renders its
  *unagreed* base `script` in this state and is marked not drillable until
  filled, rather than showing an arbitrary half of its pair.
- `resolveAgreement` returning `null` refuses the combination outright. A
  pattern that has not declared its agreement cannot be paired with a filler
  that carries a pair, so a nonsensical combination is impossible rather than
  merely unlikely.
- Collapsing still happens after substitution, so a frame that is speaker-varying
  in Hebrew and invariant in Arabic shows two Hebrew lines and one Arabic line.

`src/features/patterns/grade.ts` wraps `checkLanguage` and takes a
`PracticeContext` (Phase 3) rather than reading Settings: expected answers are
the substituted templates across `context.activePerspective` where a step names
one, and across `context.perspectives` otherwise. The guarantee already
documented in `validate.ts` — never marked wrong for failing to produce a
perspective you are not studying, never quietly credited for it — carries over
unchanged, and the grader gains no knowledge of how the context was built.

Tests: `render.test.ts`, `realise.test.ts`, `grade.test.ts`, colocated, vitest,
matching the existing style. Explicitly covering each controller kind, `null`
refusal, definite realisation in both languages, a case where perspective and
agreement disagree (male learner, `{ kind: 'slot' }` frame, feminine noun) to
prove neither is inferred from the other, and a case where a masculine and a
feminine noun in the same definite slot take the same article to prove
realisation is not reading agreement.

## Phase 3 — practice

Three modes, in ascending order of what they teach:

1. **Frame recall** — English frame → Hebrew + Arabic frame. Reuses
   `buildPromptPlan` with the slot rendered as a labelled blank.
2. **Slot drill** — pattern plus a filler card the learner has already met →
   produce the whole sentence. This is where a pattern earns its keep: thirty
   sentences out of one frame and words already in the deck.
3. **Perspective flip** — the same prompt asked twice, second time as *"now say
   it to a man."* Graded against that one perspective only.

### Perspective flip is a session mechanic, not a pattern feature

It lives in `src/features/practice/perspectiveFlip.ts`, above patterns, and
takes any *prompt* — a `Flashcard` or a `SentencePattern` — because "how are
you?" needs the drill exactly as much as "do you want ___?" does.

The session carries the framing, and Settings is never written:

```ts
type PracticeContext = {
  /** What this learner generally practises. From `effectivePerspectives`. */
  perspectives: SpeechPerspective[];
  /** What this one question is asking for. Absent means "all of the above". */
  activePerspective?: SpeechPerspective;
};
```

A flip is then two contexts built from the same settings read:

```ts
const first  = { perspectives, activePerspective: 'femaleToFemale' };
const second = { perspectives, activePerspective: 'femaleToMale' };
```

Rendering and grading take the context. Nothing persists, so killing the app
mid-flip cannot corrupt a preference, two sessions cannot fight over a global,
and an override found on disk is unambiguously a deliberate learner choice or a
migration. This is why `practicePerspectiveOverride` needs no provenance tag:
only persistent choices ever reach it.

```ts
/** The perspective worth flipping to, or null if the wording does not vary. */
flipTarget(prompt, from: SpeechPerspective, within: SpeechPerspective[]):
  SpeechPerspective | null;
```

`null` whenever the rendered forms are identical across the candidates, which is
the same collapsing rule `speechWordForms` already applies — a frame that
resolves to one wording across the learner's perspectives never asks her to flip
it, and neither does a card.

`within` is `context.perspectives`, so by default a flip stays inside what she
has chosen to study. A learner practising only ♀→♀ has nothing to flip to, and
the drill is simply not offered rather than quietly grading her on an unstudied
perspective. Widening a flip past her selection — *"you only practise speaking
to women; want to try this one to a man?"* — is a deliberate, opt-in variant
that must announce itself in the prompt, and it is out of scope for the first
version.

Progress is not keyed by perspective (Phase 5), so a flip step scores into the
same row as the unflipped one.

Shipping order within the phase: the mechanic works on existing cards first,
where there is already content to try it on, and patterns plug into the same
interface when Phase 2 lands. It depends on `PracticeContext` alone, so it does
not wait on the pattern model — and, since it never writes Settings, not on
Phase 0 either beyond reading `effectivePerspectives`.

New `PatternScreen` for browsing and learning a frame; the drills route through
the existing `StudyScreen` session machinery so mode, retry pile, and perfect
runs all behave the same. `StudyCard` takes its perspectives as a prop and needs
only to accept a `PracticeContext` in place of the bare list — the session
builds it once from `effectivePerspectives`, and screens outside a session keep
passing the list.

## Phase 4 — audio

**Nothing strips `{slot}` before speech.** A frame minus its slot is not a
speakable phrase in general — Hebrew *איפה ה־* ends mid-word — and silently
truncating produces a clip that teaches a sound nobody says.

Instead, `LanguageForm` gains:

```ts
/**
 * What to say for the frame on its own, when the frame alone is speakable.
 * Authored, never derived: absent means this frame has no bare-frame clip and
 * is only ever heard inside a whole sentence.
 */
audioPrompt?: string;
```

Rules:

- Bare-frame clip generated per distinct spoken form, through `clipsForSide`,
  **only** where `audioPrompt` is authored. No `audioPrompt`, no clip, and the
  UI offers the frame's audio button only on sentences.
- Assembled sentences use device speech (`useSpeech`) over a
  `speechText(pattern, filler, perspective)` string built from the same
  substitution as Phase 2 and honouring each part's `pronunciationText`, rather
  than concatenating two mp3s, which would audibly seam.
- A generator-level assertion: any text reaching a TTS provider or the clip
  manifest containing `{` or `}` is a build failure. This is the test that stops
  the stripping shortcut being reintroduced.
- Optionally pre-generate a small set of high-value whole sentences later; the
  manifest already keys by form name and needs no schema change to hold them.

## Phase 5 — persistence

`PatternProgress` keyed by `patternId`, mirroring `CardProgress`: per-language
counters, both-correct streak, mastery. **Not keyed by perspective** — the same
invariant `Settings.speechPerspectives` documents today, now carried by
`learnerGender` / `listenerGenders` / `practicePerspectiveOverride` together, so
widening or narrowing perspectives, or spending a step flipped, never costs a
learner a single score.

Then: a `patterns` collection in [collections.ts](../src/services/sync/collections.ts)
with tombstones, a `BackupFile` version bump plus a load path for older files
(which run the Phase 0 migration table on their `speechPerspectives`), and
pattern editing in the card editor (which already renders per-perspective inputs
and needs slot fields, a `role` picker and an agreement-controller picker added).

`practicePerspectiveOverride` **syncs**, with the rest of the settings row. It
was excluded in the previous draft because a flip step wrote to it; now that no
session does, it is a deliberate learner choice like any other and a second
device should honour it. The thing that must never sync — a prompt's current
framing — no longer exists as stored state at all, which is the point of moving
it to `PracticeContext`.

## Phase 6 — starter content

Frames that pay off against decks that already exist. The axis is recorded per
language, because a frame that varies in Hebrew is routinely invariant in Arabic
and the reverse — a single column would be the conflation this document exists
to prevent. *Frame* is the frame's own wording; *slot agreement* is what decides the
filler's gendered form; *realisation* is the shape the filler must take in the
slot.

| Frame | Slot (role) | Hebrew frame | Arabic frame | Slot agreement | Realisation |
| --- | --- | --- | --- | --- | --- |
| I want ___ / I don't want ___ | food, household, transport (noun) | speaker — *rotsa / rotse* | none — `بدّي` serves both | none | bare |
| I need ___ | same (noun) | speaker — *tsricha / tsarich* | none | none | bare |
| I have ___ | same (noun) | none — `יש לי` | none — `عندي` | none | bare |
| Do you want ___? | same (noun) | listener — *rotsa / rotse* | listener — `بدِّك / بدَّك` | none | bare |
| Where is **the** ___? | places, household (place) | **none** | **none** | none | **definite, both** — `החתול` / `القط` |
| How much is **the** ___? | food, shopping (noun) | none | none | none | **definite, both** |
| I am ___ | adjectives (adjective) | none — verbless | none — verbless | **speaker** | bare |
| Can I ___? | verbs (infinitive) | none, using *efshar* | none | none | bare |
| This is ___ | nouns (noun) | **slot** — `זה / זאת` | **slot** — `هادا / هاي` | none | bare |

The corrections against the previous version of this table:

- **Where is the ___?** was listed as listener-driven. It is not. It is
  *addressed to* a listener and worded identically for any listener — the
  mistake the architectural principle above names first. Neither frame varies on
  any axis; what the frame actually demands is a *definite* filler, which is a
  realisation and not an axis at all. Two questions had been collapsed into one
  wrong answer.
- **The English frame carries the article where the realisation demands one.**
  A slot realising `definiteness: 'definite'` has no bare reading, so the
  English a learner is shown says *the*. Writing "How much is ___?" would teach
  an English frame broader than the Hebrew and Arabic ones actually are, and
  would invite fillers the slot cannot take. Applied to both definite rows for
  the same reason, not only the one it was noticed on.
- **I am ___** was listed as speaker-driven at the frame level. The Hebrew and
  Arabic frames are verbless and do not vary at all; it is the *adjective* that
  agrees with the speaker. Frame `none`, slot `{ kind: 'speaker' }` — and it is
  the clearest case in the set for why the two columns had to be separated.
- **This is ___** was listed as "neither". It is slot-controlled in both
  languages, and is the reference case for `{ kind: 'slot' }`.
- **I want / I need** were listed as speaker without qualification. True in
  Hebrew, false in Arabic, which is exactly why `speechForms` is per language
  already; the table now says so.
- **Can I ___?** as *efshar* has no agreement; phrased as *yechola / yachol* it
  would be speaker-controlled. The frame is authored one way and the note says
  which, rather than the table implying both.

### Beyond the nine

The nine above were chosen as a proof of the model, not as the ship list. The
curriculum's [layer-2 harvest](sentence-curriculum.md#layer-2-harvest) is the
actual backlog — seventeen frames drawn from categories a learner already meets,
each against a filler deck she already owns. Three are worth calling out here
because they change what Phase 6 covers:

| Frame | Slot (role) | Frame agreement | Slot agreement | Note |
| --- | --- | --- | --- | --- |
| How do you say ___ in Hebrew/Arabic? | noun | listener — *check both* | none | The highest-value frame in the app: one frame, every word she owns, and it turns the vocabulary decks into sentence practice with no new authoring |
| She is ___ / He is ___ | adjective | none — verbless | **referent** | Two frames, because the English fixes the referent; `referentGender` on each |
| It's ___ | adjective | none | **referent** | Same shape; the referent is the thing described |

The last two are what `{ kind: 'referent' }` buys: §26 and §27 of the curriculum
go from "unrepresentable, author sixty cards" to two frames over the adjective
deck. That is the single largest content saving the controller unlocks, and it
is why `referent` is in v1 rather than deferred.

Each entry gets the same treatment the existing seed gives its cards: a note
where the two languages diverge, and no fabricated variant where a language
makes one form serve everyone. **Every axis and controller in this table is a
content claim and needs the same native check the wordings do** — the columns
are the plan's best reading, not an authority.

## Phase 7 — exchanges

The curriculum's third layer, and a **third content type**. Not a card with
newlines in it, and not a pattern: a card has one speaker, and a frame has a
slot where an exchange has a turn.

```ts
export type ExchangeLine = {
  id: string;
  /** Which participant speaks this line. */
  speaker: 'a' | 'b';
  english: string;
  hebrew: LanguageSide;
  arabic: ArabicHalf;
  referentGender?: 'feminine' | 'masculine';
  notes?: string;
};

export type Exchange = {
  id: string;
  categoryId: string;
  order?: number;
  title: string;                                   // 'Coffee'
  /** Who the two participants are. The learner is `a` unless she says otherwise. */
  participants: { a: 'female' | 'male'; b: 'female' | 'male' };
  lines: ExchangeLine[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

### The perspective switches on every line, and is derived

A line's perspective is `participants[line.speaker]` speaking to
`participants[other]` — so a three-line greeting between a woman and a man is
♀→♂, ♂→♀, ♀→♂, and each line's `LanguageSide` resolves through the existing
`speechForms` machinery at *its own* perspective. Nothing new is needed to
render a line; what is new is that one piece of content holds several
perspectives at once.

Derived, never stored per line. A stored per-line perspective would go stale the
moment `participants` changed, and would let an author write a line whose
speaker and whose perspective disagree — the same cached-inference failure Phase
0 removes from Settings.

`participants` is what makes an exchange reusable rather than four exchanges:
the same coffee dialogue between two women is the same content with `b: 'female'`,
and the lines re-resolve. Which pairings a learner is offered comes from
`effectivePerspectives`, so an exchange whose participants she does not practise
is simply not shown.

### Practice

`PracticeContext` gains nothing. The session walks the lines, and for each line
builds a context whose `activePerspective` is that line's derived perspective —
exactly the mechanism Phase 3 already uses for a flip step, which is the reason
that mechanic was put on the session rather than on patterns.

Two modes:

1. **Read-through** — every line shown, audio per line. This is comprehension,
   and it is what a learner does first.
2. **Take a part** — she plays one participant; the app speaks the other's
   lines and she produces hers. Graded per line against that line's
   perspective only, through the existing `checkLanguage`.

Taking part B when she is a woman and B is a man is legitimate and useful, and
it is the same widening question as a flip past her selection: offered only if
the perspective is one she studies, and otherwise announced rather than silent.

### What exchanges deliberately do not get

- **No slots.** An exchange line is a whole utterance. A dialogue with a
  substitutable noun is two features stacked before either has shipped.
- **No line reuse from cards.** *I'm good* exists as a card in §1 and as a line
  in §42, and they are independent content. Sharing them would couple deck
  edits to dialogue edits for a saving of a few dozen strings, and it would make
  a line's perspective depend on where it was being read from.
- **No branching.** One ordered list, no choices.

### Persistence and audio

`ExchangeProgress` keyed by `exchangeId`, mirroring `PatternProgress`, and not
keyed by perspective for the same reason. An `exchanges` collection in
[collections.ts](../src/services/sync/collections.ts) with tombstones, a Dexie
table, and a `BackupFile` bump. Audio is per line through `clipsForSide` with no
new machinery — a line is a whole utterance, so unlike a frame it always has
something speakable, and `audioPrompt` does not apply.

## Risks

- **Agreement is now declarable, not solved.** Hebrew adjectives agree with the
  noun; "I want a big cat" is two gender decisions in one phrase. The v1
  one-agreeing-region-per-side constraint means that sentence is authored as a
  frame with a fixed adjective or not at all. `resolveAgreement` returning
  `null` is the guard; the audit below records what stays unrepresentable.
- **Undeclared pairs on existing cards.** Several hundred cards carry a `forms`
  pair with no `agreement` field. They are read as speaker-controlled for
  display order only. That convention is right for most of them and wrong for
  any noun-controlled pair, so it must never reach grading or flip steps before
  the deck is backfilled.
- **Referent gender read from the wrong person.** `{ kind: 'referent' }` is
  attractive enough to be over-applied, and the failure is quiet: *your brother
  is here* has a listener-controlled possessive **and** a referent-controlled
  predicate, which is two regions and therefore a card. The guards are a
  seed-time failure when a side declares `referent` and the prompt has no
  `referentGender`, `resolveAgreement` returning `null` rather than falling back
  to the perspective, and a test asserting that changing the perspective never
  changes a referent-controlled form.
- **Exchanges drifting into a dialogue engine.** No slots, no reuse, no
  branching — three deliberate omissions, each of which will look like an easy
  win. The first one taken makes an exchange a second pattern system.
- **Anything writing Settings from a session.** The failure mode that would undo
  Phase 0 and reintroduce the crash-corrupts-preferences problem: a drill
  reaching for `practicePerspectiveOverride` because it is conveniently global.
  Guarded by the second architectural principle, by `PracticeContext` being the
  only thing rendering and grading accept, and by a test asserting a flip
  session leaves the settings row byte-identical.
- **Realisation growing into a grammar engine.** `definiteness` is one operation
  with one implementation. The pull will be to add a second, then a rule per
  word class, and eventually to be inflecting Hebrew badly. Two constraints hold
  it: no realisation key without a renderer and a starter frame that needs it,
  and no realisation key that any other word could agree with. The second is the
  load-bearing one — it is what makes "realisation runs last" a fact about the
  operations rather than a hope.
- **Combinatorial audio.** Deliberately not solved by pre-generation; frames are
  recorded where speakable, sentences are spoken.
- **Content correctness.** Every frame needs a native check before it ships. A
  wrong frame is worse than a wrong card because it multiplies across every
  filler. The history already shows this class of bug being caught — a masculine
  verb on a sentence spoken by a woman to her mother
  ([seed.ts:702-710](../src/constants/seed.ts#L702-L710)).

## Tests, by phase

| Phase | File | What it pins |
| --- | --- | --- |
| 0 | `wordForms.test.ts` | male-learner `lead`; `lead` never affects grading |
| 0 | `speechIdentity.test.ts` | derivation over listener arrays; empty guard |
| 0 | `settingsStore.test.ts` | three migration rows; mixed list preserved as override with identity left unconfirmed; clearing an override |
| 1 | `agreement.test.ts` | each controller kind; `null` on unfilled slot and on ungendered filler; `referent` unaffected by perspective; `null` when `referent` is declared with no `referentGender` |
| 1 | `seed.test.ts` | no side declares `referent` on a prompt lacking `referentGender` |
| 1 | `seed.test.ts` | definite slots draw only from article-taking fillers; unrecognised realisation key rejected |
| 2 | `render.test.ts` | substitution per perspective; blanks; collapsing after substitution; refusal on undeclared agreement; perspective and agreement disagreeing |
| 2 | `realise.test.ts` | definite article in both languages; same article for a masculine and a feminine noun; `bare` leaves the filler untouched |
| 2 | `grade.test.ts` | `activePerspective` alone where set, `perspectives` otherwise; no credit for unstudied perspectives |
| 3 | `perspectiveFlip.test.ts` | `flipTarget` null where wording is uniform; null where `within` has one member; works on a `Flashcard`; a flip session leaves Settings unchanged |
| 4 | `audio.test.ts` | no `{` or `}` reaches a provider or the manifest; no `audioPrompt` → no bare-frame clip |
| 5 | `sync.test.ts` | override syncs; progress survives a perspective change |
| 7 | `exchange.test.ts` | per-line perspective derived from `speaker` + `participants`; alternates down the exchange; re-derives when `participants` changes; grading a taken part uses that line's perspective alone |

## Suggested order

1. **Phase 0** — identity, override, migration, ordering. Shippable alone and
   improves the whole existing card set. Nothing else can be built honestly on
   top of the current inferred identity.
2. **Phase 3's flip mechanic, on existing cards.** It needs `PracticeContext`
   and content that already exists — no pattern model, and no settings write. It
   is the first thing a learner feels, and it proves the session/settings
   boundary on a small surface before patterns depend on it.
3. **Phase 1 + 2** — the pattern model and rendering. The substance, testable
   with no UI.
4. **Phase 3's pattern modes and `PatternScreen`** — the flip mechanic plugs in
   rather than being written twice.
5. **Phase 4 audio, then 5 persistence, then 6 content** in any order, except
   that no starter frame ships before its native check.
6. **Phase 7 exchanges**, which can move earlier. They depend on `PracticeContext`
   and on line-level rendering that already works for cards — **not** on the
   pattern model, the slot machinery, or agreement controllers. If the
   curriculum's tier 1 lands before Phase 1 does, exchanges are shippable right
   after step 2 and give a learner the thing she notices most, which is being
   able to hold a whole short conversation.

## Audit — contradictions resolved, and what this model still cannot represent

Recorded deliberately, so the next revision starts from the known edges rather
than rediscovering them.

**Resolved in the third revision.** Writing the curriculum before the code
surfaced three things the model could not hold: third-person agreement, which is
now the `referent` controller rather than a permanent special case; dialogue,
which is now its own content type rather than a card with newlines in it; and
the frame/card boundary, which was an implementation limit buried in a
constraints list and is now a stated principle with a decision procedure behind
it. The curriculum also settled that English controller tags are a lint hint and
never a generator for a target-language axis.

**Resolved across the two revisions before it.** Phase 5 justified its
perspective-independent progress by citing a field (`speechPerspectives`) that
Phase 0 removes, now restated against the fields that replace it; Phase 2 graded
against "enabled perspectives" while Phase 3 flipped to one, now unified under
`PracticeContext`; Phase 6's axis column asserted single axes for frames whose
two languages differ, now split per language; the override's two writers had
incompatible lifetimes, now resolved by removing one rather than tagging it —
which also flips the sync decision, since what remains is a genuine preference;
and definiteness, which the previous draft could only mislabel as an agreement
axis, is now its own `realisation` concept.

**Still unrepresentable.**

1. **Two agreeing regions in one side.** "I want a big ___" needs the adjective
   to agree with the noun *and* nothing else to change; "I am ready to ___"
   needs a speaker-agreeing adjective and a slot. One `forms` pair per side can
   hold one decision. The fix, when needed, is named gendered regions on the
   side (`regions: Record<string, GenderedForms & { agreement }>`) rather than a
   second mechanism — but it is not v1. This is now a **stated boundary with a
   fallback** rather than a hole: the third principle says what to do instead
   (author a whole card), and the Phase 1 verdict table says how to tell. What
   remains unrepresentable is the *frame*, not the phrase.
2. **Non-binary and plural agreement.** `'feminine' | 'masculine'` is the whole
   type. Plural addressees (*you all want*), plural nouns driving frame
   agreement, and any non-binary form are unrepresentable, in the new model
   exactly as in the old one. `SpeechPerspective` being a four-member union
   makes this a wide change, not a narrow one, and `learnerGender` deliberately
   reuses the same two-member union rather than pretending otherwise.
3. **Undeclared card pairs.** `LanguageSide.agreement` is optional, so the model
   *permits* the ambiguity it was added to remove until the seed is backfilled.
   The convention (undeclared = speaker, display only) is a stated compromise,
   not something the types enforce.
4. **`identityConfirmed` has no consumer beyond Settings' prompt.** It is
   metadata about an answer rather than an answer, and if nothing ends up
   reading it besides the one prompt, it should be dropped in review rather than
   carried as a field that looks meaningful.
5. **Realisation covers one operation, not the class.** `definiteness` is named
   because starter frames need it. Preposition interaction (*to the shop* vs
   *the shop*), Hebrew construct state, and object-pronoun shapes have a home in
   `SlotRealisation` but no implementation, so a frame requiring one cannot ship
   in v1. The abstraction is right; the coverage is one entry wide.
   Number-changing realisation is a different kind of absence from the rest of
   that list: it is excluded on principle rather than on effort, because it
   would let a late stage invalidate an earlier one. Admitting it later means
   splitting requested grammatical features from surface transformation, not
   adding a case to `realise`. A plural filler in v1 is authored as its own
   card, and the frame never asks for the change.
6. **Inherently definite fillers.** `definiteness: 'definite'` articles
   mechanically, so a proper name or *home* would come out doubly definite. v1
   restricts definite slots to article-taking common nouns by content rule and
   seed test; `lexical.inherentlyDefinite` is designed and deliberately unbuilt.
   This is the one place the model knowingly relies on content discipline rather
   than on the type.
7. **Realisation is a per-slot property, not a per-filler one.** Two fillers in
   the same slot that need different treatment — one taking an article, one not
   — cannot be distinguished without the lexical metadata above. Same gap as 6,
   noted separately because it will bite first through a mixed filler deck.
8. **`flipTarget` picks one target.** Where three perspectives all differ, the
   signature returns a single flip and silently drops the third. Adequate for a
   drill; wrong if flip ever becomes a coverage guarantee.
9. **One referent per prompt.** `referentGender` is a single field, so *she told
   him*, *my sister is taller than my brother*, and any sentence with two third
   parties whose forms both matter cannot be a frame. Same shape as item 1 — two
   regions, one pair — and the same fallback: author the card. Named regions
   would fix both at once, which is the argument for doing that one properly
   when it comes rather than adding `referentGenders: Record<string, …>` first.
10. **Exchanges are linear and closed.** No slots, no branching, no shared lines
    (Phase 7). A dialogue that should vary — *do you want coffee / tea / water* —
    is three exchanges or one with a fixed drink. Deliberate, and the first
    place the omission will feel wrong is the coffee dialogue itself.
11. **`participants` is a pair of binary genders**, so a three-person exchange
    and any non-binary participant are unrepresentable, inheriting item 2's
    limit rather than adding a new one.
12. **Flips cannot reach outside what she studies.** `within` keeps a flip inside
   `context.perspectives`, so a learner practising a single perspective is never
   offered the drill that would teach her the axis. The opt-in widening is
   described in Phase 3 and deliberately not built, but it means the mechanic is
   weakest for exactly the learner with the narrowest selection.
