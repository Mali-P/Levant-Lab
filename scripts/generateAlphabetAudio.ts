import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { arabicVoiceTag, loadConfig } from './audio/config';
import { sourceHash } from './audio/jobs';
import {
  arabicSynthesizer,
  googleHebrew,
  TtsError,
  type Synthesizer,
} from './audio/providers';
import { hasFfmpeg, normalise } from './audio/postProcess';
import {
  allAlphabetClipSpecs,
  type AlphabetClipSpec,
} from '../src/services/audio/alphabetPaths';
import type { AlphabetScript } from '../src/types/alphabet';
import type { AlphabetAudioRecord } from '../src/generated/alphabetAudioManifest';

/**
 * Records the alphabet clips.
 *
 * Deliberately a second entry point rather than a flag on `generateAudio`:
 * the two share providers, credentials and the resume-by-fingerprint rule,
 * but nothing else. A letter has no deck and no English meaning, and folding
 * it into the vocabulary job list would mean inventing both.
 *
 * Hebrew goes to the Google he-IL voice and Arabic to Gemini under the
 * Palestinian style direction, exactly as the vocabulary does. Modern
 * Standard Arabic is never asked for: it would teach a pronunciation the
 * learner will not hear.
 */

const MANIFEST_FILE = 'src/generated/alphabetAudioManifest.ts';
const MANIFEST_MARKER =
  'export const ALPHABET_CLIPS: Record<string, AlphabetAudioRecord> = ';
const REPORT_FILE = 'alphabet-audio-report.json';

type Options = { script?: AlphabetScript; force: boolean; dryRun: boolean };

function parseArgs(argv: string[]): Options {
  const options: Options = { force: false, dryRun: false };
  for (const arg of argv) {
    if (arg === '--force') {
      options.force = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--script=')) {
      const value = arg.slice('--script='.length).toLowerCase();
      if (value !== 'hebrew' && value !== 'arabic') {
        throw new Error('--script must be hebrew or arabic, got: ' + value);
      }
      options.script = value;
    } else if (arg.startsWith('--')) {
      throw new Error('Unknown option: ' + arg);
    }
  }
  return options;
}

/** The manifest the previous run wrote; its fingerprints drive the resume. */
function readExistingManifest(): Record<string, AlphabetAudioRecord> {
  try {
    const source = readFileSync(resolve(MANIFEST_FILE), 'utf8');
    const start = source.indexOf(MANIFEST_MARKER);
    if (start === -1) return {};
    const open = source.indexOf('{', start);
    const close = source.lastIndexOf('}');
    if (open === -1 || close <= open) return {};
    return JSON.parse(source.slice(open, close + 1)) as Record<
      string,
      AlphabetAudioRecord
    >;
  } catch {
    return {};
  }
}

/** Rewrites only the data at the end of the manifest, keeping its types. */
function writeManifest(clips: Record<string, AlphabetAudioRecord>): void {
  const source = readFileSync(resolve(MANIFEST_FILE), 'utf8');
  const cut = source.indexOf(MANIFEST_MARKER);
  if (cut === -1) {
    throw new Error('Cannot find ALPHABET_CLIPS in ' + MANIFEST_FILE);
  }
  const ordered = Object.fromEntries(
    Object.entries(clips).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(
    resolve(MANIFEST_FILE),
    source.slice(0, cut) +
      MANIFEST_MARKER +
      JSON.stringify(ordered, null, 2) +
      ';\n',
    'utf8',
  );
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig();

  const specs = allAlphabetClipSpecs().filter(
    (clip) => !options.script || clip.script === options.script,
  );
  const blank = specs.filter((clip) => clip.spoken.length === 0);
  const speakable = specs.filter((clip) => clip.spoken.length > 0);

  const previous = readExistingManifest();
  const manifest: Record<string, AlphabetAudioRecord> = { ...previous };
  const generated = { hebrew: 0, arabic: 0 };
  const failures: Array<{ key: string; label: string; reason: string }> = [];
  let skipped = 0;

  const arabicVoice = arabicVoiceTag(config);

  const needed = new Map<AlphabetScript, AlphabetClipSpec[]>();
  for (const clip of speakable) {
    const voice = clip.script === 'hebrew' ? config.google.voice : arabicVoice;
    const file = join(config.outputRoot, clip.path);
    const unchanged =
      !options.force &&
      existsSync(file) &&
      previous[clip.key]?.sourceHash === sourceHash(clip.spoken, voice);
    if (unchanged) {
      skipped++;
      continue;
    }
    const list = needed.get(clip.script);
    if (list) list.push(clip);
    else needed.set(clip.script, [clip]);
  }

  const todo = [...needed.values()].reduce((n, list) => n + list.length, 0);
  console.log(
    'Alphabet clips required: ' +
      speakable.length +
      '   already current: ' +
      skipped +
      '   to generate: ' +
      todo,
  );
  for (const clip of blank) {
    console.error('Nothing to speak for ' + clip.key + ' (' + clip.label + ')');
  }

  if (options.dryRun) {
    for (const [script, list] of needed) {
      console.log('  ' + script + ': ' + list.length + ' clip(s)');
    }
    return blank.length > 0 ? 1 : 0;
  }

  const trimming = hasFfmpeg();
  if (!trimming) {
    console.warn(
      'ffmpeg was not found on PATH. Clips will be saved exactly as the ' +
        'providers return them: untrimmed, and not levelled against each other.',
    );
  }

  for (const [script, list] of needed) {
    let voice: Synthesizer;
    try {
      voice =
        script === 'hebrew'
          ? await googleHebrew(config)
          : await arabicSynthesizer(config);

      // Gemini hands back raw samples: with no ffmpeg there is nothing to
      // encode them into the MP3 the app plays, and WAV bytes under an `.mp3`
      // name would leave the browser guessing.
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
      // the other script still finishes and a partial run stays useful.
      const reason = error instanceof TtsError ? error.message : String(error);
      console.error(script + ': ' + reason);
      for (const clip of list) {
        failures.push({ key: clip.key, label: clip.label, reason });
      }
      continue;
    }

    console.log(
      script +
        ': ' +
        list.length +
        ' clip(s) via ' +
        voice.provider +
        ' voice ' +
        voice.voice,
    );

    for (const clip of list) {
      try {
        const raw = await voice.synthesize(clip.spoken);
        const audio = trimming ? await normalise(raw, config) : raw;
        const file = resolve(config.outputRoot, clip.path);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, audio);

        manifest[clip.key] = {
          path: clip.path,
          script: clip.script,
          entryKind: clip.entryKind,
          entryId: clip.entryId,
          clipKind: clip.clipKind,
          provider: voice.provider,
          voice: voice.voice,
          spoken: clip.spoken,
          label: clip.label,
          sourceHash: sourceHash(clip.spoken, voice.voice),
          bytes: audio.length,
          generatedAt: new Date().toISOString(),
        };
        generated[clip.script]++;
      } catch (error) {
        failures.push({
          key: clip.key,
          label: clip.label,
          reason: error instanceof Error ? error.message : String(error),
        });
        console.error('  failed ' + clip.key + ': ' + String(error));
      }
    }
  }

  // An entry whose file has gone is worse than no entry: the app would aim a
  // speaker button at a 404 instead of falling back to device speech.
  for (const [key, record] of Object.entries(manifest)) {
    const file = resolve(config.outputRoot, record.path);
    if (!existsSync(file) || statSync(file).size === 0) delete manifest[key];
  }

  const withoutAudio = speakable.filter((clip) => !manifest[clip.key]);
  writeManifest(manifest);

  const report = {
    ranAt: new Date().toISOString(),
    script: options.script ?? 'both',
    forced: options.force,
    normalised: trimming,
    hebrewGenerated: generated.hebrew,
    arabicGenerated: generated.arabic,
    skippedUpToDate: skipped,
    blankText: blank.map((clip) => ({ key: clip.key, label: clip.label })),
    failures,
    clipsWithoutAudio: withoutAudio.map((clip) => ({
      key: clip.key,
      label: clip.label,
    })),
    voices: { hebrew: config.google.voice, arabic: arabicVoice },
    arabicProvider: config.arabicProvider,
  };
  writeFileSync(resolve(REPORT_FILE), JSON.stringify(report, null, 2), 'utf8');

  console.log('');
  console.log('Hebrew clips generated   : ' + report.hebrewGenerated);
  console.log('Arabic clips generated   : ' + report.arabicGenerated);
  console.log('Skipped, already current : ' + report.skippedUpToDate);
  console.log('Blank text               : ' + report.blankText.length);
  console.log('API failures             : ' + report.failures.length);
  console.log('Clips still missing      : ' + report.clipsWithoutAudio.length);
  console.log('Report written to ' + REPORT_FILE);

  return failures.length + blank.length + withoutAudio.length > 0 ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
