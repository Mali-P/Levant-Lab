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

export type AudioConfig = {
  google: GoogleConfig;
  azure: AzureConfig;
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
 */
const DEFAULT_ARABIC_VOICE = 'ar-JO-SanaNeural';

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
    outputRoot: process.env.AUDIO_OUTPUT_ROOT || 'public',
    sampleRateHz: Number(process.env.AUDIO_SAMPLE_RATE || 24000),
    loudnessLufs: Number(process.env.AUDIO_LOUDNESS_LUFS || -16),
    bitrateKbps: Number(process.env.AUDIO_BITRATE_KBPS || 96),
  };
}
