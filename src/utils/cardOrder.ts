import type { Flashcard } from '../types';

/**
 * A deck's own reading order.
 *
 * IndexedDB hands rows back keyed by id, and a card id is a random string, so
 * an unsorted `cards.filter(...)` deals a counting deck as "three, nine, one".
 * Starter cards therefore carry the position they hold in the seed, and every
 * screen that shows a deck in its own order reads it through here.
 *
 * Cards the learner wrote themselves have no `order` and sit after the starter
 * words, oldest first. English is the last resort so the result never depends
 * on the order the database happened to return.
 */
export function sortCards(cards: Flashcard[]): Flashcard[] {
  return [...cards].sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.english.localeCompare(b.english),
  );
}
