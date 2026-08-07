import type { Category, Deck, Flashcard } from '../../types';
import { CUSTOM_CATEGORY, SEED_CATEGORIES, type SeedCard } from '../../constants/seed';
import { uid } from '../../utils/random';
import { audioIdFor } from '../audio/paths';
import { withClipPaths } from '../audio/manifest';
import { db } from './db';
import { mergeDuplicateContent, type MergeReport } from './dedupe';
import { DEFAULT_SETTINGS } from './defaults';

export type InstallReport = { added: number; updated: number };

/**
 * Bumped whenever `SEED_CATEGORIES` gains or changes words. An install that
 * predates the current number is topped up once on launch, which is what
 * rescues a device seeded before the later categories existed. Deletions made
 * after that top-up are the learner's own and are not undone.
 */
export const STARTER_CONTENT_VERSION = 8;

/**
 * How many cards the official starter set contains: every taught deck is a ten,
 * so this is ten times the number of decks, plus the five sentences the Custom
 * category opens with. Sentences added there afterwards are the learner's own
 * and are counted nowhere here.
 */
export const OFFICIAL_CARD_COUNT = SEED_CATEGORIES.reduce(
  (total, category) =>
    total + category.decks.reduce((n, deck) => n + deck.cards.length, 0),
  0,
);

/** `category|deck|english`, lowercased. Identifies one official word. */
function officialKey(category: string, deck: string, english: string): string {
  return [category, deck, english].map((s) => s.toLowerCase()).join('|');
}

const OFFICIAL_KEYS: ReadonlySet<string> = new Set(
  SEED_CATEGORIES.flatMap((category) =>
    category.decks.flatMap((deck) =>
      deck.cards.map((card) => officialKey(category.name, deck.name, card.english)),
    ),
  ),
);

/**
 * Decks whose contents the official set defines in full — the Custom category
 * excepted, since a sentence the learner writes there belongs in its deck and
 * must not be read as a leftover from an older seed.
 */
const OFFICIAL_DECK_KEYS: ReadonlySet<string> = new Set(
  SEED_CATEGORIES.filter((category) => category.name !== CUSTOM_CATEGORY).flatMap(
    (category) =>
      category.decks.map((deck) => (category.name + '|' + deck.name).toLowerCase()),
  ),
);

function sidesFor(
  card: SeedCard,
  categoryName: string,
  deckName: string,
  now: string,
): Omit<Flashcard, 'id' | 'categoryId' | 'deckId' | 'createdAt'> {
  // Keyed off the same category / deck / English identity the merge below uses
  // to recognise a word, so a card keeps its recordings across reinstalls.
  const audioId = audioIdFor(categoryName, deckName, card.english);

  return {
    english: card.english,
    icon: card.icon,
    audioId,
    hebrew: withClipPaths(
      {
        script: card.hebrew.script,
        transliteration: card.hebrew.transliteration,
        forms: card.hebrew.forms,
        notes: card.hebrew.notes,
      },
      audioId,
      'hebrew',
    ),
    arabic: withClipPaths(
      {
        script: card.arabic.script,
        transliteration: card.arabic.transliteration,
        forms: card.arabic.forms,
        dialect: card.arabic.dialect,
        notes: card.arabic.notes,
      },
      audioId,
      'arabic',
    ),
    updatedAt: now,
  };
}

/**
 * Writes the starter content into whatever is already there.
 *
 * Nothing is ever deleted. A category or deck is matched by name, a card by
 * its English prompt within its deck; a match is rewritten in place, keeping
 * its id so the learner's progress on that word survives. Anything the user
 * added themselves is left untouched.
 */
export async function installStarterCards(): Promise<InstallReport> {
  const now = new Date().toISOString();
  const report: InstallReport = { added: 0, updated: 0 };

  const [categories, decks, cards] = await Promise.all([
    db.categories.toArray(),
    db.decks.toArray(),
    db.cards.toArray(),
  ]);

  const newCategories: Category[] = [];
  const newDecks: Deck[] = [];
  const newCards: Flashcard[] = [];
  const changedCards: Flashcard[] = [];

  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const deckByKey = new Map(
    decks.map((d) => [d.categoryId + '|' + d.name.toLowerCase(), d]),
  );
  const cardByKey = new Map(
    cards.map((c) => [c.deckId + '|' + c.english.toLowerCase(), c]),
  );

  let order = categories.length;

  SEED_CATEGORIES.forEach((seedCategory) => {
    let category = categoryByName.get(seedCategory.name.toLowerCase());
    if (!category) {
      category = {
        id: uid('cat'),
        name: seedCategory.name,
        icon: seedCategory.icon,
        order: order++,
        createdAt: now,
        updatedAt: now,
      };
      newCategories.push(category);
      categoryByName.set(seedCategory.name.toLowerCase(), category);
    }

    // Decks unlock in order, so a starter deck's position is the position it
    // holds in `SEED_CATEGORIES` — the order its words are meant to be met.
    seedCategory.decks.forEach((seedDeck, deckOrder) => {
      const deckKey = category!.id + '|' + seedDeck.name.toLowerCase();
      let deck = deckByKey.get(deckKey);
      if (!deck) {
        deck = {
          id: uid('deck'),
          categoryId: category!.id,
          name: seedDeck.name,
          order: deckOrder,
          perfectRunsRequired: DEFAULT_SETTINGS.defaultPerfectRunsRequired,
          promptDirections: ['en>he+ar'],
          createdAt: now,
          updatedAt: now,
        };
        newDecks.push(deck);
        deckByKey.set(deckKey, deck);
      }

      for (const seedCard of seedDeck.cards) {
        const existing = cardByKey.get(
          deck.id + '|' + seedCard.english.toLowerCase(),
        );
        if (existing) {
          changedCards.push({
            ...existing,
            ...sidesFor(seedCard, seedCategory.name, seedDeck.name, now),
          });
          report.updated++;
        } else {
          newCards.push({
            id: uid('card'),
            categoryId: category!.id,
            deckId: deck.id,
            createdAt: now,
            ...sidesFor(seedCard, seedCategory.name, seedDeck.name, now),
          });
          report.added++;
        }
      }
    });
  });

  await db.transaction('rw', [db.categories, db.decks, db.cards, db.settings], async () => {
    if (newCategories.length) await db.categories.bulkAdd(newCategories);
    if (newDecks.length) await db.decks.bulkAdd(newDecks);
    if (newCards.length) await db.cards.bulkAdd(newCards);
    if (changedCards.length) await db.cards.bulkPut(changedCards);
    await ensureSettings();
    // The device now holds this build's starter set, so later launches leave
    // it alone and the learner's own deletions stay deleted.
    await db.settings.update('settings', {
      starterContentVersion: STARTER_CONTENT_VERSION,
    });
  });

  return report;
}

export type StarterCoverage = {
  /** Official words present on this device. */
  present: number;
  /** Official words missing from it. */
  missing: number;
  /** Always `OFFICIAL_CARD_COUNT`. */
  total: number;
  /** Official categories holding no cards at all. */
  emptyCategories: string[];
};

/** How much of the official starter set this device actually has. */
export async function starterCoverage(): Promise<StarterCoverage> {
  const { officialCardIds, cardsByCategory } = await officialIndex();
  const emptyCategories = SEED_CATEGORIES.filter(
    (c) => (cardsByCategory.get(c.name.toLowerCase()) ?? 0) === 0,
  ).map((c) => c.name);

  return {
    present: officialCardIds.size,
    missing: OFFICIAL_CARD_COUNT - officialCardIds.size,
    total: OFFICIAL_CARD_COUNT,
    emptyCategories,
  };
}

/**
 * Cards sitting inside an official starter deck that the official set no
 * longer lists — leftovers from an earlier seed such as "apple" or "to eat".
 * They are only ever reported, never removed: the same query also catches a
 * word the learner added to a starter deck themselves.
 */
export async function retiredStarterCards(): Promise<Flashcard[]> {
  const [categories, decks, cards] = await Promise.all([
    db.categories.toArray(),
    db.decks.toArray(),
    db.cards.toArray(),
  ]);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const deckById = new Map(decks.map((d) => [d.id, d]));

  return cards.filter((card) => {
    const category = categoryById.get(card.categoryId);
    const deck = deckById.get(card.deckId);
    if (!category || !deck) return false;
    const deckKey = (category.name + '|' + deck.name).toLowerCase();
    if (!OFFICIAL_DECK_KEYS.has(deckKey)) return false;
    return !OFFICIAL_KEYS.has(officialKey(category.name, deck.name, card.english));
  });
}

/**
 * Moves cards into an "Archived" category, out of the starter decks but with
 * their ids and therefore their progress intact. Nothing is deleted.
 */
export async function archiveCards(cardIds: string[]): Promise<number> {
  if (cardIds.length === 0) return 0;
  const now = new Date().toISOString();

  const categories = await db.categories.toArray();
  let category = categories.find((c) => c.name.toLowerCase() === 'archived');
  const decks = await db.decks.toArray();

  const newCategories: Category[] = [];
  if (!category) {
    category = {
      id: uid('cat'),
      name: 'Archived',
      icon: '🗄️',
      order: categories.length,
      createdAt: now,
      updatedAt: now,
    };
    newCategories.push(category);
  }

  const deckName = 'Retired starter words';
  let deck = decks.find(
    (d) => d.categoryId === category!.id && d.name.toLowerCase() === deckName.toLowerCase(),
  );
  const newDecks: Deck[] = [];
  if (!deck) {
    deck = {
      id: uid('deck'),
      categoryId: category.id,
      name: deckName,
      perfectRunsRequired: DEFAULT_SETTINGS.defaultPerfectRunsRequired,
      promptDirections: ['en>he+ar'],
      createdAt: now,
      updatedAt: now,
    };
    newDecks.push(deck);
  }

  const moving = (await db.cards.bulkGet(cardIds))
    .filter((c): c is Flashcard => Boolean(c))
    .map((c) => ({ ...c, categoryId: category!.id, deckId: deck!.id, updatedAt: now }));

  await db.transaction('rw', [db.categories, db.decks, db.cards], async () => {
    if (newCategories.length) await db.categories.bulkAdd(newCategories);
    if (newDecks.length) await db.decks.bulkAdd(newDecks);
    await db.cards.bulkPut(moving);
  });

  return moving.length;
}

/** Which official cards exist, and how many cards each official category holds. */
async function officialIndex(): Promise<{
  officialCardIds: Set<string>;
  cardsByCategory: Map<string, number>;
}> {
  const [categories, decks, cards] = await Promise.all([
    db.categories.toArray(),
    db.decks.toArray(),
    db.cards.toArray(),
  ]);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const deckById = new Map(decks.map((d) => [d.id, d]));

  const officialCardIds = new Set<string>();
  const cardsByCategory = new Map<string, number>();

  for (const card of cards) {
    const category = categoryById.get(card.categoryId);
    const deck = deckById.get(card.deckId);
    if (!category || !deck) continue;
    const key = officialKey(category.name, deck.name, card.english);
    if (!OFFICIAL_KEYS.has(key)) continue;
    officialCardIds.add(card.id);
    const name = category.name.toLowerCase();
    cardsByCategory.set(name, (cardsByCategory.get(name) ?? 0) + 1);
  }

  return { officialCardIds, cardsByCategory };
}

export type StartupReport = InstallReport & { ran: boolean; merged: MergeReport };

/**
 * Guards against two launches racing each other.
 *
 * React's development double-mount fires the startup effect twice. Both passes
 * used to read an empty database before either had written, and both then
 * inserted the whole starter set — which is how a device ends up showing every
 * category twice. Sharing one promise makes the second caller wait for the
 * first instead of repeating its work.
 */
let inFlight: Promise<StartupReport> | null = null;

/**
 * Called once per launch. An empty database gets the full starter set; a
 * database seeded by an older build gets topped up once, so categories that
 * did not exist back then stop showing "0 cards". Neither path deletes a word
 * — once the device is marked current, the learner's own deletions stick.
 *
 * Duplicates left behind by earlier racing launches are merged on the way
 * through, which is the one place rows are removed, and only ever rows that
 * repeat a name already present.
 */
export function prepareStarterContent(): Promise<StartupReport> {
  inFlight ??= runStarterContent().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runStarterContent(): Promise<StartupReport> {
  await ensureSettings();
  const settings = await db.settings.get('settings');
  const seeded = (await db.categories.count()) > 0;
  const current = settings?.starterContentVersion === STARTER_CONTENT_VERSION;

  const install =
    seeded && current
      ? { ran: false, added: 0, updated: 0 }
      : { ran: true, ...(await installStarterCards()) };

  // Runs unconditionally: a device duplicated by an older build is already
  // marked current, so gating this on the install would never reach it.
  const merged = await mergeDuplicateContent();

  return { ...install, merged };
}

export async function ensureSettings(): Promise<void> {
  const stored = await db.settings.get('settings');
  if (!stored) await db.settings.put(DEFAULT_SETTINGS);
}
