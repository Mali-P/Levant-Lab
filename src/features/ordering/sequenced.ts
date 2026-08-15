import type { Category, Deck } from '../../types';
import { SEQUENCED_CATEGORY } from '../../constants/seed';
import {
  BASICS_CATEGORY_NAME,
  basicsBaseName,
} from '../review/languagePolicy';

/**
 * Which decks the ordering drill is allowed to ask about.
 *
 * The drill asks what comes after what, and that is only a question where the
 * deck is a sequence. One to ten is; "Hello and goodbye" is not — its ten cards
 * sit in the order somebody happened to write them down, so asking a learner to
 * reproduce that order would test the deck's file rather than the language, and
 * marking her wrong for putting شكرا before أهلا would be worse than asking
 * nothing at all.
 *
 * So: the numbers, the explicitly ordered basics decks, and the alphabets. The
 * alphabets reach the drill from their own module — a script is a sequence by
 * definition and needs no permission — and every other category of words and
 * sentences is left alone.
 */

/** The categories whose decks run in an order. */
const SEQUENCED_CATEGORIES: readonly string[] = [SEQUENCED_CATEGORY];
const SEQUENCED_BASICS_DECKS: readonly string[] = [
  'Question words',
  'Days of the week',
];

export function isSequencedCategory(
  category: Pick<Category, 'name'> | undefined,
): boolean {
  if (!category) return false;
  const name = category.name.trim().toLowerCase();
  return SEQUENCED_CATEGORIES.some((entry) => entry.toLowerCase() === name);
}

/**
 * Whether this deck may be put in order.
 *
 * Decided by the category rather than by the deck, so a category that gains a
 * second counting deck — twenties, hundreds — is covered the day it is written
 * and nothing has to be flagged card by card. A category the learner renames
 * simply stops being sequenced, which is the right way round: the app has no
 * business insisting a deck is numbers when its owner says otherwise.
 */
export function isSequencedDeck(
  deck: Pick<Deck, 'categoryId' | 'name'> | undefined,
  categories: readonly Category[],
): boolean {
  if (!deck) return false;
  const category = categories.find((c) => c.id === deck.categoryId);
  if (isSequencedCategory(category)) return true;
  if (category?.name !== BASICS_CATEGORY_NAME) return false;

  const name = basicsBaseName(deck).trim().toLowerCase();
  return SEQUENCED_BASICS_DECKS.some((entry) => entry.toLowerCase() === name);
}
