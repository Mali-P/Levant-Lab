/**
 * GENERATED FILE — rewritten by `npm run generate-audio`. Do not edit by hand.
 *
 * It is committed so the app builds and validates without anyone needing
 * Google or Gemini credentials. An empty map simply means no clips have been
 * generated yet; every speaker button then falls back to device speech.
 */

/** `azure` appears only on clips recorded before Arabic moved to Gemini. */
export type AudioProvider = 'google' | 'azure' | 'gemini';

export type AudioClipRecord = {
  /** Path under the bundled assets, e.g. `assets/audio/he/x_feminine.mp3`. */
  path: string;
  language: 'hebrew' | 'arabic';
  /**
   * Which form was recorded: `feminine` / `masculine` for a grammatical pair,
   * `neutral` for a word said one way, or the joined perspective keys of a
   * speaker/listener variant — `f2m`, or `f2m+m2m` where two perspectives
   * share one wording and therefore one clip. See `FormName` in `audio/paths`.
   */
  form: string;
  provider: AudioProvider;
  /**
   * How it was said. A provider voice name for Google and Azure, e.g.
   * `he-IL-Wavenet-A`; for Gemini, model, voice and a digest of the dialect
   * instruction — `gemini-2.5-flash-preview-tts/Kore/4f1c8a90` — since all
   * three decide the accent.
   */
  voice: string;
  /** English meaning, for the review screen. */
  english: string;
  /** What the learner sees. */
  text: string;
  /** What was actually sent to the provider. */
  spoken: string;
  transliteration?: string;
  /** Fingerprint of voice + spoken text. A change here forces a regenerate. */
  sourceHash: string;
  bytes: number;
  /** ISO-8601, e.g. `2026-08-06T14:10:20.998Z`. */
  generatedAt: string;
};

export const AUDIO_MANIFEST_VERSION = 1;

export const AUDIO_CLIPS: Record<string, AudioClipRecord> = {};
