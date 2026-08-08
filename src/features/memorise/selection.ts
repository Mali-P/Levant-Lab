import type { Category, Deck, DeckProgress, Flashcard } from '../../types';
import { gateDecks } from '../review/unlock';
import { sortCards } from '../../utils/cardOrder';

/**
 * What the Memorise tab reads from.
 *
 * Memorise sits in the middle of the tab bar, so it is opened before it is ever
 * configured. It therefore has to answer "which cards?" with no stored choice at
 * all, and the answer is the first deck the learner can open — the one at the
 * top of the first category. She then ticks the decks she wants on each deck's
 * own screen, and that choice is what the tab reads from every time afterwards.
 *
 * The choice is per deck rather than per category because a category can hold
 * ten decks, and a learner four decks in does not want the six behind her dealt
 * into the same read-through as the one she is meeting now.
 *
 * Both functions are pure so the rule can be tested without a database or a
 * rendered screen, the way `unlock.ts` does for the deck ladder.
 */

export type MemoriseDeckParams = {
  categories: Category[];
  decks: Deck[];
  deckProgress: Record<string, DeckProgress | undefined>;
  selectedIds: string[] | undefined;
};

/**
 * The decks to memorise, in the order Study lays them out: category by
 * category, and inside a category up the ladder.
 *
 * Locked decks are never returned, whether or not they were ticked. Memorise
 * grades nothing, but the ladder is about what the learner has met, not about
 * scores — dealing her deck seven of a category she has not opened yet would
 * undo the progression the category screen draws. A deck that has since been
 * deleted quietly drops out instead of leaving a gap, and a selection that
 * matches nothing falls back to the first unlocked deck rather than to an
 * empty tab.
 */
export function memoriseDecks(params: MemoriseDeckParams): Deck[] {
  const open: Deck[] = [];

  for (const category of params.categories) {
    const gates = gateDecks(
      params.decks.filter((d) => d.categoryId === category.id),
      params.deckProgress,
    );
    for (const gate of gates) {
      if (gate.unlocked) open.push(gate.deck);
    }
  }

  const chosen = open.filter((d) => params.selectedIds?.includes(d.id));
  return chosen.length > 0 ? chosen : open.slice(0, 1);
}

/**
 * Every card the chosen decks offer, in reading order: deck by deck, and inside
 * a deck in the deck's own order.
 *
 * Sorted rather than merely filtered because IndexedDB returns rows by id, and
 * a counting deck read out of sequence is not a counting deck.
 */
export function memorisePool(decks: Deck[], cards: Flashcard[]): Flashcard[] {
  const pool: Flashcard[] = [];
  for (const deck of decks) {
    pool.push(...sortCards(cards.filter((c) => c.deckId === deck.id)));
  }
  return pool;
}
