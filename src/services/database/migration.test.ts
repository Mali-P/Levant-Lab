import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { CardProgress, Flashcard } from '../../types';
import { CUSTOM_CATEGORY, SEED_CATEGORIES } from '../../constants/seed';
import { db } from './db';
import { DEFAULT_SETTINGS } from './defaults';
import {
  installStarterCards,
  OFFICIAL_CARD_COUNT,
  prepareStarterContent,
  retiredStarterCards,
  starterCoverage,
} from './seed';

/**
 * The scenario a real device is in: seeded by an early build that shipped
 * five categories, some of whose words have since been dropped from the
 * official set, plus the learner's own cards and progress on top.
 */

const T0 = '2026-01-02T09:00:00.000Z';

/** Words the first starter set had and the official set no longer lists. */
const RETIRED = ['apple', 'cheese', 'egg', 'to eat'];

/** Ids we expect to survive the refresh, keyed by the English prompt. */
const oldIds = new Map<string, string>();
let customCardIds: string[] = [];

async function buildOldInstall(): Promise<void> {
  const cards: Flashcard[] = [];
  const progress: CardProgress[] = [];

  // Five official categories, each with eight official words plus two
  // leftovers — fifty cards in total, matching the old install.
  for (const [ci, seedCategory] of SEED_CATEGORIES.slice(0, 5).entries()) {
    const categoryId = 'old_cat_' + ci;
    const deckId = 'old_deck_' + ci;
    const seedDeck = seedCategory.decks[0];

    await db.categories.add({
      id: categoryId,
      name: seedCategory.name,
      icon: seedCategory.icon,
      order: ci,
      createdAt: T0,
      updatedAt: T0,
    });
    await db.decks.add({
      id: deckId,
      categoryId,
      name: seedDeck.name,
      perfectRunsRequired: 10,
      promptDirections: ['en>he+ar'],
      createdAt: T0,
      updatedAt: T0,
    });

    seedDeck.cards.slice(0, 8).forEach((seedCard, i) => {
      const id = 'old_card_' + ci + '_' + i;
      oldIds.set(seedCard.english, id);
      // The old build stored one masculine-only word and no gendered pair.
      cards.push({
        id,
        categoryId,
        deckId,
        english: seedCard.english,
        hebrew: { script: seedCard.hebrew.script },
        arabic: { script: seedCard.arabic.script, dialect: 'Palestinian' },
        createdAt: T0,
        updatedAt: T0,
      });
      progress.push({
        cardId: id,
        hebrew: { correct: 7, incorrect: 1, currentStreak: 3, longestStreak: 5 },
        arabic: { correct: 4, incorrect: 2, currentStreak: 1, longestStreak: 4 },
        bothCorrectCount: 4,
        consecutiveBothCorrect: 1,
        masteryScore: 62,
      });
    });

    // Two retired words per category, drawn from the old food list.
    [RETIRED[ci % RETIRED.length], RETIRED[(ci + 1) % RETIRED.length]].forEach(
      (english, i) => {
        cards.push({
          id: 'old_retired_' + ci + '_' + i,
          categoryId,
          deckId,
          english,
          hebrew: { script: 'תפוח' },
          arabic: { script: 'تفاح', dialect: 'Palestinian' },
          createdAt: T0,
          updatedAt: T0,
        });
      },
    );
  }

  // The learner's own category, which must come through untouched.
  await db.categories.add({
    id: 'my_cat',
    name: 'My words',
    icon: '⭐',
    order: 99,
    createdAt: T0,
    updatedAt: T0,
  });
  await db.decks.add({
    id: 'my_deck',
    categoryId: 'my_cat',
    name: 'Phrases I hear',
    perfectRunsRequired: 3,
    promptDirections: ['en>he+ar'],
    createdAt: T0,
    updatedAt: T0,
  });
  customCardIds = ['my_1', 'my_2', 'my_3'];
  customCardIds.forEach((id, i) => {
    cards.push({
      id,
      categoryId: 'my_cat',
      deckId: 'my_deck',
      english: 'my phrase ' + i,
      hebrew: { script: 'שלום', transliteration: 'shalom' },
      arabic: { script: 'مرحبا', transliteration: 'marḥaba', dialect: 'Palestinian' },
      createdAt: T0,
      updatedAt: T0,
    });
  });

  // A custom word that collides with an official English prompt but lives in
  // the learner's own deck, so the refresh must not touch it.
  cards.push({
    id: 'my_collide',
    categoryId: 'my_cat',
    deckId: 'my_deck',
    english: 'water',
    hebrew: { script: 'מים שלי' },
    arabic: { script: 'ميتي', dialect: 'Palestinian' },
    createdAt: T0,
    updatedAt: T0,
  });

  await db.cards.bulkAdd(cards);
  await db.cardProgress.bulkAdd(progress);
  await db.settings.put({ ...DEFAULT_SETTINGS });
}

describe('refreshing starter cards over an existing install', () => {
  let before: { cards: number; official: number };

  beforeAll(async () => {
    await buildOldInstall();
    before = {
      cards: await db.cards.count(),
      official: (await starterCoverage()).present,
    };
    await installStarterCards();
  });

  it('starts from a fifty-card install missing most of the official set', () => {
    expect(before.cards).toBe(54); // 50 old + 4 custom
    expect(before.official).toBe(40); // 5 categories × 8 official words
    expect(OFFICIAL_CARD_COUNT).toBe(455);
  });

  it('ends with the full official set present', async () => {
    const coverage = await starterCoverage();
    expect(coverage.present).toBe(455);
    expect(coverage.missing).toBe(0);
    expect(coverage.emptyCategories).toEqual([]);
  });

  it('gives every taught category ten cards, and Custom its five sentences', async () => {
    const categories = await db.categories.toArray();
    const cards = await db.cards.toArray();

    for (const seedCategory of SEED_CATEGORIES) {
      const category = categories.find((c) => c.name === seedCategory.name);
      expect(category, seedCategory.name + ' should exist').toBeTruthy();
      const official = cards.filter(
        (c) =>
          c.categoryId === category!.id &&
          seedCategory.decks[0].cards.some((s) => s.english === c.english),
      );
      // The learner's own category opens with a handful of sentences rather
      // than a full deck; everything the starter set teaches is a ten.
      const expected = seedCategory.name === CUSTOM_CATEGORY ? 5 : 10;
      expect(official.length, seedCategory.name).toBe(expected);
    }
  });

  it('keeps the ids and the progress of words that were already there', async () => {
    for (const [english, id] of oldIds) {
      const card = await db.cards.get(id);
      expect(card, english + ' should keep its id').toBeTruthy();
      expect(card!.english).toBe(english);

      const progress = await db.cardProgress.get(id);
      expect(progress, english + ' should keep its progress').toBeTruthy();
      expect(progress!.hebrew.correct).toBe(7);
      expect(progress!.masteryScore).toBe(62);
    }
  });

  it('rewrites those words in place with their gendered pair', async () => {
    const card = await db.cards.get(oldIds.get('one')!);
    expect(card!.hebrew.forms?.feminine.script).toBe('אחת');
    expect(card!.hebrew.forms?.masculine.script).toBe('אחד');
    expect(card!.arabic.forms?.feminine.transliteration).toBe('waḥde');
  });

  it("leaves the learner's own cards untouched", async () => {
    for (const id of customCardIds) {
      const card = await db.cards.get(id);
      expect(card!.updatedAt).toBe(T0);
    }
    const collide = await db.cards.get('my_collide');
    expect(collide!.hebrew.script).toBe('מים שלי');
    expect(collide!.updatedAt).toBe(T0);
  });

  it('keeps old removed seed words without counting them as official', async () => {
    const cards = await db.cards.toArray();
    // Scoped to the old decks: a word the first starter set dropped, such as
    // "apple", may since have been taught again in a deck of its own, and that
    // card is official rather than a leftover.
    const leftovers = cards.filter(
      (c) => RETIRED.includes(c.english) && c.deckId.startsWith('old_deck_'),
    );
    expect(leftovers.length).toBe(10); // 5 categories × 2

    const retired = await retiredStarterCards();
    const names = [...new Set(retired.map((c) => c.english))].sort();
    expect(names).toEqual([...RETIRED].sort());

    // They sit in starter decks but are not part of the official count.
    const coverage = await starterCoverage();
    expect(coverage.present).toBe(455);
    expect(cards.length).toBe(455 + 10 + 4);
  });

  it("does not list the learner's own deck as leftovers", async () => {
    const retired = await retiredStarterCards();
    expect(retired.some((c) => c.deckId === 'my_deck')).toBe(false);
  });

  it('does not re-run once the device is marked current', async () => {
    const second = await prepareStarterContent();
    expect(second.ran).toBe(false);

    // A word deleted after the top-up stays deleted.
    const id = oldIds.get('two')!;
    await db.cards.delete(id);
    const third = await prepareStarterContent();
    expect(third.ran).toBe(false);
    expect(await db.cards.get(id)).toBeUndefined();
  });
});
