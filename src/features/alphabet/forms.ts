import type {
  ArabicFormName,
  ArabicLetter,
  HebrewLetter,
  LetterAsset,
  StrokeSequence,
} from '../../types/alphabet';
import { isHebrewLetter } from '../../data/alphabets';

/**
 * The small reads every alphabet screen needs and that the two letter shapes
 * disagree about: a Hebrew letter keeps its printed form in `printForm`, an
 * Arabic one in `forms.isolated`. Collected here so a screen never repeats the
 * narrowing, and so the "no asset means no view" rule lives in one place.
 */

/** The character a font can render, in the letter's citation shape. */
export function printFormOf(letter: HebrewLetter | ArabicLetter): string {
  return isHebrewLetter(letter) ? letter.printForm : letter.forms.isolated;
}

/** The drawn citation form, where an asset has been supplied. */
export function handwrittenOf(
  letter: HebrewLetter | ArabicLetter,
): LetterAsset | undefined {
  return isHebrewLetter(letter)
    ? letter.handwrittenForm
    : letter.handwrittenForms?.isolated;
}

/** True once any handwritten asset exists for this letter, in any shape. */
export function hasHandwritten(letter: HebrewLetter | ArabicLetter): boolean {
  if (isHebrewLetter(letter)) {
    return Boolean(letter.handwrittenForm ?? letter.finalHandwrittenForm);
  }
  return Object.keys(letter.handwrittenForms ?? {}).length > 0;
}

/** Reading order for Arabic shapes: how a learner meets them, isolated last. */
export const ARABIC_FORM_ORDER: readonly ArabicFormName[] = [
  'initial',
  'medial',
  'final',
  'isolated',
];

/** Said in a sentence, e.g. "Which letter is this, at the start of a word?" */
export const ARABIC_FORM_LABEL: Record<ArabicFormName, string> = {
  initial: 'at the start of a word',
  medial: 'in the middle of a word',
  final: 'at the end of a word',
  isolated: 'on its own',
};

/**
 * The shapes an Arabic letter actually changes into, isolated excluded.
 *
 * Alif and its five non-connecting cousins have only a final shape beyond the
 * isolated one, so asking for their "medial" form would be asking about
 * something that does not exist.
 */
export function contextualForms(
  letter: ArabicLetter,
): Array<{ form: ArabicFormName; glyph: string }> {
  return ARABIC_FORM_ORDER.filter((form) => form !== 'isolated')
    .filter((form) => Boolean(letter.forms[form]))
    .map((form) => ({ form, glyph: letter.forms[form]! }));
}

/**
 * The stroke sequence to teach for a letter in one style, or undefined.
 *
 * Print and handwritten sequences are authored separately and neither is
 * derived from the other, so a missing one stays missing: the writing screen
 * falls back to tracing the glyph itself rather than inventing a stroke order.
 * Arabic sequences hang off the contextual shapes; the isolated one is what a
 * learner writes first.
 */
export function strokeSequenceOf(
  letter: HebrewLetter | ArabicLetter,
  style: 'print' | 'handwritten',
): StrokeSequence | undefined {
  if (isHebrewLetter(letter)) return letter.strokeOrder?.[style];
  return style === 'print'
    ? letter.strokeOrder?.isolated
    : letter.handwrittenStrokeOrder?.isolated;
}
