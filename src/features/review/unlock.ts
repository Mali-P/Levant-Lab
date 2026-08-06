import type { Deck, DeckProgress } from '../../types';

/**
 * Decks inside a category are a ladder, not a menu: the learner works the first
 * one until it is mastered, and only then may open the second. Everything here
 * is pure so the rule can be read off in one place and tested without a
 * database or a rendered screen.
 */

/**
 * Category order: explicit `order` first, then creation time for decks written
 * before ordering existed, then name so the result never depends on whatever
 * order IndexedDB happened to hand the rows back in.
 */
export function sortDecks(decks: Deck[]): Deck[] {
  return [...decks].sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.name.localeCompare(b.name),
  );
}

/**
 * A deck is mastered once it has been run flawlessly as many times as it asks
 * for — ten 10/10 runs on the starter decks.
 *
 * `hardModePassedAt` counts too, and permanently. Hard mode can knock
 * `perfectRunsCompleted` back down after a slip, and a deck the learner has
 * already finished must never re-lock the one behind it.
 */
export function isDeckMastered(
  deck: Deck,
  progress: DeckProgress | undefined,
): boolean {
  if (progress?.hardModePassedAt) return true;
  const required = Math.max(1, deck.perfectRunsRequired);
  return (progress?.perfectRunsCompleted ?? 0) >= required;
}

export type DeckGate = {
  deck: Deck;
  /** 1-based rung on the ladder, for "Deck 3 of 10". */
  position: number;
  unlocked: boolean;
  mastered: boolean;
  perfectRunsCompleted: number;
  perfectRunsRequired: number;
  /** The deck standing in the way. Set only while `unlocked` is false. */
  blockedBy?: Deck;
};

/**
 * Walks a category's decks in order and works out which are open. The first is
 * always open; each later one opens when the deck before it is mastered.
 */
export function gateDecks(
  decks: Deck[],
  deckProgress: Record<string, DeckProgress | undefined>,
): DeckGate[] {
  const ordered = sortDecks(decks);
  const gates: DeckGate[] = [];
  let previous: Deck | undefined;
  let previousMastered = true;

  for (const [index, deck] of ordered.entries()) {
    const progress = deckProgress[deck.id];
    const mastered = isDeckMastered(deck, progress);

    gates.push({
      deck,
      position: index + 1,
      unlocked: previousMastered,
      mastered,
      perfectRunsCompleted: progress?.perfectRunsCompleted ?? 0,
      perfectRunsRequired: Math.max(1, deck.perfectRunsRequired),
      blockedBy: previousMastered ? undefined : previous,
    });

    previous = deck;
    previousMastered = mastered;
  }

  return gates;
}

/** The one deck the learner should be working on, if any are still open. */
export function nextDeck(gates: DeckGate[]): DeckGate | undefined {
  return gates.find((g) => g.unlocked && !g.mastered);
}

export function unlockedCount(gates: DeckGate[]): number {
  return gates.filter((g) => g.unlocked).length;
}
