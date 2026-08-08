import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '../types';
import type { WordForm } from '../utils/wordForms';
import { speechService, type SpeechLanguage } from '../services/speech';
import { clipUrl } from '../services/audio/manifest';
import { resolveTtsPlan } from '../services/audio/ttsPlan';
import {
  nowPlaying,
  playPronunciation,
  stopPronunciation,
  subscribe,
} from '../services/audio/pronunciation';

/**
 * The accessible name of a speaker button.
 *
 * Where forms differ the name has to say *how*, because two adjacent buttons
 * are otherwise indistinguishable to a screen reader:
 *
 *   "Play Hebrew feminine pronunciation"
 *   "Play Arabic — female speaking to male"
 *
 * A word with one form gets the bare name; there is nothing to tell apart.
 */
export function pronunciationLabel(
  language: SpeechLanguage,
  form?: Pick<WordForm, 'gender' | 'label' | 'perspectives'>,
): string {
  const name = language === 'hebrew' ? 'Hebrew' : 'Arabic';
  if (form?.perspectives && form.label) {
    return 'Play ' + name + ' — ' + form.label;
  }
  if (form?.gender) {
    return 'Play ' + name + ' ' + form.gender + ' pronunciation';
  }
  return 'Play ' + name + ' pronunciation';
}

/**
 * Plays one form of one word, saying what the card teaches.
 *
 * The ladder is `resolveTtsPlan`'s, and the reason it is not simply "clip, else
 * speak the script" is that the script does not decide the pronunciation.
 * Undiacritized Levantine admits more than one reading, and a generic Arabic
 * voice picks the Modern Standard one — `مرحبا` as *marḥaban*, `تنين` with a
 * syllable it does not have. So a bundled clip first, then the card's own
 * override, then the Palestinian dictionary, and only then the spelling.
 *
 * A clip is preferred because it is the pronunciation rather than an attempt to
 * produce one, and because it keeps the button working with no network and no
 * provider key. When it will not play — missing asset, decode failure, autoplay
 * block — the fallback is the next tier down, never a jump to the bottom.
 */
export function usePronunciation(settings: Settings) {
  const [playingPath, setPlayingPath] = useState<string | null>(nowPlaying());
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);

  useEffect(() => subscribe(setPlayingPath), []);

  const stop = useCallback(() => {
    stopPronunciation();
    speechService().stop();
    setSpeakingKey(null);
  }, []);

  const play = useCallback(
    async (form: WordForm, language: SpeechLanguage) => {
      // Whatever is sounding stops first, from either source, so repeated taps
      // can never stack two words on top of each other.
      stopPronunciation();
      speechService().stop();
      setSpeakingKey(null);

      const plan = resolveTtsPlan(form, {
        language,
        allowCardText: settings.useCardPronunciationText,
      });

      if (plan.audioPath) {
        const played = await playPronunciation(plan.audioPath, clipUrl(plan.audioPath));
        if (played) return;
      }

      const service = speechService();
      if (!service.isAvailable()) return;

      const { text } = plan.speech;
      if (!text) return;

      const key = language + ':' + form.script;
      setSpeakingKey(key);
      await service.speak(text, {
        language,
        voiceId:
          language === 'hebrew' ? settings.hebrewVoiceUri : settings.arabicVoiceUri,
        rate: settings.speechRate,
        repeat: settings.repeatCount,
      });
      setSpeakingKey((current) => (current === key ? null : current));
    },
    [
      settings.useCardPronunciationText,
      settings.hebrewVoiceUri,
      settings.arabicVoiceUri,
      settings.speechRate,
      settings.repeatCount,
    ],
  );

  const isPlaying = useCallback(
    (form: WordForm, language: SpeechLanguage) =>
      form.audioPath
        ? playingPath === form.audioPath
        : speakingKey === language + ':' + form.script,
    [playingPath, speakingKey],
  );

  return { play, stop, isPlaying };
}
