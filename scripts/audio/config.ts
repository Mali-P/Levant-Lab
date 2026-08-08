import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Reads `.env` into `process.env` without overwriting anything already set,
 * so CI secrets always beat a local file. Deliberately tiny: this only ever
 * parses a developer's own credentials file.
 */
export function loadEnvFile(file = '.env'): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), file), 'utf8');
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

export type GoogleConfig = {
  projectId?: string;
  /** Path to the service account JSON. Never bundled, never committed. */
  credentials?: string;
  languageCode: string;
  voice: string;
};

export type AzureConfig = {
  key?: string;
  region?: string;
  languageCode: string;
  voice: string;
};

export type GeminiConfig = {
  apiKey?: string;
  /** A Gemini TTS model, e.g. `gemini-2.5-flash-preview-tts`. */
  model: string;
  /** A prebuilt Gemini voice name, e.g. `Kore`. Not a locale. */
  voice: string;
  /**
   * Plain-English direction sent ahead of every line. This is what makes a
   * clip Palestinian: Gemini's voices carry no locale of their own, so the
   * accent is asked for rather than picked from a list.
   */
  styleDirection: string;
};

/** Which provider records the Arabic. Hebrew is always Google. */
export type ArabicProvider = 'gemini' | 'azure';

export type AudioConfig = {
  google: GoogleConfig;
  azure: AzureConfig;
  gemini: GeminiConfig;
  /** Reads ARABIC_TTS_PROVIDER; `gemini` unless something asks for Azure. */
  arabicProvider: ArabicProvider;
  /** Where the bundled clips live, relative to the repo root. */
  outputRoot: string;
  sampleRateHz: number;
  /** Integrated loudness target in LUFS, applied to both providers. */
  loudnessLufs: number;
  bitrateKbps: number;
};

/**
 * Israeli Hebrew, female, natural. Swap through GOOGLE_HEBREW_VOICE for a
 * Chirp or Neural2 voice where the project has access to one.
 */
const DEFAULT_HEBREW_VOICE = 'he-IL-Wavenet-A';

/**
 * Jordanian Arabic is the closest dialect Azure offers to Palestinian
 * Levantine. Never replaced by a Modern Standard Arabic voice: the stored
 * wording is colloquial and an MSA voice would read it as something the
 * learner will not hear on the street.
 *
 * Shelved rather than deleted — Arabic goes through Gemini now. Set
 * ARABIC_TTS_PROVIDER=azure to record from here again.
 */
const DEFAULT_ARABIC_VOICE = 'ar-JO-SanaNeural';

/** Gemini's TTS model. The flash model is the cheap one and sounds fine. */
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-preview-tts';

/**
 * A prebuilt Gemini voice. `Kore` is female and even-toned, which is what a
 * vocabulary clip wants; `Aoede`, `Leda` and `Zephyr` are the other female
 * options worth hearing before settling.
 */
const DEFAULT_GEMINI_VOICE = 'Kore';

/**
 * The dialect instruction. Gemini picks its accent from what it is told, so
 * this sentence is doing the same job the `ar-JO` locale did for Azure — and
 * it can name Palestinian outright, which no Azure voice could. It names the
 * pace as well, because an unprompted read drifts theatrical.
 *
 * Editing it re-records every Arabic clip: it is part of the fingerprint.
 */
const DEFAULT_GEMINI_STYLE =
  'Say the following in everyday spoken Palestinian Levantine Arabic, in the ' +
  'accent of a native speaker from Jerusalem, warm and clear at a normal ' +
  'conversational pace. It is colloquial speech, not Modern Standard Arabic. ' +
  'Read only the words themselves, nothing else:';

/** Derives `ar-JO` from `ar-JO-SanaNeural`, so one variable configures both. */
function localeOf(voice: string, fallback: string): string {
  const match = /^([a-z]{2,3}-[A-Z]{2})/.exec(voice);
  return match ? match[1] : fallback;
}

export function loadConfig(): AudioConfig {
  loadEnvFile();

  const hebrewVoice = process.env.GOOGLE_HEBREW_VOICE || DEFAULT_HEBREW_VOICE;
  const arabicVoice = process.env.AZURE_ARABIC_VOICE || DEFAULT_ARABIC_VOICE;

  return {
    google: {
      projectId: process.env.GOOGLE_TTS_PROJECT_ID || undefined,
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
      languageCode: localeOf(hebrewVoice, 'he-IL'),
      voice: hebrewVoice,
    },
    azure: {
      key: process.env.AZURE_SPEECH_KEY || undefined,
      region: process.env.AZURE_SPEECH_REGION || undefined,
      languageCode: localeOf(arabicVoice, 'ar-JO'),
      voice: arabicVoice,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || undefined,
      model: process.env.GEMINI_TTS_MODEL || DEFAULT_GEMINI_MODEL,
      voice: process.env.GEMINI_ARABIC_VOICE || DEFAULT_GEMINI_VOICE,
      styleDirection: process.env.GEMINI_ARABIC_STYLE || DEFAULT_GEMINI_STYLE,
    },
    arabicProvider:
      process.env.ARABIC_TTS_PROVIDER?.toLowerCase() === 'azure'
        ? 'azure'
        : 'gemini',

    outputRoot: process.env.AUDIO_OUTPUT_ROOT || 'public',
    sampleRateHz: Number(process.env.AUDIO_SAMPLE_RATE || 24000),
    loudnessLufs: Number(process.env.AUDIO_LOUDNESS_LUFS || -16),
    bitrateKbps: Number(process.env.AUDIO_BITRATE_KBPS || 96),
  };
}

/**
 * The single string that names how the Arabic was said. It goes in the
 * manifest and into the clip fingerprint, so it has to move whenever the
 * sound would.
 *
 * Azure has one thing that decides that — the voice. Gemini has three: the
 * model, the voice, and the dialect instruction. The instruction is a whole
 * paragraph, so it appears as a short digest rather than in full:
 *
 *   gemini-2.5-flash-preview-tts/Kore/4f1c8a90
 *
 * Change any of the three and every Arabic clip is re-recorded on the next
 * run, which is the intent: all three change the accent.
 */
export function arabicVoiceTag(config: AudioConfig): string {
  if (config.arabicProvider === 'azure') return config.azure.voice;

  const style = createHash('sha256')
    .update(config.gemini.styleDirection)
    .digest('hex')
    .slice(0, 8);

  return config.gemini.model + '/' + config.gemini.voice + '/' + style;
}
