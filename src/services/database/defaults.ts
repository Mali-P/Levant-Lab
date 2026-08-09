import type { CardProgress, DeckProgress, Settings } from '../../types';

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',

  /**
   * Both, which is the app this document describes: a card is not learned
   * until it is learned twice. One language is a deliberate narrowing, and
   * nobody should be narrowed by default.
   */
  studyLanguages: 'both',

  /**
   * A woman speaking to both, which derives ♀→♂ · ♀→♀ with ♀→♂ leading.
   *
   * This app is written for a woman, so the forms she will actually say are
   * the ones it teaches; the male-speaker variants stay available but unused.
   * Deliberately not all four — showing every card four ways would put her own
   * wording back onto a list of alternatives, which is the habit this setting
   * exists to break.
   *
   * `identityConfirmed: false` marks this as the app's assumption rather than
   * her answer, so Settings can ask the two questions once instead of
   * presenting a guess as a decision she already made. An install predating
   * these fields is migrated on load by `identityFromLegacy`, keeping every
   * score and every perspective it was studying.
   */
  learnerGender: 'female',
  listenerGenders: ['male', 'female'],
  identityConfirmed: false,

  // Nothing ticked yet, which `memoriseDecks` reads as the first unlocked deck.
  memoriseDeckIds: [],

  defaultMode: 'normal',
  defaultAnswerMode: 'self',
  defaultDeckSize: 10,
  defaultPerfectRunsRequired: 10,
  showTransliteration: true,
  showHints: true,
  requireTyping: false,
  ignoreDiacritics: true,
  acceptAlternateAnswers: true,
  lenientArabicLetters: true,
  enableMasteryDecay: true,
  brutalResetOnHardFailure: false,

  speechRate: 0.9,
  autoPlayHebrew: false,
  autoPlayArabic: false,
  repeatCount: 1,
  soundEffects: true,
  haptics: true,
  useCardPronunciationText: true,

  // Both forms at once is what the learner should meet first; the letter card
  // falls back to whichever form actually exists.
  alphabetDisplay: 'both',
  showAlphabetTransliteration: true,
  showPronunciationMarks: true,
  showStrokeOrder: true,
  autoplayLetterPronunciation: false,
  // Nothing run yet, which the ladder reads as "only the first deck is open".
  pairedLetterRuns: {},

  theme: 'system',
  highContrast: false,
  reducedMotion: false,
  fontScale: 1,
  cardAnimationIntensity: 1,
};

export function emptyCardProgress(cardId: string): CardProgress {
  const side = { correct: 0, incorrect: 0, currentStreak: 0, longestStreak: 0 };
  return {
    cardId,
    hebrew: { ...side },
    arabic: { ...side },
    bothCorrectCount: 0,
    consecutiveBothCorrect: 0,
    masteryScore: 0,
  };
}

export function emptyDeckProgress(deckId: string): DeckProgress {
  return { deckId, perfectRunsCompleted: 0, hardModeFailures: 0 };
}
