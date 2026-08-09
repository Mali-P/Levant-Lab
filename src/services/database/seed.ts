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
export const STARTER_CONTENT_VERSION = 32;

/**
 * How many cards the official starter set contains: every taught deck is a ten,
 * so this is ten times the number of decks, plus the nine sentences the Custom
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
  order: number,
  now: string,
): Omit<Flashcard, 'id' | 'categoryId' | 'deckId' | 'createdAt'> {
  // Keyed off the same category / deck / English identity the merge below uses
  // to recognise a word, so a card keeps its recordings across reinstalls.
  const audioId = audioIdFor(categoryName, deckName, card.english);

  return {
    english: card.english,
    icon: card.icon,
    // The position this word holds in its seed deck. Rewritten on every
    // top-up, so a device seeded before ordering existed stops reading its
    // counting decks in whatever order IndexedDB returned them.
    order,
    audioId,
    hebrew: withClipPaths(
      {
        script: card.hebrew.script,
        transliteration: card.hebrew.transliteration,
        forms: card.hebrew.forms,
        // Carried across explicitly: a card whose variants were dropped here
        // would fall back to `script` alone, which is one perspective's
        // wording presented as if it were everybody's. `agreement` travels
        // with `forms` for the same reason — a pair that arrives without it
        // has quietly become word gender, and shows both halves for ever.
        agreement: card.hebrew.agreement,
        speechForms: card.hebrew.speechForms,
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
        agreement: card.arabic.agreement,
        speechForms: card.arabic.speechForms,
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

      // A card's position in the seed deck is the order its words are meant to
      // be read in — one to ten, not "three, nine, one".
      seedDeck.cards.forEach((seedCard, cardOrder) => {
        const sides = sidesFor(
          seedCard,
          seedCategory.name,
          seedDeck.name,
          cardOrder,
          now,
        );
        const existing = cardByKey.get(
          deck!.id + '|' + seedCard.english.toLowerCase(),
        );
        if (existing) {
          changedCards.push({ ...existing, ...sides });
          report.updated++;
        } else {
          newCards.push({
            id: uid('card'),
            categoryId: category!.id,
            deckId: deck!.id,
            createdAt: now,
            ...sides,
          });
          report.added++;
        }
      });
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

/**
 * Categories that have been split or renamed since a device was seeded, and
 * which deck moves out of the old one.
 *
 * `installStarterCards` finds a category by its name, so without this a device
 * holding "Titles and pronouns" would be given a fresh "Pronouns" and a fresh
 * "Titles" beside it, each with new ids and no progress, and the learner would
 * see the same words three times over. Repointing the rows the device already
 * has keeps every card id, and therefore every streak.
 */
const RESHAPED_CATEGORIES: {
  from: string;
  /** Left off where the old category keeps its name and only loses a deck. */
  into?: { name: string; icon: string };
  movingDeck: { name: string; into: { name: string; icon: string } };
}[] = [
  {
    from: 'Titles and pronouns',
    into: { name: 'Pronouns', icon: '🫵' },
    movingDeck: {
      name: 'Titles and forms of address',
      into: { name: 'Titles', icon: '🎩' },
    },
  },
  {
    // Adjectives keeps its name; the colours it used to hold become a category
    // of their own, and the deck the learner has already studied moves across.
    from: 'Adjectives',
    movingDeck: { name: 'Colours', into: { name: 'Colours', icon: '🌈' } },
  },
];

/**
 * Applies those splits. Runs before the top-up and writes nothing on a device
 * that has already been through it, or on one seeded after the change.
 */
export async function reshapeRenamedCategories(): Promise<number> {
  const [categories, decks] = await Promise.all([
    db.categories.toArray(),
    db.decks.toArray(),
  ]);
  const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const byId = new Map(categories.map((c) => [c.id, c]));
  const now = new Date().toISOString();

  const changedCategories: Category[] = [];
  const newCategories: Category[] = [];
  const changedDecks: Deck[] = [];
  const changedCards: Flashcard[] = [];

  for (const rule of RESHAPED_CATEGORIES) {
    const old = byName.get(rule.from.toLowerCase());
    if (!old) continue;

    // Only worth a write the first time: a rule that renames nothing, on a
    // device whose deck has already moved, must leave the row alone so the
    // launch after this one has nothing to do.
    if (rule.into && (old.name !== rule.into.name || old.icon !== rule.into.icon)) {
      changedCategories.push({
        ...old,
        name: rule.into.name,
        icon: rule.into.icon,
        updatedAt: now,
      });
    }

    const moving = decks.find(
      (d) =>
        d.categoryId === old.id &&
        d.name.toLowerCase() === rule.movingDeck.name.toLowerCase(),
    );
    if (!moving) continue;

    let target = byName.get(rule.movingDeck.into.name.toLowerCase());
    if (!target) {
      target = {
        id: uid('cat'),
        name: rule.movingDeck.into.name,
        icon: rule.movingDeck.into.icon,
        // Half a step behind the category it was split from, so it lands
        // immediately after it. The renumbering below settles it to a whole
        // step before the top-up runs and starts counting from the total.
        order: old.order + 0.5,
        createdAt: now,
        updatedAt: now,
      };
      newCategories.push(target);
      byName.set(target.name.toLowerCase(), target);
    }

    changedDecks.push({ ...moving, categoryId: target.id, order: 0, updatedAt: now });

    const cards = await db.cards.where('deckId').equals(moving.id).toArray();
    for (const card of cards) {
      changedCards.push({ ...card, categoryId: target.id, updatedAt: now });
    }
  }

  if (!changedCategories.length && !newCategories.length) return 0;

  // The half-step above has to be spent before the top-up runs: that pass
  // numbers each category it adds from the count of those already present, so
  // a fractional order — or any gap — would put a newly installed category
  // between the two halves of the split. Renumbering the whole list from zero
  // leaves the next free number exactly where the top-up will start.
  const renamed = new Map(changedCategories.map((c) => [c.id, c]));
  const ordered = [...categories.map((c) => renamed.get(c.id) ?? c), ...newCategories]
    .sort(
      (a, b) =>
        a.order - b.order ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    )
    .map((c, i) => (c.order === i ? c : { ...c, order: i, updatedAt: now }));

  const newIds = new Set(newCategories.map((c) => c.id));
  const toAdd = ordered.filter((c) => newIds.has(c.id));
  const toPut = ordered.filter(
    (c) => !newIds.has(c.id) && (renamed.has(c.id) || c.order !== byId.get(c.id)!.order),
  );

  await db.transaction('rw', [db.categories, db.decks, db.cards], async () => {
    if (toAdd.length) await db.categories.bulkAdd(toAdd);
    if (toPut.length) await db.categories.bulkPut(toPut);
    if (changedDecks.length) await db.decks.bulkPut(changedDecks);
    if (changedCards.length) await db.cards.bulkPut(changedCards);
  });

  return changedCategories.length + newCategories.length;
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

  // Before the top-up, not after: the install matches categories by name, and
  // a device still holding a since-split one would otherwise be given the new
  // categories as duplicates rather than having its own rows moved across.
  if (seeded) await reshapeRenamedCategories();

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
