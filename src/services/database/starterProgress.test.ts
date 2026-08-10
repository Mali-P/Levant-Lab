import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { SEED_CATEGORIES } from '../../constants/seed';
import { applyAnswerToProgress } from '../../features/review/mastery';
import type { CardProgress, DeckProgress } from '../../types';
import { emptyDeckProgress } from './defaults';
import { db } from './db';
import {
  installStarterCards,
  OFFICIAL_CARD_COUNT,
  starterCoverage,
} from './seed';

const NOW = '2026-08-10T11:00:00.000Z';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('starter practice progress coverage', () => {
  it('lets every official practice card and deck write progress', async () => {
    await installStarterCards();

    const coverage = await starterCoverage();
    expect(coverage).toMatchObject({
      present: OFFICIAL_CARD_COUNT,
      missing: 0,
      emptyCategories: [],
    });

    const [categories, decks, cards] = await Promise.all([
      db.categories.toArray(),
      db.decks.toArray(),
      db.cards.toArray(),
    ]);

    const categoriesByName = new Map(
      categories.map((category) => [category.name, category]),
    );
    const decksByCategoryAndName = new Map(
      decks.map((deck) => [deck.categoryId + '|' + deck.name, deck]),
    );
    const cardsByDeckAndEnglish = new Map(
      cards.map((card) => [card.deckId + '|' + card.english, card]),
    );

    const cardProgressRows: CardProgress[] = [];
    const deckProgressRows: DeckProgress[] = [];

    for (const seedCategory of SEED_CATEGORIES) {
      const category = categoriesByName.get(seedCategory.name);
      expect(category, seedCategory.name).toBeTruthy();

      for (const seedDeck of seedCategory.decks) {
        const deck = decksByCategoryAndName.get(category!.id + '|' + seedDeck.name);
        expect(deck, seedCategory.name + ' / ' + seedDeck.name).toBeTruthy();

        deckProgressRows.push({
          ...emptyDeckProgress(deck!.id),
          perfectRunsCompleted: 1,
          lastStudiedAt: NOW,
          updatedAt: NOW,
        });

        for (const seedCard of seedDeck.cards) {
          const card = cardsByDeckAndEnglish.get(deck!.id + '|' + seedCard.english);
          expect(
            card,
            seedCategory.name + ' / ' + seedDeck.name + ' / ' + seedCard.english,
          ).toBeTruthy();

          cardProgressRows.push(
            applyAnswerToProgress(
              undefined,
              card!.id,
              { hebrew: true, arabic: true },
              NOW,
            ),
          );
        }
      }
    }

    await db.transaction('rw', [db.cardProgress, db.deckProgress], async () => {
      await db.cardProgress.bulkPut(cardProgressRows);
      await db.deckProgress.bulkPut(deckProgressRows);
    });

    expect(await db.cardProgress.count()).toBe(OFFICIAL_CARD_COUNT);
    expect(await db.deckProgress.count()).toBe(
      SEED_CATEGORIES.reduce((total, category) => total + category.decks.length, 0),
    );

    const wants = categoriesByName.get('Wants and feelings')!;
    const wantDeckIds = decks
      .filter((deck) => deck.categoryId === wants.id)
      .map((deck) => deck.id);
    const wantDeckProgress = await db.deckProgress.bulkGet(wantDeckIds);
    expect(wantDeckProgress).toHaveLength(3);
    expect(wantDeckProgress.every(Boolean)).toBe(true);
    expect(
      (
        await db.cardProgress.bulkGet(
          cards
            .filter((card) => card.categoryId === wants.id)
            .map((card) => card.id),
        )
      ).every(Boolean),
    ).toBe(true);
    expect(
      await db.cardProgress.bulkGet(
        cards
          .filter((card) => card.categoryId === wants.id)
          .map((card) => card.id),
      ),
    ).toHaveLength(30);
  });
});
