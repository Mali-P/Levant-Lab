import type { AlphabetDisplay } from './alphabet';

export type Language = 'hebrew' | 'arabic';

export type StudyMode = 'normal' | 'hard' | 'brutal';

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

export type GenderedForm = {
  script: string;
  transliteration?: string;
  /**
   * Sent to the speech generator instead of `script`. Holds niqqud or a
   * respelling that fixes a mispronunciation; the learner never sees it.
   */
  pronunciationText?: string;
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
  forms?: GenderedForms;
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

export type Flashcard = {
  id: string;
  categoryId: string;
  deckId: string;

  english: string;
  imageUrl?: string;
  icon?: string;

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
  | 'completed';

export type StudySession = {
  id: string;
  deckId: string;

  /**
   * A one-card drill on a weak word rather than a run through the deck. It is
   * kept out of the "Continue" panel and out of every resume query, and it
   * never stamps the deck as completed — only the card's own progress moves.
   *
   * A drill has no ladder: there is nothing to introduce and nothing to grow
   * to, so it opens straight in `testing` and one correct answer ends it.
   */
  drill?: boolean;

  mode: StudyMode;
  promptDirection: PromptDirection;
  answerMode: AnswerMode;

  phase: StudyPhase;

  /**
   * The whole deck in the order it is meant to be met, which is the order the
   * ladder deals from — cards 1-3 first, then 4-5, and so on. Fixed for the
   * life of the session, so a card added to the deck mid-run cannot quietly
   * change which words the stage in progress is about.
   */
  deckCardIds: string[];

  /** How many of `deckCardIds` are in play: 3, then 5, then 7, then the deck. */
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
   * The decks the Memorise tab reads from, ticked on each deck's own screen.
   *
   * Empty means "the first unlocked deck" rather than "nothing": Memorise is
   * the middle tab and must always open on something, so a learner who has
   * never ticked — or who has just unticked the last deck — still gets the deck
   * she is meant to start with. Ids of decks that no longer exist, or that are
   * still locked, are ignored on read, so neither deleting a deck nor a deck
   * closing behind her can empty the tab.
   */
  memoriseDeckIds: string[];

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
