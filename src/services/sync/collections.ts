/**
 * What each syncable collection *is*, in one place.
 *
 * Sync needs four things from every table it carries: how to read its rows, how
 * to name a row, when a row last changed, and how to write or delete one. Every
 * other module here works purely against this registry, so putting a new table
 * under sync is a single entry rather than a change in five files.
 *
 * The DOM and Dexie are both fine to touch here — this is the browser half.
 */

import { db } from '../database/db';
import type { Settings } from '../../types';
import type { AlphabetProgress } from '../../types/alphabet';
import { EPOCH, stamp, type SyncCollection } from './protocol';

/** The latest of several optional stamps, or epoch when a row has none. */
function latest(...values: Array<string | undefined>): string {
  let best = EPOCH;
  for (const value of values) {
    const normalised = stamp(value);
    if (normalised > best) best = normalised;
  }
  return best;
}

/**
 * Settings that describe the device rather than the learner.
 *
 * A voice URI names a speech engine installed on *this* machine. Syncing it
 * would leave the phone pointing at a Windows voice it cannot load, and the
 * failure would surface as silence on the study screen rather than as an
 * obvious sync problem. Everything else in Settings is a real preference and
 * travels.
 */
export const DEVICE_LOCAL_SETTINGS = ['hebrewVoiceUri', 'arabicVoiceUri'] as const;

export type CollectionSpec = {
  /** Every row currently held on this device. */
  read: () => Promise<unknown[]>;
  /** The row's key, as the string used on the wire. */
  keyOf: (row: any) => string;
  /** When the row last changed, for last-write-wins. */
  stampOf: (row: any) => string;
  /** Strip anything that must not leave this device. Absent for most tables. */
  outgoing?: (row: any) => unknown;
  /**
   * Merge an incoming row over whatever is here. Most tables replace outright;
   * settings has to keep this device's own voices.
   */
  write: (value: unknown) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

export const COLLECTIONS: Record<SyncCollection, CollectionSpec> = {
  categories: {
    read: () => db.categories.toArray(),
    keyOf: (row) => row.id,
    stampOf: (row) => stamp(row.updatedAt),
    write: async (value) => void (await db.categories.put(value as never)),
    remove: async (key) => void (await db.categories.delete(key)),
  },

  decks: {
    read: () => db.decks.toArray(),
    keyOf: (row) => row.id,
    stampOf: (row) => stamp(row.updatedAt),
    write: async (value) => void (await db.decks.put(value as never)),
    remove: async (key) => void (await db.decks.delete(key)),
  },

  cards: {
    read: () => db.cards.toArray(),
    keyOf: (row) => row.id,
    stampOf: (row) => stamp(row.updatedAt),
    write: async (value) => void (await db.cards.put(value as never)),
    remove: async (key) => void (await db.cards.delete(key)),
  },

  cardProgress: {
    read: () => db.cardProgress.toArray(),
    keyOf: (row) => row.cardId,
    // Rows written before sync existed carry no `updatedAt`. Falling back to
    // the review stamps recovers a real date for most of them, which beats
    // calling the whole history epoch and letting an untouched device win.
    stampOf: (row) =>
      latest(row.updatedAt, row.hebrew?.lastReviewedAt, row.arabic?.lastReviewedAt),
    write: async (value) => void (await db.cardProgress.put(value as never)),
    remove: async (key) => void (await db.cardProgress.delete(key)),
  },

  deckProgress: {
    read: () => db.deckProgress.toArray(),
    keyOf: (row) => row.deckId,
    stampOf: (row) =>
      latest(row.updatedAt, row.lastStudiedAt, row.hardModePassedAt, row.normalModeCompletedAt),
    write: async (value) => void (await db.deckProgress.put(value as never)),
    remove: async (key) => void (await db.deckProgress.delete(key)),
  },

  alphabetProgress: {
    read: () => db.alphabetProgress.toArray(),
    // A bare letter id is not unique: `shin` and `ha` name a letter in both
    // scripts. This mirrors the compound primary key the table already uses.
    keyOf: (row: AlphabetProgress) => row.script + ':' + row.letterId,
    stampOf: (row) => latest(row.updatedAt, row.lastPractisedAt),
    write: async (value) => void (await db.alphabetProgress.put(value as never)),
    remove: async (key) => {
      const separator = key.indexOf(':');
      if (separator < 0) return;
      await db.alphabetProgress.delete([key.slice(0, separator), key.slice(separator + 1)]);
    },
  },

  settings: {
    read: async () => {
      const row = await db.settings.get('settings');
      return row ? [row] : [];
    },
    keyOf: () => 'settings',
    stampOf: (row) => stamp(row.updatedAt),
    outgoing: (row: Settings) => {
      const copy = { ...row };
      for (const field of DEVICE_LOCAL_SETTINGS) delete copy[field];
      return copy;
    },
    write: async (value) => {
      // The incoming row has had its voices stripped, so a plain put would
      // silence this device. Keep whatever it had chosen for itself.
      const current = await db.settings.get('settings');
      const next = { ...(value as Settings), id: 'settings' as const };
      for (const field of DEVICE_LOCAL_SETTINGS) {
        if (current?.[field] !== undefined) next[field] = current[field];
      }
      await db.settings.put(next);
    },
    // Settings is a singleton the app always needs. Deleting it would leave the
    // next read falling back to defaults, which is not what either device asked
    // for, so a tombstone for it is ignored.
    remove: async () => {},
  },
};
