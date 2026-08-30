import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from './db';
import { DEFAULT_SETTINGS } from './defaults';
import { prepareStarterContent } from './seed';

/**
 * The device that matters here is one seeded before the titles and the pronouns
 * were pulled apart: it holds a single "Titles and pronouns" category, with the
 * learner's progress underneath it.
 *
 * The starter set finds a category by its name, so the danger is not that the
 * split fails but that it half-succeeds — the two new categories arriving as
 * fresh rows beside the old one, the same words showing three times over, and
 * the streaks left behind on ids nothing points at any more.
 */

const T0 = '2026-01-02T09:00:00.000Z';

const OLD_CATEGORY = 'old_cat_titles';
const TITLES_DECK = 'old_deck_titles';
const PRONOUNS_DECK = 'old_deck_pronouns';
const TITLE_CARD = 'old_card_engineer';
const PRONOUN_CARD = 'old_card_i';

// The same device predates the colours becoming a category of their own, so it
// also holds them as a deck inside "Adjectives" — a category that keeps its
// name and loses only the one deck.
const ADJECTIVES_CATEGORY = 'old_cat_adjectives';
const COLOURS_DECK = 'old_deck_colours';
const COLOUR_CARD = 'old_card_red';
const ADJECTIVE_CARD = 'old_card_big';

async function buildOldInstall(): Promise<void> {
  await db.categories.add({
    id: OLD_CATEGORY,
    name: 'Titles and pronouns',
    icon: '🎩',
    order: 4,
    createdAt: T0,
    updatedAt: T0,
  });

  // A category after it, so the split has somewhere to be wrong: the titles
  // must land between these two rather than at the end of the list.
  await db.categories.add({
    id: 'old_cat_body',
    name: 'Body parts',
    icon: '🫀',
    order: 5,
    createdAt: T0,
    updatedAt: T0,
  });

  await db.categories.add({
    id: ADJECTIVES_CATEGORY,
    name: 'Adjectives',
    icon: '🎨',
    order: 6,
    createdAt: T0,
    updatedAt: T0,
  });

  await db.decks.bulkAdd([
    {
      id: TITLES_DECK,
      categoryId: OLD_CATEGORY,
      name: 'Titles and forms of address',
      order: 0,
      perfectRunsRequired: 3,
      promptDirections: ['en>he+ar'],
      createdAt: T0,
      updatedAt: T0,
    },
    {
      id: PRONOUNS_DECK,
      categoryId: OLD_CATEGORY,
      name: 'Personal pronouns',
      order: 1,
      perfectRunsRequired: 3,
      promptDirections: ['en>he+ar'],
      createdAt: T0,
      updatedAt: T0,
    },
    {
      id: COLOURS_DECK,
      categoryId: ADJECTIVES_CATEGORY,
      name: 'Colours',
      order: 1,
      perfectRunsRequired: 3,
      promptDirections: ['en>he+ar'],
      createdAt: T0,
      updatedAt: T0,
    },
    {
      id: 'old_deck_descriptions',
      categoryId: ADJECTIVES_CATEGORY,
      name: 'Everyday descriptions',
      order: 0,
      perfectRunsRequired: 3,
      promptDirections: ['en>he+ar'],
      createdAt: T0,
      updatedAt: T0,
    },
  ]);

  await db.cards.bulkAdd([
    {
      id: TITLE_CARD,
      categoryId: OLD_CATEGORY,
      deckId: TITLES_DECK,
      english: 'engineer',
      hebrew: { script: 'מהנדס' },
      arabic: { script: 'مهندس', dialect: 'Palestinian' },
      createdAt: T0,
      updatedAt: T0,
    },
    {
      id: PRONOUN_CARD,
      categoryId: OLD_CATEGORY,
      deckId: PRONOUNS_DECK,
      english: 'I',
      hebrew: { script: 'אני' },
      arabic: { script: 'أنا', dialect: 'Palestinian' },
      createdAt: T0,
      updatedAt: T0,
    },
    {
      id: COLOUR_CARD,
      categoryId: ADJECTIVES_CATEGORY,
      deckId: COLOURS_DECK,
      english: 'red',
      hebrew: { script: 'אדום' },
      arabic: { script: 'أحمر', dialect: 'Palestinian' },
      createdAt: T0,
      updatedAt: T0,
    },
    {
      id: ADJECTIVE_CARD,
      categoryId: ADJECTIVES_CATEGORY,
      deckId: 'old_deck_descriptions',
      english: 'big',
      hebrew: { script: 'גדול' },
      arabic: { script: 'كبير', dialect: 'Palestinian' },
      createdAt: T0,
      updatedAt: T0,
    },
  ]);

  await db.cardProgress.bulkAdd([
    {
      cardId: TITLE_CARD,
      hebrew: { correct: 6, incorrect: 2, currentStreak: 2, longestStreak: 4 },
      arabic: { correct: 5, incorrect: 3, currentStreak: 1, longestStreak: 3 },
      bothCorrectCount: 4,
      consecutiveBothCorrect: 1,
      masteryScore: 55,
    },
    {
      cardId: PRONOUN_CARD,
      hebrew: { correct: 9, incorrect: 0, currentStreak: 9, longestStreak: 9 },
      arabic: { correct: 9, incorrect: 0, currentStreak: 9, longestStreak: 9 },
      bothCorrectCount: 9,
      consecutiveBothCorrect: 9,
      masteryScore: 98,
    },
    {
      cardId: COLOUR_CARD,
      hebrew: { correct: 3, incorrect: 1, currentStreak: 3, longestStreak: 3 },
      arabic: { correct: 2, incorrect: 2, currentStreak: 0, longestStreak: 2 },
      bothCorrectCount: 2,
      consecutiveBothCorrect: 0,
      masteryScore: 41,
    },
  ]);

  await db.deckProgress.add({
    deckId: TITLES_DECK,
    perfectRunsCompleted: 2,
    hardModeFailures: 1,
    lastStudiedAt: T0,
  });

  // Marked current by the build that shipped the combined category.
  await db.settings.put({ ...DEFAULT_SETTINGS, starterContentVersion: 24 });
}

describe('splitting the titles out of the pronouns on an existing install', () => {
  beforeAll(async () => {
    await buildOldInstall();
    await prepareStarterContent();
  });

  it('leaves no trace of the combined category', async () => {
    const categories = await db.categories.toArray();
    expect(categories.filter((c) => c.name === 'Titles and pronouns')).toEqual([]);
  });

  it('keeps the learner on the same rows, renamed rather than replaced', async () => {
    const pronouns = await db.categories.get(OLD_CATEGORY);
    expect(pronouns!.name).toBe('Pronouns');

    // One of each: a second copy would mean the top-up installed the new
    // categories instead of recognising the ones already there.
    const categories = await db.categories.toArray();
    expect(categories.filter((c) => c.name === 'Pronouns')).toHaveLength(1);
    expect(categories.filter((c) => c.name === 'Titles')).toHaveLength(1);

    const decks = await db.decks.toArray();
    expect(
      decks.filter((d) => d.name === 'Titles and forms of address — Hebrew'),
    ).toHaveLength(1);
    expect(
      decks.filter((d) => d.name === 'Personal pronouns — Hebrew'),
    ).toHaveLength(1);
  });

  it('moves the titles deck across without breaking its progress', async () => {
    const titles = (await db.categories.toArray()).find((c) => c.name === 'Titles')!;
    const deck = await db.decks.get(TITLES_DECK);
    expect(deck!.categoryId).toBe(titles.id);

    const card = await db.cards.get(TITLE_CARD);
    expect(card!.categoryId).toBe(titles.id);
    expect(card!.deckId).toBe(TITLES_DECK);

    // Progress hangs off the ids, so surviving the move is the whole point.
    const cardProgress = await db.cardProgress.get(TITLE_CARD);
    expect(cardProgress!.masteryScore).toBe(55);
    const deckProgress = await db.deckProgress.get(TITLES_DECK);
    expect(deckProgress!.perfectRunsCompleted).toBe(2);
  });

  it('leaves the pronouns where they were, with their streaks', async () => {
    const card = await db.cards.get(PRONOUN_CARD);
    expect(card!.categoryId).toBe(OLD_CATEGORY);
    expect(card!.deckId).toBe(PRONOUNS_DECK);

    const progress = await db.cardProgress.get(PRONOUN_CARD);
    expect(progress!.hebrew.currentStreak).toBe(9);
  });

  it('teaches the pronouns before the titles', async () => {
    const categories = await db.categories.toArray();
    const pronouns = categories.find((c) => c.name === 'Pronouns')!;
    const titles = categories.find((c) => c.name === 'Titles')!;
    expect(pronouns.order).toBeLessThan(titles.order);

    // Directly after, not shunted to the end of the list: the two belong
    // together, in the order they are met.
    expect(titles.order).toBe(pronouns.order + 1);
  });

  it('gives both categories their full starter decks', async () => {
    const categories = await db.categories.toArray();
    const cards = await db.cards.toArray();

    for (const [name, decks] of [
      ['Pronouns', 3],
      ['Titles', 1],
    ] as const) {
      const category = categories.find((c) => c.name === name)!;
      // Three rungs to a lot — Hebrew, Palestinian Arabic, both — each with
      // its own copy of the ten words.
      expect(cards.filter((c) => c.categoryId === category.id), name).toHaveLength(
        decks * 10 * 3,
      );
    }
  });

  it('lifts the colours out of the adjectives without disturbing them', async () => {
    const categories = await db.categories.toArray();
    const colours = categories.find((c) => c.name === 'Colours')!;
    const adjectives = await db.categories.get(ADJECTIVES_CATEGORY);

    // Adjectives keeps its name and its row — only the one deck leaves.
    expect(adjectives!.name).toBe('Adjectives');
    expect(categories.filter((c) => c.name === 'Colours')).toHaveLength(1);
    expect(colours.order).toBe(adjectives!.order + 1);

    const deck = await db.decks.get(COLOURS_DECK);
    expect(deck!.categoryId).toBe(colours.id);
    const moved = await db.cards.get(COLOUR_CARD);
    expect(moved!.categoryId).toBe(colours.id);
    expect((await db.cardProgress.get(COLOUR_CARD))!.masteryScore).toBe(41);

    // The adjective beside it stays where it was.
    const stayed = await db.cards.get(ADJECTIVE_CARD);
    expect(stayed!.categoryId).toBe(ADJECTIVES_CATEGORY);

    const cards = await db.cards.toArray();
    expect(cards.filter((c) => c.categoryId === colours.id)).toHaveLength(90);
  });

  it('writes nothing on a second launch', async () => {
    const before = await db.categories.toArray();
    await prepareStarterContent();
    const after = await db.categories.toArray();
    expect(after.map((c) => c.id + '|' + c.name + '|' + c.order)).toEqual(
      before.map((c) => c.id + '|' + c.name + '|' + c.order),
    );
  });
});
