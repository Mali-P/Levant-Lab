import type { AlphabetDisplay } from './alphabet';

export type Language = 'hebrew' | 'arabic';

/** Both languages, in the order every paired surface presents them. */
export const LANGUAGES: readonly Language[] = ['hebrew', 'arabic'];

/**
 * Which languages the learner has switched on.
 *
 * A preference and a filter, never a fact about the content: a card always
 * carries both halves, and choosing one language hides the other rather than
 * touching it. Switching back to `both` restores it, its stored accuracy
 * included, exactly as it stood.
 *
 * Stored as the answer she gave rather than as a derived list, for the same
 * reason identity is — the list every consumer reads is `activeLanguages()`,
 * computed on load, so no stale mirror of the choice can exist on disk.
 */
export type LanguageChoice = Language | 'both';

export type StudyMode = 'normal' | 'hard' | 'brutal';

/**
 * Where finished work sits in a list of categories or lots.
 *
 * `course` leaves the order the course wrote. The other two gather everything
 * finished at one end, consecutively, so a learner a long way in can either
 * keep what she has done in front of her or push it out of the way.
 */
export type FinishedSort = 'course' | 'first' | 'last';

export type AnswerMode = 'self' | 'typed' | 'audio';

export type PromptDirection =
  | 'en>he+ar'
  | 'he>en+ar'
  | 'ar>en+he'
  | 'heAudio>he+ar'
  | 'arAudio>ar+he'
  | 'enAudio>he+ar';

export type ArabicDialect =
  | 'Palestinian'
  | 'Jordanian'
  | 'Lebanese'
  | 'Syrian'
  | 'General Levantine';

export type AcceptedAnswer = {
  value: string;
  label?: string;
  dialect?: string;
};

/**
 * How one form is to be pronounced, decided by the course rather than by the
 * speech engine's reading of the spelling.
 *
 * Four things are kept apart on purpose, because collapsing any two of them is
 * how a card ends up teaching one word and saying another:
 *
 *   the script the learner reads      — `script`
 *   the romanisation she is taught    — `transliteration`
 *   the input that produces it        — `text`, here
 *   the recording, where there is one — `audioPath`
 *
 * `text` is engine input and nothing else. It is normally the same word
 * vocalised; it is never shown, never graded, and never a different word.
 */
export type TtsPronunciation = {
  /** The exact input handed to the speech engine. */
  text: string;
  /**
   * The romanisation this must come out as. Redundant with the form's own
   * `transliteration` when they agree, and the tie-breaker when they do not —
   * a reviewer correcting audio writes here without touching what is taught.
   */
  target?: string;
  /**
   * `curated` — authored Levantry course content. Authoritative.
   * `dictionary` — stamped from the Palestinian pronunciation dictionary.
   * `user` — the learner's own correction to a guess on her own card.
   */
  source: 'curated' | 'dictionary' | 'user';
  /**
   * Never re-derive this pronunciation from the Arabic spelling.
   *
   * A locked form ignores the "use card pronunciation" setting, which exists so
   * a learner can silence her own respellings — not so she can be handed a
   * Modern Standard reading of a word the deck teaches in Palestinian. Defaults
   * to true for `curated` and false otherwise.
   */
  locked?: boolean;
};

export type GenderedForm = {
  script: string;
  transliteration?: string;
  /**
   * Sent to the speech generator instead of `script`. Holds niqqud or a
   * respelling that fixes a mispronunciation; the learner never sees it.
   *
   * The bare form of `tts`, kept for cards and backups written before that
   * field existed. `tts` wins where both are set.
   */
  pronunciationText?: string;
  /** The pronunciation this form is locked to, where the course fixes one. */
  tts?: TtsPronunciation;
  /** Bundled clip for this exact form, relative to the app base. */
  audioPath?: string;
};

/**
 * The feminine and masculine forms of one word. Set only when the two differ:
 * a noun like "water" that everybody says the same way leaves this undefined.
 *
 * This is *word* gender — the gender of the noun, adjective or number itself,
 * or of whoever the word describes. It is not the conversation's perspective;
 * see `SpeechForms` for that. A card may carry both.
 */
export type GenderedForms = {
  feminine: GenderedForm;
  masculine: GenderedForm;
};

/**
 * Who decides which half of a `forms` pair is the one to say.
 *
 * A pair on its own is only two strings; it does not say what the choice
 * between them turns on, and the app answered that for years by showing both
 * and leaving the learner to work it out. This is the missing answer, and the
 * reason the From / To settings can reach a `forms` card at all.
 *
 * `speaker`  — the form follows whoever is talking. "I'm tired" is تعبانة from
 *   a woman and تعبان from a man, whoever is listening.
 * `listener` — the form follows whoever is addressed: imperatives, and anything
 *   said about the person in front of you.
 * `word`     — neither. The gender belongs to the word itself or to a third
 *   person: a cat, a colour, a heavy suitcase, "her house". Nothing about the
 *   learner picks between these, so both stay on screen.
 *
 * Undefined reads as `word`, which is the safe default in both directions: it
 * can never hide a form the learner needed, and a pair that genuinely follows a
 * person in the conversation has to say so before the setting will touch it.
 */
export type FormAgreement = 'speaker' | 'listener' | 'word';

/**
 * Who is speaking, and who is being spoken to.
 *
 * A separate axis from `GenderedForms`. "How are you?" changes its ending to
 * match the listener; "I am tired" changes to match the speaker; a noun like
 * "cat" changes for neither and keeps its `forms` pair instead.
 *
 * Female-speaker perspectives come first. Every ordering in the app follows
 * `SPEECH_PERSPECTIVES` rather than sorting or reversing it.
 */
export type SpeechPerspective =
  | 'femaleToMale'
  | 'femaleToFemale'
  | 'maleToFemale'
  | 'maleToMale';

/**
 * A person's gender, on the speaker/listener axis.
 *
 * Deliberately not the same type as the feminine/masculine of `GenderedForms`,
 * which is a grammatical property of a word. A person speaks or is spoken to; a
 * word has a gender. One shared union would invite reading either as the other,
 * which is the confusion this axis exists to prevent.
 */
export type PersonGender = 'female' | 'male';

/** The canonical order: ♀→♂ · ♀→♀ · ♂→♀ · ♂→♂. */
export const SPEECH_PERSPECTIVES: readonly SpeechPerspective[] = [
  'femaleToMale',
  'femaleToFemale',
  'maleToFemale',
  'maleToMale',
];

/** The marker shown beside a form. */
export const SPEECH_PERSPECTIVE_MARKERS: Record<SpeechPerspective, string> = {
  femaleToMale: '♀→♂',
  femaleToFemale: '♀→♀',
  maleToFemale: '♂→♀',
  maleToMale: '♂→♂',
};

/** Read in place of the marker, and used in audio button names. */
export const SPEECH_PERSPECTIVE_LABELS: Record<SpeechPerspective, string> = {
  femaleToMale: 'female speaking to male',
  femaleToFemale: 'female speaking to female',
  maleToFemale: 'male speaking to female',
  maleToMale: 'male speaking to male',
};

/** How the choice is put to the learner in Settings. */
export const SPEECH_PERSPECTIVE_SHORT: Record<SpeechPerspective, string> = {
  femaleToMale: 'I am a woman, speaking to a man',
  femaleToFemale: 'I am a woman, speaking to a woman',
  maleToFemale: 'I am a man, speaking to a woman',
  maleToMale: 'I am a man, speaking to a man',
};

/**
 * One perspective's wording. Carries everything an ordinary answer carries, so
 * a variant is never a second-class version of the headline form.
 */
export type LanguageForm = {
  script: string;
  transliteration?: string;
  /** Sent to the speech generator instead of `script`; the learner never sees it. */
  pronunciationText?: string;
  /** The pronunciation this wording is locked to, where the course fixes one. */
  tts?: TtsPronunciation;
  /** Bundled clip for this exact wording, relative to the app base. */
  audioPath?: string;
  notes?: string;
};

/**
 * A perspective worded exactly like another one. Written as a pointer rather
 * than copied, so the content never claims a distinction that is not there and
 * the two can share a single recording.
 */
export type SameAsPerspective = { sameAs: SpeechPerspective };

/** A perspective this phrase is simply not said in. */
export type PerspectiveNotApplicable = { notApplicable: true };

export type SpeechVariant =
  | LanguageForm
  | SameAsPerspective
  | PerspectiveNotApplicable;

/**
 * The speaker/listener variants of one side of one card.
 *
 * Set only where the language genuinely changes, and independently for Hebrew
 * and Arabic — a distinction can exist in one language and not the other. A
 * perspective left out falls back to the side's own `script`, so a phrase that
 * is the same for everyone needs no entries at all, and a phrase that varies in
 * only one direction carries only the entries that differ.
 */
export type SpeechForms = Partial<Record<SpeechPerspective, SpeechVariant>>;

export function isSameAs(variant: SpeechVariant): variant is SameAsPerspective {
  return 'sameAs' in variant;
}

export function isNotApplicable(
  variant: SpeechVariant,
): variant is PerspectiveNotApplicable {
  return 'notApplicable' in variant;
}

export type LanguageSide = {
  /** The headline form. Mirrors `forms.feminine` when a gendered pair is set. */
  script: string;
  transliteration?: string;
  /** Sent to TTS instead of `script` when present. Lets niqqud / respelling drive audio. */
  pronunciationText?: string;
  /**
   * The pronunciation this side is locked to, where the course fixes one.
   *
   * Applies to the side's own single form. A side with `forms` or `speechForms`
   * carries the lock on each of those instead, because two forms of a word are
   * two different pronunciations and one entry cannot be right about both.
   */
  tts?: TtsPronunciation;
  forms?: GenderedForms;
  /**
   * Whose gender picks between the two halves of `forms`. Defaults to `word`,
   * so a pair says nothing about the conversation until it is told to.
   *
   * Meaningless without `forms`, and deliberately separate from `speechForms`,
   * which carries its perspective in the key already.
   */
  agreement?: FormAgreement;
  /**
   * Speaker/listener variants, where this phrase has any. Independent of
   * `forms`: a card can carry a grammatical pair and a set of perspectives at
   * once, and most cards carry neither.
   */
  speechForms?: SpeechForms;
  /**
   * Bundled clip for the single form of a word that has no gendered pair.
   * A word with `forms` carries its clips on the forms themselves instead.
   */
  audioPath?: string;
  /** Grammatical gender of the word itself, unrelated to `forms`. */
  gender?: string;
  plural?: string;
  notes?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  accepted?: AcceptedAnswer[];
  audioUrl?: string;
};

export type ArabicHalf = LanguageSide & { dialect?: ArabicDialect };

/**
 * The line somebody else says, that this card's own line answers.
 *
 * Conversation Flow is the one area where a card is half of an exchange rather
 * than a thing on its own: "I'm going home" is not the card, "Where are you
 * going? — I'm going home" is. The question is carried here rather than folded
 * into `english`, because the two are used differently. A cue is shown, spoken
 * and hovered like any other line; it is never typed into, never hidden behind
 * the reveal and never graded, so the learner is only ever scored on her half.
 *
 * Whose gender picks between a cue's two forms is the one thing worth pausing
 * over. A cue is spoken *to* the learner, so its endings follow her — which is
 * `agreement: 'speaker'`, because that is the value the settings resolve
 * against her own identity. See `askedOfHer` in `constants/conversations`,
 * where every cue in the course is authored.
 */
export type CardCue = {
  english: string;
  hebrew: LanguageSide;
  arabic: ArabicHalf;
};

export type Flashcard = {
  id: string;
  categoryId: string;
  deckId: string;

  english: string;
  imageUrl?: string;
  icon?: string;

  /** What was said to her, where this card is the reply. Conversation Flow only. */
  cue?: CardCue;

  /**
   * Position within the deck — the order the words are meant to be met, which
   * for a counting deck is the only order that makes sense. Absent on cards the
   * learner added themselves; `sortCards` puts those after the starter words.
   */
  order?: number;

  /**
   * Stable key for this word's bundled pronunciation clips, independent of the
   * per-device `id` and of the Hebrew/Arabic spelling. Only starter words have
   * one; cards the learner adds fall back to device speech synthesis.
   */
  audioId?: string;

  hebrew: LanguageSide;
  arabic: ArabicHalf;

  tags?: string[];

  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type Deck = {
  id: string;
  categoryId: string;
  name: string;
  /**
   * Position within the category. Decks unlock in this order, so it decides
   * which one a learner may open next. Absent on decks written by a build that
   * predates ordering; `sortDecks` falls back to creation time.
   */
  order?: number;
  /**
   * Limits a deck to one or more study languages regardless of the global
   * language preference. Used by Basics language stages: a learner with "both"
   * enabled still studies Directions in Hebrew first, then Arabic.
   */
  studyLanguages?: Language[];
  /** Opens directly into shuffled full-deck mastery rounds, with no intro ladder. */
  masteryOnly?: boolean;
  /**
   * Deal each mastery round as this many cards drawn from the deck at random,
   * rather than one shuffled pass over all of it — and a different draw every
   * round, so no round can be predicted from the last. Set on cumulative test
   * decks whose pool is far larger than a sitting; absent everywhere else,
   * which keeps the round the whole deck, exactly as before the field existed.
   */
  roundSize?: number;
  perfectRunsRequired: number;
  promptDirections: PromptDirection[];
  createdAt: string;
  updatedAt: string;
};

export type LanguageProgress = {
  correct: number;
  incorrect: number;
  currentStreak: number;
  longestStreak: number;
  lastReviewedAt?: string;
};

export type CardProgress = {
  cardId: string;
  hebrew: LanguageProgress;
  arabic: LanguageProgress;
  bothCorrectCount: number;
  consecutiveBothCorrect: number;
  masteryScore: number;
  nextReviewAt?: string;
  /**
   * When this row last changed. Only sync reads it, to decide which device's
   * version of a score wins. Optional because rows written before sync existed
   * have none; those count as the oldest possible, so a later edit on either
   * device beats them.
   */
  updatedAt?: string;
};

export type DeckProgress = {
  deckId: string;
  perfectRunsCompleted: number;
  hardModeFailures: number;
  normalModeCompletedAt?: string;
  hardModePassedAt?: string;
  lastStudiedAt?: string;
  /**
   * When the deck's words were last put back into their right order from
   * memory, per language.
   *
   * Kept per language because it is genuinely two pieces of knowledge:
   * counting to ten in Hebrew says nothing about counting to ten in Arabic, and
   * one stamp for both would let a learner claim the deck on half the work.
   * Separate from `perfectRunsCompleted` for the same reason — being asked
   * "what is six?" ten times over never once asks what comes after six.
   */
  orderRecallPassedAt?: Partial<Record<Language, string>>;
  /** See `CardProgress.updatedAt`. */
  updatedAt?: string;
};

export type SessionAnswer = {
  cardId: string;
  hebrew: boolean;
  arabic: boolean;
  at: string;
};

/**
 * Where a deck's run has got to.
 *
 * A deck is not ten words handed over at once. It is met three at a time and
 * grown: `introducing` reads the new words, `testing` asks for the whole active
 * set back, and the two alternate until that set is the deck. Only then does
 * `fullDeckMastery` begin, and only repeated flawless rounds of it reach
 * `completed`.
 *
 * Stored rather than inferred. Nothing about the phase can be read off the
 * screen or recomputed from a score, so it travels on the session row and
 * survives a reload, a closed tab, and a walk to another category.
 */
export type StudyPhase =
  | 'introducing'
  | 'testing'
  | 'fullDeckMastery'
  | 'completed'
  /**
   * The ordering interlude, sat part-way through the flawless rounds. Not a
   * rung of the ladder and not scored: the deck pauses while the learner puts
   * it back in order, first in Hebrew and then in Arabic, and the rounds pick
   * up exactly where they left off.
   */
  | 'ordering';

export type StudySession = {
  id: string;
  deckId: string;
  /** Language slice this run is testing, when a deck overrides the global setting. */
  studyLanguages?: Language[];

  /**
   * A one-card drill on a weak word rather than a run through the deck. It is
   * kept out of the "Continue" panel and out of every resume query, and it
   * never stamps the deck as completed — only the card's own progress moves.
   *
   * A drill has no ladder: there is nothing to introduce and nothing to grow
   * to, so it opens straight in `testing` and one correct answer ends it.
   */
  drill?: boolean;

  /**
   * Whether this deck runs in an order worth being asked for — the numbers, and
   * nothing else. It decides one thing only: whether the ordering interlude
   * happens part-way through the flawless rounds. A deck of greetings has no
   * order to recall, so it never sees it.
   *
   * Written onto the session at the start rather than looked up each time, so a
   * run in progress cannot change shape because a category was renamed halfway
   * through it.
   */
  sequenced?: boolean;

  /**
   * The interlude has been sat — both languages, which are two columns on one
   * screen. Once per run through a deck.
   */
  orderingDone?: boolean;

  mode: StudyMode;
  promptDirection: PromptDirection;
  answerMode: AnswerMode;

  phase: StudyPhase;

  /**
   * The whole deck in the order it is meant to be met, which is the order the
   * ladder deals from — cards 1-2 first, then card 3, then card 4, and so on.
   * Fixed for the life of the session, so a card added to the deck mid-run
   * cannot quietly change which words the stage in progress is about.
   */
  deckCardIds: string[];

  /** How many of `deckCardIds` are in play: 2, then 3, then 4, up to the deck. */
  activeCardCount: number;

  /** `deckCardIds.slice(0, activeCardCount)` — the set being recalled. */
  activeCardIds: string[];

  /** Every card whose back has been read, across all stages. A tally, not a score. */
  introducedCardIds: string[];

  /** The cards this `introducing` phase is showing. Empty in every other phase. */
  introduceCardIds: string[];
  introduceIndex: number;
  introduceFlipped: boolean;

  currentCardId?: string;

  /**
   * The card just asked. Read only by the picker, to keep one word from being
   * put twice running where anything else could be asked instead.
   */
  lastAskedCardId?: string;

  /**
   * Cards recalled correctly since this stage — or this mastery round — began,
   * each at most once. A card missed afterwards leaves again: a stage is
   * cleared by holding the whole set at once, not by having once been right
   * about each of them separately.
   */
  stageCorrect: string[];

  /**
   * Cards missed at least once in the stage or round in progress. Kept after
   * they are put right, because that is the point: a word that has slipped is
   * weighted to come back sooner than one that never did.
   */
  stageIncorrect: string[];

  /**
   * Clean passes over the active set banked at this rung, out of the two that
   * buy the next word. Any miss puts it back to none, and every change of stage
   * starts it again. Unused once the deck itself is the active set: the last
   * rung hands over to the mastery rounds, which do their own counting.
   *
   * Absent on rows written before the one-card ladder, which is read as none.
   */
  stagePerfectRounds: number;

  /** False the moment a card is missed in the pass being worked. */
  stagePerfect: boolean;

  /**
   * How many cards each mastery round deals, where the deck caps it. Copied
   * from `Deck.roundSize` at the start for the same reason `sequenced` is:
   * a run in progress must not change shape because the deck was edited
   * halfway through it. Absent means every round is the whole active set.
   */
  roundSize?: number;

  /** The shuffled full-deck pass being worked through. `fullDeckMastery` only. */
  roundQueue: string[];
  roundIndex: number;
  /** False the moment a card is missed. A round only counts while this holds. */
  roundPerfect: boolean;
  /** 1-based, and it counts every round, perfect or not. */
  currentRound: number;

  /** Flawless full-deck rounds banked. Mirrored onto `DeckProgress`. */
  perfectRounds: number;
  perfectRunsRequired: number;

  deckMastered: boolean;

  answers: SessionAnswer[];

  startedAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type LanguageAnswerResult = {
  correct: boolean;
  submitted: string;
  expected: string[];
};

export type AnswerResult = {
  hebrew: LanguageAnswerResult;
  arabic: LanguageAnswerResult;
  fullyCorrect: boolean;
};

export type MasteryStatus =
  | 'new'
  | 'mastered'
  | 'strong'
  | 'rusty'
  | 'needs-review'
  | 'forgotten';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * One language's Free Conversation record. Counts, never percentages: the
 * level's own progress screen turns these into sentences, and nothing else
 * reads them.
 */
export type FreeTalkLangStats = {
  /** Conversations carried to a close, in this language. */
  conversations: number;
  /** Of those, ones that needed no English help at all. */
  withoutHelp: number;
  /** Learner turns spoken across all of them. */
  turns: number;
  /** Phrases taught mid-conversation and saved for review. */
  phrasesSaved: number;
};

/**
 * Tell Me About It's record. Counts, never percentages — see `tellMeStats`.
 */
export type TellMeStats = {
  /** Stories put together out of four answers, start to finish. */
  builds: number;
  /** Short stories listened through with every question answered. */
  stories: number;
};

/**
 * Opinions & Reasons' record. Counts, never percentages — and here that is not
 * only a convention: neither exercise has a right answer to score. See
 * `opinionStats`.
 */
export type OpinionStats = {
  /** Opinions put together out of three answers, start to finish. */
  builds: number;
  /** Positions taken on a statement or a choice, with a reason given. */
  stands: number;
};

/**
 * How much help one listening item needed before it was understood.
 *
 * Ordered best to worst, and that order is the whole point of the level: the
 * claim Native Listening makes is not "she can read the transcript", it is "she
 * understood it without one". A learner who recognises every line the moment it
 * is written down has learned nothing this level set out to teach, so the record
 * has to keep *how* she got there and not merely that she got there.
 *
 * `wrong` is an answer that was wrong on the first try, whatever help was open
 * at the time. It is the floor rather than a sixth kind of help.
 */
export type ListeningOutcome = 'first' | 'replay' | 'slow' | 'transcript' | 'wrong';

/**
 * Native Listening's record.
 *
 * Not a percentage, and not a `DeckProgress`. Nothing in that level is a deck —
 * there is no line to master, only speech to understand — so there is no
 * progress row for any of this to live on, and it rides the settings row exactly
 * as `situationRehearsals` and `freeTalkStats` do.
 *
 * Kept per language, because the spec asks for the two ears to be trained
 * independently: understanding spoken Hebrew says nothing whatever about
 * understanding spoken Arabic, and one number covering both would let progress
 * in one hide a standstill in the other.
 */
export type ListeningStats = {
  /**
   * The best each item has ever managed, keyed `<itemId>:<language>`.
   *
   * Best rather than latest: needing a slow replay today does not un-hear the
   * day she caught it first time. Keys naming an item this build no longer
   * carries are ignored on read, so content can be re-cut without touching the
   * record.
   */
  heard?: Record<string, ListeningOutcome>;
  /**
   * Every attempt ever made, counted by how it went — including the ones that
   * did not improve on a previous best.
   *
   * This is the honest half. `heard` is what she can do; this is what actually
   * happens when she listens, which is the number that tells her whether
   * first-listen comprehension is becoming normal.
   */
  attempts?: Partial<Record<ListeningOutcome, number>>;
};

export type Settings = {
  id: 'settings';

  /**
   * When any preference last changed, for sync's last-write-wins comparison.
   * The row travels as one unit, so a single toggle moves the stamp. Voice
   * choices are stripped before it leaves the device — see `DEVICE_LOCAL_SETTINGS`.
   */
  updatedAt?: string;

  /**
   * Which build of the official starter set this device has been topped up
   * to. Absent on installs made before starter content was versioned.
   */
  starterContentVersion?: number;

  /*
   * Identity, then practice selection. Three lifetimes, three homes: who she
   * is, what she has chosen to drill, and — on `PracticeContext`, never here —
   * what a single prompt is asking for. Storing any of them in another is how
   * a drill ends up rewriting a person.
   *
   * Nothing derived is stored alongside them. The perspective list every
   * consumer reads comes from `effectivePerspectives`, computed on load, so a
   * stale mirror of an identity cannot exist on disk.
   */

  /**
   * The languages she is learning. Asked before identity and answered before
   * it, because it decides *which* languages a card is resolved for and
   * identity only decides which form each of those takes.
   *
   * Absent on rows written before the choice existed, which read as `both` —
   * the behaviour those installs already had.
   */
  studyLanguages: LanguageChoice;

  /** Who the learner is. Female is the default this app is written for. */
  learnerGender: PersonGender;

  /**
   * Who she is practising speaking to. Never empty — an empty set would leave
   * gendered cards with nothing to show and nothing to grade — and normalised
   * to ♂-first order, matching `SPEECH_PERSPECTIVES`.
   */
  listenerGenders: PersonGender[];

  /**
   * Whether she has actually answered the two questions above, as opposed to
   * having been handed the defaults. Lets Settings ask once rather than assert
   * a guess back at her. It never changes what is rendered or graded.
   */
  identityConfirmed?: boolean;

  /**
   * Perspectives to render and grade *instead of* the ones her identity
   * implies. Written by exactly two things: the advanced disclosure in
   * Settings, and the migration off the legacy `speechPerspectives` list where
   * that list cannot be read as an identity. Clearing it returns her to
   * herself; it is never written back into identity.
   *
   * Not written by a study session. A prompt's current framing lives on the
   * session, so both writers here are deliberate persistent choices and an
   * override found on disk always means one of them.
   *
   * Changing it, like changing identity, is purely a display and grading
   * filter. No progress row is keyed by perspective, so a learner can widen or
   * narrow at any point without losing a single score.
   */
  practicePerspectiveOverride?: SpeechPerspective[];

  /**
   * The decks the Review tab reads as one pile, ticked while browsing there.
   *
   * Empty means "the first unlocked deck" rather than "nothing": the pile must
   * always open on something, so a learner who has never ticked — or who has
   * just unticked the last deck — still gets the deck she is meant to start
   * with. Ids of decks that no longer exist, or that are still locked, are
   * ignored on read, so neither deleting a deck nor a deck closing behind her
   * can empty it.
   *
   * Named for the tab's former title. The stored key is deliberately left
   * alone: renaming it would need a migration on every install to buy nothing
   * a comment cannot say.
   */
  memoriseDeckIds: string[];

  /**
   * The lots the learner has chosen to open, by the id of the deck she opened.
   *
   * Outside Basics the course runs one unfinished lot at a time, but never
   * insists on which: she picks, and the pick is stored because it has to
   * survive her closing the app before she has answered a single card. A deck
   * she has already worked counts as open whether or not its id is here, so an
   * install made before this existed is never shut out of work in progress.
   *
   * Ids of decks that no longer exist are ignored on read; removing one closes
   * the lot again and hands the choice back, without touching a single score.
   */
  openedDeckIds?: string[];

  /** The same choice one level up: which categories she has opened. */
  openedCategoryIds?: string[];

  /**
   * Where finished categories and lots sit in their lists — left where the
   * course put them, gathered at the top, or pushed to the bottom.
   */
  finishedSort?: FinishedSort;

  /**
   * When each Real Situations scenario was first rehearsed to the end, keyed
   * by the scenario's name lowercased — the same name-keyed identity the area
   * itself runs on, so it survives a reinstall regenerating category ids.
   *
   * A separate claim from the decks' mastery on purpose: mastering the lines
   * says she can produce each reply, getting through the rehearsal says she
   * can steer the whole interaction. The stamp rides the settings row like
   * `pairedLetterRuns` does, because a rehearsal is not a deck and has no
   * progress row of its own to live on.
   */
  situationRehearsals?: Record<string, string>;

  /**
   * What Free Conversation has amounted to so far, per language.
   *
   * Deliberately not a mastery score. A free conversation has no single
   * expected answer, so nothing here is an accuracy percentage — it is a
   * record of conversations actually held, and of the help they did or did
   * not need. Rides the settings row like `situationRehearsals` does, because
   * a conversation is not a deck and has no progress row of its own.
   */
  freeTalkStats?: Partial<Record<Language, FreeTalkLangStats>>;

  /**
   * What Tell Me About It's two unscored exercises have amounted to.
   *
   * Its lessons are ordinary decks and keep their own progress rows; these are
   * the two things that are not decks — a story built out of four answers, and
   * a short story listened through and answered about. Neither has a single
   * right form to grade, so neither is a percentage. One record for the level
   * rather than one per language: a build is put together in whichever
   * language is on, and counting it twice would say she had done it twice.
   */
  tellMeStats?: TellMeStats;

  /**
   * The same, for Opinions & Reasons' two unscored exercises.
   *
   * Its lessons are ordinary decks and keep their own progress rows; these are
   * the two things that are not decks — an opinion built out of three answers,
   * and a position taken on something with a reason behind it. Neither is a
   * percentage, because neither has a correct answer to be a percentage *of*:
   * the level's whole claim is that an opinion cannot be wrong. One record for
   * the level rather than one per language, as Tell Me About It's is.
   */
  opinionStats?: OpinionStats;

  /**
   * What Native Listening has heard, per language.
   *
   * The one level whose whole record lives here rather than beside it. Every
   * level below installs decks and keeps its progress on the deck rows, and
   * only its unscored extras ride this row; Native Listening installs nothing
   * at all, because it has no line to master — so this *is* its progress, not
   * an appendix to it. See `ListeningStats`.
   */
  listeningStats?: ListeningStats;

  /**
   * The deck the Review tab was last reading, so the tab reopens on it.
   *
   * Written on opening a deck's read-through and cleared on leaving that
   * screen — which is what makes the memory survive a trip to Practice or
   * Settings but not survive backing out of the deck. A stale or since-locked
   * id is ignored on read and the tab falls back to its browse, so this can
   * never strand a learner on a deck that is no longer there.
   */
  memoriseLastDeckId?: string;

  // Study
  defaultMode: StudyMode;
  defaultAnswerMode: AnswerMode;
  defaultDeckSize: number;
  defaultPerfectRunsRequired: number;
  /*
   * No shuffle preference: the ladder draws every question at random, and
   * every mastery round reshuffles. Memorise keeps its own per-pass toggle,
   * which is the only place reading order is still the learner's to choose.
   */
  showTransliteration: boolean;
  showHints: boolean;
  requireTyping: boolean;
  ignoreDiacritics: boolean;
  acceptAlternateAnswers: boolean;
  lenientArabicLetters: boolean;
  enableMasteryDecay: boolean;
  brutalResetOnHardFailure: boolean;

  // Audio
  hebrewVoiceUri?: string;
  arabicVoiceUri?: string;
  speechRate: number;
  autoPlayHebrew: boolean;
  autoPlayArabic: boolean;
  repeatCount: number;
  soundEffects: boolean;
  haptics: boolean;
  useCardPronunciationText: boolean;

  // Alphabet modules
  /** Print, handwritten, or both side by side. Both is the default where it fits. */
  alphabetDisplay: AlphabetDisplay;
  showAlphabetTransliteration: boolean;
  /** Niqqud, dagesh and harakat on the letter cards. */
  showPronunciationMarks: boolean;
  showStrokeOrder: boolean;
  autoplayLetterPronunciation: boolean;
  /**
   * Flawless runs through each deck of the paired Both alphabet, keyed by deck
   * id. This is the one piece of alphabet standing that is not a per-letter
   * score, because the Both ladder gates on runs rather than on mastery, and a
   * run has nowhere else to be recorded — letter decks are deliberately absent
   * from the Dexie schema. It rides the settings row so it syncs and restores
   * with everything else.
   */
  pairedLetterRuns: Record<string, number>;

  // Appearance
  theme: ThemeMode;
  highContrast: boolean;
  reducedMotion: boolean;
  fontScale: number;
  cardAnimationIntensity: number;
};

export type BackupFile = {
  format: 'levantine-flashcards-backup';
  version: 1;
  exportedAt: string;
  categories: Category[];
  decks: Deck[];
  cards: Flashcard[];
  cardProgress: CardProgress[];
  deckProgress: DeckProgress[];
  sessions: StudySession[];
  settings?: Settings;
};

export type Snapshot = {
  id?: number;
  createdAt: string;
  label: string;
  payload: BackupFile;
};

/**
 * A row this device deleted, kept so the deletion can be told to the other
 * device. `collection` matches a `SyncCollection`; `key` is that collection's
 * primary key as a string.
 */
export type Tombstone = {
  collection: string;
  key: string;
  deletedAt: string;
};

/** One row, id `'sync'`. Absent until the learner first opens the sync screen. */
export type SyncState = {
  id: 'sync';
  /**
   * Identifies this install to the server, so it is not sent back its own
   * writes. Generated once; deliberately not derived from anything about the
   * hardware or the person.
   */
  deviceId: string;
  /** Shown in the server log and on the other device, e.g. "Laptop". */
  deviceName?: string;
  /** Highest server seq already applied here. 0 means nothing synced yet. */
  seq: number;
  lastSyncedAt?: string;
  lastError?: string;
};
