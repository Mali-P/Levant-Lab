export type SpeechLanguage = 'hebrew' | 'arabic';

export type SpeechVoice = {
  id: string;
  name: string;
  lang: string;
  localService: boolean;
};

export type SpeechOptions = {
  language: SpeechLanguage;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  /** Play the utterance this many times back to back. */
  repeat?: number;
};

/**
 * Deliberately narrow so the app can move from browser synthesis to Azure or
 * pre-recorded audio without any screen changing.
 */
export interface SpeechService {
  readonly id: string;
  isAvailable(): boolean;
  getAvailableVoices(): Promise<SpeechVoice[]>;
  speak(text: string, options: SpeechOptions): Promise<void>;
  stop(): void;
}

/**
 * Levantine locales first. Modern Standard Arabic voices are a fallback, never
 * a substitute for the stored Levantine wording.
 */
export const ARABIC_LOCALE_PREFERENCE = ['ar-PS', 'ar-JO', 'ar-LB', 'ar-SY'];
export const HEBREW_LOCALE_PREFERENCE = ['he-IL', 'he'];

export function localePreference(language: SpeechLanguage): string[] {
  return language === 'hebrew'
    ? HEBREW_LOCALE_PREFERENCE
    : ARABIC_LOCALE_PREFERENCE;
}

/** Ranks voices so the best Levantine match sorts first. */
export function rankVoices(
  voices: SpeechVoice[],
  language: SpeechLanguage,
): SpeechVoice[] {
  const prefix = language === 'hebrew' ? 'he' : 'ar';
  const preferred = localePreference(language);

  return voices
    .filter((v) => v.lang.toLowerCase().startsWith(prefix))
    .sort((a, b) => {
      const rank = (v: SpeechVoice) => {
        const idx = preferred.findIndex(
          (p) => v.lang.toLowerCase() === p.toLowerCase(),
        );
        return idx === -1 ? preferred.length : idx;
      };
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      // Offline voices beat cloud voices: the app has to work with no network.
      if (a.localService !== b.localService) return a.localService ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}
