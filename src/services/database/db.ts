import Dexie, { type Table } from 'dexie';
import type {
  Category,
  CardProgress,
  Deck,
  DeckProgress,
  Flashcard,
  Settings,
  Snapshot,
  StudySession,
  SyncState,
  Tombstone,
} from '../../types';
import type { AlphabetProgress } from '../../types/alphabet';

/**
 * All persistence is local IndexedDB. This database is still the only thing the
 * app studies from, and it stays complete offline; the optional sync server is
 * a peer the app can be told to exchange rows with, never a source it depends
 * on.
 */
export class FlashcardDatabase extends Dexie {
  categories!: Table<Category, string>;
  decks!: Table<Deck, string>;
  cards!: Table<Flashcard, string>;
  cardProgress!: Table<CardProgress, string>;
  deckProgress!: Table<DeckProgress, string>;
  sessions!: Table<StudySession, string>;
  settings!: Table<Settings, string>;
  snapshots!: Table<Snapshot, number>;
  /**
   * Alphabet progress is keyed by script *and* letter id: `shin` and `ha` name
   * a letter in both alphabets, so the bare id would collide.
   */
  alphabetProgress!: Table<AlphabetProgress, [string, string]>;

  /**
   * Deletions, remembered.
   *
   * A row that is simply gone is indistinguishable from a row this device has
   * not been told about yet, so without these a card deleted on the laptop
   * would be handed straight back by the next sync from the phone, which still
   * holds it. Kept indefinitely: they are a few dozen bytes each, and expiring
   * one is exactly how a deleted card comes back to life.
   */
  tombstones!: Table<Tombstone, [string, string]>;

  /** A single row: this device's identity and how far it has synced. */
  syncState!: Table<SyncState, string>;

  constructor(name = 'levantine-flashcards') {
    super(name);
    this.version(1).stores({
      categories: 'id, order, name',
      decks: 'id, categoryId, name',
      cards: 'id, deckId, categoryId, english, *tags',
      cardProgress: 'cardId, masteryScore, nextReviewAt',
      deckProgress: 'deckId, lastStudiedAt',
      sessions: 'id, deckId, completedAt, updatedAt',
      settings: 'id',
      snapshots: '++id, createdAt',
    });

    // v2 only adds a table. The v1 stores are left alone, so an install made
    // before the alphabet modules existed keeps every card and every score.
    this.version(2).stores({
      alphabetProgress: '[script+letterId], script, mastered, lastPractisedAt',
    });

    // v3 adds the two tables sync needs. Again purely additive: an install that
    // never turns sync on carries two empty tables and behaves exactly as before.
    this.version(3).stores({
      tombstones: '[collection+key], deletedAt',
      syncState: 'id',
    });

    // v4 changes no schema. Study became a ladder — a small set of words, grown
    // a rung at a time up to the deck — and a session from before it has no
    // phase and no active set to resume into. There is nothing to map those
    // onto, so the unfinished ones are dropped and the deck is begun again from
    // its first rung. Nothing scored is lost: card accuracy and the deck's banked
    // perfect rounds live in their own tables and are left alone. Completed
    // sessions are history and stay.
    this.version(4).upgrade(async (tx) => {
      await tx
        .table('sessions')
        .filter((s) => !s.completedAt && typeof s.phase !== 'string')
        .delete();
    });
  }
}

export const db = new FlashcardDatabase();
