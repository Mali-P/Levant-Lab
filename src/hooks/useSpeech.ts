import { useCallback } from 'react';
import type { Flashcard, Settings } from '../types';
import { speechService, type SpeechLanguage } from '../services/speech';

/** Chooses the text to speak: card-specific pronunciation wins when present. */
export function spokenText(
  card: Flashcard,
  language: SpeechLanguage,
  useCardPronunciation: boolean,
): string {
  const side = language === 'hebrew' ? card.hebrew : card.arabic;
  if (useCardPronunciation && side.pronunciationText) return side.pronunciationText;
  return side.script;
}

export function useSpeech(settings: Settings) {
  const speak = useCallback(
    async (card: Flashcard, language: SpeechLanguage) => {
      const service = speechService();
      if (!service.isAvailable()) return;
      const text = spokenText(card, language, settings.useCardPronunciationText);
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
