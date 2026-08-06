import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from './audio/config';
import { buildJobs } from './audio/jobs';
import { AUDIO_CLIPS } from '../src/generated/audioManifest';

/**
 * Confirms that every form the starter content expects to have audio really
 * points at a file that exists. Run in CI: it needs no credentials and no
 * network, only the committed manifest and the bundled clips.
 */
function main(): number {
  const config = loadConfig();
  const { jobs, missingText, duplicatePaths } = buildJobs();
  const speakable = jobs.filter((job) => job.spoken.length > 0);

  const unrecorded: string[] = [];
  const brokenPaths: string[] = [];
  const emptyFiles: string[] = [];

  for (const job of speakable) {
    const record = AUDIO_CLIPS[job.key];
    if (!record) {
      unrecorded.push(job.key + '  (' + job.english + ')');
      continue;
    }
    if (record.path !== job.path) {
      brokenPaths.push(
        job.key + '  manifest says ' + record.path + ', expected ' + job.path,
      );
    }
    const file = resolve(config.outputRoot, record.path);
    if (!existsSync(file)) {
      brokenPaths.push(job.key + '  file is missing: ' + record.path);
    } else if (statSync(file).size === 0) {
      emptyFiles.push(record.path);
    }
  }

  // A manifest entry with no matching form is an orphan: usually a word that
  // was renamed, leaving a clip nothing will ever play.
  const expected = new Set(speakable.map((job) => job.key));
  const orphans = Object.keys(AUDIO_CLIPS).filter((key) => !expected.has(key));

  console.log('Forms expecting audio     : ' + speakable.length);
  console.log('Clips in the manifest     : ' + Object.keys(AUDIO_CLIPS).length);
  console.log('Forms with no clip        : ' + unrecorded.length);
  console.log('Missing or mismatched files: ' + brokenPaths.length);
  console.log('Empty files               : ' + emptyFiles.length);
  console.log('Orphaned manifest entries : ' + orphans.length);
  console.log('Blank vocabulary text     : ' + missingText.length);
  console.log('Duplicate output paths    : ' + duplicatePaths.length);

  for (const line of [...unrecorded, ...brokenPaths, ...emptyFiles, ...orphans]) {
    console.error('  ' + line);
  }
  for (const blank of missingText) {
    console.error('  blank text: ' + blank.key + ' (' + blank.english + ')');
  }
  for (const duplicate of duplicatePaths) {
    console.error('  duplicate path: ' + duplicate.path);
  }

  const problems =
    unrecorded.length +
    brokenPaths.length +
    emptyFiles.length +
    orphans.length +
    missingText.length +
    duplicatePaths.length;

  if (problems === 0) {
    console.log('');
    console.log('Every expected form points at an audio file that exists.');
  }

  return problems > 0 ? 1 : 0;
}

process.exit(main());
