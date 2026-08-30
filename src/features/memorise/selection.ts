import type { Category, Deck, DeckProgress, Flashcard, Language } from '../../types';
import { gateCategories, type OpenedChoices } from '../review/languagePolicy';
import { sortCards } from '../../utils/cardOrder';

/**
 * What the Review tab's selection run reads from.
 *
 * The run can be opened before it is ever configured, so it has to answer
 * "which cards?" with no stored choice at all, and the answer is the first deck
 * the learner can open — the one at the top of the first category. She then
 * ticks the decks she wants with the plus while browsing Review, and that
 * choice is what the run reads from every time afterwards.
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
  languages?: readonly Language[];
  /** The lots and categories the learner has chosen to have open. */
  opened?: OpenedChoices;
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
  const open = unlockedDecks(params);
  const chosen = open.filter((d) => params.selectedIds?.includes(d.id));
  return chosen.length > 0 ? chosen : open.slice(0, 1);
}

/**
 * Every deck the learner can open, category by category and inside a category
 * up the ladder — the order Practice lays them out in.
 *
 * Split out because two things need it now: the pile above, and the tab's
 * memory of the deck it was last reading, which has to be checked against the
 * same ladder before it is honoured.
 */
export function unlockedDecks(
  params: Pick<
    MemoriseDeckParams,
    'categories' | 'decks' | 'deckProgress' | 'languages' | 'opened'
  >,
): Deck[] {
  const open: Deck[] = [];

  for (const entry of gateCategories(
    params.categories,
    params.decks,
    params.deckProgress,
    params.languages ?? ['hebrew', 'arabic'],
    params.opened,
  )) {
    for (const gate of entry.gates) {
      if (gate.unlocked) open.push(gate.deck);
    }
  }

  return open;
}

/**
 * The remembered deck, but only if it is still one the learner can open.
 *
 * A deck can be deleted between two visits to the tab, and a restored backup
 * can close one that was open — so the id is never trusted on its own.
 * Anything that fails the check comes back undefined and the tab shows its
 * browse, rather than a deck-not-found.
 */
export function resumeDeck(
  params: Pick<
    MemoriseDeckParams,
    'categories' | 'decks' | 'deckProgress' | 'languages' | 'opened'
  > & {
    lastDeckId: string | undefined;
  },
): Deck | undefined {
  if (!params.lastDeckId) return undefined;
  return unlockedDecks(params).find((d) => d.id === params.lastDeckId);
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
