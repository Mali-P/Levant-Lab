import type { Language } from '../../types';
import type { ArabicLetter, HebrewLetter } from '../../types/alphabet';
import { LETTER_PAIRS, pairLetters, type LetterPair } from '../../data/alphabets';

/**
 * What the Review tab reads when it is reading the alphabet rather than a deck.
 *
 * Built from `LETTER_PAIRS` rather than from the two letter lists, because the
 * pairing is the only ordering that can hold both alphabets at once: ב arrives
 * beside ب, and the six Arabic letters Hebrew has no partner for arrive together
 * at the end. Reading the two lists one after the other would meet every Hebrew
 * letter, then start again from alif, and a learner studying both would never
 * see that she is learning twenty-two shapes twice over.
 *
 * The pairs are also complete: all 22 Hebrew letters and all 28 Arabic ones
 * appear exactly once across the 28 rows, so filtering to one language loses
 * nothing and reading with both languages on repeats nothing.
 *
 * Nothing here grades. This is the Review tab's alphabet — the letters read the
 * way its word cards are read — and the scored letter modes stay where they
 * are, under Alphabets.
 */

export type LetterReviewEntry = {
  /** The pair's id, and so the id the pass shuffles and steps through. */
  id: string;
  /**
   * The headline the back opens with.
   *
   * The pair's shared sound where both letters are on the card, and the
   * letter's own romanisation where only one is: `g / j` is an answer about
   * ג *and* ج, and putting it on a Hebrew-only card would teach a reading
   * Hebrew does not have.
   */
  sound: string;
  /** The sound in words, under the headline. Sourced the same way as `sound`. */
  description: string;
  /**
   * Where the two scripts have drifted apart, or what an Arabic-only letter
   * branched off. Every note compares the two alphabets, so it is carried only
   * when both halves are actually on the card.
   */
  note?: string;
  hebrew?: HebrewLetter;
  arabic?: ArabicLetter;
};

/**
 * The letters to read, in pair order, for the languages the learner is
 * studying.
 *
 * A language she has switched off is not merely hidden on the card: its half is
 * left out here, and a row that has nothing left — every Arabic-only row, for a
 * learner reading Hebrew alone — drops out of the pass entirely rather than
 * arriving as an empty card.
 */
export function letterReviewPool(
  languages: readonly Language[],
): LetterReviewEntry[] {
  const entries: LetterReviewEntry[] = [];

  for (const pair of LETTER_PAIRS) {
    const entry = letterReviewEntry(pair, languages);
    if (entry) entries.push(entry);
  }

  return entries;
}

/** One row of the pass, or undefined where she studies neither of its halves. */
export function letterReviewEntry(
  pair: LetterPair,
  languages: readonly Language[],
): LetterReviewEntry | undefined {
  const { hebrew, arabic } = pairLetters(pair);

  const keptHebrew = languages.includes('hebrew') ? hebrew : undefined;
  const keptArabic = languages.includes('arabic') ? arabic : undefined;

  if (!keptHebrew && !keptArabic) return undefined;

  const both = Boolean(keptHebrew && keptArabic);
  const only = (keptHebrew ?? keptArabic) as HebrewLetter | ArabicLetter;

  return {
    id: pair.id,
    sound: both ? pair.sound : only.transliteration,
    description: both ? pair.description : only.commonSound,
    note: both ? pair.note : undefined,
    hebrew: keptHebrew,
    arabic: keptArabic,
  };
}
