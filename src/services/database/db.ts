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
} from '../../types';
import type { AlphabetProgress } from '../../types/alphabet';

/**
 * All persistence is local IndexedDB. Nothing here talks to a network, which
 * is what makes the app work offline and keeps the vocabulary private.
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
  }
}

export const db = new FlashcardDatabase();
