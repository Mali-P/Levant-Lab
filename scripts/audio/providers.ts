import { arabicVoiceTag, type AudioConfig } from './config';

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
  readonly provider: 'google' | 'azure' | 'gemini';
  readonly voice: string;
  /**
   * What `synthesize` hands back. `mp3` is ready to write as it stands; `wav`
   * is lossless and has to be encoded before it can be saved under an `.mp3`
   * name, which is why a wav provider makes ffmpeg a requirement rather than
   * an improvement.
   */
  readonly format: 'mp3' | 'wav';
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
    format: 'mp3',
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
 * Jordanian Arabic through Azure Speech. **Shelved.**
 *
 * Arabic is recorded by `geminiArabic` now. This is kept whole, and reachable
 * through ARABIC_TTS_PROVIDER=azure, because it is the only provider here that
 * ships a real `ar-*` voice: if the Gemini accent turns out to be wrong under
 * review, this is what the comparison is against.
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
    format: 'mp3',
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

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

/** Fallback for a `mimeType` that names no rate. Gemini's TTS output rate. */
const GEMINI_PCM_RATE = 24000;

/**
 * The rate out of `audio/L16;codec=pcm;rate=24000`.
 *
 * The header is read rather than assumed: raw PCM carries no rate of its own,
 * so guessing it wrong does not fail — it just plays the word at the wrong
 * pitch and speed, which is the sort of bug that survives to production.
 */
export function pcmSampleRate(mimeType: string): number {
  const match = /rate=(\d+)/i.exec(mimeType);
  const rate = match ? Number(match[1]) : NaN;
  return Number.isFinite(rate) && rate > 0 ? rate : GEMINI_PCM_RATE;
}

/**
 * Wraps signed 16-bit little-endian mono PCM in a WAV header.
 *
 * Gemini returns bare samples, and bare samples are not a file: ffmpeg would
 * have to be told the rate and width by hand, and anything else that opened
 * the buffer would hear noise. 44 bytes makes it self-describing.
 */
export function wavFromPcm(pcm: Buffer, sampleRate: number): Buffer {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // PCM fmt chunk length
  header.writeUInt16LE(1, 20); // format 1 = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

/**
 * The audio out of a `generateContent` response.
 *
 * A TTS call can come back with no audio at all — a safety block, a refusal,
 * or a model that answered in words. Each of those is reported with what the
 * response actually said, because "no audio" alone is not enough to act on.
 */
export function geminiAudioPart(payload: GeminiResponse): {
  data: string;
  mimeType: string;
} {
  const candidate = payload.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType ?? '',
      };
    }
  }

  const blocked = payload.promptFeedback?.blockReason;
  if (blocked) throw new TtsError('Gemini blocked the request: ' + blocked);

  const spoken = parts.map((part) => part.text).filter(Boolean).join(' ').trim();
  if (spoken) {
    throw new TtsError('Gemini answered in text instead of audio: ' + spoken.slice(0, 200));
  }

  throw new TtsError(
    'Gemini returned no audio (finishReason: ' + (candidate?.finishReason ?? 'none') + ')',
  );
}

/**
 * Palestinian Levantine Arabic through Gemini TTS.
 *
 * The accent comes from `styleDirection`, not from a locale code: Gemini's
 * voices are language-neutral and take their dialect from the instruction they
 * are given. That is the whole reason for the switch — no vendor here sells a
 * Palestinian voice, but this one can be asked for a Palestinian accent, which
 * is closer than the Jordanian voice that was standing in for it.
 *
 * The instruction and the words are one prompt because the model needs the
 * direction before it starts speaking; the trailing colon in the direction is
 * what keeps it from reading the instruction aloud.
 */
export async function geminiArabic(config: AudioConfig): Promise<Synthesizer> {
  const { apiKey, model, voice, styleDirection } = config.gemini;
  if (!apiKey) {
    throw new TtsError(
      'GEMINI_API_KEY is not set. Create a key at https://aistudio.google.com/apikey',
    );
  }

  const endpoint = GEMINI_ENDPOINT + model + ':generateContent';

  return {
    provider: 'gemini',
    // Everything that decides how this sounds, in one string: manifest entry
    // and clip fingerprint both read it.
    voice: arabicVoiceTag(config),
    format: 'wav',
    async synthesize(text: string): Promise<Buffer> {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: styleDirection + '\n\n' + text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
            },
          },
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new TtsError(
          'Gemini returned ' +
            response.status +
            ' ' +
            response.statusText +
            ' ' +
            detail.slice(0, 300),
        );
      }

      const payload = (await response.json()) as GeminiResponse;
      const { data, mimeType } = geminiAudioPart(payload);
      const pcm = Buffer.from(data, 'base64');
      if (pcm.length === 0) throw new TtsError('Gemini returned empty audio for: ' + text);

      return wavFromPcm(pcm, pcmSampleRate(mimeType));
    },
  };
}

/**
 * The Arabic voice this run should use. One place decides it, so the two
 * generators cannot drift apart on which provider is live.
 */
export function arabicSynthesizer(config: AudioConfig): Promise<Synthesizer> {
  return config.arabicProvider === 'azure' ? azureArabic(config) : geminiArabic(config);
}
