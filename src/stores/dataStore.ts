import { create } from 'zustand';
import type {
  CardProgress,
  Category,
  Deck,
  DeckProgress,
  Flashcard,
} from '../types';
import { db } from '../services/database/db';
import { emptyDeckProgress } from '../services/database/defaults';
import { applyAnswerToProgress } from '../features/review/mastery';
import { uid } from '../utils/random';
import type { SyncCollection } from '../services/sync/protocol';

/**
 * Remembers a deletion so sync can carry it to the other device.
 *
 * Written unconditionally, whether or not sync is switched on: a card deleted
 * today and a server paired next week must still agree, and a tombstone costs
 * a few dozen bytes. Deliberately outside the delete transaction — failing to
 * note a deletion must not roll back the deletion itself.
 */
async function noteDeletions(
  collection: SyncCollection,
  keys: string[],
  deletedAt = new Date().toISOString(),
): Promise<void> {
  if (keys.length === 0) return;
  await db.tombstones.bulkPut(keys.map((key) => ({ collection, key, deletedAt })));
}

type DataState = {
  categories: Category[];
  decks: Deck[];
  cards: Flashcard[];
  cardProgress: Record<string, CardProgress>;
  deckProgress: Record<string, DeckProgress>;
  loaded: boolean;

  load: () => Promise<void>;

  createCategory: (name: string, icon: string) => Promise<Category>;
  updateCategory: (id: string, patch: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  createDeck: (categoryId: string, name: string, perfectRunsRequired: number) => Promise<Deck>;
  updateDeck: (id: string, patch: Partial<Deck>) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;

  saveCard: (card: Flashcard) => Promise<void>;
  createCards: (cards: Flashcard[]) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  duplicateCard: (id: string) => Promise<void>;
  moveCard: (id: string, deckId: string) => Promise<void>;

  recordAnswer: (
    cardId: string,
    result: { hebrew: boolean; arabic: boolean },
  ) => Promise<void>;
  /**
   * Puts a card's and a deck's progress back exactly as they were before an
   * answer, so a study session can be walked backwards.
   *
   * Wholesale replacement rather than subtraction, because grading is not an
   * invertible function: `applyAnswerToProgress` folds in a longest streak and
   * a next-review date that cannot be computed backwards from the result. Only
   * the caller that took the snapshot knows what was there.
   *
   * `undefined` means the row did not exist yet and is deleted rather than left
   * holding the answer being undone. No tombstone is written for that: the row
   * was born moments ago on this device and has never been anywhere else, so
   * there is nothing for another device to be told about.
   */
  restoreProgress: (
    cardId: string,
    card: CardProgress | undefined,
    deckId: string,
    deck: DeckProgress | undefined,
  ) => Promise<void>;
  saveDeckProgress: (deckId: string, patch: Partial<DeckProgress>) => Promise<void>;
  resetAllProgress: () => Promise<void>;
};

const byId = <T extends { cardId?: string; deckId?: string }>(
  rows: T[],
  key: 'cardId' | 'deckId',
): Record<string, T> =>
  Object.fromEntries(rows.map((r) => [r[key] as string, r]));

export const useData = create<DataState>((set, get) => ({
  categories: [],
  decks: [],
  cards: [],
  cardProgress: {},
  deckProgress: {},
  loaded: false,

  async load() {
    const [categories, decks, cards, progress, deckProgress] = await Promise.all([
      db.categories.orderBy('order').toArray(),
      db.decks.toArray(),
      db.cards.toArray(),
      db.cardProgress.toArray(),
      db.deckProgress.toArray(),
    ]);
    set({
      categories,
      decks,
      cards,
      cardProgress: byId(progress, 'cardId'),
      deckProgress: byId(deckProgress, 'deckId'),
      loaded: true,
    });
  },

  async createCategory(name, icon) {
    const now = new Date().toISOString();
    const category: Category = {
      id: uid('cat'),
      name,
      icon,
      order: get().categories.length,
      createdAt: now,
      updatedAt: now,
    };
    await db.categories.add(category);
    set({ categories: [...get().categories, category] });
    return category;
  },

  async updateCategory(id, patch) {
    const next = { ...patch, updatedAt: new Date().toISOString() };
    await db.categories.update(id, next);
    set({
      categories: get().categories.map((c) => (c.id === id ? { ...c, ...next } : c)),
    });
  },

  async deleteCategory(id) {
    const deckIds = get().decks.filter((d) => d.categoryId === id).map((d) => d.id);
    const cardIds = get().cards.filter((c) => c.categoryId === id).map((c) => c.id);
    await db.transaction('rw', [db.categories, db.decks, db.cards, db.cardProgress], async () => {
      await db.categories.delete(id);
      await db.decks.bulkDelete(deckIds);
      await db.cards.bulkDelete(cardIds);
      await db.cardProgress.bulkDelete(cardIds);
    });
    await noteDeletions('categories', [id]);
    await noteDeletions('decks', deckIds);
    await noteDeletions('cards', cardIds);
    await noteDeletions('cardProgress', cardIds);
    await noteDeletions('deckProgress', deckIds);
    await get().load();
  },

  async createDeck(categoryId, name, perfectRunsRequired) {
    const now = new Date().toISOString();
    const deck: Deck = {
      id: uid('deck'),
      categoryId,
      name,
      // Onto the end of the category's ladder, so adding a deck never
      // re-locks one the learner has already opened.
      order: get().decks.filter((d) => d.categoryId === categoryId).length,
      perfectRunsRequired,
      promptDirections: ['en>he+ar'],
      createdAt: now,
      updatedAt: now,
    };
    await db.decks.add(deck);
    set({ decks: [...get().decks, deck] });
    return deck;
  },

  async updateDeck(id, patch) {
    const next = { ...patch, updatedAt: new Date().toISOString() };
    await db.decks.update(id, next);
    set({ decks: get().decks.map((d) => (d.id === id ? { ...d, ...next } : d)) });
  },

  async deleteDeck(id) {
    const cardIds = get().cards.filter((c) => c.deckId === id).map((c) => c.id);
    await db.transaction('rw', [db.decks, db.cards, db.cardProgress, db.deckProgress], async () => {
      await db.decks.delete(id);
      await db.cards.bulkDelete(cardIds);
      await db.cardProgress.bulkDelete(cardIds);
      await db.deckProgress.delete(id);
    });
    await noteDeletions('decks', [id]);
    await noteDeletions('deckProgress', [id]);
    await noteDeletions('cards', cardIds);
    await noteDeletions('cardProgress', cardIds);
    await get().load();
  },

  async saveCard(card) {
    const next = { ...card, updatedAt: new Date().toISOString() };
    await db.cards.put(next);
    const exists = get().cards.some((c) => c.id === card.id);
    set({
      cards: exists
        ? get().cards.map((c) => (c.id === card.id ? next : c))
        : [...get().cards, next],
    });
  },

  async createCards(cards) {
    await db.cards.bulkPut(cards);
    await get().load();
  },

  async deleteCard(id) {
    await db.transaction('rw', [db.cards, db.cardProgress], async () => {
      await db.cards.delete(id);
      await db.cardProgress.delete(id);
    });
    await noteDeletions('cards', [id]);
    await noteDeletions('cardProgress', [id]);
    set({ cards: get().cards.filter((c) => c.id !== id) });
  },

  async duplicateCard(id) {
    const source = get().cards.find((c) => c.id === id);
    if (!source) return;
    const now = new Date().toISOString();
    await get().saveCard({
      ...source,
      id: uid('card'),
      english: source.english + ' (copy)',
      createdAt: now,
      updatedAt: now,
    });
  },

  async moveCard(id, deckId) {
    const deck = get().decks.find((d) => d.id === deckId);
    const card = get().cards.find((c) => c.id === id);
    if (!deck || !card) return;
    await get().saveCard({ ...card, deckId, categoryId: deck.categoryId });
  },

  async recordAnswer(cardId, result) {
    const now = new Date().toISOString();
    // `updatedAt` is stamped here rather than inside `applyAnswerToProgress`,
    // which is pure scoring logic that sync has no business reaching into.
    const scored = applyAnswerToProgress(get().cardProgress[cardId], cardId, result, now);
    const next: CardProgress = { ...scored, updatedAt: now };
    await db.cardProgress.put(next);
    set({ cardProgress: { ...get().cardProgress, [cardId]: next } });
  },

  async restoreProgress(cardId, card, deckId, deck) {
    const cardProgress = { ...get().cardProgress };
    const deckProgress = { ...get().deckProgress };

    if (card) {
      await db.cardProgress.put(card);
      cardProgress[cardId] = card;
    } else {
      await db.cardProgress.delete(cardId);
      delete cardProgress[cardId];
    }

    if (deck) {
      await db.deckProgress.put(deck);
      deckProgress[deckId] = deck;
    } else {
      await db.deckProgress.delete(deckId);
      delete deckProgress[deckId];
    }

    set({ cardProgress, deckProgress });
  },

  async saveDeckProgress(deckId, patch) {
    const current = get().deckProgress[deckId] ?? emptyDeckProgress(deckId);
    const next: DeckProgress = {
      ...current,
      ...patch,
      deckId,
      updatedAt: new Date().toISOString(),
    };
    await db.deckProgress.put(next);
    set({ deckProgress: { ...get().deckProgress, [deckId]: next } });
  },

  async resetAllProgress() {
    await db.transaction('rw', [db.cardProgress, db.deckProgress, db.sessions], async () => {
      await db.cardProgress.clear();
      await db.deckProgress.clear();
      await db.sessions.clear();
    });
    set({ cardProgress: {}, deckProgress: {} });
  },
}));
