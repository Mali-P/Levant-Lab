/**
 * The server's copy of the learner's data.
 *
 * Held as a single JSON file, rewritten in full on every change. That sounds
 * profligate and is not: this is one person's vocabulary — a few thousand small
 * records, a couple of megabytes at the outside — and a whole-file rewrite
 * behind an atomic rename is the one persistence strategy with no half-written
 * state to reason about. If the dataset ever outgrows that, `node:sqlite` is
 * the next step and the interface below is what it would implement.
 *
 * Nothing here interprets a card. The server stores opaque values under keys
 * and settles conflicts by timestamp, so the meaning of a flashcard stays
 * entirely in the app: adding a field to `Flashcard` needs no server change.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  SYNC_COLLECTIONS,
  SYNC_PROTOCOL_VERSION,
  stamp,
  supersedes,
  type SyncChangeSet,
  type SyncCollection,
  type SyncHealth,
  type SyncRecord,
} from '../src/services/sync/protocol.ts';

type StoredRecord = SyncRecord & {
  /** Monotonic, server-assigned. Drives every device's pull cursor. */
  seq: number;
  /** Which device last won this key. Diagnostic, and see `since` below. */
  deviceId?: string;
};

type Database = {
  protocol: number;
  seq: number;
  collections: Record<SyncCollection, Record<string, StoredRecord>>;
  lastWriteAt?: string;
  lastDevice?: { id: string; name?: string; at: string };
};

function emptyDatabase(): Database {
  const collections = {} as Database['collections'];
  for (const name of SYNC_COLLECTIONS) collections[name] = {};
  return { protocol: SYNC_PROTOCOL_VERSION, seq: 0, collections };
}

export class SyncStore {
  private db: Database = emptyDatabase();

  /**
   * Writes are chained rather than fired concurrently. Two overlapping
   * whole-file writes could interleave their renames and leave the older
   * snapshot on disk, silently discarding the newer one.
   */
  private writing: Promise<void> = Promise.resolve();

  constructor(private readonly file: string) {}

  async load(): Promise<void> {
    let raw: string;
    try {
      raw = await readFile(this.file, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }

    let parsed: Database;
    try {
      parsed = JSON.parse(raw) as Database;
    } catch (error) {
      // Starting empty here would be the worst possible response: the next
      // push would treat a blank server as authoritative and the first device
      // to pull would have its own copy deleted to match.
      throw new Error(
        `The sync store at ${this.file} is not readable JSON. Move it aside to ` +
          `start fresh, or restore it from a backup first. (${String(error)})`,
      );
    }

    const next = emptyDatabase();
    next.seq = typeof parsed.seq === 'number' ? parsed.seq : 0;
    next.lastWriteAt = parsed.lastWriteAt;
    next.lastDevice = parsed.lastDevice;
    // Copied collection by collection, so a file written by an older build
    // that lacks a collection this one knows about still loads.
    for (const name of SYNC_COLLECTIONS) {
      Object.assign(next.collections[name], parsed.collections?.[name] ?? {});
    }
    this.db = next;
  }

  /**
   * Applies a device's changes, then reports everything it has not yet seen.
   *
   * Both halves run against the same in-memory snapshot, so the returned `seq`
   * is a cursor the caller can trust: nothing can slip in between the merge and
   * the read and go unreported.
   */
  async sync(
    since: number,
    incoming: SyncChangeSet,
    device: { id: string; name?: string },
  ): Promise<{ seq: number; accepted: number; rejected: number; changes: SyncChangeSet }> {
    let accepted = 0;
    let rejected = 0;
    const now = new Date().toISOString();

    for (const name of SYNC_COLLECTIONS) {
      const records = incoming[name];
      if (!Array.isArray(records) || records.length === 0) continue;
      const collection = this.db.collections[name];

      for (const record of records) {
        if (typeof record?.key !== 'string' || record.key === '') continue;
        const updatedAt = stamp(record.updatedAt);

        if (!supersedes({ updatedAt }, collection[record.key])) {
          rejected += 1;
          continue;
        }

        this.db.seq += 1;
        collection[record.key] = record.deleted
          ? { key: record.key, updatedAt, deleted: true, seq: this.db.seq, deviceId: device.id }
          : {
              key: record.key,
              updatedAt,
              value: record.value,
              seq: this.db.seq,
              deviceId: device.id,
            };
        accepted += 1;
      }
    }

    if (accepted > 0) {
      this.db.lastWriteAt = now;
      this.db.lastDevice = { id: device.id, name: device.name, at: now };
      await this.persist();
    }

    return {
      seq: this.db.seq,
      accepted,
      rejected,
      changes: this.since(since, device.id),
    };
  }

  /**
   * Everything written after `cursor`, minus what this device wrote itself.
   *
   * The device already holds its own accepted writes, so echoing them back
   * would only provoke a round of local writes that change nothing. A push
   * that *lost* is the case worth checking, and it is safe: a rejected record
   * never advances the seq, so the winning version still carries the seq and
   * deviceId of whichever device wrote it — a different device — and is
   * therefore still reported here.
   */
  private since(cursor: number, deviceId: string): SyncChangeSet {
    const changes: SyncChangeSet = {};
    for (const name of SYNC_COLLECTIONS) {
      const rows = Object.values(this.db.collections[name]).filter(
        (row) => row.seq > cursor && row.deviceId !== deviceId,
      );
      if (rows.length === 0) continue;
      changes[name] = rows
        .sort((a, b) => a.seq - b.seq)
        .map(({ key, updatedAt, deleted, value }) =>
          deleted ? { key, updatedAt, deleted: true } : { key, updatedAt, value },
        );
    }
    return changes;
  }

  health(): SyncHealth {
    const counts = {} as SyncHealth['counts'];
    for (const name of SYNC_COLLECTIONS) {
      // Tombstones are not content. This number is what the operator checks
      // against the app's own card count, and deletions must not inflate it.
      counts[name] = Object.values(this.db.collections[name]).filter((r) => !r.deleted).length;
    }
    return {
      ok: true,
      service: 'levantry-sync',
      protocol: SYNC_PROTOCOL_VERSION,
      seq: this.db.seq,
      counts,
      lastWriteAt: this.db.lastWriteAt,
      lastDevice: this.db.lastDevice,
    };
  }

  /** The live values with tombstones dropped — a plain snapshot for backups. */
  snapshot(): Record<SyncCollection, unknown[]> {
    const out = {} as Record<SyncCollection, unknown[]>;
    for (const name of SYNC_COLLECTIONS) {
      out[name] = Object.values(this.db.collections[name])
        .filter((row) => !row.deleted)
        .map((row) => row.value);
    }
    return out;
  }

  private persist(): Promise<void> {
    const payload = JSON.stringify(this.db);
    this.writing = this.writing.then(async () => {
      await mkdir(dirname(this.file), { recursive: true });
      // Write beside the target, then rename over it. On every platform this
      // runs on that rename is atomic, so a crash mid-write leaves the last
      // good store intact rather than a truncated one.
      const temporary = this.file + '.tmp';
      await writeFile(temporary, payload, 'utf8');
      await rename(temporary, this.file);
    });
    return this.writing;
  }
}

export const DEFAULT_STORE_PATH = join(process.cwd(), 'server', 'data', 'store.json');
