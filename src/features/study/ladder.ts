import { shuffle, type RNG } from '../../utils/random';

/**
 * The shape of the climb, and the choosing of the next word.
 *
 * Pure, and free of the session type on purpose: how big a stage is, and which
 * card should be asked next, are the two decisions worth being able to read and
 * test on their own. `engine.ts` owns the state machine that calls them.
 */

/**
 * The rungs, for a deck of the usual ten.
 *
 * Three to start because three is what a person can actually hold after one
 * reading; then two more at a time, so every stage adds a small debt to an
 * already-secure set rather than a second pile beside it.
 */
export const LADDER_STEPS: readonly number[] = [3, 5, 7, 10];

/**
 * The rungs for a deck of this size, always ending on the whole deck.
 *
 * The literal 3 / 5 / 7 / 10 is kept wherever it fits, since that is the
 * progression the decks were written for. A shorter deck simply loses the rungs
 * it has outgrown — six cards climb 3 → 5 → 6 — and a longer one keeps the
 * standard climb and then finishes on everything: fourteen cards go
 * 3 → 5 → 7 → 10 → 14. A deck of three or fewer is a single stage.
 */
export function stageSizes(deckSize: number): number[] {
  if (deckSize <= 0) return [];
  return [...LADDER_STEPS.filter((n) => n < deckSize), deckSize];
}

/** The next rung above `current`, or undefined once the deck is the stage. */
export function nextStageSize(
  deckSize: number,
  current: number,
): number | undefined {
  return stageSizes(deckSize).find((n) => n > current);
}

/**
 * How much more likely a card is to be asked than a settled one.
 *
 * Three tiers rather than two. A word still owed to the current stage has to
 * come round often or the stage never ends; a word already missed once in this
 * stage has to come round sooner still, because that is the one that has not
 * stuck. But a word already recalled keeps a real share of the turns — cut it
 * to nothing and the last two cards of a stage crowd out the first three, which
 * is precisely the short-term-memory trap the ladder exists to avoid.
 */
export const WEIGHT_MISSED = 6;
export const WEIGHT_OWED = 3;
export const WEIGHT_SETTLED = 1;

export type PickParams = {
  /** The cards in play this stage. Never empty. */
  activeCardIds: readonly string[];
  /** Already recalled since the stage began. */
  stageCorrect: readonly string[];
  /** Missed at least once since the stage began, whether or not since put right. */
  stageIncorrect: readonly string[];
  /** Skipped wherever there is anything else to ask. */
  lastAskedCardId?: string;
  rng?: RNG;
};

export function weightFor(
  cardId: string,
  stageCorrect: readonly string[],
  stageIncorrect: readonly string[],
): number {
  const owed = !stageCorrect.includes(cardId);
  if (owed && stageIncorrect.includes(cardId)) return WEIGHT_MISSED;
  if (owed) return WEIGHT_OWED;
  return WEIGHT_SETTLED;
}

/**
 * Picks the next card to ask.
 *
 * Weighted, never cyclic. The learner is not walked round a queue — every card
 * in the active set can come up at any point, so there is no position to learn
 * and no way to know what is coming next. What tilts the draw is only how badly
 * each word is still owed.
 *
 * The card just answered is held back wherever another one could be asked
 * instead, so a mistake is not followed straight away by the same prompt, which
 * would test nothing but the last two seconds. With a single card in the set
 * there is nothing to hold it back in favour of, and it is simply asked again.
 */
export function pickNextCard(params: PickParams): string {
  const { activeCardIds, stageCorrect, stageIncorrect } = params;
  if (activeCardIds.length === 0) {
    throw new Error('Cannot pick a card from an empty active set.');
  }

  const rng = params.rng ?? Math.random;

  const candidates = activeCardIds.filter((id) => id !== params.lastAskedCardId);
  const pool = candidates.length > 0 ? candidates : [...activeCardIds];

  const weights = pool.map((id) => weightFor(id, stageCorrect, stageIncorrect));
  const total = weights.reduce((sum, w) => sum + w, 0);

  let ticket = rng() * total;
  for (const [i, weight] of weights.entries()) {
    ticket -= weight;
    if (ticket < 0) return pool[i];
  }

  // Only reachable if `rng` returns exactly 1, which `Math.random` never does.
  return pool[pool.length - 1];
}

/**
 * A fresh shuffled pass over the cards, for one full-deck mastery round.
 *
 * Reshuffled every round so that what is being recalled is the vocabulary and
 * not the order, and opened on a different card from the one just answered
 * wherever the deck is long enough to have a choice.
 */
export function buildRound(
  cardIds: readonly string[],
  opts: { lastAskedCardId?: string; rng?: RNG } = {},
): string[] {
  const queue = shuffle(cardIds, opts.rng ?? Math.random);
  if (queue.length > 1 && queue[0] === opts.lastAskedCardId) {
    [queue[0], queue[1]] = [queue[1], queue[0]];
  }
  return queue;
}
