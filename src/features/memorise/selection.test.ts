import { describe, expect, it } from 'vitest';
import type { Category, Deck, DeckProgress, Flashcard } from '../../types';
import {
  memoriseDecks,
  memorisePool,
  resumeDeck,
  unlockedDecks,
} from './selection';

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
const DECKS = [deck('a1', 'a', 0), deck('a2', 'a', 1), deck('b1', 'b', 0)];

/** Everything unlocked, so a test can speak about ticks rather than the ladder. */
const ALL_OPEN = { a1: mastered('a1'), b1: mastered('b1') };

function chooseDecks(
  selectedIds: string[] | undefined,
  deckProgress: Record<string, DeckProgress> = ALL_OPEN,
) {
  return memoriseDecks({
    categories: CATEGORIES,
    decks: DECKS,
    deckProgress,
    selectedIds,
  }).map((d) => d.id);
}

describe('memoriseDecks', () => {
  it('falls back to the first unlocked deck when nothing has been ticked', () => {
    expect(chooseDecks([])).toEqual(['a1']);
    expect(chooseDecks(undefined)).toEqual(['a1']);
  });

  it('keeps the ticked decks, in the order Study lays them out', () => {
    expect(chooseDecks(['b1', 'a1'])).toEqual(['a1', 'b1']);
  });

  it('ignores ids of decks that no longer exist', () => {
    expect(chooseDecks(['a2', 'deleted'])).toEqual(['a2']);
  });

  it('falls back rather than emptying the tab when every id is stale', () => {
    expect(chooseDecks(['deleted'])).toEqual(['a1']);
  });

  it('leaves out a ticked deck the learner has not unlocked', () => {
    // Deck a2 opens only once a1 is mastered, so a tick on it is not honoured
    // yet — and with nothing else ticked the tab falls back to a1.
    expect(chooseDecks(['a2'], {})).toEqual(['a1']);
  });

  it('has nothing to offer when there are no decks at all', () => {
    expect(
      memoriseDecks({
        categories: CATEGORIES,
        decks: [],
        deckProgress: {},
        selectedIds: ['a1'],
      }),
    ).toEqual([]);
  });
});

describe('unlockedDecks', () => {
  it('reads category by category, and up the ladder inside one', () => {
    expect(unlockedDecks({ categories: CATEGORIES, decks: DECKS, deckProgress: ALL_OPEN }))
      .toEqual([DECKS[0], DECKS[1], DECKS[2]]);
  });

  it('stops at the first deck the learner has not earned', () => {
    // a2 is behind a1, and b1 opens its own category.
    expect(
      unlockedDecks({ categories: CATEGORIES, decks: DECKS, deckProgress: {} }).map(
        (d) => d.id,
      ),
    ).toEqual(['a1', 'b1']);
  });
});

describe('resumeDeck', () => {
  function resume(
    lastDeckId: string | undefined,
    deckProgress: Record<string, DeckProgress> = ALL_OPEN,
  ) {
    return resumeDeck({
      categories: CATEGORIES,
      decks: DECKS,
      deckProgress,
      lastDeckId,
    })?.id;
  }

  it('reopens the deck the tab was last reading', () => {
    expect(resume('a2')).toBe('a2');
  });

  it('has nothing to reopen before the learner has read anything', () => {
    expect(resume(undefined)).toBeUndefined();
  });

  it('forgets a deck that has since been deleted', () => {
    expect(resume('deleted')).toBeUndefined();
  });

  it('forgets a deck that has since closed behind her', () => {
    // A restored backup can undo the runs that opened a2. The tab falls back
    // to its browse rather than reopening onto a wall.
    expect(resume('a2', {})).toBeUndefined();
  });
});

describe('memorisePool', () => {
  const cards = [
    card('a1-second', 'a1', 1),
    card('a1-first', 'a1', 0),
    card('a2-only', 'a2', 0),
    card('b1-only', 'b1', 0),
  ];

  it('reads deck by deck, in each deck’s own order', () => {
    const pool = memorisePool([DECKS[0], DECKS[2]], cards);
    expect(pool.map((c) => c.id)).toEqual(['a1-first', 'a1-second', 'b1-only']);
  });

  it('is empty when the chosen decks hold no cards', () => {
    expect(memorisePool([deck('empty', 'c', 0)], cards)).toEqual([]);
  });

  it('is empty when nothing was chosen', () => {
    expect(memorisePool([], cards)).toEqual([]);
  });
});
