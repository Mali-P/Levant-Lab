import { shuffle, type RNG } from '../../utils/random';

/**
 * "Put these back in the order they run in."
 *
 * One engine behind both ordering exercises — the numbers a learner has to be
 * able to count in sequence, and the letters they have to be able to recite in
 * alphabet order. Neither is a multiple-choice question: knowing that ك is kāf
 * is a different thing from knowing that it comes after yāʾ, and only an
 * arrangement can ask the second.
 *
 * The board is the whole column, jumbled, with every row already occupied.
 * There is no pile down the side: a word still waiting in a pile is a word the
 * learner can leave until last, and the column she is actually being asked
 * about is the one in front of her. She takes one row to another and the two
 * change places, as often as she likes.
 *
 * Nothing is marked while she works. A row that turns green the moment it
 * happens to be right does half the drill for her — the jumble already puts a
 * few words near enough their places, and lighting those up tells her which
 * parts of the order she never has to think about. So the column stays silent
 * and she decides when it reads correctly. Reviewing her own answer is the part
 * that teaches; submitting it is the only moment anything is judged.
 *
 * A submission that is wrong is counted and handed back with a score — how many
 * rows were in the right place — and nothing else. The number tells her how
 * close she is, which is what keeps her going; which rows they were would be
 * the same gift as the green row, one step later, and finding the pair that is
 * the wrong way round is exactly the skill being drilled.
 *
 * Attempts are unlimited and nothing is failed. The drill is consolidation, sat
 * between flawless rounds of a deck already learned, and a wall at the end of
 * it would only teach her to stop trying.
 *
 * Pure, like the study and letter engines beside it. A round is a value that is
 * replaced rather than mutated, so a screen can render straight from what these
 * functions return and the rules can be tested without a rendered list or a
 * pointer event.
 */

export type PlacementRound = {
  /** The right order. Slot `i` takes `solution[i]` and nothing else. */
  solution: string[];
  /** What is sitting in each slot. Always full, jumbled to begin with. */
  slots: string[];
  /** Submissions handed back. Counted, reported, and never fatal. */
  slips: number;
  /**
   * The last submission was wrong and nothing has been moved since. The screen
   * says so; it does not say where, and neither does this.
   */
  refused?: boolean;
  /** The order she submitted was the right one. */
  solved: boolean;
  /** The order was put right by the "show me" button. Never solved. */
  revealed?: boolean;
};

export type CreatePlacementRoundParams = {
  /** The correct order, which is also the set of items in play. */
  solution: string[];
  rng?: RNG;
};

/**
 * A full column, jumbled, with nothing already right.
 *
 * Jumbled afresh every time it is called — a learner who runs the drill twice
 * is arranging a different column the second time, not repeating the moves that
 * worked the first. The arrangement is also a derangement rather than any old
 * shuffle: words that happen to land in their own slots are rows she never has
 * to think about, and a shuffle that leaves three of ten sitting right has
 * quietly done a third of the drill for her.
 */
export function createPlacementRound(
  params: CreatePlacementRoundParams,
): PlacementRound {
  const { solution } = params;
  const rng = params.rng ?? Math.random;

  return {
    solution: [...solution],
    slots: derange(solution, rng),
    slips: 0,
    solved: false,
  };
}

/**
 * A rearrangement with nothing left where it started.
 *
 * Shuffled and retried rather than constructed, so no arrangement is favoured
 * over any other. Twenty tries is far past the point of failing by bad luck —
 * a little over one shuffle in three is already a derangement — and the
 * fallback is a rotation, which cannot leave anything in place at all.
 */
function derange(items: readonly string[], rng: RNG): string[] {
  if (items.length < 2) return [...items];

  for (let attempt = 0; attempt < 20; attempt++) {
    const next = shuffle(items, rng);
    if (next.every((id, i) => id !== items[i])) return next;
  }
  return [...items.slice(1), items[0]];
}

/**
 * Swaps two rows over.
 *
 * Always allowed and never judged. The board is hers to arrange until she says
 * she is done, and a swap that says nothing back is what makes the reviewing
 * step real: she has to read the column and decide, rather than shuffle pairs
 * until the colours come out right.
 *
 * The one thing it does clear is a refusal. A wrong submission stands as an
 * unanswered question only until she moves something, at which point she is
 * asking again.
 */
export function swapAt(
  round: PlacementRound,
  a: number,
  b: number,
): PlacementRound {
  if (isSettled(round)) return round;
  if (!inRange(round, a) || !inRange(round, b) || a === b) return round;

  const slots = [...round.slots];
  [slots[a], slots[b]] = [slots[b], slots[a]];

  return { ...round, slots, refused: undefined };
}

function inRange(round: PlacementRound, slot: number): boolean {
  return slot >= 0 && slot < round.slots.length;
}

/**
 * Hands the column in.
 *
 * The only moment anything is graded. Right, and the round is solved; wrong,
 * and it comes back whole and still hers to work on, with the attempt counted,
 * a score against it, and not a word about which rows were out of place.
 *
 * There is no limit on the attempts and there is not meant to be. The column
 * she hands in the fourth time is one she has read through four times, which is
 * the drill working rather than the drill being failed.
 */
export function submitPlacement(round: PlacementRound): PlacementRound {
  if (isSettled(round)) return round;

  if (isRight(round)) {
    return { ...round, refused: undefined, solved: true };
  }
  return { ...round, slips: round.slips + 1, refused: true };
}

/**
 * Back to arranging, with the score taken down off the screen.
 *
 * The count of rows she had right is true of an arrangement, not of the round,
 * so it goes the moment she starts changing that arrangement — by hand here, or
 * simply by moving a row.
 */
export function dismissRefusal(round: PlacementRound): PlacementRound {
  if (!round.refused) return round;
  return { ...round, refused: undefined };
}

/** The column as it stands, against the order it should be in. */
export function isRight(round: PlacementRound): boolean {
  return round.slots.every((id, i) => id === round.solution[i]);
}

/**
 * Puts the column right and ends the round.
 *
 * The way out for a learner who is stuck, and deliberately not a way of
 * finishing: the round is over, it is not solved, and the attempts it cost
 * stand. What she is left with is the order itself, on screen, which is the
 * part that teaches.
 */
export function revealPlacement(round: PlacementRound): PlacementRound {
  if (isSettled(round)) return round;
  return {
    ...round,
    slots: [...round.solution],
    refused: undefined,
    solved: false,
    revealed: true,
  };
}

/** Solved or given up on. Either way the run moves on. */
export function isSettled(round: PlacementRound): boolean {
  return round.solved || round.revealed === true;
}

/**
 * Rows standing in the right place.
 *
 * The score on a submission handed back, and the honest total on one that was
 * not. Never shown while she is arranging: a count that ticks up as she moves
 * rows is the green row again, spread over the whole column.
 */
export function placedCount(round: PlacementRound): number {
  return round.slots.filter((id, i) => id === round.solution[i]).length;
}

/**
 * How many rows one round holds.
 *
 * Ten is the sitting the rest of the app is built in — a deck of ten numbers, a
 * level of ten letters — and it is also about as many rows as anyone can read
 * back through before handing the column in. A pile of twenty-eight letters is
 * therefore three rounds rather than one very long column.
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
