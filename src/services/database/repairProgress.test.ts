import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CardProgress, Flashcard } from '../../types';
import { db } from './db';
import { clearUnaskableProgress } from './repairProgress';

const T0 = '2026-01-02T09:00:00.000Z';

function card(id: string, hebrew: string, arabic: string): Flashcard {
  return {
    id,
    categoryId: 'cat1',
    deckId: 'deck1',
    english: id,
    hebrew: { script: hebrew },
    arabic: { script: arabic, dialect: 'General Levantine' },
    createdAt: T0,
    updatedAt: T0,
  };
}

/** A card studied a few times, missed in Hebrew every single time. */
function progress(cardId: string): CardProgress {
  return {
    cardId,
    hebrew: { correct: 0, incorrect: 6, currentStreak: 0, longestStreak: 0 },
    arabic: { correct: 5, incorrect: 1, currentStreak: 3, longestStreak: 3 },
    bothCorrectCount: 0,
    consecutiveBothCorrect: 0,
    masteryScore: 0,
    updatedAt: T0,
  };
}

beforeEach(async () => {
  await db.cards.clear();
  await db.cardProgress.clear();
});

describe('clearing marks against a half the card never had', () => {
  it('wipes the unanswerable side and leaves the real one alone', async () => {
    await db.cards.add(card('bread', '', 'خبز'));
    await db.cardProgress.add(progress('bread'));

    expect(await clearUnaskableProgress()).toBe(1);

    const row = (await db.cardProgress.get('bread'))!;
    expect(row.hebrew).toEqual({
      correct: 0,
      incorrect: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
    // Her actual Arabic study, untouched to the last count.
    expect(row.arabic).toEqual({
      correct: 5,
      incorrect: 1,
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  it('lets such a card be scored on the half it has', async () => {
    await db.cards.add(card('bread', '', 'خبز'));
    await db.cardProgress.add(progress('bread'));
    await clearUnaskableProgress();

    // Was pinned at nought: mastery is capped by the weakest language, and the
    // Hebrew it never had was scoring zero.
    expect((await db.cardProgress.get('bread'))!.masteryScore).toBeGreaterThan(0);
  });

  it('touches nothing on a card that has both halves', async () => {
    await db.cards.add(card('water', 'מים', 'مي'));
    const before = progress('water');
    await db.cardProgress.add(before);

    expect(await clearUnaskableProgress()).toBe(0);
    expect(await db.cardProgress.get('water')).toEqual(before);
  });

  it('runs clean a second time', async () => {
    await db.cards.add(card('bread', '', 'خبز'));
    await db.cardProgress.add(progress('bread'));

    expect(await clearUnaskableProgress()).toBe(1);
    expect(await clearUnaskableProgress()).toBe(0);
  });

  it('leaves a row whose card is gone for the merge to deal with', async () => {
    const orphan = progress('deleted');
    await db.cardProgress.add(orphan);

    expect(await clearUnaskableProgress()).toBe(0);
    expect(await db.cardProgress.get('deleted')).toEqual(orphan);
  });

  it('keeps a side filled in only as a gendered pair', async () => {
    const gendered: Flashcard = {
      ...card('tired', '', 'تعبان'),
      hebrew: {
        script: '',
        forms: { feminine: { script: 'עייפה' }, masculine: { script: 'עייף' } },
      },
    };
    await db.cards.add(gendered);
    await db.cardProgress.add(progress('tired'));

    // The Hebrew is there, just not in `script` — those misses are real.
    expect(await clearUnaskableProgress()).toBe(0);
  });
});
