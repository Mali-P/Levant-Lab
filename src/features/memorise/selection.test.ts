import { describe, expect, it } from 'vitest';
import type { Category, Deck, DeckProgress, Flashcard } from '../../types';
import { memoriseCategories, memorisePool } from './selection';

const T0 = '2026-01-02T09:00:00.000Z';

function category(id: string, order: number): Category {
  return { id, name: 'Category ' + id, icon: '', order, createdAt: T0, updatedAt: T0 };
}

function deck(id: string, categoryId: string, order: number): Deck {
  return {
    id,
    categoryId,
    name: 'Deck ' + id,
    order,
    perfectRunsRequired: 10,
    promptDirections: ['en>he+ar'],
    createdAt: T0,
    updatedAt: T0,
  };
}

function card(id: string, deckId: string, order?: number): Flashcard {
  return {
    id,
    categoryId: 'unused',
    deckId,
    english: id,
    order,
    hebrew: { script: '' },
    arabic: { script: '' },
    createdAt: T0,
    updatedAt: T0,
  };
}

function mastered(deckId: string): DeckProgress {
  return { deckId, perfectRunsCompleted: 10, hardModeFailures: 0 };
}

const CATEGORIES = [category('a', 0), category('b', 1), category('c', 2)];

describe('memoriseCategories', () => {
  it('falls back to the first category when nothing has been chosen', () => {
    expect(memoriseCategories(CATEGORIES, []).map((c) => c.id)).toEqual(['a']);
    expect(memoriseCategories(CATEGORIES, undefined).map((c) => c.id)).toEqual(['a']);
  });

  it('keeps the chosen categories, in the order Study lists them', () => {
    const chosen = memoriseCategories(CATEGORIES, ['c', 'a']);
    expect(chosen.map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('ignores ids of categories that no longer exist', () => {
    expect(memoriseCategories(CATEGORIES, ['b', 'deleted']).map((c) => c.id)).toEqual([
      'b',
    ]);
  });

  it('falls back rather than emptying the tab when every id is stale', () => {
    expect(memoriseCategories(CATEGORIES, ['deleted']).map((c) => c.id)).toEqual(['a']);
  });

  it('has nothing to offer when there are no categories at all', () => {
    expect(memoriseCategories([], ['a'])).toEqual([]);
  });
});

describe('memorisePool', () => {
  const decks = [deck('a1', 'a', 0), deck('a2', 'a', 1), deck('b1', 'b', 0)];
  const cards = [
    card('a1-second', 'a1', 1),
    card('a1-first', 'a1', 0),
    card('a2-only', 'a2', 0),
    card('b1-only', 'b1', 0),
  ];

  it('reads category by category, deck by deck, in each deck’s own order', () => {
    const pool = memorisePool({
      categories: [CATEGORIES[0], CATEGORIES[1]],
      decks,
      cards,
      deckProgress: { a1: mastered('a1') },
    });
    expect(pool.map((c) => c.id)).toEqual([
      'a1-first',
      'a1-second',
      'a2-only',
      'b1-only',
    ]);
  });

  it('leaves out decks the learner has not unlocked', () => {
    const pool = memorisePool({
      categories: [CATEGORIES[0]],
      decks,
      cards,
      deckProgress: {},
    });
    // Deck a2 opens only once a1 is mastered, so it is not dealt here.
    expect(pool.map((c) => c.id)).toEqual(['a1-first', 'a1-second']);
  });

  it('is empty when the chosen categories hold no cards', () => {
    expect(
      memorisePool({
        categories: [CATEGORIES[2]],
        decks,
        cards,
        deckProgress: {},
      }),
    ).toEqual([]);
  });
});
