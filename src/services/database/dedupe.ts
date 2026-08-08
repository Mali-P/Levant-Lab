import type {
  CardProgress,
  Category,
  Deck,
  DeckProgress,
  Flashcard,
  StudySession,
} from '../../types';
import { attempts } from '../../features/review/mastery';
import { sortDecks } from '../../features/review/unlock';
import { db } from './db';

/**
 * Collapses categories and decks that the same starter set installed twice.
 *
 * Devices exist whose card box holds every official category two or three
 * times over: the launch effect ran concurrently, each pass read an empty
 * database, and each pass inserted the full starter set. The learner sees two
 * "Shopping" tiles with no way to tell them apart.
 *
 * Merging is by name, and it never throws work away. Rows are repointed at one
 * survivor rather than rewritten, so a card keeps its id and therefore its
 * progress; where a word genuinely exists twice, the copy the learner has
 * actually studied is the one kept.
 */

export type MergeReport = {
  categoriesRemoved: number;
  decksRemoved: number;
  cardsRemoved: number;
  sessionsRemoved: number;
};

const EMPTY: MergeReport = {
  categoriesRemoved: 0,
  decksRemoved: 0,
  cardsRemoved: 0,
  sessionsRemoved: 0,
};

const key = (s: string): string => s.trim().toLowerCase();

/** Groups rows by a derived key, preserving insertion order within a group. */
function groupBy<T>(rows: T[], of: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = of(row);
    const bucket = groups.get(k);
    if (bucket) bucket.push(row);
    else groups.set(k, [row]);
  }
  return groups;
}

/**
 * The survivor of a duplicate set is the one sitting highest in the list the
 * learner already sees; ties fall to the oldest, then to the id, so two runs
 * of this function always pick the same row.
 */
function pickCategory(duplicates: Category[]): Category {
  return [...duplicates].sort(
    (a, b) =>
      a.order - b.order ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  )[0];
}

function pickDeck(duplicates: Deck[]): Deck {
  return sortDecks(duplicates)[0];
}

/**
 * Between two copies of one word, keep whichever the learner has actually
 * answered. Progress lives under the card's id, so keeping that row is what
 * keeps the streaks.
 */
function pickCard(
  duplicates: Flashcard[],
  progress: Map<string, CardProgress>,
): Flashcard {
  const studied = (card: Flashcard): number => {
    const p = progress.get(card.id);
    return p ? attempts(p.hebrew) + attempts(p.arabic) : 0;
  };
  return [...duplicates].sort(
    (a, b) =>
      studied(b) - studied(a) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  )[0];
}

const earliest = (a?: string, b?: string): string | undefined =>
  a && b ? (a < b ? a : b) : (a ?? b);

const latest = (a?: string, b?: string): string | undefined =>
  a && b ? (a > b ? a : b) : (a ?? b);

/**
 * Folds a duplicate deck's progress into the survivor's. The learner did the
 * work under both ids, so the better run count and the earlier pass stamp are
 * the honest ones to keep.
 */
function mergeDeckProgress(
  into: DeckProgress | undefined,
  from: DeckProgress | undefined,
  deckId: string,
): DeckProgress | undefined {
  if (!from) return into;
  if (!into) return { ...from, deckId };

  return {
    deckId,
    perfectRunsCompleted: Math.max(
      into.perfectRunsCompleted,
      from.perfectRunsCompleted,
    ),
    hardModeFailures: into.hardModeFailures + from.hardModeFailures,
    normalModeCompletedAt: earliest(
      into.normalModeCompletedAt,
      from.normalModeCompletedAt,
    ),
    hardModePassedAt: earliest(into.hardModePassedAt, from.hardModePassedAt),
    lastStudiedAt: latest(into.lastStudiedAt, from.lastStudiedAt),
  };
}

/**
 * Merges duplicates and renumbers what is left, so categories and the decks
 * inside them come out as one contiguous ordered ladder.
 *
 * Safe to run on every launch: with nothing to merge it writes nothing at all.
 */
export async function mergeDuplicateContent(): Promise<MergeReport> {
  const [categories, decks, cards, cardProgress, deckProgress, sessions] =
    await Promise.all([
      db.categories.toArray(),
      db.decks.toArray(),
      db.cards.toArray(),
      db.cardProgress.toArray(),
      db.deckProgress.toArray(),
      db.sessions.toArray(),
    ]);

  if (categories.length === 0) return EMPTY;

  const now = new Date().toISOString();
  const progressByCard = new Map(cardProgress.map((p) => [p.cardId, p]));
  const progressByDeck = new Map(deckProgress.map((p) => [p.deckId, p]));

  // --- categories -------------------------------------------------------

  const categoryRemap = new Map<string, string>();
  const keptCategories: Category[] = [];
  const droppedCategoryIds: string[] = [];

  for (const duplicates of groupBy(categories, (c) => key(c.name)).values()) {
    const survivor = pickCategory(duplicates);
    keptCategories.push(survivor);
    for (const other of duplicates) {
      if (other.id === survivor.id) continue;
      categoryRemap.set(other.id, survivor.id);
      droppedCategoryIds.push(other.id);
    }
  }

  const categoryIdOf = (id: string): string => categoryRemap.get(id) ?? id;

  // --- decks ------------------------------------------------------------

  const repointedDecks = decks.map((d) => ({
    ...d,
    categoryId: categoryIdOf(d.categoryId),
  }));

  const deckRemap = new Map<string, string>();
  const keptDecks: Deck[] = [];
  const droppedDeckIds: string[] = [];
  const mergedDeckProgress = new Map<string, DeckProgress>();

  for (const duplicates of groupBy(
    repointedDecks,
    (d) => d.categoryId + '|' + key(d.name),
  ).values()) {
    const survivor = pickDeck(duplicates);
    keptDecks.push(survivor);

    let progress = progressByDeck.get(survivor.id);
    for (const other of duplicates) {
      if (other.id === survivor.id) continue;
      deckRemap.set(other.id, survivor.id);
      droppedDeckIds.push(other.id);
      progress = mergeDeckProgress(
        progress,
        progressByDeck.get(other.id),
        survivor.id,
      );
    }
    if (progress) mergedDeckProgress.set(survivor.id, progress);
  }

  const deckIdOf = (id: string): string => deckRemap.get(id) ?? id;

  // --- cards ------------------------------------------------------------

  const repointedCards = cards.map((c) => ({
    ...c,
    categoryId: categoryIdOf(c.categoryId),
    deckId: deckIdOf(c.deckId),
  }));

  const keptCards: Flashcard[] = [];
  const droppedCardIds: string[] = [];

  for (const duplicates of groupBy(
    repointedCards,
    (c) => c.deckId + '|' + key(c.english),
  ).values()) {
    const survivor = pickCard(duplicates, progressByCard);
    keptCards.push(survivor);
    for (const other of duplicates) {
      if (other.id !== survivor.id) droppedCardIds.push(other.id);
    }
  }

  // --- ordering ---------------------------------------------------------

  const orderedCategories = [...keptCategories]
    .sort(
      (a, b) =>
        a.order - b.order ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    )
    .map((c, i) => ({ ...c, order: i }));

  const decksByCategory = groupBy(keptDecks, (d) => d.categoryId);
  const orderedDecks = [...decksByCategory.values()].flatMap((group) =>
    sortDecks(group).map((d, i) => ({ ...d, order: i })),
  );

  // --- sessions ---------------------------------------------------------

  // An open session pinned to a deck that no longer exists, or holding cards
  // that were just merged away, would resume into a broken screen. Only
  // unfinished sessions are discarded; completed ones are history and stay.
  const survivingCardIds = new Set(keptCards.map((c) => c.id));
  const staleSessions = sessions.filter(
    (s: StudySession) =>
      !s.completedAt &&
      // The whole deck as the ladder deals it, so a card merged away out of a
      // stage the learner has not climbed to yet still counts as stale — the
      // session would introduce it three stages from now and find it gone.
      // Defaulted because a backup from an older build can carry sessions that
      // predate the field.
      (deckRemap.has(s.deckId) ||
        (s.deckCardIds ?? []).some((id) => !survivingCardIds.has(id))),
  );

  // --- write ------------------------------------------------------------

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const deckById = new Map(decks.map((d) => [d.id, d]));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const changedCategories = orderedCategories.filter(
    (c) => categoryById.get(c.id)!.order !== c.order,
  );

  const changedDecks = orderedDecks.filter((d) => {
    const before = deckById.get(d.id)!;
    return before.order !== d.order || before.categoryId !== d.categoryId;
  });

  const changedCards = keptCards.filter((c) => {
    const before = cardById.get(c.id)!;
    return before.categoryId !== c.categoryId || before.deckId !== c.deckId;
  });

  const nothingToDo =
    changedCategories.length === 0 &&
    changedDecks.length === 0 &&
    changedCards.length === 0 &&
    droppedCategoryIds.length === 0 &&
    droppedDeckIds.length === 0 &&
    droppedCardIds.length === 0 &&
    staleSessions.length === 0;

  if (nothingToDo) return EMPTY;

  await db.transaction(
    'rw',
    [db.categories, db.decks, db.cards, db.cardProgress, db.deckProgress, db.sessions],
    async () => {
      if (changedCategories.length) {
        await db.categories.bulkPut(
          changedCategories.map((c) => ({ ...c, updatedAt: now })),
        );
      }
      if (changedDecks.length) {
        await db.decks.bulkPut(changedDecks.map((d) => ({ ...d, updatedAt: now })));
      }
      if (changedCards.length) {
        await db.cards.bulkPut(changedCards.map((c) => ({ ...c, updatedAt: now })));
      }
      if (mergedDeckProgress.size) {
        await db.deckProgress.bulkPut([...mergedDeckProgress.values()]);
      }
      if (droppedCategoryIds.length) {
        await db.categories.bulkDelete(droppedCategoryIds);
      }
      if (droppedDeckIds.length) {
        await db.decks.bulkDelete(droppedDeckIds);
        await db.deckProgress.bulkDelete(droppedDeckIds);
      }
      if (droppedCardIds.length) {
        await db.cards.bulkDelete(droppedCardIds);
        await db.cardProgress.bulkDelete(droppedCardIds);
      }
      if (staleSessions.length) {
        await db.sessions.bulkDelete(staleSessions.map((s) => s.id));
      }
    },
  );

  return {
    categoriesRemoved: droppedCategoryIds.length,
    decksRemoved: droppedDeckIds.length,
    cardsRemoved: droppedCardIds.length,
    sessionsRemoved: staleSessions.length,
  };
}
