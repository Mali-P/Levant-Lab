import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CardProgress, Flashcard } from '../../types';
import { db } from './db';
import { emptyCardProgress } from './defaults';
import { mergeDuplicateContent } from './dedupe';

/**
 * The state a raced launch leaves behind: every category installed twice, the
 * learner's progress sitting on whichever copy they happened to open.
 */

const T0 = '2026-01-02T09:00:00.000Z';
const T1 = '2026-03-01T09:00:00.000Z';

/** Adds a category with one deck of the given words. Returns the deck id. */
async function install(
  suffix: string,
  name: string,
  order: number,
  words: string[],
  createdAt = T0,
): Promise<string> {
  const categoryId = 'cat_' + suffix;
  const deckId = 'deck_' + suffix;

  await db.categories.add({
    id: categoryId,
    name,
    icon: '🛒',
    order,
    createdAt,
    updatedAt: createdAt,
  });
  await db.decks.add({
    id: deckId,
    categoryId,
    name: 'At the shop',
    perfectRunsRequired: 10,
    promptDirections: ['en>he+ar'],
    createdAt,
    updatedAt: createdAt,
  });
  await db.cards.bulkAdd(
    words.map<Flashcard>((english, i) => ({
      id: 'card_' + suffix + '_' + i,
      categoryId,
      deckId,
      english,
      hebrew: { script: 'he-' + english },
      arabic: { script: 'ar-' + english, dialect: 'Palestinian' },
      createdAt,
      updatedAt: createdAt,
    })),
  );

  return deckId;
}

/** Card progress showing the word has actually been answered. */
function studied(cardId: string, correct: number): CardProgress {
  const base = emptyCardProgress(cardId);
  return {
    ...base,
    hebrew: { ...base.hebrew, correct, lastReviewedAt: T1 },
    arabic: { ...base.arabic, correct, lastReviewedAt: T1 },
    bothCorrectCount: correct,
    masteryScore: 0.9,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('mergeDuplicateContent', () => {
  it('leaves a clean install alone', async () => {
    await install('a', 'Shopping', 0, ['bread', 'milk']);

    const report = await mergeDuplicateContent();

    expect(report).toEqual({
      categoriesRemoved: 0,
      decksRemoved: 0,
      cardsRemoved: 0,
      sessionsRemoved: 0,
    });
    expect(await db.categories.count()).toBe(1);
  });

  it('collapses a category installed twice into one', async () => {
    await install('a', 'Shopping', 0, ['bread', 'milk']);
    await install('b', 'Shopping', 1, ['bread', 'milk']);

    const report = await mergeDuplicateContent();

    expect(report.categoriesRemoved).toBe(1);
    expect(report.decksRemoved).toBe(1);
    expect(report.cardsRemoved).toBe(2);
    expect(await db.categories.count()).toBe(1);
    expect(await db.decks.count()).toBe(1);
    expect(await db.cards.count()).toBe(2);
  });

  it('keeps the copy of a word the learner has actually studied', async () => {
    await install('a', 'Shopping', 0, ['bread']);
    await install('b', 'Shopping', 1, ['bread']);
    // The learner opened the second tile, so the streak lives on that card.
    await db.cardProgress.put(studied('card_b_0', 7));

    await mergeDuplicateContent();

    const survivors = await db.cards.toArray();
    expect(survivors).toHaveLength(1);
    expect(survivors[0].id).toBe('card_b_0');
    expect((await db.cardProgress.get('card_b_0'))?.hebrew.correct).toBe(7);
    expect(await db.cardProgress.get('card_a_0')).toBeUndefined();
  });

  it('carries the better run count onto the surviving deck', async () => {
    const deckA = await install('a', 'Shopping', 0, ['bread']);
    const deckB = await install('b', 'Shopping', 1, ['bread']);
    await db.deckProgress.bulkPut([
      { deckId: deckA, perfectRunsCompleted: 2, hardModeFailures: 1 },
      {
        deckId: deckB,
        perfectRunsCompleted: 6,
        hardModeFailures: 3,
        lastStudiedAt: T1,
      },
    ]);

    await mergeDuplicateContent();

    const kept = await db.decks.toArray();
    expect(kept).toHaveLength(1);
    const progress = await db.deckProgress.get(kept[0].id);
    expect(progress?.perfectRunsCompleted).toBe(6);
    expect(progress?.hardModeFailures).toBe(4);
    expect(progress?.lastStudiedAt).toBe(T1);
    expect(await db.deckProgress.count()).toBe(1);
  });

  it('keeps words that only one copy had', async () => {
    await install('a', 'Shopping', 0, ['bread', 'milk']);
    await install('b', 'Shopping', 1, ['bread', 'cheese']);

    await mergeDuplicateContent();

    const cards = await db.cards.toArray();
    expect(cards.map((c) => c.english).sort()).toEqual(['bread', 'cheese', 'milk']);
    expect(new Set(cards.map((c) => c.deckId)).size).toBe(1);
  });

  it('does not merge two genuinely different categories', async () => {
    await install('a', 'Shopping', 0, ['bread']);
    await install('b', 'Household', 1, ['broom']);

    const report = await mergeDuplicateContent();

    expect(report.categoriesRemoved).toBe(0);
    expect(await db.categories.count()).toBe(2);
  });

  it('numbers the surviving categories and decks into one ladder', async () => {
    await install('a', 'Shopping', 4, ['bread']);
    await install('b', 'Shopping', 9, ['bread']);
    await install('c', 'Household', 7, ['broom']);

    await mergeDuplicateContent();

    const orders = (await db.categories.orderBy('order').toArray()).map(
      (c) => c.order,
    );
    expect(orders).toEqual([0, 1]);
    for (const deck of await db.decks.toArray()) {
      expect(deck.order).toBe(0);
    }
  });

  it('discards an unfinished session whose deck was merged away', async () => {
    await install('a', 'Shopping', 0, ['bread']);
    const deckB = await install('b', 'Shopping', 1, ['bread']);

    await db.sessions.put({
      id: 'session_open',
      deckId: deckB,
      mode: 'normal',
      promptDirection: 'en>he+ar',
      answerMode: 'self',
      activeCardIds: ['card_b_0'],
      retryCardIds: [],
      completedCardIds: [],
      currentIndex: 0,
      currentRunCorrect: 0,
      currentRunFailed: false,
      perfectRunsCompleted: 0,
      perfectRunsRequired: 10,
      answers: [],
      startedAt: T1,
      updatedAt: T1,
    });

    const report = await mergeDuplicateContent();

    expect(report.sessionsRemoved).toBe(1);
    expect(await db.sessions.count()).toBe(0);
  });

  it('is idempotent — a second pass finds nothing left to do', async () => {
    await install('a', 'Shopping', 0, ['bread', 'milk']);
    await install('b', 'Shopping', 1, ['bread', 'milk']);

    await mergeDuplicateContent();
    const second = await mergeDuplicateContent();

    expect(second).toEqual({
      categoriesRemoved: 0,
      decksRemoved: 0,
      cardsRemoved: 0,
      sessionsRemoved: 0,
    });
  });

  it('does nothing on an empty database', async () => {
    const report = await mergeDuplicateContent();
    expect(report.categoriesRemoved).toBe(0);
  });
});
