import type {
  AlphabetScript,
  ArabicLetter,
  HebrewLetter,
  SimilarLetterGroup,
  VowelMark,
} from '../../types/alphabet';
import {
  HEBREW_FINAL_FORM_LETTERS,
  HEBREW_LETTERS,
  HEBREW_SIMILAR_GROUPS,
  HEBREW_VOWELS,
} from './hebrew';
import {
  ARABIC_EXTRA_CHARACTERS,
  ARABIC_LETTERS,
  ARABIC_NON_CONNECTING_IDS,
  ARABIC_SIMILAR_GROUPS,
  ARABIC_VOWELS,
} from './arabic';

export * from './hebrew';
export * from './arabic';

/** The two alphabets, in the order the selection screen lists them. */
export const ALPHABET_SCRIPTS: readonly AlphabetScript[] = ['hebrew', 'arabic'];

export const SCRIPT_LABEL: Record<AlphabetScript, string> = {
  hebrew: 'Hebrew Alphabet',
  arabic: 'Arabic Alphabet',
};

/**
 * Letters of one script, already ordered. Typed as the union rather than a
 * generic so a caller that knows which script it asked for can narrow with a
 * single check instead of a cast.
 */
export function lettersFor(
  script: AlphabetScript,
): HebrewLetter[] | ArabicLetter[] {
  return script === 'hebrew' ? HEBREW_LETTERS : ARABIC_LETTERS;
}

export function vowelsFor(script: AlphabetScript): VowelMark[] {
  return script === 'hebrew' ? HEBREW_VOWELS : ARABIC_VOWELS;
}

export function similarGroupsFor(script: AlphabetScript): SimilarLetterGroup[] {
  return script === 'hebrew' ? HEBREW_SIMILAR_GROUPS : ARABIC_SIMILAR_GROUPS;
}

export function isHebrewLetter(
  letter: HebrewLetter | ArabicLetter,
): letter is HebrewLetter {
  return 'printForm' in letter;
}

/** One letter by id, or undefined. Ids are unique within a script, not across. */
export function findLetter(
  script: AlphabetScript,
  id: string,
): HebrewLetter | ArabicLetter | undefined {
  return (lettersFor(script) as Array<HebrewLetter | ArabicLetter>).find(
    (letter) => letter.id === id,
  );
}

export function findVowel(
  script: AlphabetScript,
  id: string,
): VowelMark | undefined {
  return vowelsFor(script).find((vowel) => vowel.id === id);
}

/**
 * How many separate things one script teaches. Shown on the selection screen
 * so a learner can see the size of the module before starting it.
 */
export function alphabetCounts(script: AlphabetScript): {
  letters: number;
  vowels: number;
  extras: number;
  finalForms: number;
  nonConnecting: number;
} {
  return {
    letters: lettersFor(script).length,
    vowels: vowelsFor(script).length,
    extras: script === 'arabic' ? ARABIC_EXTRA_CHARACTERS.length : 0,
    finalForms: script === 'hebrew' ? HEBREW_FINAL_FORM_LETTERS.length : 0,
    nonConnecting: script === 'arabic' ? ARABIC_NON_CONNECTING_IDS.length : 0,
  };
}
