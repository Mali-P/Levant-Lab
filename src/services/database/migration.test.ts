import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { CardProgress, Flashcard, Language } from '../../types';
import { SEED_CATEGORIES } from '../../constants/seed';
import { db } from './db';
import { DEFAULT_SETTINGS } from './defaults';
import {
  STARTER_CONTENT_VERSION,
  archiveRetiredBasicsCanCards,
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
    expect(before.cards).toBe(50);
    expect(before.official).toBe(36);
    expect(OFFICIAL_CARD_COUNT).toBe(1516);
  });

  it('ends with the full official set present', async () => {
    const coverage = await starterCoverage();
    expect(coverage.present).toBe(OFFICIAL_CARD_COUNT);
    expect(coverage.missing).toBe(0);
    expect(coverage.emptyCategories).toEqual([]);
  });

  it('gives every taught category its official cards', async () => {
    const categories = await db.categories.toArray();
    const cards = await db.cards.toArray();

    for (const seedCategory of SEED_CATEGORIES) {
      const category = categories.find((c) => c.name === seedCategory.name);
      expect(category, seedCategory.name + ' should exist').toBeTruthy();
      const officialEnglish = new Set(
        seedCategory.decks.flatMap((deck) => deck.cards.map((card) => card.english)),
      );
      const official = cards.filter(
        (c) => c.categoryId === category!.id && officialEnglish.has(c.english),
      );
      const expected = seedCategory.decks.reduce(
        (total, deck) => total + deck.cards.length,
        0,
      );
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

  it('rewrites those words in place with the forms the language makes', async () => {
    const card = await db.cards.get(oldIds.get('one')!);
    // Counting aloud takes one word in both languages, so the top-up leaves
    // the card one word in both. Hebrew counts with its feminine column —
    // akhat, shtayim, shalosh — and Arabic with its single form; אחד and وحدة
    // are taught where they belong, in "Numbers with nouns".
    expect(card!.hebrew.script).toBe('אחת');
    expect(card!.hebrew.transliteration).toBe('akhat');
    expect(card!.arabic.transliteration).toBe('wāḥad');

    // Both undefined rather than merely absent from the seed: an install made
    // before this change is holding a stored pair, and the top-up has to clear
    // it. A stale `forms` would go on showing אחד beside אחת for ever.
    expect(card!.hebrew.forms).toBeUndefined();
    expect(card!.arabic.forms).toBeUndefined();
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
    expect(coverage.present).toBe(OFFICIAL_CARD_COUNT);
    expect(cards.length).toBe(OFFICIAL_CARD_COUNT + 10 + 4);
  });

  it("does not list the learner's own deck as leftovers", async () => {
    const retired = await retiredStarterCards();
    expect(retired.some((c) => c.deckId === 'my_deck')).toBe(false);
  });

  it('does not re-run once the device is marked current unless official cards are missing', async () => {
    const second = await prepareStarterContent();
    expect(second.ran).toBe(false);

    // A missing official starter word is restored even on a current install.
    const id = oldIds.get('two')!;
    await db.cards.delete(id);
    const third = await prepareStarterContent();
    expect(third.ran).toBe(true);
    expect((await db.cards.toArray()).some((card) => card.english === 'two')).toBe(true);
    // Three full passes over the starter set through fake-indexeddb, which is
    // an order of magnitude slower than the browser's. The budget is generous
    // on purpose: a tight one fails on the machine rather than on the code, and
    // takes the test after it down with it — the timeout leaves an install
    // still running against a database that test then deletes.
  }, 30000);
});

describe('current-version installs with missing starter content', () => {
  it('still restores every missing practice deck and card', async () => {
    await db.delete();
    await db.open();

    const now = '2026-08-10T08:00:00.000Z';
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      starterContentVersion: STARTER_CONTENT_VERSION,
    });
    await db.categories.add({
      id: 'cat_numbers',
      name: 'Numbers',
      icon: '🔢',
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.decks.add({
      id: 'deck_numbers',
      categoryId: 'cat_numbers',
      name: 'One to ten',
      perfectRunsRequired: 10,
      promptDirections: ['en>he+ar'],
      createdAt: now,
      updatedAt: now,
    });
    await db.cards.add({
      id: 'card_one',
      categoryId: 'cat_numbers',
      deckId: 'deck_numbers',
      english: 'one',
      hebrew: { script: 'אחד' },
      arabic: { script: 'واحد', dialect: 'Palestinian' },
      createdAt: now,
      updatedAt: now,
    });

    const report = await prepareStarterContent();
    expect(report.ran).toBe(true);

    expect(await starterCoverage()).toMatchObject({ missing: 0, present: OFFICIAL_CARD_COUNT });
  });
});

describe('retired Basics gender cards', () => {
  it('moves old combined Can cards out of the Can stages', async () => {
    await db.delete();
    await db.open();

    const now = '2026-08-15T20:00:00.000Z';
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      starterContentVersion: STARTER_CONTENT_VERSION,
    });
    await db.categories.add({
      id: 'basics',
      name: 'Basics of Basics',
      icon: '🔰',
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.decks.bulkAdd(
      [
        ['can-hebrew', 'Can — Hebrew', ['hebrew']],
        ['can-arabic', 'Can — Palestinian Arabic', ['arabic']],
        ['can-both', 'Can — Both', ['hebrew', 'arabic']],
      ].map(([id, name, studyLanguages]) => ({
        id: id as string,
        categoryId: 'basics',
        name: name as string,
        perfectRunsRequired: 10,
        promptDirections: ['en>he+ar'] as const,
        studyLanguages: studyLanguages as ['hebrew'] | ['arabic'] | ['hebrew', 'arabic'],
        createdAt: now,
        updatedAt: now,
      })),
    );
    await db.cards.bulkAdd(
      ['can-hebrew', 'can-arabic', 'can-both'].flatMap((deckId) =>
        [
          ['I can', 'אני יכולה', 'ani yekhola', 'אני יכול', 'ani yakhol', 'speaker'],
          ['I can\'t', 'אני לא יכולה', 'ani lo yekhola', 'אני לא יכול', 'ani lo yakhol', 'speaker'],
          ['you can', 'את יכולה', 'at yekhola', 'אתה יכול', 'ata yakhol', 'listener'],
          ['you can\'t', 'את לא יכולה', 'at lo yekhola', 'אתה לא יכול', 'ata lo yakhol', 'listener'],
        ].map(([english, fScript, fTranslit, mScript, mTranslit, agreement]) => ({
          id: 'old-' + english.toLowerCase().replace(/[^a-z]+/g, '-') + '-' + deckId,
          categoryId: 'basics',
          deckId,
          english,
          hebrew: {
            script: fScript,
            transliteration: fTranslit,
            forms: {
              feminine: { script: fScript, transliteration: fTranslit },
              masculine: { script: mScript, transliteration: mTranslit },
            },
            agreement: agreement as 'speaker' | 'listener',
          },
          arabic: { script: 'بقدر', transliteration: 'baʾdar', dialect: 'Palestinian' as const },
          createdAt: now,
          updatedAt: now,
        })),
      ),
    );

    await prepareStarterContent();

    const decks = await db.decks.toArray();
    for (const name of ['Can — Hebrew', 'Can — Palestinian Arabic', 'Can — Both']) {
      const canDeck = decks.find((deck) => deck.name === name)!;
      const canCards = await db.cards.where('deckId').equals(canDeck.id).toArray();
      for (const english of ['I can', 'I can\'t', 'you can', 'you can\'t']) {
        expect(canCards.some((card) => card.english === english), name + ' / ' + english)
          .toBe(false);
      }
      expect(canCards.map((card) => card.english).sort(), name).toContain(
        'I can (female)',
      );
      expect(canCards.map((card) => card.english).sort(), name).toContain('I can (male)');
      expect(canCards.map((card) => card.english).sort(), name).toContain(
        'you can (female)',
      );
      expect(canCards.map((card) => card.english).sort(), name).toContain(
        'you can (male)',
      );
    }

    const archived = await db.cards
      .filter((card) => card.id.startsWith('old-'))
      .toArray();
    // The archive sits outside starter decks, and duplicate retired rows are
    // collapsed there like any other duplicate content.
    expect(archived).toHaveLength(4);
    const archivedDeckNames = await Promise.all(
      archived.map(async (card) => (await db.decks.get(card.deckId))!.name),
    );
    expect(new Set(archivedDeckNames)).toEqual(new Set(['Retired starter words']));
  });

  /**
   * The device that reported an empty fourth lot. Its "Can" deck was never
   * renamed into "Can — Hebrew", because an in-between build had already
   * written a language onto it and the rename skipped anything carrying one.
   * Bearing a name the seed does not list, it was passed over by every top-up
   * — and then the sweep for retired combined rows, which matches a bare "Can"
   * by name, carried off the only four cards it had.
   */
  it('restores a bare Can deck that an in-between build gave a language', async () => {
    await db.delete();
    await db.open();

    const now = '2026-08-15T20:00:00.000Z';
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      starterContentVersion: STARTER_CONTENT_VERSION,
    });
    await db.categories.add({
      id: 'basics',
      name: 'Basics of Basics',
      icon: '🔰',
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.decks.add({
      id: 'can-bare',
      categoryId: 'basics',
      name: 'Can',
      order: 9,
      studyLanguages: ['hebrew'],
      perfectRunsRequired: 10,
      promptDirections: ['en>he+ar'],
      createdAt: now,
      updatedAt: now,
    });
    await db.cards.bulkAdd(
      ['I can', "I can't", 'you can', "you can't"].map((english) => ({
        id: 'bare-' + english.toLowerCase().replace(/[^a-z]+/g, '-'),
        categoryId: 'basics',
        deckId: 'can-bare',
        english,
        hebrew: { script: 'אני יכול', transliteration: 'ani yakhol' },
        arabic: {
          script: 'بقدر',
          transliteration: 'baʾdar',
          dialect: 'Palestinian' as const,
        },
        createdAt: now,
        updatedAt: now,
      })),
    );
    // Runs already recorded against the deck under its old name.
    await db.deckProgress.put({
      deckId: 'can-bare',
      perfectRunsCompleted: 4,
      hardModeFailures: 0,
    });

    await prepareStarterContent();

    const decks = await db.decks.toArray();
    expect(decks.some((deck) => deck.name === 'Can')).toBe(false);

    const hebrew = decks.find((deck) => deck.name === 'Can — Hebrew')!;
    expect(hebrew).toBeDefined();
    const canCards = await db.cards.where('deckId').equals(hebrew.id).toArray();
    expect(canCards.map((card) => card.english).sort()).toEqual([
      'I can (female)',
      'I can (male)',
      "I can't (female)",
      "I can't (male)",
      'you can (female)',
      'you can (male)',
      "you can't (female)",
      "you can't (male)",
    ]);

    // The deck kept its id, and with it the runs the learner had put in.
    expect(hebrew.id).toBe('can-bare');
    expect((await db.deckProgress.get('can-bare'))?.perfectRunsCompleted).toBe(4);
  });

  /**
   * The sweep exists to clear a word taught twice. Where the replacements have
   * not arrived there is nothing doubled, and taking the old rows would leave
   * the learner with an empty lot.
   */
  it('leaves the old rows alone in a deck the replacements have not reached', async () => {
    await db.delete();
    await db.open();

    const now = '2026-08-15T20:00:00.000Z';
    await db.categories.add({
      id: 'basics',
      name: 'Basics of Basics',
      icon: '🔰',
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.decks.add({
      id: 'can-hebrew',
      categoryId: 'basics',
      name: 'Can — Hebrew',
      order: 9,
      studyLanguages: ['hebrew'],
      perfectRunsRequired: 10,
      promptDirections: ['en>he+ar'],
      createdAt: now,
      updatedAt: now,
    });
    await db.cards.bulkAdd(
      ['I can', 'you can'].map((english) => ({
        id: 'left-' + english.toLowerCase().replace(/[^a-z]+/g, '-'),
        categoryId: 'basics',
        deckId: 'can-hebrew',
        english,
        hebrew: { script: 'אני יכול', transliteration: 'ani yakhol' },
        arabic: {
          script: 'بقدر',
          transliteration: 'baʾdar',
          dialect: 'Palestinian' as const,
        },
        createdAt: now,
        updatedAt: now,
      })),
    );

    expect(await archiveRetiredBasicsCanCards()).toBe(0);
    const still = await db.cards.where('deckId').equals('can-hebrew').toArray();
    expect(still.map((card) => card.english).sort()).toEqual(['I can', 'you can']);
  });

  /**
   * Why the lot still looked empty after the words were put back, and why it
   * looked empty on standard alone. The half-finished standard run had been
   * dealt the old combined words; archiving moved those rows out of the deck
   * without deleting them, so every check for a session naming a deleted card
   * passed it, and the screen resumed onto a card the deck could no longer
   * deal and said "No card to show". Hard mode held no such run and dealt the
   * deck cleanly — exactly the shape the learner reported.
   */
  it('drops the unfinished run that was dealt the words being retired', async () => {
    await db.delete();
    await db.open();

    const now = '2026-08-16T20:00:00.000Z';
    await db.categories.add({
      id: 'basics',
      name: 'Basics of Basics',
      icon: '🔰',
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.decks.add({
      id: 'can-hebrew',
      categoryId: 'basics',
      name: 'Can — Hebrew',
      order: 9,
      studyLanguages: ['hebrew'],
      perfectRunsRequired: 10,
      promptDirections: ['en>he+ar'],
      createdAt: now,
      updatedAt: now,
    });

    const card = (id: string, english: string) => ({
      id,
      categoryId: 'basics',
      deckId: 'can-hebrew',
      english,
      hebrew: { script: 'אני יכול', transliteration: 'ani yakhol' },
      arabic: {
        script: 'بقدر',
        transliteration: 'baʾdar',
        dialect: 'Palestinian' as const,
      },
      createdAt: now,
      updatedAt: now,
    });
    // The deck holds both the replacements and the combined rows they retire,
    // which is the state the sweep is meant to act on.
    await db.cards.bulkAdd([
      card('old-i-can', 'I can'),
      card('new-i-can-f', 'I can (female)'),
      card('new-i-can-m', 'I can (male)'),
    ]);

    const run = (id: string, mode: 'normal' | 'hard', cardIds: string[]) => ({
      id,
      deckId: 'can-hebrew',
      studyLanguages: ['hebrew'] as Language[],
      mode,
      promptDirection: 'en>he+ar' as const,
      answerMode: 'self' as const,
      phase: 'testing' as const,
      deckCardIds: cardIds,
      activeCardCount: cardIds.length,
      activeCardIds: cardIds,
      introducedCardIds: [],
      introduceCardIds: [],
      introduceIndex: 0,
      introduceFlipped: false,
      currentCardId: cardIds[0],
      stageCorrect: [],
      stageIncorrect: [],
      stagePerfectRounds: 0,
      stagePerfect: true,
      roundQueue: [],
      roundIndex: 0,
      roundPerfect: true,
      currentRound: 0,
      perfectRounds: 0,
      perfectRunsRequired: 10,
      deckMastered: false,
      answers: [],
      startedAt: now,
      updatedAt: now,
    });

    await db.sessions.bulkPut([
      // The stale standard run, opening on the word about to be archived.
      run('run-standard', 'normal', ['old-i-can', 'new-i-can-f']),
      // A run over none of the retired words carries on untouched.
      run('run-hard', 'hard', ['new-i-can-f', 'new-i-can-m']),
      // Finished runs are history and are never swept.
      { ...run('run-done', 'normal', ['old-i-can']), completedAt: now },
    ]);

    expect(await archiveRetiredBasicsCanCards()).toBe(1);

    const left = (await db.sessions.toArray()).map((s) => s.id).sort();
    expect(left).toEqual(['run-done', 'run-hard']);

    // The word itself is archived, not destroyed.
    expect((await db.cards.get('old-i-can'))?.deckId).not.toBe('can-hebrew');
  });
});
