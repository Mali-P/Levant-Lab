import type { Category, Deck, DeckProgress, Flashcard } from '../../types';
import { gateDecks } from '../review/unlock';
import { sortCards } from '../../utils/cardOrder';

/**
 * What the Memorise tab reads from.
 *
 * Memorise sits in the middle of the tab bar, so it is opened before it is ever
 * configured. It therefore has to answer "which cards?" with no stored choice at
 * all, and the answer is the first category — the one the app already puts at
 * the top of Study. The learner then ticks the categories she wants in Study,
 * and that choice is what the tab reads from every time afterwards.
 *
 * Both functions are pure so the rule can be tested without a database or a
 * rendered screen, the way `unlock.ts` does for the deck ladder.
 */

/**
 * The categories to memorise, in the order Study lists them.
 *
 * Ids are matched against the categories that actually exist, so a deleted
 * category quietly drops out instead of leaving a gap. A selection that matches
 * nothing falls back to the first category rather than to an empty tab.
 */
export function memoriseCategories(
  categories: Category[],
  selectedIds: string[] | undefined,
): Category[] {
  const chosen = categories.filter((c) => selectedIds?.includes(c.id));
  return chosen.length > 0 ? chosen : categories.slice(0, 1);
}

export type MemorisePoolParams = {
  /** Already narrowed by `memoriseCategories`. */
  categories: Category[];
  decks: Deck[];
  cards: Flashcard[];
  deckProgress: Record<string, DeckProgress | undefined>;
};

/**
 * Every card the chosen categories offer, in reading order: category by
 * category, deck by deck, and inside a deck in the deck's own order.
 *
 * Locked decks are left out. Memorise grades nothing, but the ladder is about
 * what the learner has met, not about scores — dealing her deck seven of a
 * category she has not opened yet would undo the progression the category
 * screen draws.
 */
export function memorisePool(params: MemorisePoolParams): Flashcard[] {
  const pool: Flashcard[] = [];

  for (const category of params.categories) {
    const gates = gateDecks(
      params.decks.filter((d) => d.categoryId === category.id),
      params.deckProgress,
    );

    for (const gate of gates) {
      if (!gate.unlocked) continue;
      pool.push(
        ...sortCards(params.cards.filter((c) => c.deckId === gate.deck.id)),
      );
    }
  }

  return pool;
}
