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
 */
export type GenderedForms = {
  feminine: GenderedForm;
  masculine: GenderedForm;
};

export type LanguageSide = {
  /** The headline form. Mirrors `forms.feminine` when a gendered pair is set. */
  script: string;
  transliteration?: string;
  /** Sent to TTS instead of `script` when present. Lets niqqud / respelling drive audio. */
  pronunciationText?: string;
  forms?: GenderedForms;
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

export type StudySession = {
  id: string;
  deckId: string;

  mode: StudyMode;
  promptDirection: PromptDirection;
  answerMode: AnswerMode;

  activeCardIds: string[];
  retryCardIds: string[];
  completedCardIds: string[];

  currentCardId?: string;
  currentIndex: number;

  currentRunCorrect: number;
  currentRunFailed: boolean;

  perfectRunsCompleted: number;
  perfectRunsRequired: number;

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

  // Study
  defaultMode: StudyMode;
  defaultAnswerMode: AnswerMode;
  defaultDeckSize: number;
  defaultPerfectRunsRequired: number;
  shuffleCards: boolean;
  shuffleAfterFailure: boolean;
  showTransliteration: boolean;
  showHints: boolean;
  requireTyping: boolean;
  ignoreDiacritics: boolean;
  acceptAlternateAnswers: boolean;
  lenientArabicLetters: boolean;
  enableMasteryDecay: boolean;
  autoStartRetryPile: boolean;
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
