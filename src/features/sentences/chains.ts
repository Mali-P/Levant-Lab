import type { Category, Deck, DeckProgress, Flashcard } from '../../types';
import {
  SENTENCE_FINAL_TEST_CATEGORY,
} from '../../constants/sentences';
import { deckLots, isSentenceCategory, type Lot } from '../review/languagePolicy';
import { isDeckMastered } from '../review/unlock';
import { sortCards } from '../../utils/cardOrder';

/**
 * The pure half of the Sentence Building screens: which categories are the
 * groups, which decks make one chain, how far a chain has got, and which
 * piece each step added — the readable facts the build view is drawn from.
 *
 * Chains lean entirely on shapes that already exist. A chain is a lot — three
 * language rungs over the same sentences, grouped by `deckLots` exactly as the
 * course groups its own — so nothing here re-derives staging; it only reads it.
 */

/** The sentence groups, in course order, with the final test kept apart. */
export function sentenceGroups(categories: Category[]): Category[] {
  return categories
    .filter(
      (category) =>
        isSentenceCategory(category) &&
        category.name !== SENTENCE_FINAL_TEST_CATEGORY,
    )
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** The final test's category, once the learner's install has one. */
export function finalTestCategory(categories: Category[]): Category | undefined {
  return categories.find(
    (category) => category.name === SENTENCE_FINAL_TEST_CATEGORY,
  );
}

/** One group's chains: its decks folded back into lots, in course order. */
export function chainsOf(groupDecks: Deck[]): Lot[] {
  return deckLots(groupDecks);
}

/** Whether every rung of the chain is mastered — Hebrew and Arabic alike. */
export function chainFinished(
  chain: Lot,
  deckProgress: Record<string, DeckProgress | undefined>,
): boolean {
  return chain.decks.every((deck) => isDeckMastered(deck, deckProgress[deck.id]));
}

/** Rungs of the chain already mastered, for a "2 of 3" line. */
export function rungsMastered(
  chain: Lot,
  deckProgress: Record<string, DeckProgress | undefined>,
): number {
  return chain.decks.filter((deck) => isDeckMastered(deck, deckProgress[deck.id]))
    .length;
}

/**
 * The chain's sentences in the order they grow, read off one rung.
 *
 * Any rung serves: all three deal the same sentences in the same order, so the
 * first deck of the lot is as good as the Hebrew one and covers a lot that is
 * missing a rung.
 */
export function chainSteps(chain: Lot, cards: Flashcard[]): Flashcard[] {
  const deck = chain.hebrew ?? chain.decks[0];
  if (!deck) return [];
  return sortCards(cards.filter((card) => card.deckId === deck.id));
}

/**
 * The words this step added to the one before it, or undefined where the step
 * is not a plain extension.
 *
 * Derived rather than authored, because the English already says it: "I can
 * go" extends "I can" by "go". The boundary must be a whole word — "I can't"
 * merely *starts like* "I can", and highlighting "'t" would present a new verb
 * form as a bolt-on. A substitution step ("I want coffee" after "I want
 * water") extends nothing and comes back undefined, which the build view reads
 * as a step that changes a piece rather than adding one.
 */
export function addedPiece(
  previous: string | undefined,
  english: string,
): string | undefined {
  if (!previous) return undefined;
  if (!english.startsWith(previous)) return undefined;
  if (english[previous.length] !== ' ') return undefined;
  const added = english.slice(previous.length + 1).trim();
  return added.length > 0 ? added : undefined;
}
