import type { CardProgress, DeckProgress, Settings } from '../../types';

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',

  defaultMode: 'normal',
  defaultAnswerMode: 'self',
  defaultDeckSize: 10,
  defaultPerfectRunsRequired: 10,
  shuffleCards: true,
  shuffleAfterFailure: true,
  showTransliteration: true,
  showHints: true,
  requireTyping: false,
  ignoreDiacritics: true,
  acceptAlternateAnswers: true,
  lenientArabicLetters: true,
  enableMasteryDecay: true,
  autoStartRetryPile: true,
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
