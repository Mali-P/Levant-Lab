import type { AlphabetScript } from '../../types/alphabet';
import SpeakerButton from '../controls/SpeakerButton';
import {
  alphabetClipPathFor,
} from '../../services/audio/alphabetManifest';
import type {
  AlphabetClipKind,
  AlphabetEntryKind,
} from '../../services/audio/alphabetPaths';

type Props = {
  script: AlphabetScript;
  entryKind: AlphabetEntryKind;
  entryId: string;
  clipKind: AlphabetClipKind;
  /** What the device should say when no clip is bundled. */
  fallbackText: string;
  label: string;
};

/**
 * Plays one alphabet recording.
 *
 * Reuses the vocabulary speaker button by handing it a form-shaped object, so
 * a letter behaves exactly like a word: the bundled clip first, device speech
 * only as a fallback. `fallbackText` carries the vowel marks the card itself
 * may be hiding, because an engine given a bare letter reads out its name.
 */
export default function LetterSpeaker({
  script,
  entryKind,
  entryId,
  clipKind,
  fallbackText,
  label,
}: Props) {
  const audioPath = alphabetClipPathFor(script, entryKind, entryId, clipKind);

  return (
    <SpeakerButton
      form={{ script: fallbackText, audioPath }}
      language={script}
      label={label}
    />
  );
}
