/**
 * GENERATED FILE -- rewritten by `npm run generate-alphabet-audio`.
 * Do not edit by hand.
 *
 * Committed so the app builds and validates with no Google or Azure
 * credentials. An empty map means no alphabet clips have been generated yet;
 * every letter then falls back to device speech, which is why the app still
 * runs offline either way.
 */

export type AlphabetAudioRecord = {
  /** Path under the bundled assets, e.g. `assets/audio/alphabet/he/letter_alef_name.mp3`. */
  path: string;
  script: 'hebrew' | 'arabic';
  entryKind: 'letter' | 'vowel' | 'char';
  entryId: string;
  clipKind: 'name' | 'sound' | 'example';
  provider: 'google' | 'azure';
  /** Full provider voice name, e.g. `ar-JO-SanaNeural`. */
  voice: string;
  /** What was actually sent to the provider, vowel marks included. */
  spoken: string;
  /** How a reviewer recognises the clip, e.g. `Alef - name`. */
  label: string;
  /** Fingerprint of voice + spoken text. A change here forces a regenerate. */
  sourceHash: string;
  bytes: number;
  /** ISO-8601, e.g. `2026-08-06T14:10:20.998Z`. */
  generatedAt: string;
};

export const ALPHABET_AUDIO_MANIFEST_VERSION = 1;

export const ALPHABET_CLIPS: Record<string, AlphabetAudioRecord> = {};
