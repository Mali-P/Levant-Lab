import { shuffle, type RNG } from '../../utils/random';

/**
 * "Put these back where they belong."
 *
 * One engine behind both ordering exercises — the numbers a learner has to be
 * able to count in sequence, and the letters they have to be able to recite in
 * alphabet order. Neither is a multiple-choice question: knowing that ك is kāf
 * is a different thing from knowing that it comes after yāʾ, and only a
 * placement can ask the second.
 *
 * The board is a numbered column with nothing in it and a pile of words beside
 * it. A word dropped on the slot it belongs in stays there; a word dropped
 * anywhere else goes back to the pile it came from. That is the whole rule, and
 * it is deliberately not the older arrange-the-column-then-check-it one: a
 * learner who knows where three goes should be told so the moment she puts it
 * there, and a learner who does not should find out then rather than six moves
 * later, when a verdict can no longer say which move was the wrong one.
 *
 * Slips are counted but nothing is failed. The drill is consolidation, sat
 * between flawless rounds of a deck already learned, and a wall at the end of
 * it would only teach her to stop dragging.
 *
 * Pure, like the study and letter engines beside it. A round is a value that is
 * replaced rather than mutated, so a screen can render straight from what these
 * functions return and the rules can be tested without a rendered list or a
 * pointer event.
 */

export type PlacementRound = {
  /** The right order. Slot `i` takes `solution[i]` and nothing else. */
  solution: string[];
  /** What is sitting in each slot. Only ever the right id, or nothing. */
  slots: (string | null)[];
  /** Still in the pile, jumbled. */
  pool: string[];
  /** Wrong drops across the round. Counted, reported, and never fatal. */
  slips: number;
  /**
   * The id of the drop just turned away, so the pile can flinch at the right
   * chip. Cleared by the next accepted placement.
   */
  rejected?: string;
  /** Every slot filled by the learner. */
  solved: boolean;
  /** Every slot filled by the "show me" button. Never solved. */
  revealed?: boolean;
};

export type CreatePlacementRoundParams = {
  /** The correct order, which is also the set of items in play. */
  solution: string[];
  rng?: RNG;
};

/**
 * An empty column and a jumbled pile.
 *
 * The pile is reshuffled rather than accepted blind. That the slots are empty
 * either way is not the point: a pile sitting in its own order down the side of
 * the screen hands over the answer before the learner has touched anything.
 */
export function createPlacementRound(
  params: CreatePlacementRoundParams,
): PlacementRound {
  const { solution } = params;
  const rng = params.rng ?? Math.random;

  let pool = [...solution];
  if (solution.length > 1) {
    for (let attempt = 0; attempt < 10; attempt++) {
      pool = shuffle(solution, rng);
      if (!sameOrder(pool, solution)) break;
    }
    if (sameOrder(pool, solution)) {
      pool = [...solution.slice(1), solution[0]];
    }
  }

  return {
    solution: [...solution],
    slots: solution.map(() => null),
    pool,
    slips: 0,
    solved: solution.length === 0,
  };
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * Drops one word on one slot.
 *
 * Right, and it stays: the id leaves the pile and the slot is closed for good.
 * Wrong, and the round comes back with a slip against it and `rejected` set —
 * the screen springs the chip back to where it was picked up, because a word
 * left resting in the wrong place looks like an answer the board has accepted.
 *
 * A drop on a slot that is already filled is neither. The only thing that can
 * be sitting there is the right answer, so it is a fumble rather than a guess
 * and nothing is counted against it.
 */
export function placeAt(
  round: PlacementRound,
  id: string,
  slot: number,
): PlacementRound {
  if (round.solved || round.revealed) return round;
  if (!round.pool.includes(id)) return round;
  if (slot < 0 || slot >= round.slots.length) return round;
  if (round.slots[slot] !== null) return round;

  if (round.solution[slot] !== id) {
    return { ...round, slips: round.slips + 1, rejected: id };
  }

  const slots = [...round.slots];
  slots[slot] = id;
  const pool = round.pool.filter((entry) => entry !== id);

  return {
    ...round,
    slots,
    pool,
    rejected: undefined,
    solved: pool.length === 0,
  };
}

/**
 * Fills the column in and ends the round.
 *
 * The way out for a learner who is stuck, and deliberately not a way of
 * finishing: the round is over, it is not solved, and the slips it cost stand.
 * What she is left with is the order itself, on screen, which is the part that
 * teaches.
 */
export function revealPlacement(round: PlacementRound): PlacementRound {
  if (round.solved || round.revealed) return round;
  return {
    ...round,
    slots: [...round.solution],
    pool: [],
    rejected: undefined,
    solved: false,
    revealed: true,
  };
}

/** Solved or given up on. Either way the run moves on. */
export function isSettled(round: PlacementRound): boolean {
  return round.solved || round.revealed === true;
}

/** Placed out of the whole column, for the progress line. */
export function placedCount(round: PlacementRound): number {
  return round.slots.filter((id) => id !== null).length;
}

/**
 * How many rows one round holds.
 *
 * Ten is the sitting the rest of the app is built in — a deck of ten numbers, a
 * level of ten letters — and it is also about as many slots as anyone can hold
 * in their head while dragging the fourth chip. A pile of twenty-eight letters
 * is therefore three rounds rather than one very long column.
 */
export const ORDER_ROUND_SIZE = 10;

export function chunkForOrdering(
  ids: readonly string[],
  size = ORDER_ROUND_SIZE,
): string[][] {
  const chunks: string[][] = [];
  for (let start = 0; start < ids.length; start += size) {
    chunks.push([...ids.slice(start, start + size)]);
  }
  return chunks;
}
