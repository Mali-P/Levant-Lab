import type { Category, Deck, Flashcard, Language, LanguageSide } from '../../types';
import { CUSTOM_CATEGORY, SEED_CATEGORIES, type SeedCard } from '../../constants/seed';
import { SENTENCE_CATEGORIES } from '../../constants/sentences';
import { CONVERSATION_CATEGORIES } from '../../constants/conversations';
import { SITUATION_CATEGORIES } from '../../constants/situations';
import { PAST_FUTURE_CATEGORIES } from '../../constants/pastfuture';
import { TELL_ME_CATEGORIES } from '../../constants/tellme';
import { uid } from '../../utils/random';
import { audioIdFor } from '../audio/paths';
import { withClipPaths } from '../audio/manifest';
import { db } from './db';
import { mergeDuplicateContent, type MergeReport } from './dedupe';
import { DEFAULT_SETTINGS } from './defaults';
import { clearUnaskableProgress } from './repairProgress';

export type InstallReport = { added: number; updated: number };

/**
 * Bumped whenever `SEED_CATEGORIES` gains or changes words. An install that
 * predates the current number is topped up once on launch, which is what
 * rescues a device seeded before the later categories existed. Deletions made
 * after that top-up are the learner's own and are not undone.
 */
export const STARTER_CONTENT_VERSION = 50;

/**
 * Everything the app installs: the vocabulary course, then each standalone
 * level in the order the learner meets it.
 *
 * One list for the installer and the official-word bookkeeping, so an exchange
 * is topped up, deduplicated and counted exactly the way a word is. The bodies
 * of content stay separate constants because everything *else* about them
 * differs — the course is gated into a ladder, the standalone levels are
 * not, and `languagePolicy.isStandaloneLevel` tells the areas apart by name.
 */
export const INSTALLED_CATEGORIES = [
  ...SEED_CATEGORIES,
  ...SENTENCE_CATEGORIES,
  ...CONVERSATION_CATEGORIES,
  ...SITUATION_CATEGORIES,
  ...PAST_FUTURE_CATEGORIES,
  ...TELL_ME_CATEGORIES,
];

/** `category|deck|english`, lowercased. Identifies one official word. */
function officialKey(category: string, deck: string, english: string): string {
  return [category, deck, english].map((s) => s.trim().toLowerCase()).join('|');
}

const OFFICIAL_KEYS: ReadonlySet<string> = new Set(
  INSTALLED_CATEGORIES.flatMap((category) =>
    category.decks.flatMap((deck) =>
      deck.cards.map((card) => officialKey(category.name, deck.name, card.english)),
    ),
  ),
);

/**
 * How many cards the official starter set contains, across ordinary decks,
 * small Basics stages, cumulative mastery decks, and the sentences the Custom
 * category opens with. Sentences added there afterwards are the learner's own
 * and are counted nowhere here.
 *
 * Counted as distinct words rather than as seed rows, because it is compared
 * against what a device actually holds and that comparison is by word. Were the
 * seed ever to list one word twice in a deck, a row count would stand for ever
 * one above anything a device could reach, and the top-up — which repairs only
 * while something is missing — would then run on every single launch.
 */
export const OFFICIAL_CARD_COUNT = OFFICIAL_KEYS.size;

/**
 * Decks whose contents the official set defines in full — the Custom category
 * excepted, since a sentence the learner writes there belongs in its deck and
 * must not be read as a leftover from an older seed.
 */
function officialDeckKey(category: string, deck: string): string {
  return [category, deck].map((s) => s.trim().toLowerCase()).join('|');
}

const OFFICIAL_DECK_KEYS: ReadonlySet<string> = new Set(
  INSTALLED_CATEGORIES.filter((category) => category.name !== CUSTOM_CATEGORY).flatMap(
    (category) => category.decks.map((deck) => officialDeckKey(category.name, deck.name)),
  ),
);

/**
 * Whether the official set defines this deck's contents in full — which is to
 * say, whether an empty one is a fault rather than a deck waiting to be
 * written. The Custom category is excluded by the set above, so a sentence deck
 * of the learner's own answers false and keeps its own empty state.
 */
export function isOfficialDeck(
  categoryName: string | undefined,
  deckName: string | undefined,
): boolean {
  if (!categoryName || !deckName) return false;
  return OFFICIAL_DECK_KEYS.has(officialDeckKey(categoryName, deckName));
}

/**
 * One authored side, narrowed to the fields a stored card may carry.
 *
 * A whitelist rather than a spread, and every field on it is here on purpose.
 * A side arriving without its `speechForms` falls back to `script` alone, which
 * is one perspective's wording presented as everybody's; `agreement` travels
 * with `forms` for the same reason, since a pair that loses it has quietly
 * become word gender and shows both halves for ever.
 */
function sideOf(side: SeedCard['hebrew']): LanguageSide {
  return {
    script: side.script,
    transliteration: side.transliteration,
    forms: side.forms,
    agreement: side.agreement,
    speechForms: side.speechForms,
    notes: side.notes,
  };
}

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
    // The question this card answers, where it has one. Always written, even
    // as undefined: the top-up merges with `{...existing, ...sides}`, so a key
    // left off entirely would strand a cue on a card that no longer has one.
    //
    // Its clips are filed under an id of their own, because the cue is a
    // different sentence from the answer and recording them under one key
    // would have the two overwrite each other.
    cue: card.cue
      ? {
          english: card.cue.english,
          hebrew: withClipPaths(sideOf(card.cue.hebrew), audioId + '__ask', 'hebrew'),
          arabic: {
            ...withClipPaths(sideOf(card.cue.arabic), audioId + '__ask', 'arabic'),
            dialect: card.cue.arabic.dialect,
          },
        }
      : undefined,
    // The position this word holds in its seed deck. Rewritten on every
    // top-up, so a device seeded before ordering existed stops reading its
    // counting decks in whatever order IndexedDB returned them.
    order,
    audioId,
    hebrew: withClipPaths(sideOf(card.hebrew), audioId, 'hebrew'),
    arabic: {
      ...withClipPaths(sideOf(card.arabic), audioId, 'arabic'),
      dialect: card.arabic.dialect,
    },
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
  const changedCategories: Category[] = [];
  const newDecks: Deck[] = [];
  const changedDecks: Deck[] = [];
  const newCards: Flashcard[] = [];
  const changedCards: Flashcard[] = [];
  const decksWithNewOfficialCards = new Set<string>();

  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const deckByKey = new Map(
    decks.map((d) => [d.categoryId + '|' + d.name.toLowerCase(), d]),
  );
  const cardByKey = new Map(
    cards.map((c) => [c.deckId + '|' + c.english.toLowerCase(), c]),
  );

  INSTALLED_CATEGORIES.forEach((seedCategory, categoryOrder) => {
    let category = categoryByName.get(seedCategory.name.toLowerCase());
    if (!category) {
      category = {
        id: uid('cat'),
        name: seedCategory.name,
        icon: seedCategory.icon,
        order: categoryOrder,
        createdAt: now,
        updatedAt: now,
      };
      newCategories.push(category);
      categoryByName.set(seedCategory.name.toLowerCase(), category);
    } else if (category.order !== categoryOrder || category.icon !== seedCategory.icon) {
      category = {
        ...category,
        icon: seedCategory.icon,
        order: categoryOrder,
        updatedAt: now,
      };
      changedCategories.push(category);
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
          studyLanguages: seedDeck.studyLanguages,
          masteryOnly: seedDeck.masteryOnly,
          roundSize: seedDeck.roundSize,
          // The course's own figure where it sets one — sentence chains ask
          // for less than a vocabulary deck — and the learner's default
          // everywhere the seed has no opinion.
          perfectRunsRequired:
            seedDeck.perfectRunsRequired ??
            DEFAULT_SETTINGS.defaultPerfectRunsRequired,
          promptDirections: ['en>he+ar'],
          createdAt: now,
          updatedAt: now,
        };
        newDecks.push(deck);
        deckByKey.set(deckKey, deck);
      } else if (
        deck.order !== deckOrder ||
        deck.masteryOnly !== seedDeck.masteryOnly ||
        deck.roundSize !== seedDeck.roundSize ||
        // Only where the seed fixes a figure: a deck the seed is silent about
        // keeps whatever the learner's default gave it, for ever.
        (seedDeck.perfectRunsRequired !== undefined &&
          deck.perfectRunsRequired !== seedDeck.perfectRunsRequired) ||
        JSON.stringify(deck.studyLanguages ?? null) !==
          JSON.stringify(seedDeck.studyLanguages ?? null)
      ) {
        deck = {
          ...deck,
          order: deckOrder,
          studyLanguages: seedDeck.studyLanguages,
          masteryOnly: seedDeck.masteryOnly,
          roundSize: seedDeck.roundSize,
          perfectRunsRequired:
            seedDeck.perfectRunsRequired ?? deck.perfectRunsRequired,
          updatedAt: now,
        };
        changedDecks.push(deck);
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
          decksWithNewOfficialCards.add(deck!.id);
          report.added++;
        }
      });
    });
  });

  const staleSessions = decksWithNewOfficialCards.size
    ? await db.sessions
        .filter(
          (session) =>
            !session.completedAt && decksWithNewOfficialCards.has(session.deckId),
        )
        .primaryKeys()
    : [];

  await db.transaction('rw', [db.categories, db.decks, db.cards, db.sessions, db.settings], async () => {
    if (newCategories.length) await db.categories.bulkAdd(newCategories);
    if (changedCategories.length) await db.categories.bulkPut(changedCategories);
    if (newDecks.length) await db.decks.bulkAdd(newDecks);
    if (changedDecks.length) await db.decks.bulkPut(changedDecks);
    if (newCards.length) await db.cards.bulkAdd(newCards);
    if (changedCards.length) await db.cards.bulkPut(changedCards);
    if (staleSessions.length) await db.sessions.bulkDelete(staleSessions);
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
  const { presentKeys, cardsByCategory } = await officialIndex();
  const emptyCategories = INSTALLED_CATEGORIES.filter(
    (c) => (cardsByCategory.get(c.name.toLowerCase()) ?? 0) === 0,
  ).map((c) => c.name);

  return {
    present: presentKeys.size,
    missing: OFFICIAL_CARD_COUNT - presentKeys.size,
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

  // An unfinished run dealt one of these words cannot be resumed once the word
  // has left its deck. The row is moved rather than deleted, so the usual test
  // — does every card the session names still exist — finds nothing wrong, and
  // the run comes back on a card its deck can no longer deal. Only unfinished
  // runs go; a completed one is history and stays.
  const movedIds = new Set(moving.map((c) => c.id));
  const stranded = await db.sessions
    .filter(
      (session) =>
        !session.completedAt &&
        (session.deckCardIds ?? []).some((id) => movedIds.has(id)),
    )
    .primaryKeys();

  await db.transaction(
    'rw',
    [db.categories, db.decks, db.cards, db.sessions],
    async () => {
      if (newCategories.length) await db.categories.bulkAdd(newCategories);
      if (newDecks.length) await db.decks.bulkAdd(newDecks);
      await db.cards.bulkPut(moving);
      if (stranded.length) await db.sessions.bulkDelete(stranded);
    },
  );

  return moving.length;
}

/** The combined rows that the split-out gendered "can" cards replaced. */
const RETIRED_CAN_ENGLISH: ReadonlySet<string> = new Set([
  'i can',
  "i can't",
  'you can',
  "you can't",
]);

/**
 * Earlier Basics installs taught gendered "can" rows as one card with two
 * forms. The official set now teaches those as separate symbol-marked cards,
 * so the old combined rows need to leave the Basics decks even on a device
 * already marked current.
 *
 * A row only leaves once the pair replacing it is standing in the same deck.
 * Archiving is here to clear a word taught twice, and a deck whose
 * replacements have not arrived has nothing doubled to clear — emptying it
 * there takes the lot away from the learner and leaves a deck reporting its
 * own words missing. The replacements come from the top-up above, so on a
 * device needing both this is one launch; on one the top-up did not reach, the
 * old rows stay and the deck goes on teaching "can".
 */
export async function archiveRetiredBasicsCanCards(): Promise<number> {
  const [categories, decks, cards] = await Promise.all([
    db.categories.toArray(),
    db.decks.toArray(),
    db.cards.toArray(),
  ]);
  const basics = categories.find((c) => c.name.toLowerCase() === 'basics of basics');
  if (!basics) return 0;

  const canDeckIds = new Set(
    decks
      .filter(
        (deck) =>
          deck.categoryId === basics.id &&
          (deck.name === 'Can' || deck.name.startsWith('Can —')),
      )
      .map((deck) => deck.id),
  );
  if (!canDeckIds.size) return 0;

  // Which Can decks hold a replacement — a gendered row such as "I can
  // (female)". Only those may give up their old combined rows.
  const replaced = new Set<string>();
  for (const card of cards) {
    if (!canDeckIds.has(card.deckId)) continue;
    const english = card.english.toLowerCase();
    if (RETIRED_CAN_ENGLISH.has(english)) continue;
    if (english.startsWith('i can') || english.startsWith('you can')) {
      replaced.add(card.deckId);
    }
  }

  const retired = cards
    .filter(
      (card) =>
        replaced.has(card.deckId) && RETIRED_CAN_ENGLISH.has(card.english.toLowerCase()),
    )
    .map((card) => card.id);

  return archiveCards(retired);
}

/**
 * Which official words this device holds, and how many each official category
 * holds.
 *
 * Counted as words rather than as rows. A device that somehow ends up with one
 * word twice — two launches racing each other is the way it happens — would
 * otherwise have that spare row cancel out a word missing somewhere else, the
 * total would come out right, and the top-up that exists to restore the missing
 * word would decide there was nothing to do. That is a deck sitting empty on a
 * device the app believes to be complete, and it is the whole reason this is a
 * set of keys and not a set of ids.
 */
async function officialIndex(): Promise<{
  presentKeys: Set<string>;
  cardsByCategory: Map<string, number>;
}> {
  const [categories, decks, cards] = await Promise.all([
    db.categories.toArray(),
    db.decks.toArray(),
    db.cards.toArray(),
  ]);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const deckById = new Map(decks.map((d) => [d.id, d]));

  const presentKeys = new Set<string>();
  const cardsByCategory = new Map<string, number>();

  for (const card of cards) {
    const category = categoryById.get(card.categoryId);
    const deck = deckById.get(card.deckId);
    if (!category || !deck) continue;
    const key = officialKey(category.name, deck.name, card.english);
    if (!OFFICIAL_KEYS.has(key) || presentKeys.has(key)) continue;
    presentKeys.add(key);
    const name = category.name.toLowerCase();
    cardsByCategory.set(name, (cardsByCategory.get(name) ?? 0) + 1);
  }

  return { presentKeys, cardsByCategory };
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

  if (
    !changedCategories.length &&
    !newCategories.length &&
    !changedDecks.length &&
    !changedCards.length
  ) {
    return 0;
  }

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

  return (
    changedCategories.length +
    newCategories.length +
    changedDecks.length +
    changedCards.length
  );
}

/**
 * Decks as they were named before their category became a language ladder,
 * mapped to the stage each one is now the first rung of.
 *
 * A lot was once a single deck — "Directions", "Hello and goodbye" — and is now
 * three: Hebrew, then Palestinian Arabic, then both together. The deck a
 * learner has already worked is the Hebrew rung of its lot, so it is renamed
 * into that rung rather than left standing beside it. Without this the top-up
 * finds no deck called "Directions — Hebrew", builds a second one, and she is
 * shown her old deck and its replacement side by side with her ten flawless
 * runs recorded against the copy the ladder no longer uses.
 *
 * Keyed by category as well as by name because the same bare name occurs in
 * more than one category — "Colours" is a deck in Basics and a category of its
 * own — and a rename must never reach across.
 */
const LEGACY_STAGE_NAMES: ReadonlyMap<string, string> = new Map(
  SEED_CATEGORIES.flatMap((category) =>
    category.decks
      .filter((deck) => deck.name.endsWith(' — Hebrew'))
      .map((deck): [string, string] => [
        legacyStageKey(category.name, deck.name.slice(0, -' — Hebrew'.length)),
        deck.name,
      ]),
  ),
);

function legacyStageKey(categoryName: string, deckName: string): string {
  return [categoryName, deckName].map((s) => s.trim().toLowerCase()).join('|');
}

/**
 * Renames those decks in place, keeping every id. Writes nothing on a device
 * seeded after the split, or on one that has already been through this.
 */
export async function reshapeLegacyStagedDecks(): Promise<number> {
  const [categories, decks] = await Promise.all([
    db.categories.toArray(),
    db.decks.toArray(),
  ]);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const now = new Date().toISOString();

  const renamed = decks.flatMap((deck) => {
    const category = categoryById.get(deck.categoryId);
    if (!category) return [];
    // Judged by the name alone. The stage names all carry their language, so a
    // deck that is already a stage cannot match the bare names here and needs
    // no guard of its own — whereas a bare "Can" that an in-between build gave
    // a language to is still the old lot, and skipping it over that language
    // stranded it: named nothing the seed lists, it was never topped up, its
    // empty state offered to write the words out by hand, and the sweep that
    // retires the old combined rows took the last of its cards away.
    const stageName = LEGACY_STAGE_NAMES.get(
      legacyStageKey(category.name, deck.name),
    );
    if (!stageName) return [];
    return [
      {
        ...deck,
        name: stageName,
        studyLanguages: ['hebrew'] as Language[],
        updatedAt: now,
      },
    ];
  });

  if (!renamed.length) return 0;
  await db.decks.bulkPut(renamed);
  return renamed.length;
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

  // Before the top-up, not after: the install matches categories and decks by
  // name, and a device still holding a since-split category or a since-staged
  // Basics deck would otherwise be given the new rows as duplicates rather than
  // having its own moved across, taking its progress with them.
  if (seeded) {
    await reshapeRenamedCategories();
    await reshapeLegacyStagedDecks();
  }

  // What is counted here is words, not rows — see `officialIndex`. It has to
  // be, because this is the decision about whether anything needs restoring and
  // it is taken before duplicates are collapsed at the bottom of this function.
  // Counting rows, a word held twice would settle the account for a word held
  // nowhere, the total would come out right, and a deck could sit empty on a
  // device the app had just pronounced complete.
  const coverage = seeded ? await starterCoverage() : null;
  const hasEveryCategory =
    coverage !== null && coverage.emptyCategories.length === 0;
  const hasEveryOfficialCard = coverage !== null && coverage.missing === 0;
  const install =
    seeded && current && hasEveryCategory && hasEveryOfficialCard
      ? { ran: false, added: 0, updated: 0 }
      : { ran: true, ...(await installStarterCards()) };

  await archiveRetiredBasicsCanCards();

  // After the install and the reshapes, so each card is judged by the sides it
  // has once every card is where it belongs. Runs on every launch: it is a
  // repair rather than a version step, and a device can acquire such a row at
  // any time by saving a card with one half still blank.
  await clearUnaskableProgress();

  // Runs unconditionally: a device duplicated by an older build is already
  // marked current, so gating this on the install would never reach it.
  const merged = await mergeDuplicateContent();

  return { ...install, merged };
}

export async function ensureSettings(): Promise<void> {
  const stored = await db.settings.get('settings');
  if (!stored) await db.settings.put(DEFAULT_SETTINGS);
}
