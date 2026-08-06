import {
  localePreference,
  rankVoices,
  type SpeechOptions,
  type SpeechService,
  type SpeechVoice,
} from './types';

function toVoice(v: SpeechSynthesisVoice): SpeechVoice {
  return {
    id: v.voiceURI,
    name: v.name,
    lang: v.lang,
    localService: v.localService,
  };
}

/**
 * Device / browser speech synthesis. Voices load asynchronously on most
 * engines, so the first call waits for the voiceschanged event.
 */
export class WebSpeechService implements SpeechService {
  readonly id = 'web-speech';

  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  async getAvailableVoices(): Promise<SpeechVoice[]> {
    if (!this.isAvailable()) return [];
    const synth = window.speechSynthesis;

    const existing = synth.getVoices();
    if (existing.length > 0) return existing.map(toVoice);

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        synth.removeEventListener('voiceschanged', finish);
        resolve(synth.getVoices().map(toVoice));
      };
      synth.addEventListener('voiceschanged', finish);
      // Some engines never fire the event; do not hang the settings screen.
      window.setTimeout(finish, 1500);
    });
  }

  async speak(text: string, options: SpeechOptions): Promise<void> {
    if (!this.isAvailable() || !text.trim()) return;

    const voices = window.speechSynthesis.getVoices();
    let chosen = options.voiceId
      ? voices.find((v) => v.voiceURI === options.voiceId)
      : undefined;

    if (!chosen) {
      const ranked = rankVoices(voices.map(toVoice), options.language);
      chosen = ranked[0]
        ? voices.find((v) => v.voiceURI === ranked[0].id)
        : undefined;
    }

    const repeat = Math.max(1, options.repeat ?? 1);
    for (let i = 0; i < repeat; i++) {
      await this.speakOnce(text, options, chosen);
    }
  }

  private speakOnce(
    text: string,
    options: SpeechOptions,
    voice: SpeechSynthesisVoice | undefined,
  ): Promise<void> {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      if (voice) utterance.voice = voice;
      // Falls back to a sensible locale tag when no matching voice exists.
      utterance.lang = voice?.lang ?? localePreference(options.language)[0];
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    if (!this.isAvailable()) return;
    window.speechSynthesis.cancel();
  }
}
