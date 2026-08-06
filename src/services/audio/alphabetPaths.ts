import type { AlphabetScript } from '../../types/alphabet';
import {
  ARABIC_EXTRA_CHARACTERS,
  lettersFor,
  vowelsFor,
} from '../../data/alphabets';
import { AUDIO_EXTENSION, LANGUAGE_DIR } from './paths';

/**
 * Alphabet clips are addressed separately from vocabulary clips.
 *
 * They share the providers and the offline-first rule -- the app only ever
 * plays a bundled file -- but not the key space: a vocabulary key is built
 * from `category | deck | english`, which a letter has none of. Keeping them
 * apart means renaming a deck can never orphan a letter recording.
 */

/** `letter` covers the 22 + 28 alphabet letters; `char` the extra Arabic forms. */
export type AlphabetEntryKind = 'letter' | 'vowel' | 'char';

/** Which recording of one entry: its name, its sound, or its example word. */
export type AlphabetClipKind = 'name' | 'sound' | 'example';

export const ALPHABET_AUDIO_ROOT = 'assets/audio/alphabet';

/**
 * A stable, ASCII clip id such as `letter_alef_name`.
 *
 * Built from the entry's id and never from the character itself: neither
 * Hebrew nor Arabic is safe in a filename, and a letter that gains a niqqud in
 * its written name must not lose its recording.
 */
export function alphabetClipId(
  entryKind: AlphabetEntryKind,
  entryId: string,
  clipKind: AlphabetClipKind,
): string {
  return entryKind + '_' + entryId + '_' + clipKind;
}

/** `assets/audio/alphabet/he/letter_alef_name.mp3` */
export function alphabetClipPath(
  script: AlphabetScript,
  clipId: string,
): string {
  return (
    ALPHABET_AUDIO_ROOT +
    '/' +
    LANGUAGE_DIR[script] +
    '/' +
    clipId +
    '.' +
    AUDIO_EXTENSION
  );
}

/** Key into the generated alphabet manifest: `he/letter_alef_name`. */
export function alphabetClipKey(
  script: AlphabetScript,
  clipId: string,
): string {
  return LANGUAGE_DIR[script] + '/' + clipId;
}

export type AlphabetClipSpec = {
  clipId: string;
  key: string;
  path: string;
  script: AlphabetScript;
  entryKind: AlphabetEntryKind;
  entryId: string;
  clipKind: AlphabetClipKind;
  /** What the provider is asked to say. May carry vowel marks the card hides. */
  spoken: string;
  /** How a reviewer should recognise the clip, e.g. "Alef - name". */
  label: string;
};

function spec(
  script: AlphabetScript,
  entryKind: AlphabetEntryKind,
  entryId: string,
  clipKind: AlphabetClipKind,
  spoken: string,
  label: string,
): AlphabetClipSpec {
  const clipId = alphabetClipId(entryKind, entryId, clipKind);
  return {
    clipId,
    key: alphabetClipKey(script, clipId),
    path: alphabetClipPath(script, clipId),
    script,
    entryKind,
    entryId,
    clipKind,
    spoken: spoken.trim(),
    label,
  };
}

/**
 * Every clip one script's alphabet module needs.
 *
 * A sound clip is only requested where the content actually supplies a
 * demonstration syllable. Asking a speech engine for a bare letter would get
 * back the letter's *name*, which the name clip already covers, so the lesson
 * would teach the same recording twice.
 */
export function alphabetClipSpecs(
  script: AlphabetScript,
): AlphabetClipSpec[] {
  const specs: AlphabetClipSpec[] = [];

  for (const letter of lettersFor(script)) {
    const name = letter.nameEnglish;
    specs.push(
      spec(script, 'letter', letter.id, 'name', letter.nameSpokenText, name + ' - name'),
    );
    if (letter.soundSpokenText) {
      specs.push(
        spec(
          script,
          'letter',
          letter.id,
          'sound',
          letter.soundSpokenText,
          name + ' - sound',
        ),
      );
    }
    if (letter.exampleWord) {
      specs.push(
        spec(
          script,
          'letter',
          letter.id,
          'example',
          letter.exampleWord.pronunciationText ?? letter.exampleWord.script,
          name + ' - example: ' + letter.exampleWord.english,
        ),
      );
    }
  }

  for (const vowel of vowelsFor(script)) {
    specs.push(
      spec(
        script,
        'vowel',
        vowel.id,
        'name',
        vowel.nameSpokenText,
        vowel.nameEnglish + ' - name',
      ),
    );
    if (vowel.soundSpokenText) {
      specs.push(
        spec(
          script,
          'vowel',
          vowel.id,
          'sound',
          vowel.soundSpokenText,
          vowel.nameEnglish + ' - sound',
        ),
      );
    }
    if (vowel.exampleWord) {
      specs.push(
        spec(
          script,
          'vowel',
          vowel.id,
          'example',
          vowel.exampleWord.pronunciationText ?? vowel.exampleWord.script,
          vowel.nameEnglish + ' - example: ' + vowel.exampleWord.english,
        ),
      );
    }
  }

  if (script === 'arabic') {
    for (const extra of ARABIC_EXTRA_CHARACTERS) {
      specs.push(
        spec(
          script,
          'char',
          extra.id,
          'name',
          extra.nameSpokenText,
          extra.nameEnglish + ' - name',
        ),
      );
      if (extra.exampleWord) {
        specs.push(
          spec(
            script,
            'char',
            extra.id,
            'example',
            extra.exampleWord.pronunciationText ?? extra.exampleWord.script,
            extra.nameEnglish + ' - example: ' + extra.exampleWord.english,
          ),
        );
      }
    }
  }

  return specs;
}

/** Both scripts at once, for the generator and the validator. */
export function allAlphabetClipSpecs(): AlphabetClipSpec[] {
  return [...alphabetClipSpecs('hebrew'), ...alphabetClipSpecs('arabic')];
}
