// Every character class below is written with \u escapes on purpose. Literal
// Hebrew and Arabic inside a regex range renders in bidi order in most editors,
// which makes "from-to" ranges impossible to review by eye.

/** Hebrew cantillation marks, niqqud and meteg (U+0591..U+05C7). */
const HEBREW_DIACRITICS = /[֑-ׇ]/g;

/**
 * Arabic tashkeel (U+064B..U+0652), extra marks (U+0653..U+065F),
 * superscript alef (U+0670), the tatweel elongation dash (U+0640) and
 * Quranic annotation marks (U+06D6..U+06ED).
 */
const ARABIC_DIACRITICS = /[ً-ٰٟـۖ-ۭ]/g;

/**
 * Punctuation that must never decide correctness: Latin marks, dashes and
 * smart quotes, Hebrew maqaf / geresh / gershayim, and the Arabic comma,
 * semicolon, question mark, full stop and thousands separators.
 */
const PUNCTUATION =
  /[.,;:!?'"()[\]{}\-«»־׳״،؛؟٪-٭۔‐-―‘’“”]/g;

/** Zero-width and bidi control characters that ride along on pasted text. */
const INVISIBLES = /[​-‏‪-‮⁦-⁩﻿]/g;

export type NormaliseOptions = {
  /** Defaults to true. Hebrew niqqud and Arabic tashkeel are ignored. */
  ignoreDiacritics?: boolean;
  /**
   * Fold Arabic letters that vary by writer: hamza carriers to bare alef,
   * alef maqsura to ya, ta marbuta to ha. Levantine spelling is not
   * standardised, so this defaults to true.
   */
  lenientArabicLetters?: boolean;
};

function foldArabicLetters(input: string): string {
  return input
    .replace(/[آأإٱ]/g, 'ا') // alef w/ hamza|madda -> alef
    .replace(/ى/g, 'ي') // alef maqsura -> ya
    .replace(/ة/g, 'ه') // ta marbuta -> ha
    .replace(/ؤ/g, 'و') // waw w/ hamza -> waw
    .replace(/ئ/g, 'ي'); // ya w/ hamza -> ya
}

export function normalise(
  raw: string,
  language: 'hebrew' | 'arabic' | 'english',
  opts: NormaliseOptions = {},
): string {
  let out = (raw ?? '').normalize('NFC');

  out = out.replace(INVISIBLES, '');
  out = out.replace(PUNCTUATION, '');

  if (opts.ignoreDiacritics !== false) {
    if (language === 'hebrew') out = out.replace(HEBREW_DIACRITICS, '');
    if (language === 'arabic') out = out.replace(ARABIC_DIACRITICS, '');
  }

  if (language === 'arabic' && opts.lenientArabicLetters !== false) {
    out = foldArabicLetters(out);
  }

  if (language === 'english') out = out.toLocaleLowerCase();

  // Collapse every run of whitespace, then trim the ends.
  return out.replace(/\s+/g, ' ').trim();
}
