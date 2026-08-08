import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../utils/random';
import {
  buildRound,
  nextStageSize,
  pickNextCard,
  stageSizes,
  weightFor,
  WEIGHT_MISSED,
  WEIGHT_OWED,
  WEIGHT_SETTLED,
} from './ladder';

const TEN = Array.from({ length: 10 }, (_unused, i) => 'c' + (i + 1));

describe('stageSizes', () => {
  it('climbs 3, 5, 7, 10 for the standard deck', () => {
    expect(stageSizes(10)).toEqual([3, 5, 7, 10]);
  });

  it('drops the rungs a short deck has outgrown and finishes on the deck', () => {
    expect(stageSizes(6)).toEqual([3, 5, 6]);
    expect(stageSizes(4)).toEqual([3, 4]);
  });

  it('makes a deck of three or fewer a single stage', () => {
    expect(stageSizes(3)).toEqual([3]);
    expect(stageSizes(2)).toEqual([2]);
    expect(stageSizes(1)).toEqual([1]);
  });

  it('keeps the standard climb on a longer deck, then takes everything', () => {
    expect(stageSizes(14)).toEqual([3, 5, 7, 10, 14]);
  });

  it('has no stages at all for an empty deck', () => {
    expect(stageSizes(0)).toEqual([]);
  });
});

describe('nextStageSize', () => {
  it('names the rung above the current one', () => {
    expect(nextStageSize(10, 3)).toBe(5);
    expect(nextStageSize(10, 5)).toBe(7);
    expect(nextStageSize(10, 7)).toBe(10);
  });

  it('returns nothing once the deck is the stage', () => {
    expect(nextStageSize(10, 10)).toBeUndefined();
    expect(nextStageSize(6, 6)).toBeUndefined();
  });
});

describe('weightFor', () => {
  it('ranks a missed card above one merely owed, and both above a settled one', () => {
    expect(weightFor('c1', [], ['c1'])).toBe(WEIGHT_MISSED);
    expect(weightFor('c1', [], [])).toBe(WEIGHT_OWED);
    expect(weightFor('c1', ['c1'], [])).toBe(WEIGHT_SETTLED);
  });

  it('drops a card back to settled once it has been put right', () => {
    // Missed earlier in the stage but recalled since: it keeps coming round,
    // just no longer ahead of everything else.
    expect(weightFor('c1', ['c1'], ['c1'])).toBe(WEIGHT_SETTLED);
  });
});

describe('pickNextCard', () => {
  const active = ['c1', 'c2', 'c3'];

  it('never repeats the card just asked while another one exists', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const picked = pickNextCard({
        activeCardIds: active,
        stageCorrect: [],
        stageIncorrect: [],
        lastAskedCardId: 'c2',
        rng: mulberry32(seed),
      });
      expect(picked).not.toBe('c2');
    }
  });

  it('repeats the only card there is rather than refusing to ask', () => {
    expect(
      pickNextCard({
        activeCardIds: ['c1'],
        stageCorrect: [],
        stageIncorrect: [],
        lastAskedCardId: 'c1',
        rng: mulberry32(3),
      }),
    ).toBe('c1');
  });

  it('does not settle into a fixed cycle', () => {
    const rng = mulberry32(7);
    const seen: string[] = [];
    let last: string | undefined;

    for (let i = 0; i < 30; i++) {
      last = pickNextCard({
        activeCardIds: TEN,
        stageCorrect: [],
        stageIncorrect: [],
        lastAskedCardId: last,
        rng,
      });
      seen.push(last);
    }

    // A queue walked in order would repeat its first ten exactly.
    expect(seen.slice(0, 10)).not.toEqual(seen.slice(10, 20));
  });

  it('asks a missed card more often than one that never slipped', () => {
    const rng = mulberry32(11);
    const counts: Record<string, number> = { c1: 0, c2: 0, c3: 0 };

    for (let i = 0; i < 3000; i++) {
      counts[
        pickNextCard({
          activeCardIds: active,
          stageCorrect: [],
          stageIncorrect: ['c1'],
          rng,
        })
      ] += 1;
    }

    expect(counts.c1).toBeGreaterThan(counts.c2 * 1.5);
    expect(counts.c1).toBeGreaterThan(counts.c3 * 1.5);
  });

  it('keeps asking the cards already recalled, so they cannot be crowded out', () => {
    const rng = mulberry32(13);
    let settled = 0;

    // Four of five recalled: without a floor under their weight the one card
    // still owed would take every remaining turn, and the earlier words would
    // fall out of memory while she chased it.
    for (let i = 0; i < 2000; i++) {
      const picked = pickNextCard({
        activeCardIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
        stageCorrect: ['c1', 'c2', 'c3', 'c4'],
        stageIncorrect: ['c5'],
        rng,
      });
      if (picked !== 'c5') settled += 1;
    }

    expect(settled).toBeGreaterThan(200);
  });

  it('refuses an empty set rather than returning undefined', () => {
    expect(() =>
      pickNextCard({ activeCardIds: [], stageCorrect: [], stageIncorrect: [] }),
    ).toThrow(/empty active set/i);
  });
});

describe('buildRound', () => {
  it('deals every card exactly once', () => {
    const round = buildRound(TEN, { rng: mulberry32(5) });
    expect([...round].sort()).toEqual([...TEN].sort());
  });

  it('reshuffles, so the order is not the same every round', () => {
    const a = buildRound(TEN, { rng: mulberry32(5) });
    const b = buildRound(TEN, { rng: mulberry32(9) });
    expect(a).not.toEqual(b);
  });

  it('does not open on the card just answered', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const round = buildRound(TEN, {
        lastAskedCardId: 'c4',
        rng: mulberry32(seed),
      });
      expect(round[0]).not.toBe('c4');
      expect([...round].sort()).toEqual([...TEN].sort());
    }
  });

  it('has nowhere else to start with a single card', () => {
    expect(buildRound(['c1'], { lastAskedCardId: 'c1' })).toEqual(['c1']);
  });
});
