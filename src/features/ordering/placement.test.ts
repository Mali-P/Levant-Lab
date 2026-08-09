import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../utils/random';
import {
  chunkForOrdering,
  createPlacementRound,
  isSettled,
  placeAt,
  placedCount,
  revealPlacement,
} from './placement';

const TEN = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

describe('createPlacementRound', () => {
  it('opens with an empty column and every item in the pile', () => {
    const round = createPlacementRound({ solution: TEN, rng: mulberry32(7) });
    expect(round.slots).toEqual(TEN.map(() => null));
    expect([...round.pool].sort()).toEqual([...TEN].sort());
    expect(round.slips).toBe(0);
    expect(round.solved).toBe(false);
  });

  it('never lays the pile out in its own order', () => {
    // Every seed, not a lucky one: a pile that reads one, two, three down the
    // side is the answer, and a two-item round is the case that trips it.
    for (let seed = 1; seed <= 200; seed++) {
      const round = createPlacementRound({ solution: ['a', 'b'], rng: mulberry32(seed) });
      expect(round.pool).toEqual(['b', 'a']);
    }
  });

  it('leaves a single item alone rather than looping for a rearrangement', () => {
    const round = createPlacementRound({ solution: ['only'] });
    expect(round.pool).toEqual(['only']);
    expect(round.solved).toBe(false);
  });
});

describe('placeAt', () => {
  it('keeps a word dropped on the slot it belongs in', () => {
    const round = createPlacementRound({ solution: TEN, rng: mulberry32(3) });
    const next = placeAt(round, 'three', 2);

    expect(next.slots[2]).toBe('three');
    expect(next.pool).not.toContain('three');
    expect(next.slips).toBe(0);
    expect(next.rejected).toBeUndefined();
  });

  it('turns a wrong drop away without moving anything', () => {
    const round = createPlacementRound({ solution: TEN, rng: mulberry32(3) });
    const next = placeAt(round, 'three', 5);

    expect(next.slots.every((id) => id === null)).toBe(true);
    expect(next.pool).toEqual(round.pool);
    expect(next.slips).toBe(1);
    expect(next.rejected).toBe('three');
  });

  it('clears the last rejection once something lands', () => {
    const round = createPlacementRound({ solution: TEN, rng: mulberry32(3) });
    const missed = placeAt(round, 'three', 5);
    const landed = placeAt(missed, 'one', 0);

    expect(landed.rejected).toBeUndefined();
    // The slip it cost is not forgiven along with it.
    expect(landed.slips).toBe(1);
  });

  it('counts nothing against a drop on a slot already filled', () => {
    const round = placeAt(
      createPlacementRound({ solution: TEN, rng: mulberry32(3) }),
      'one',
      0,
    );
    const next = placeAt(round, 'two', 0);

    expect(next).toBe(round);
  });

  it('ignores a word that is not in the pile and a slot off the end', () => {
    const round = createPlacementRound({ solution: TEN, rng: mulberry32(3) });
    expect(placeAt(round, 'eleven', 0)).toBe(round);
    expect(placeAt(round, 'one', -1)).toBe(round);
    expect(placeAt(round, 'one', 10)).toBe(round);
  });

  it('is solved once the pile is empty, and settles there', () => {
    let round = createPlacementRound({ solution: TEN, rng: mulberry32(9) });
    TEN.forEach((id, slot) => {
      round = placeAt(round, id, slot);
    });

    expect(round.solved).toBe(true);
    expect(isSettled(round)).toBe(true);
    expect(placedCount(round)).toBe(10);
    // Nothing further can be dropped on a finished board.
    expect(placeAt(round, 'one', 0)).toBe(round);
  });
});

describe('revealPlacement', () => {
  it('fills the column in without ever calling it solved', () => {
    const round = createPlacementRound({ solution: TEN, rng: mulberry32(4) });
    const shown = revealPlacement(placeAt(round, 'three', 5));

    expect(shown.slots).toEqual(TEN);
    expect(shown.pool).toEqual([]);
    expect(shown.solved).toBe(false);
    expect(shown.revealed).toBe(true);
    expect(isSettled(shown)).toBe(true);
    // The slip that led her to give up still stands.
    expect(shown.slips).toBe(1);
  });

  it('leaves a solved round alone', () => {
    let round = createPlacementRound({ solution: ['a', 'b'], rng: mulberry32(1) });
    round = placeAt(round, 'a', 0);
    round = placeAt(round, 'b', 1);

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
