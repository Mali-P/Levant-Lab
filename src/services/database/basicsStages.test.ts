import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { Flashcard } from '../../types';
import { CUSTOM_CATEGORY, SEED_CATEGORIES } from '../../constants/seed';
import { gateCategoryDecks } from '../../features/review/languagePolicy';
import { audioIdFor } from '../audio/paths';
import { db } from './db';
import {
  OFFICIAL_CARD_COUNT,
  isOfficialDeck,
  prepareStarterContent,
  starterCoverage,
} from './seed';

/**
 * The device that matters here is one seeded before "Basics of Basics" became a
 * language ladder. Back then each lot was a single deck — "Directions",
 * "Question words" — and it is now three: Hebrew, then Palestinian Arabic, then
 * both together.
 *
 * The starter set finds a deck by its name, so a device holding the old ones was
 * given the whole new ladder as fresh rows beside them: seventy decks instead of
 * fifty-three, the learner's ten flawless runs recorded against a deck the
 * ladder no longer uses, and seventeen leftover decks sitting unlocked in the
 * middle of it because they matched no stage and so nothing held them.
 */

const T0 = '2026-05-01T09:00:00.000Z';
const BASICS = SEED_CATEGORIES.find((c) => c.name === 'Basics of Basics')!;
const OLD_CATEGORY = 'old_cat_basics';

/** The lots as the older build shipped them: bare names, no study language. */
function legacyLots(): { name: string; cards: (typeof BASICS.decks)[number]['cards'] }[] {
  return BASICS.decks
    .filter((deck) => deck.name.endsWith(' — Hebrew'))
    .map((deck) => ({ name: deck.name.replace(' — Hebrew', ''), cards: deck.cards }));
}

async function buildPreStageInstall(): Promise<void> {
  await db.categories.add({
    id: OLD_CATEGORY,
    name: BASICS.name,
    icon: BASICS.icon,
    order: 0,
    createdAt: T0,
    updatedAt: T0,
  });

  for (const [i, lot] of legacyLots().entries()) {
    const deckId = 'old_deck_' + i;
    await db.decks.add({
      id: deckId,
      categoryId: OLD_CATEGORY,
      name: lot.name,
      order: i,
      perfectRunsRequired: 10,
      promptDirections: ['en>he+ar'],
      createdAt: T0,
      updatedAt: T0,
    });
    const cards: Flashcard[] = lot.cards.map((card, ci) => ({
      id: 'old_card_' + i + '_' + ci,
      categoryId: OLD_CATEGORY,
      deckId,
      english: card.english,
      order: ci,
      audioId: audioIdFor(BASICS.name, lot.name, card.english),
      hebrew: card.hebrew,
      arabic: card.arabic,
      createdAt: T0,
      updatedAt: T0,
    }));
    await db.cards.bulkAdd(cards);
  }

  // The learner finished the first lot under the old naming.
  await db.deckProgress.add({
    deckId: 'old_deck_0',
    perfectRunsCompleted: 10,
    hardModeFailures: 0,
    hardModePassedAt: T0,
  });
}

describe('a Basics install from before the language stages', () => {
  it('moves each old lot into its Hebrew stage instead of building one beside it', async () => {
    await db.delete();
    await db.open();
    await buildPreStageInstall();

    await prepareStarterContent();

    const basics = (await db.categories.toArray()).find(
      (c) => c.name === 'Basics of Basics',
    )!;
    const decks = (await db.decks.toArray()).filter((d) => d.categoryId === basics.id);
    const cards = await db.cards.toArray();

    // One ladder, not two laid over each other.
    expect(decks).toHaveLength(BASICS.decks.length);
    expect(decks.filter((d) => d.name === 'Directions')).toEqual([]);

    // Every rung of it holds its words. This is the screen that offered to
    // "Add cards" to a deck whose words ship with the app.
    const empty = decks
      .filter((deck) => !cards.some((card) => card.deckId === deck.id))
      .map((deck) => deck.name);
    expect(empty).toEqual([]);

    // And the ten flawless runs are on the rung the ladder actually uses.
    const hebrew = decks.find((d) => d.name === 'Directions — Hebrew')!;
    expect(hebrew.id).toBe('old_deck_0');
    expect(hebrew.studyLanguages).toEqual(['hebrew']);
    expect((await db.deckProgress.get(hebrew.id))?.perfectRunsCompleted).toBe(10);
  }, 120000);

  it('leaves the whole of Basics open to pick from', async () => {
    const basics = (await db.categories.toArray()).find(
      (c) => c.name === 'Basics of Basics',
    )!;
    const decks = (await db.decks.toArray()).filter((d) => d.categoryId === basics.id);
    const progress = Object.fromEntries(
      (await db.deckProgress.toArray()).map((p) => [p.deckId, p]),
    );

    const gates = gateCategoryDecks(basics, decks, progress, ['hebrew', 'arabic']);

    // Basics is the ground floor: nothing in it waits on anything else, so the
    // learner dips into whichever lot and whichever language she needs.
    expect(gates.every((gate) => gate.unlocked)).toBe(true);

    // The rescued deck is still the rung its ten flawless runs are recorded
    // against, and is still counted as finished.
    const hebrew = gates.find((g) => g.deck.name === 'Directions — Hebrew')!;
    expect(hebrew.mastered).toBe(true);
    expect(
      gates.find((g) => g.deck.name === 'Directions — Palestinian Arabic')!.mastered,
    ).toBe(false);
  }, 120000);
});

describe('isOfficialDeck', () => {
  it('knows which empty decks are a fault rather than a blank page', () => {
    // A starter deck's words ship with the app, so an empty one is something to
    // restore. The learner's own decks are genuinely waiting to be written.
    expect(isOfficialDeck('Basics of Basics', 'Question words — Hebrew')).toBe(true);
    expect(isOfficialDeck('Basics of Basics', 'Hebrew Basics Master Test')).toBe(true);
    expect(isOfficialDeck(CUSTOM_CATEGORY, 'My sentences')).toBe(false);
    expect(isOfficialDeck('Basics of Basics', 'Words I keep forgetting')).toBe(false);
    expect(isOfficialDeck(undefined, 'Question words — Hebrew')).toBe(false);
  });
});

describe('starter coverage', () => {
  it('counts words rather than rows, so a spare copy cannot hide a loss', async () => {
    await db.delete();
    await db.open();
    await prepareStarterContent();

    const before = await starterCoverage();
    expect(before.missing).toBe(0);
    expect(before.total).toBe(OFFICIAL_CARD_COUNT);

    const decks = await db.decks.toArray();
    const emptied = decks.find((d) => d.name === 'Question words — Hebrew')!;
    const lost = await db.cards.where('deckId').equals(emptied.id).toArray();
    await db.cards.bulkDelete(lost.map((c) => c.id));

    // A second copy of a word somewhere else — which is what two launches
    // racing each other leaves behind. Counted as rows, these cancel the empty
    // deck out and the device is pronounced complete while it plainly is not.
    const spare = decks.find((d) => d.name === 'Directions — Hebrew')!;
    const twins = await db.cards.where('deckId').equals(spare.id).toArray();
    await db.cards.bulkAdd(
      twins.slice(0, lost.length).map((card, i) => ({ ...card, id: 'twin_' + i })),
    );

    const after = await starterCoverage();
    expect(after.missing).toBe(lost.length);

    // And the very next launch puts them back.
    await prepareStarterContent();
    expect((await starterCoverage()).missing).toBe(0);
    expect(await db.cards.where('deckId').equals(emptied.id).count()).toBe(lost.length);
  }, 120000);
});
