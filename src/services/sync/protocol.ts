/**
 * The wire format shared by the browser and the sync server.
 *
 * This module is imported by both sides, so it must stay free of anything
 * environment-specific: no Dexie, no DOM, no `node:` imports. Types and pure
 * functions only.
 *
 * ## The model
 *
 * Every syncable row travels as a `SyncRecord`: an opaque `value` under a
 * stable `key`, stamped with the moment it last changed. Conflicts are settled
 * by last-write-wins on that stamp. For a personal setup — a laptop and a phone
 * that are rarely edited in the same second — this is the right amount of
 * machinery. It cannot merge two simultaneous edits to one card, and it does
 * not pretend to.
 *
 * ## Two clocks, on purpose
 *
 * `updatedAt` is a wall-clock ISO stamp written by whichever device made the
 * change, and it decides conflicts.
 *
 * `seq` is a counter the server assigns, and it drives the *cursor*: a device
 * asks for everything past the seq it already holds. Cursors deliberately avoid
 * wall-clock time, because a phone whose clock runs a few minutes fast would
 * otherwise write records that every later pull skips straight over. Clock skew
 * can still cost you a conflict; it can no longer cost you a record.
 */

export const SYNC_COLLECTIONS = [
  'categories',
  'decks',
  'cards',
  'cardProgress',
  'deckProgress',
  'alphabetProgress',
  'settings',
] as const;

export type SyncCollection = (typeof SYNC_COLLECTIONS)[number];

export function isSyncCollection(name: string): name is SyncCollection {
  return (SYNC_COLLECTIONS as readonly string[]).includes(name);
}

/**
 * One row in transit.
 *
 * A deletion travels as a record with `deleted: true` and no `value` — a
 * tombstone. Without them, a card deleted on the laptop would simply be
 * re-created by the next push from the phone, which still holds it.
 */
export type SyncRecord = {
  key: string;
  /** ISO-8601. The last-write-wins clock. */
  updatedAt: string;
  deleted?: boolean;
  value?: unknown;
};

export type SyncChangeSet = Partial<Record<SyncCollection, SyncRecord[]>>;

export type SyncPushBody = {
  /** Stable per-install id, so the server can report which device wrote last. */
  deviceId: string;
  /** Human label for the status screen, e.g. "Pixel 8". */
  deviceName?: string;
  /** Highest server seq this device has already applied. 0 on a first sync. */
  since: number;
  changes: SyncChangeSet;
};

export type SyncResponse = {
  /** The cursor to send as `since` next time. */
  seq: number;
  serverTime: string;
  /** Pushed records that were newer than the server's copy. */
  accepted: number;
  /** Pushed records that lost the last-write-wins comparison. */
  rejected: number;
  changes: SyncChangeSet;
};

export type SyncHealth = {
  ok: true;
  service: 'levantry-sync';
  protocol: number;
  seq: number;
  counts: Record<SyncCollection, number>;
  lastWriteAt?: string;
  lastDevice?: { id: string; name?: string; at: string };
};

/** Bumped only for a change the other side could not understand. */
export const SYNC_PROTOCOL_VERSION = 1;

/**
 * Rows written before this feature existed carry no stamp of their own.
 * Treating them as epoch means anything either device has since written wins,
 * which is the safe direction: a real edit always beats an unstamped legacy row.
 */
export const EPOCH = '1970-01-01T00:00:00.000Z';

/**
 * Decides whether an incoming record supersedes the one already held.
 *
 * Ties keep the incumbent. That makes a repeated push idempotent — re-sending
 * an identical record is a no-op rather than a fresh revision — so a device
 * that syncs twice in a row does not churn the seq counter and hand every
 * other device a pointless round of changes.
 */
export function supersedes(
  incoming: Pick<SyncRecord, 'updatedAt'>,
  existing: Pick<SyncRecord, 'updatedAt'> | undefined,
): boolean {
  if (!existing) return true;
  return incoming.updatedAt > existing.updatedAt;
}

/** ISO stamps only sort lexicographically at a fixed width; normalise to that. */
export function stamp(value: string | undefined | null): string {
  if (!value) return EPOCH;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? EPOCH : parsed.toISOString();
}
