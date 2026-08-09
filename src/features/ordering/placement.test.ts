import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../utils/random';
import {
  chunkForOrdering,
  createPlacementRound,
  dismissRefusal,
  isRight,
  isSettled,
  placedCount,
  revealPlacement,
  submitPlacement,
  swapAt,
  type PlacementRound,
} from './placement';

const TEN = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** Where an id is currently sitting, which is what a swap is expressed in. */
function at(round: PlacementRound, id: string): number {
  return round.slots.indexOf(id);
}

/** Swaps whatever is in a slot with the word that belongs there. */
function putRight(round: PlacementRound, slot: number): PlacementRound {
  return swapAt(round, slot, at(round, round.solution[slot]));
}

/** Arranges the whole column correctly, the way a learner eventually would. */
function arrange(round: PlacementRound): PlacementRound {
  return round.solution.reduce((r, _, slot) => putRight(r, slot), round);
}

describe('createPlacementRound', () => {
  it('opens with every row filled and every word in play', () => {
    const round = createPlacementRound({ solution: TEN, rng: mulberry32(7) });
    expect([...round.slots].sort()).toEqual([...TEN].sort());
    expect(round.slips).toBe(0);
    expect(round.solved).toBe(false);
  });

  it('never leaves a word in the place it belongs', () => {
    // Every seed, not a lucky one. A shuffle that drops three of ten into their
    // own slots has quietly done a third of the drill for the learner.
    for (let seed = 1; seed <= 200; seed++) {
      const round = createPlacementRound({ solution: TEN, rng: mulberry32(seed) });
      expect(round.slots.some((id, i) => id === TEN[i])).toBe(false);
      expect(placedCount(round)).toBe(0);
    }
  });

  it('jumbles differently from one deal to the next', () => {
    // The rng is drawn from as it goes rather than reset, so two rounds off the
    // same source are two different columns.
    const rng = mulberry32(11);
    const arrangements = new Set<string>();
    for (let deal = 0; deal < 20; deal++) {
      arrangements.add(createPlacementRound({ solution: TEN, rng }).slots.join(','));
    }
    expect(arrangements.size).toBeGreaterThan(15);
  });

  it('turns a pair over, which is the only derangement of two', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const round = createPlacementRound({ solution: ['a', 'b'], rng: mulberry32(seed) });
      expect(round.slots).toEqual(['b', 'a']);
    }
  });

  it('leaves a column of one alone, since there is no pair to turn over', () => {
    const round = createPlacementRound({ solution: ['only'] });
    expect(round.slots).toEqual(['only']);
    expect(round.solved).toBe(false);
    // It is already in order; she still has to hand it in.
    expect(isRight(round)).toBe(true);
  });
});

describe('swapAt', () => {
  it('swaps two rows over and says nothing about it', () => {
    const round = createPlacementRound({ solution: TEN, rng: mulberry32(3) });
    const next = swapAt(round, 0, 4);

    expect(next.slots[0]).toBe(round.slots[4]);
    expect(next.slots[4]).toBe(round.slots[0]);
    expect(next.slips).toBe(0);
    expect(next.solved).toBe(false);
  });

  it('takes a swap that puts a word right without marking it', () => {
    const round = putRight(createPlacementRound({ solution: TEN, rng: mulberry32(3) }), 0);

    expect(round.slots[0]).toBe('one');
    expect(round.slips).toBe(0);
    // Nothing on the round says so. Only a submission grades anything.
    expect(round.solved).toBe(false);
  });

  it('does not call a column solved just because it is right', () => {
    const round = arrange(createPlacementRound({ solution: TEN, rng: mulberry32(3) }));

    expect(round.slots).toEqual(TEN);
    expect(isRight(round)).toBe(true);
    expect(round.solved).toBe(false);
  });

  it('takes the score off the screen the moment she moves something', () => {
    const round = submitPlacement(createPlacementRound({ solution: TEN, rng: mulberry32(3) }));
    expect(round.refused).toBe(true);

    expect(swapAt(round, 0, 1).refused).toBeUndefined();
  });

  it('ignores a slot off the end and a row swapped with itself', () => {
    const round = createPlacementRound({ solution: TEN, rng: mulberry32(3) });
    expect(swapAt(round, -1, 0)).toBe(round);
    expect(swapAt(round, 0, 10)).toBe(round);
    expect(swapAt(round, 4, 4)).toBe(round);
  });

  it('is over once the round is settled', () => {
    const solved = submitPlacement(
      arrange(createPlacementRound({ solution: TEN, rng: mulberry32(3) })),
    );
    expect(swapAt(solved, 0, 1)).toBe(solved);

    const shown = revealPlacement(createPlacementRound({ solution: TEN, rng: mulberry32(3) }));
    expect(swapAt(shown, 0, 1)).toBe(shown);
  });
});

describe('submitPlacement', () => {
  it('solves the round when the column is right', () => {
    const round = submitPlacement(
      arrange(createPlacementRound({ solution: TEN, rng: mulberry32(9) })),
    );

    expect(round.solved).toBe(true);
    expect(round.slips).toBe(0);
    expect(round.refused).toBeUndefined();
    expect(isSettled(round)).toBe(true);
    expect(placedCount(round)).toBe(10);
  });

  it('hands a wrong column straight back, whole', () => {
    const dealt = createPlacementRound({ solution: TEN, rng: mulberry32(9) });
    const next = submitPlacement(dealt);

    expect(next.slots).toEqual(dealt.slots);
    expect(next.solved).toBe(false);
    expect(next.refused).toBe(true);
    expect(next.slips).toBe(1);
    expect(isSettled(next)).toBe(false);
  });

  it('takes as many goes as she needs', () => {
    let round = createPlacementRound({ solution: TEN, rng: mulberry32(9) });

    for (let go = 1; go <= 6; go++) {
      round = submitPlacement(round);
      expect(round.slips).toBe(go);
      expect(isSettled(round)).toBe(false);
      // Still hers to work on after every one of them.
      round = swapAt(round, 0, 1);
    }

    round = submitPlacement(arrange(round));
    expect(round.solved).toBe(true);
    // What it took is kept, because the screen says so at the end.
    expect(round.slips).toBe(6);
  });

  it('scores a refused column without saying which rows were out', () => {
    // Two words the wrong way round, eight of ten standing right.
    const round = submitPlacement(
      swapAt(arrange(createPlacementRound({ solution: TEN, rng: mulberry32(2) })), 3, 8),
    );

    expect(round.refused).toBe(true);
    expect(placedCount(round)).toBe(8);
    // The round carries a count and nothing that names a slot.
    expect(Object.keys(round).sort()).toEqual(
      ['refused', 'slips', 'slots', 'solution', 'solved'].sort(),
    );
  });

  it('does nothing to a round already over', () => {
    const solved = submitPlacement(
      arrange(createPlacementRound({ solution: TEN, rng: mulberry32(9) })),
    );
    expect(submitPlacement(solved)).toBe(solved);

    const shown = revealPlacement(createPlacementRound({ solution: TEN, rng: mulberry32(9) }));
    expect(submitPlacement(shown)).toBe(shown);
  });
});

describe('dismissRefusal', () => {
  it('puts her back to arranging with the score taken down', () => {
    const refused = submitPlacement(createPlacementRound({ solution: TEN, rng: mulberry32(9) }));
    const back = dismissRefusal(refused);

    expect(back.refused).toBeUndefined();
    expect(back.slots).toEqual(refused.slots);
    // The go it cost is not forgiven along with it.
    expect(back.slips).toBe(1);
  });

  it('leaves a round with nothing to dismiss alone', () => {
    const round = createPlacementRound({ solution: TEN, rng: mulberry32(9) });
    expect(dismissRefusal(round)).toBe(round);
  });
});

describe('revealPlacement', () => {
  it('puts the column right without ever calling it solved', () => {
    const round = submitPlacement(createPlacementRound({ solution: TEN, rng: mulberry32(4) }));
    const shown = revealPlacement(round);

    expect(shown.slots).toEqual(TEN);
    expect(shown.solved).toBe(false);
    expect(shown.revealed).toBe(true);
    expect(shown.refused).toBeUndefined();
    expect(isSettled(shown)).toBe(true);
    // The go that led her to give up still stands.
    expect(shown.slips).toBe(1);
  });

  it('leaves a solved round alone', () => {
    const round = submitPlacement(
      arrange(createPlacementRound({ solution: ['a', 'b'], rng: mulberry32(1) })),
    );

    expect(round.solved).toBe(true);
    expect(revealPlacement(round)).toBe(round);
  });
});

describe('chunkForOrdering', () => {
  it('cuts a long pile into sittings of ten, in order', () => {
    const ids = Array.from({ length: 28 }, (_, i) => 'l' + i);
    const chunks = chunkForOrdering(ids);

    expect(chunks.map((c) => c.length)).toEqual([10, 10, 8]);
    expect(chunks.flat()).toEqual(ids);
  });

  it('leaves a deck of ten as a single round', () => {
    expect(chunkForOrdering(TEN)).toEqual([TEN]);
  });
});
