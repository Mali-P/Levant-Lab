import type { AudioConfig } from './config';

export class TtsError extends Error {}

/** XML-escapes text before it goes into an SSML document. */
export function escapeSsml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface Synthesizer {
  readonly provider: 'google' | 'azure';
  readonly voice: string;
  synthesize(text: string): Promise<Buffer>;
}

/**
 * Israeli Hebrew through Google Cloud Text-to-Speech.
 *
 * The client is imported on demand so that `--language=arabic` runs on a
 * machine with no Google package and no service account installed.
 */
export async function googleHebrew(config: AudioConfig): Promise<Synthesizer> {
  if (!config.google.credentials && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new TtsError(
      'GOOGLE_APPLICATION_CREDENTIALS is not set. Point it at a service account JSON file.',
    );
  }

  let TextToSpeechClient;
  try {
    ({ TextToSpeechClient } = await import('@google-cloud/text-to-speech'));
  } catch {
    throw new TtsError(
      'Missing @google-cloud/text-to-speech. Run: npm install',
    );
  }

  const client = new TextToSpeechClient(
    config.google.projectId ? { projectId: config.google.projectId } : {},
  );

  return {
    provider: 'google',
    voice: config.google.voice,
    async synthesize(text: string): Promise<Buffer> {
      const [response] = await client.synthesizeSpeech({
        input: { text },
        voice: {
          languageCode: config.google.languageCode,
          name: config.google.voice,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          sampleRateHertz: config.sampleRateHz,
          // Left at natural speed on purpose: a slowed voice teaches a rhythm
          // the learner will never hear from a speaker.
          speakingRate: 1,
        },
      });

      const audio = response.audioContent;
      if (!audio) throw new TtsError('Google returned no audio for: ' + text);
      return Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
    },
  };
}

/**
 * Jordanian Arabic through Azure Speech.
 *
 * Uses the REST endpoint with the subscription key directly, so the script
 * needs no Azure SDK. The voice stays whatever AZURE_ARABIC_VOICE names —
 * `ar-JO-SanaNeural` by default, the nearest Azure dialect to Palestinian
 * Levantine, and never an MSA voice.
 */
export async function azureArabic(config: AudioConfig): Promise<Synthesizer> {
  const { key, region, voice, languageCode } = config.azure;
  if (!key) throw new TtsError('AZURE_SPEECH_KEY is not set.');
  if (!region) throw new TtsError('AZURE_SPEECH_REGION is not set.');

  const endpoint =
    'https://' + region + '.tts.speech.microsoft.com/cognitiveservices/v1';

  return {
    provider: 'azure',
    voice,
    async synthesize(text: string): Promise<Buffer> {
      const ssml =
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' +
        languageCode +
        '"><voice name="' +
        voice +
        '">' +
        escapeSsml(text) +
        '</voice></speak>';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
          'User-Agent': 'levantry-audio-generator',
        },
        body: ssml,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new TtsError(
          'Azure returned ' + response.status + ' ' + response.statusText + ' ' + detail.slice(0, 200),
        );
      }

      return Buffer.from(await response.arrayBuffer());
    },
  };
}
