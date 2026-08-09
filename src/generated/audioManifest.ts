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

export const AUDIO_CLIPS: Record<string, AudioClipRecord> = {
  "ar/counting-and-numbers__one-to-ten__eight_neutral": {
    "path": "assets/audio/ar/counting-and-numbers__one-to-ten__eight_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "eight",
    "text": "تمانية",
    "spoken": "تْمانْيِة",
    "transliteration": "tmānye",
    "sourceHash": "5fcf22f810a60de2",
    "bytes": 8972,
    "generatedAt": "2026-08-08T21:59:04.445Z"
  },
  "ar/counting-and-numbers__one-to-ten__four_neutral": {
    "path": "assets/audio/ar/counting-and-numbers__one-to-ten__four_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "four",
    "text": "أربعة",
    "spoken": "أَرْبَعَة",
    "transliteration": "arbaʿa",
    "sourceHash": "586b4637d70b0f62",
    "bytes": 10988,
    "generatedAt": "2026-08-08T21:41:03.937Z"
  },
  "ar/counting-and-numbers__one-to-ten__one_neutral": {
    "path": "assets/audio/ar/counting-and-numbers__one-to-ten__one_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "one",
    "text": "واحد",
    "spoken": "واحَد",
    "transliteration": "wāḥad",
    "sourceHash": "084d7cb47bf4bf05",
    "bytes": 11852,
    "generatedAt": "2026-08-08T21:33:24.743Z"
  },
  "ar/counting-and-numbers__one-to-ten__three_neutral": {
    "path": "assets/audio/ar/counting-and-numbers__one-to-ten__three_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "three",
    "text": "تلاتة",
    "spoken": "تَلاتِة",
    "transliteration": "talāte",
    "sourceHash": "2bdb14837f90adca",
    "bytes": 12716,
    "generatedAt": "2026-08-08T21:38:04.685Z"
  },
  "ar/counting-and-numbers__one-to-ten__two_neutral": {
    "path": "assets/audio/ar/counting-and-numbers__one-to-ten__two_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "two",
    "text": "تنين",
    "spoken": "تْنِين",
    "transliteration": "tnēn",
    "sourceHash": "731a7aa7af0caafe",
    "bytes": 10700,
    "generatedAt": "2026-08-08T21:33:26.439Z"
  }
};
