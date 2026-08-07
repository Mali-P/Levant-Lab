/**
 * Deciding what a sync should actually change — with no IO in sight.
 *
 * Everything that could silently lose a card lives in this file, and none of it
 * touches Dexie or the network, so it can be tested for what it is: a set of
 * rules about which of two versions of a row survives.
 */

import { stamp, supersedes, type SyncRecord } from './protocol';

/** Key to the stamp this device currently holds for it. */
export type LocalIndex = Map<string, string>;

export type ApplyOp =
  | { kind: 'write'; key: string; value: unknown; updatedAt: string }
  | { kind: 'remove'; key: string; updatedAt: string };

export type ApplyPlan = {
  ops: ApplyOp[];
  /** Incoming records this device already had a newer version of. */
  skipped: number;
};

/**
 * Builds the local index a plan is judged against.
 *
 * Tombstones belong in here alongside live rows, and leaving them out is the
 * subtle way to lose a deletion: a card deleted here a moment ago has no row to
 * compare against, so an older copy arriving from the other device would look
 * like news and be written straight back.
 */
export function buildLocalIndex(
  rows: Array<{ key: string; updatedAt: string }>,
  tombstones: Array<{ key: string; deletedAt: string }> = [],
): LocalIndex {
  const index: LocalIndex = new Map();
  for (const row of rows) index.set(row.key, stamp(row.updatedAt));
  for (const grave of tombstones) {
    const at = stamp(grave.deletedAt);
    const existing = index.get(grave.key);
    // A row can be both present and tombstoned if it was re-created after being
    // deleted. Whichever happened later is what this device actually believes.
    if (!existing || at > existing) index.set(grave.key, at);
  }
  return index;
}

/**
 * Works out which incoming records to apply.
 *
 * The comparison is the same last-write-wins rule the server uses, run again
 * locally rather than trusted from the response. The server only knows what it
 * has been told; this device may have changed a row since its last push, and
 * that change must not be flattened by a record the server considered current.
 */
export function planApply(incoming: SyncRecord[], local: LocalIndex): ApplyPlan {
  const ops: ApplyOp[] = [];
  let skipped = 0;

  for (const record of incoming) {
    const updatedAt = stamp(record.updatedAt);
    const held = local.get(record.key);

    if (!supersedes({ updatedAt }, held ? { updatedAt: held } : undefined)) {
      skipped += 1;
      continue;
    }

    ops.push(
      record.deleted
        ? { kind: 'remove', key: record.key, updatedAt }
        : { kind: 'write', key: record.key, value: record.value, updatedAt },
    );
  }

  return { ops, skipped };
}

/**
 * Turns this device's rows and tombstones into records to push.
 *
 * Everything goes, every time, rather than only what changed since the last
 * sync. Tracking a dirty set would mean instrumenting every write in the app,
 * and a single missed call site is a row that silently never syncs again — a
 * bug that surfaces as a lost edit weeks later. A personal vocabulary is a few
 * megabytes over a home network, and the server's timestamp comparison discards
 * the unchanged rows anyway, so the wasteful option is also the one with no
 * quiet failure mode.
 */
export function buildOutgoing(
  rows: Array<{ key: string; updatedAt: string; value: unknown }>,
  tombstones: Array<{ key: string; deletedAt: string }> = [],
): SyncRecord[] {
  const records: SyncRecord[] = rows.map((row) => ({
    key: row.key,
    updatedAt: stamp(row.updatedAt),
    value: row.value,
  }));

  const live = new Map(records.map((record) => [record.key, record]));

  for (const grave of tombstones) {
    const deletedAt = stamp(grave.deletedAt);
    const resurrected = live.get(grave.key);
    // A key that is both live and tombstoned was deleted and then re-created,
    // or restored from a backup. Sending both would make the outcome depend on
    // which the server happened to process second; send only the later one.
    if (resurrected) {
      if (deletedAt <= stamp(resurrected.updatedAt)) continue;
      records.splice(records.indexOf(resurrected), 1);
    }
    records.push({ key: grave.key, updatedAt: deletedAt, deleted: true });
  }

  return records;
}
