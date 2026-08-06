import type { AlphabetScript } from '../../types/alphabet';
import {
  ALPHABET_CLIPS,
  type AlphabetAudioRecord,
} from '../../generated/alphabetAudioManifest';
import {
  alphabetClipId,
  alphabetClipKey,
  type AlphabetClipKind,
  type AlphabetEntryKind,
} from './alphabetPaths';

export type { AlphabetAudioRecord };

/**
 * The bundled clip for one recording of one entry, if the build ships it.
 *
 * Returning undefined rather than a guessed path is the point: a speaker
 * button with no clip falls back to device speech instead of firing a 404 at
 * a learner who is offline.
 */
export function alphabetClip(
  script: AlphabetScript,
  entryKind: AlphabetEntryKind,
  entryId: string,
  clipKind: AlphabetClipKind,
): AlphabetAudioRecord | undefined {
  return ALPHABET_CLIPS[
    alphabetClipKey(script, alphabetClipId(entryKind, entryId, clipKind))
  ];
}

/** Just the bundled path, for the shared `WordForm`-shaped speaker button. */
export function alphabetClipPathFor(
  script: AlphabetScript,
  entryKind: AlphabetEntryKind,
  entryId: string,
  clipKind: AlphabetClipKind,
): string | undefined {
  return alphabetClip(script, entryKind, entryId, clipKind)?.path;
}

export function alphabetClipCount(script?: AlphabetScript): number {
  const records = Object.values(ALPHABET_CLIPS);
  return script
    ? records.filter((record) => record.script === script).length
    : records.length;
}
