import { LETTER_PAIRS, pairSize, type LetterPair } from '../../data/alphabets';

/**
 * The Both alphabet as a ladder of decks.
 *
 * Unlike the single-script practice decks, which are a menu the learner picks
 * from freely, this is the vocabulary categories' shape: ten pairs at a time,
 * the first open and each later one waiting on the deck before it. Meeting
 * fifty-odd letterforms in one sitting is not a lesson, it is a wall, and the
 * two alphabets are only tractable together if they arrive ten sounds at a
 * time.
 *
 * Pure, like `unlock.ts` and for the same reason: the rule that decides what is
 * open should be readable in one place and testable without a database or a
 * rendered screen. What is persisted is only the count of flawless runs per
 * deck, which the settings row holds.
 */

/** Pairs per deck. Ten sounds — twenty letterforms — is a sitting's worth. */
export const PAIR_DECK_SIZE = 10;

/**
 * Flawless runs to open the next deck.
 *
 * One, where a vocabulary deck asks for ten. A word deck is drilled to
 * automaticity; this ladder only paces how fast the alphabets arrive, and a
 * learner who has named twenty letterforms without a single miss has earned the
 * next ten. The letters themselves keep being scored by every other alphabet
 * mode, so nothing here is the last word on whether they are known.
 */
export const RUNS_TO_UNLOCK = 1;

export type PairDeck = {
  /** Stable and URL-safe: `pairs:0`, `pairs:10`. */
  id: string;
  /** 1-based rung on the ladder, for "Deck 2 of 3". */
  position: number;
  title: string;
  description: string;
  pairIds: string[];
  /** Letterforms in the deck: twenty, or fewer where a pair has one half. */
  letterCount: number;
};

export type PairDeckGate = {
  deck: PairDeck;
  unlocked: boolean;
  /** Run flawlessly at least `RUNS_TO_UNLOCK` times. */
  passed: boolean;
  runs: number;
  runsRequired: number;
  /** The deck standing in the way. Set only while `unlocked` is false. */
  blockedBy?: PairDeck;
};

/** Every deck, in order. Fixed: the pairing does not depend on progress. */
export function buildPairDecks(): PairDeck[] {
  const decks: PairDeck[] = [];

  for (let start = 0; start < LETTER_PAIRS.length; start += PAIR_DECK_SIZE) {
    const slice = LETTER_PAIRS.slice(start, start + PAIR_DECK_SIZE);
    decks.push({
      id: 'pairs:' + start,
      position: decks.length + 1,
      title: 'Letters ' + (start + 1) + '–' + (start + slice.length),
      description: slice.map((pair) => pair.sound).join(' · '),
      pairIds: slice.map((pair) => pair.id),
      letterCount: slice.reduce((sum, pair) => sum + pairSize(pair), 0),
    });
  }

  return decks;
}

/**
 * Walks the ladder and works out which decks are open.
 *
 * `runs` is the stored count of flawless runs, keyed by deck id. The first deck
 * is always open; each later one opens once the deck before it has been run
 * clean. Passing a deck can never be undone, so nothing a learner does later
 * closes a deck they have already opened.
 */
export function gatePairDecks(
  runs: Record<string, number | undefined>,
): PairDeckGate[] {
  const gates: PairDeckGate[] = [];
  let previous: PairDeck | undefined;
  let previousPassed = true;

  for (const deck of buildPairDecks()) {
    const completed = runs[deck.id] ?? 0;
    const passed = completed >= RUNS_TO_UNLOCK;

    gates.push({
      deck,
      unlocked: previousPassed,
      passed,
      runs: completed,
      runsRequired: RUNS_TO_UNLOCK,
      blockedBy: previousPassed ? undefined : previous,
    });

    previous = deck;
    previousPassed = passed;
  }

  return gates;
}

export function findPairDeck(deckId: string): PairDeck | undefined {
  return buildPairDecks().find((deck) => deck.id === deckId);
}

/** The pairs of a deck, in deck order, skipping ids that no longer exist. */
export function deckPairs(deck: PairDeck): LetterPair[] {
  return deck.pairIds
    .map((id) => LETTER_PAIRS.find((pair) => pair.id === id))
    .filter((pair): pair is LetterPair => Boolean(pair));
}

/** The one deck the learner should be working on, if any are still open. */
export function nextPairDeck(gates: PairDeckGate[]): PairDeckGate | undefined {
  return gates.find((gate) => gate.unlocked && !gate.passed);
}

/**
 * The stored runs after a deck has been run.
 *
 * Only a flawless run counts. Returned rather than written so the caller owns
 * the persistence, and so the rule can be tested without a settings row.
 */
export function recordPairRun(
  runs: Record<string, number | undefined>,
  deckId: string,
  flawless: boolean,
): Record<string, number> {
  const current: Record<string, number> = {};
  for (const [key, value] of Object.entries(runs)) {
    if (typeof value === 'number') current[key] = value;
  }

  if (!flawless) return current;
  return { ...current, [deckId]: (current[deckId] ?? 0) + 1 };
}
