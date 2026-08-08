import { useCallback } from 'react';
import type { Flashcard, Settings } from '../types';
import { speechService, type SpeechLanguage } from '../services/speech';
import { resolveSpokenPlan } from '../services/audio/ttsPlan';

/**
 * The text to speak for one side of a card.
 *
 * Not `script`. The script is what the learner reads, and undiacritized
 * Levantine leaves the vowels open — a generic Arabic voice closes them the
 * Modern Standard way, which is the reading the course is not teaching. So the
 * card's own override comes first, then the Palestinian dictionary, and the
 * spelling only when neither knows the word.
 *
 * `useCardPronunciation` reaches unlocked overrides only, which is what it was
 * ever for: silencing the learner's own respellings, not overruling the course.
 */
export function spokenText(
  card: Flashcard,
  language: SpeechLanguage,
  useCardPronunciation: boolean,
): string {
  const side = language === 'hebrew' ? card.hebrew : card.arabic;
  return resolveSpokenPlan(side, {
    language,
    allowCardText: useCardPronunciation,
  }).text;
}

export function useSpeech(settings: Settings) {
  const speak = useCallback(
    async (card: Flashcard, language: SpeechLanguage) => {
      const service = speechService();
      if (!service.isAvailable()) return;
      const text = spokenText(card, language, settings.useCardPronunciationText);
      if (!text) return;
      await service.speak(text, {
        language,
        voiceId:
          language === 'hebrew' ? settings.hebrewVoiceUri : settings.arabicVoiceUri,
        rate: settings.speechRate,
        repeat: settings.repeatCount,
      });
    },
    [
      settings.useCardPronunciationText,
      settings.hebrewVoiceUri,
      settings.arabicVoiceUri,
      settings.speechRate,
      settings.repeatCount,
    ],
  );

  const stop = useCallback(() => speechService().stop(), []);

  return { speak, stop };
}
