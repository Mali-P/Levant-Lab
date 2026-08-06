import { describe, expect, it } from 'vitest';
import type { Deck, DeckProgress } from '../../types';
import { gateDecks, isDeckMastered, nextDeck, sortDecks } from './unlock';

const T0 = '2026-01-02T09:00:00.000Z';

function deck(id: string, order?: number, overrides: Partial<Deck> = {}): Deck {
  return {
    id,
    categoryId: 'cat',
    name: 'Deck ' + id,
    order,
    perfectRunsRequired: 10,
    promptDirections: ['en>he+ar'],
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}

function progress(
  deckId: string,
  overrides: Partial<DeckProgress> = {},
): DeckProgress {
  return { deckId, perfectRunsCompleted: 0, hardModeFailures: 0, ...overrides };
}

describe('sortDecks', () => {
  it('orders by position', () => {
    const sorted = sortDecks([deck('c', 2), deck('a', 0), deck('b', 1)]);
    expect(sorted.map((d) => d.id)).toEqual(['a', 'b', 'c']);
  });

  it('puts decks with no position last, oldest first', () => {
    const sorted = sortDecks([
      deck('legacy-new', undefined, { createdAt: '2026-03-01T00:00:00.000Z' }),
      deck('legacy-old', undefined, { createdAt: '2026-02-01T00:00:00.000Z' }),
      deck('placed', 0),
    ]);
    expect(sorted.map((d) => d.id)).toEqual(['placed', 'legacy-old', 'legacy-new']);
  });

  it('leaves the input untouched', () => {
    const input = [deck('b', 1), deck('a', 0)];
    sortDecks(input);
    expect(input.map((d) => d.id)).toEqual(['b', 'a']);
  });
});

describe('isDeckMastered', () => {
  it('needs the full count of perfect runs', () => {
    const d = deck('a', 0);
    expect(isDeckMastered(d, progress('a', { perfectRunsCompleted: 9 }))).toBe(false);
    expect(isDeckMastered(d, progress('a', { perfectRunsCompleted: 10 }))).toBe(true);
  });

  it('treats a deck never studied as unmastered', () => {
    expect(isDeckMastered(deck('a', 0), undefined)).toBe(false);
  });

  it('keeps a passed deck mastered after a hard-mode slip reset the count', () => {
    const stamped = progress('a', {
      perfectRunsCompleted: 0,
      hardModePassedAt: '2026-04-01T00:00:00.000Z',
    });
    expect(isDeckMastered(deck('a', 0), stamped)).toBe(true);
  });
});

describe('gateDecks', () => {
  const ladder = [deck('a', 0), deck('b', 1), deck('c', 2)];

  it('opens only the first deck on a fresh install', () => {
    const gates = gateDecks(ladder, {});
    expect(gates.map((g) => g.unlocked)).toEqual([true, false, false]);
    expect(gates.map((g) => g.position)).toEqual([1, 2, 3]);
  });

  it('names the deck standing in the way', () => {
    const gates = gateDecks(ladder, {});
    expect(gates[1].blockedBy?.id).toBe('a');
    expect(gates[0].blockedBy).toBeUndefined();
  });

  it('opens the next deck once the one before it is mastered', () => {
    const gates = gateDecks(ladder, {
      a: progress('a', { perfectRunsCompleted: 10 }),
    });
    expect(gates.map((g) => g.unlocked)).toEqual([true, true, false]);
  });

  it('does not open a deck two rungs ahead', () => {
    // Progress on a locked deck — from a backup, or from before the ladder
    // existed — must not let the learner skip the deck in between.
    const gates = gateDecks(ladder, {
      a: progress('a', { perfectRunsCompleted: 10 }),
      c: progress('c', { perfectRunsCompleted: 10 }),
    });
    expect(gates.map((g) => g.unlocked)).toEqual([true, true, false]);
    expect(gates[2].blockedBy?.id).toBe('b');
  });

  it('reports partial progress on the open deck', () => {
    const gates = gateDecks(ladder, {
      a: progress('a', { perfectRunsCompleted: 4 }),
    });
    expect(gates[0]).toMatchObject({
      perfectRunsCompleted: 4,
      perfectRunsRequired: 10,
      mastered: false,
      unlocked: true,
    });
  });

  it('gates in ladder order, not the order rows arrived in', () => {
    const shuffled = [ladder[2], ladder[0], ladder[1]];
    const gates = gateDecks(shuffled, {
      a: progress('a', { perfectRunsCompleted: 10 }),
    });
    expect(gates.map((g) => g.deck.id)).toEqual(['a', 'b', 'c']);
    expect(gates.map((g) => g.unlocked)).toEqual([true, true, false]);
  });

  it('handles a category with no decks', () => {
    expect(gateDecks([], {})).toEqual([]);
  });
});

describe('nextDeck', () => {
  it('points at the first open deck still unfinished', () => {
    const gates = gateDecks([deck('a', 0), deck('b', 1)], {
      a: progress('a', { perfectRunsCompleted: 10 }),
    });
    expect(nextDeck(gates)?.deck.id).toBe('b');
  });

  it('is undefined once the whole ladder is mastered', () => {
    const gates = gateDecks([deck('a', 0), deck('b', 1)], {
      a: progress('a', { perfectRunsCompleted: 10 }),
      b: progress('b', { perfectRunsCompleted: 10 }),
    });
    expect(nextDeck(gates)).toBeUndefined();
  });
});
