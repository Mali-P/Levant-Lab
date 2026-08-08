import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { arabicVoiceTag, loadConfig } from './audio/config';
import { buildJobs, sourceHash, type ClipJob } from './audio/jobs';
import {
  arabicSynthesizer,
  googleHebrew,
  TtsError,
  type Synthesizer,
} from './audio/providers';
import { hasFfmpeg, normalise } from './audio/postProcess';
import type { AudioLanguage } from '../src/services/audio/paths';
import type { AudioClipRecord } from '../src/generated/audioManifest';

const MANIFEST_FILE = 'src/generated/audioManifest.ts';
const MANIFEST_MARKER =
  'export const AUDIO_CLIPS: Record<string, AudioClipRecord> = ';
const REPORT_FILE = 'audio-report.json';

type Options = { language?: AudioLanguage; force: boolean; dryRun: boolean };

function parseArgs(argv: string[]): Options {
  const options: Options = { force: false, dryRun: false };

  for (const arg of argv) {
    if (arg === '--force') {
      options.force = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--language=')) {
      const value = arg.slice('--language='.length).toLowerCase();
      if (value !== 'hebrew' && value !== 'arabic') {
        throw new Error('--language must be hebrew or arabic, got: ' + value);
      }
      options.language = value;
    } else if (arg.startsWith('--')) {
      throw new Error('Unknown option: ' + arg);
    }
  }

  return options;
}

/**
 * The manifest the previous run wrote. Its fingerprints are what let this run
 * leave an unchanged clip alone instead of paying to synthesise it again.
 */
function readExistingManifest(): Record<string, AudioClipRecord> {
  try {
    const source = readFileSync(resolve(MANIFEST_FILE), 'utf8');
    const start = source.indexOf(MANIFEST_MARKER);
    if (start === -1) return {};
    const open = source.indexOf('{', start);
    const close = source.lastIndexOf('}');
    if (open === -1 || close <= open) return {};
    return JSON.parse(source.slice(open, close + 1)) as Record<
      string,
      AudioClipRecord
    >;
  } catch {
    return {};
  }
}

/** Rewrites only the data at the end of the manifest, keeping its types. */
function writeManifest(clips: Record<string, AudioClipRecord>): void {
  const source = readFileSync(resolve(MANIFEST_FILE), 'utf8');
  const cut = source.indexOf(MANIFEST_MARKER);
  if (cut === -1) {
    throw new Error('Cannot find the AUDIO_CLIPS declaration in ' + MANIFEST_FILE);
  }

  const ordered = Object.fromEntries(
    Object.entries(clips).sort(([a], [b]) => a.localeCompare(b)),
  );

  writeFileSync(
    resolve(MANIFEST_FILE),
    source.slice(0, cut) + MANIFEST_MARKER + JSON.stringify(ordered, null, 2) + ';\n',
    'utf8',
  );
}

type Failure = { key: string; english: string; reason: string };

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const { jobs, missingText, duplicatePaths } = buildJobs(options.language);

  const previous = readExistingManifest();
  const manifest: Record<string, AudioClipRecord> = { ...previous };

  const generated = { hebrew: 0, arabic: 0 };
  let skipped = 0;
  const failures: Failure[] = [];

  const speakable = jobs.filter((job) => job.spoken.length > 0);
  const needed = new Map<AudioLanguage, ClipJob[]>();

  const arabicVoice = arabicVoiceTag(config);

  for (const job of speakable) {
    const voice = job.language === 'hebrew' ? config.google.voice : arabicVoice;
    const file = join(config.outputRoot, job.path);
    const unchanged =
      !options.force &&
      existsSync(file) &&
      previous[job.key]?.sourceHash === sourceHash(job.spoken, voice);

    if (unchanged) {
      skipped++;
      continue;
    }

    const list = needed.get(job.language);
    if (list) list.push(job);
    else needed.set(job.language, [job]);
  }

  const todo = [...needed.values()].reduce((n, list) => n + list.length, 0);
  console.log(
    'Clips required: ' +
      speakable.length +
      '   already current: ' +
      skipped +
      '   to generate: ' +
      todo,
  );

  for (const duplicate of duplicatePaths) {
    console.error(
      'Duplicate output path ' +
        duplicate.path +
        ' shared by ' +
        duplicate.english.join(', '),
    );
  }
  for (const blank of missingText) {
    console.error('Nothing to speak for ' + blank.english + ' (' + blank.key + ')');
  }

  if (options.dryRun) {
    for (const [language, list] of needed) {
      console.log('  ' + language + ': ' + list.length + ' clip(s)');
    }
    return missingText.length + duplicatePaths.length > 0 ? 1 : 0;
  }

  const trimming = hasFfmpeg();
  if (!trimming) {
    console.warn(
      'ffmpeg was not found on PATH. Clips will be saved exactly as the ' +
        'providers return them: untrimmed, and not levelled against each other.',
    );
  }

  for (const [language, list] of needed) {
    let voice: Synthesizer;
    try {
      voice =
        language === 'hebrew'
          ? await googleHebrew(config)
          : await arabicSynthesizer(config);

      // Gemini hands back raw samples, so ffmpeg stops being a nicety here:
      // without it there is nothing to turn a WAV into the MP3 the app plays,
      // and writing WAV bytes to an `.mp3` name would ship a file the browser
      // is only guessing about.
      if (!trimming && voice.format !== 'mp3') {
        throw new TtsError(
          voice.provider +
            ' returns ' +
            voice.format +
            ' audio, which needs ffmpeg to encode. Install ffmpeg, or set ' +
            'ARABIC_TTS_PROVIDER=azure to record from the shelved Azure voice.',
        );
      }
    } catch (error) {
      // A missing credential is one failure per clip rather than a crash, so
      // the other language still finishes and a partial run stays useful.
      const reason = error instanceof TtsError ? error.message : String(error);
      console.error(language + ': ' + reason);
      for (const job of list) {
        failures.push({ key: job.key, english: job.english, reason });
      }
      continue;
    }

    console.log(
      language +
        ': ' +
        list.length +
        ' clip(s) via ' +
        voice.provider +
        ' voice ' +
        voice.voice,
    );

    for (const job of list) {
      try {
        const raw = await voice.synthesize(job.spoken);
        const audio = trimming ? await normalise(raw, config) : raw;

        const file = resolve(config.outputRoot, job.path);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, audio);

        manifest[job.key] = {
          path: job.path,
          language: job.language,
          form: job.form,
          provider: voice.provider,
          voice: voice.voice,
          english: job.english,
          text: job.text,
          spoken: job.spoken,
          transliteration: job.transliteration,
          sourceHash: sourceHash(job.spoken, voice.voice),
          bytes: audio.length,
          generatedAt: new Date().toISOString(),
        };
        generated[job.language]++;
      } catch (error) {
        failures.push({
          key: job.key,
          english: job.english,
          reason: error instanceof Error ? error.message : String(error),
        });
        console.error('  failed ' + job.key + ': ' + String(error));
      }
    }
  }

  // A manifest entry whose file has gone is worse than no entry at all: the
  // app would aim a speaker button at a 404 rather than falling back to
  // device speech.
  for (const [key, record] of Object.entries(manifest)) {
    const file = resolve(config.outputRoot, record.path);
    if (!existsSync(file) || statSync(file).size === 0) delete manifest[key];
  }

  const withoutAudio = speakable.filter((job) => !manifest[job.key]);

  writeManifest(manifest);

  const report = {
    ranAt: new Date().toISOString(),
    language: options.language ?? 'both',
    forced: options.force,
    normalised: trimming,
    hebrewGenerated: generated.hebrew,
    arabicGenerated: generated.arabic,
    skippedUpToDate: skipped,
    missingText: missingText.map((job) => ({ key: job.key, english: job.english })),
    duplicatePaths,
    failures,
    formsWithoutAudio: withoutAudio.map((job) => ({
      key: job.key,
      english: job.english,
    })),
    voices: { hebrew: config.google.voice, arabic: arabicVoice },
    arabicProvider: config.arabicProvider,
  };
  writeFileSync(resolve(REPORT_FILE), JSON.stringify(report, null, 2), 'utf8');

  console.log('');
  console.log('Hebrew clips generated    : ' + report.hebrewGenerated);
  console.log('Arabic clips generated    : ' + report.arabicGenerated);
  console.log('Skipped, already current  : ' + report.skippedUpToDate);
  console.log('Missing or blank text     : ' + report.missingText.length);
  console.log('Duplicate output paths    : ' + report.duplicatePaths.length);
  console.log('API failures              : ' + report.failures.length);
  console.log('Forms still without a clip: ' + report.formsWithoutAudio.length);
  console.log('Report written to ' + REPORT_FILE);

  const broken =
    failures.length + missingText.length + duplicatePaths.length + withoutAudio.length;
  return broken > 0 ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
