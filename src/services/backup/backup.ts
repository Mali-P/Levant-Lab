import { db } from '../database/db';
import type {
  BackupFile,
  CardProgress,
  Category,
  Deck,
  DeckProgress,
  Flashcard,
  Settings,
  StudySession,
} from '../../types';
import { backupSchema } from './schema';

const MAX_SNAPSHOTS = 10;

export async function buildBackup(options?: {
  categoryId?: string;
  deckId?: string;
  includeProgress?: boolean;
}): Promise<BackupFile> {
  const [categories, decks, cards, cardProgress, deckProgress, sessions, settings] =
    await Promise.all([
      db.categories.toArray(),
      db.decks.toArray(),
      db.cards.toArray(),
      db.cardProgress.toArray(),
      db.deckProgress.toArray(),
      db.sessions.toArray(),
      db.settings.get('settings'),
    ]);

  let keptCategories = categories;
  let keptDecks = decks;
  let keptCards = cards;

  if (options?.categoryId) {
    keptCategories = categories.filter((c) => c.id === options.categoryId);
    keptDecks = decks.filter((d) => d.categoryId === options.categoryId);
    keptCards = cards.filter((c) => c.categoryId === options.categoryId);
  }
  if (options?.deckId) {
    keptDecks = keptDecks.filter((d) => d.id === options.deckId);
    keptCards = keptCards.filter((c) => c.deckId === options.deckId);
    const ids = new Set(keptDecks.map((d) => d.categoryId));
    keptCategories = keptCategories.filter((c) => ids.has(c.id));
  }

  const cardIds = new Set(keptCards.map((c) => c.id));
  const deckIds = new Set(keptDecks.map((d) => d.id));
  const withProgress = options?.includeProgress !== false;

  return {
    format: 'levantine-flashcards-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: keptCategories,
    decks: keptDecks,
    cards: keptCards,
    cardProgress: withProgress
      ? cardProgress.filter((p) => cardIds.has(p.cardId))
      : [],
    deckProgress: withProgress
      ? deckProgress.filter((p) => deckIds.has(p.deckId))
      : [],
    sessions: withProgress ? sessions.filter((s) => deckIds.has(s.deckId)) : [],
    settings: withProgress ? settings : undefined,
  };
}

export type RestoreMode = 'merge' | 'replace';

export type RestoreReport = {
  categories: number;
  decks: number;
  cards: number;
  progress: number;
  restoredSettings: boolean;
};

export function parseBackup(raw: string): BackupFile {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(
      'That file is not a recognised backup: ' +
        first.path.join('.') + ' ' + first.message,
    );
  }
  return parsed.data as unknown as BackupFile;
}

/**
 * Always snapshots the current database first, so a mistaken "replace" is
 * recoverable. This is a personal vocabulary database with no cloud copy.
 */
export async function restoreBackup(
  backup: BackupFile,
  mode: RestoreMode = 'merge',
): Promise<RestoreReport> {
  await createSnapshot('Before restore');

  await db.transaction(
    'rw',
    [db.categories, db.decks, db.cards, db.cardProgress, db.deckProgress, db.sessions, db.settings],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.categories.clear(),
          db.decks.clear(),
          db.cards.clear(),
          db.cardProgress.clear(),
          db.deckProgress.clear(),
          db.sessions.clear(),
        ]);
      }

      await db.categories.bulkPut(backup.categories as Category[]);
      await db.decks.bulkPut(backup.decks as Deck[]);
      await db.cards.bulkPut(backup.cards as Flashcard[]);
      await db.cardProgress.bulkPut(backup.cardProgress as CardProgress[]);
      await db.deckProgress.bulkPut(backup.deckProgress as DeckProgress[]);
      await db.sessions.bulkPut(backup.sessions as StudySession[]);
      if (backup.settings) {
        await db.settings.put({ ...(backup.settings as Settings), id: 'settings' });
      }
    },
  );

  return {
    categories: backup.categories.length,
    decks: backup.decks.length,
    cards: backup.cards.length,
    progress: backup.cardProgress.length,
    restoredSettings: Boolean(backup.settings),
  };
}

export async function createSnapshot(label: string): Promise<void> {
  const payload = await buildBackup();
  if (payload.cards.length === 0 && payload.categories.length === 0) return;

  await db.snapshots.add({ createdAt: payload.exportedAt, label, payload });

  const all = await db.snapshots.orderBy('createdAt').toArray();
  const stale = all.slice(0, Math.max(0, all.length - MAX_SNAPSHOTS));
  if (stale.length > 0) {
    await db.snapshots.bulkDelete(stale.map((s) => s.id!).filter(Boolean));
  }
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
