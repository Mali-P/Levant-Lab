import { createHash } from 'node:crypto';
import { SEED_CATEGORIES } from '../../src/constants/seed';
import { pronunciationOverride } from '../../src/constants/pronunciationOverrides';
import {
  audioIdFor,
  clipsForSide,
  type AudioLanguage,
  type ClipSpec,
} from '../../src/services/audio/paths';

export type ClipJob = ClipSpec & {
  english: string;
  categoryName: string;
  deckName: string;
  /** True when a reviewer's override supplied the spoken text. */
  overridden: boolean;
};

export type JobReport = {
  jobs: ClipJob[];
  /** Forms whose text is blank, which no provider can be asked to say. */
  missingText: ClipJob[];
  /** Two words that would write the same file. Never silently overwritten. */
  duplicatePaths: Array<{ path: string; english: string[] }>;
};

/**
 * Every clip the starter content needs.
 *
 * Cards the learner added themselves are deliberately absent: generation is a
 * developer step with credentials, and those cards fall back to device speech.
 */
export function buildJobs(language?: AudioLanguage): JobReport {
  const jobs: ClipJob[] = [];

  for (const category of SEED_CATEGORIES) {
    for (const deck of category.decks) {
      for (const card of deck.cards) {
        const audioId = audioIdFor(category.name, deck.name, card.english);

        const sides: Array<[AudioLanguage, typeof card.hebrew]> = [
          ['hebrew', card.hebrew],
          ['arabic', card.arabic],
        ];

        for (const [side, content] of sides) {
          if (language && side !== language) continue;

          for (const clip of clipsForSide(audioId, side, content)) {
            const override = pronunciationOverride(clip.key);
            jobs.push({
              ...clip,
              spoken: override ?? clip.spoken,
              overridden: Boolean(override),
              english: card.english,
              categoryName: category.name,
              deckName: deck.name,
            });
          }
        }
      }
    }
  }

  const byPath = new Map<string, ClipJob[]>();
  for (const job of jobs) {
    const list = byPath.get(job.path);
    if (list) list.push(job);
    else byPath.set(job.path, [job]);
  }

  const duplicatePaths = [...byPath.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([path, list]) => ({ path, english: list.map((j) => j.english) }));

  return {
    jobs,
    missingText: jobs.filter((job) => job.spoken.length === 0),
    duplicatePaths,
  };
}

/**
 * Fingerprint of everything that decides how a clip sounds. A run skips a
 * clip whose file exists and whose fingerprint still matches, so editing one
 * word does not re-bill every other recording.
 */
export function sourceHash(spoken: string, voice: string): string {
  return createHash('sha256')
    .update(voice + '::' + spoken)
    .digest('hex')
    .slice(0, 16);
}
