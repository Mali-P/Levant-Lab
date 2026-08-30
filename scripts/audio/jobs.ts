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
            // The per-clip reviewer override is the one tier above the card's
            // own: it names a single recording rather than a word, which is how
            // a fix for "two" in the counting deck stays out of "twenty-two".
            // It is course data like any other, so it counts as a card-level
            // pronunciation and is never re-derived from the spelling.
            const override = pronunciationOverride(clip.key);
            jobs.push({
              ...clip,
              spoken: override ?? clip.spoken,
              ttsSource: override ? 'card' : clip.ttsSource,
              locked: override ? true : clip.locked,
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

  // A lot's three language rungs deal the same words and share one audio id, so
  // the same clip is reached three times over. That is one recording, not a
  // collision: only two *different* words writing the same file are reported,
  // which is the mistake this check exists to catch.
  const duplicatePaths = [...byPath.entries()]
    .map(([path, list]) => ({ path, english: [...new Set(list.map((j) => j.english))] }))
    .filter((entry) => entry.english.length > 1);

  // One job per file. Keeping all three would ask the provider to record the
  // same sentence three times and pay for it three times.
  const deduped = [...byPath.values()].map((list) => list[0]);

  return {
    jobs: deduped,
    missingText: deduped.filter((job) => job.spoken.length === 0),
    duplicatePaths,
  };
}

/**
 * Fingerprint of everything that decides how a clip sounds. A run skips a
 * clip whose file exists and whose fingerprint still matches, so editing one
 * word does not re-bill every other recording.
 */
export function sourceHash(
  spoken: string,
  voice: string,
  transliteration?: string,
): string {
  // The romanisation is part of the prompt now, so it is part of what decides
  // the sound: leave it out and a corrected transliteration would be written to
  // the manifest while the clip kept the old mispronunciation for ever.
  //
  // Absent and empty hash alike, so the Hebrew and alphabet clips — which send
  // no romanisation — keep the fingerprints they already have.
  const guide = transliteration?.trim() ?? '';
  const suffix = guide ? '::' + guide : '';

  return createHash('sha256')
    .update(voice + '::' + spoken + suffix)
    .digest('hex')
    .slice(0, 16);
}
