/**
 * The browser half of sync: gather, send, apply.
 *
 * The decisions all live in `reconcile.ts` and the table knowledge in
 * `collections.ts`; this module is the plumbing between them and the network.
 *
 * Sync is always something the learner asks for. Nothing here runs on a timer
 * or at startup, because a background sync that goes wrong on a phone is a
 * thing you discover later, by finding a card missing.
 */

import { db } from '../database/db';
import type { SyncState, Tombstone } from '../../types';
import { COLLECTIONS } from './collections';
import { buildLocalIndex, buildOutgoing, planApply } from './reconcile';
import {
  SYNC_COLLECTIONS,
  type SyncChangeSet,
  type SyncCollection,
  type SyncHealth,
  type SyncPushBody,
  type SyncResponse,
} from './protocol';

const URL_KEY = 'levantry.sync.url';
const TOKEN_KEY = 'levantry.sync.token';
const NAME_KEY = 'levantry.sync.deviceName';

export type SyncConfig = {
  /** Origin of the sync server, e.g. `http://192.168.1.20:4180`. */
  url: string;
  token: string;
  deviceName: string;
};

/**
 * Held in localStorage rather than in the synced settings, because the address
 * and token are exactly the things that must differ per device — and because a
 * device that has been wiped needs to reach the server before it has any
 * database to read the address out of.
 */
export function readConfig(): SyncConfig {
  return {
    // Same origin by default: the server serves the app too, so the common case
    // needs no address typed in at all.
    url: localStorage.getItem(URL_KEY) ?? window.location.origin,
    token: localStorage.getItem(TOKEN_KEY) ?? '',
    deviceName: localStorage.getItem(NAME_KEY) ?? '',
  };
}

export function writeConfig(config: Partial<SyncConfig>): void {
  if (config.url !== undefined) {
    localStorage.setItem(URL_KEY, config.url.trim().replace(/\/+$/, ''));
  }
  if (config.token !== undefined) localStorage.setItem(TOKEN_KEY, config.token.trim());
  if (config.deviceName !== undefined) localStorage.setItem(NAME_KEY, config.deviceName.trim());
}

export function isConfigured(): boolean {
  const config = readConfig();
  return config.url !== '' && config.token !== '';
}

/** Reads this device's sync row, creating it on first use. */
export async function loadSyncState(): Promise<SyncState> {
  const existing = await db.syncState.get('sync');
  if (existing) return existing;

  const created: SyncState = { id: 'sync', deviceId: crypto.randomUUID(), seq: 0 };
  await db.syncState.put(created);
  return created;
}

async function request<T>(config: SyncConfig, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(config.url + path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + config.token,
        ...init?.headers,
      },
    });
  } catch {
    // fetch only rejects for transport failures, which on a phone almost always
    // means the laptop is asleep, off this network, or behind its firewall.
    throw new Error(
      `Could not reach ${config.url}. Check the laptop is awake, on the same ` +
        'Wi-Fi, and running `npm run server`.',
    );
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => undefined);
    throw new Error(detail ?? `The server answered ${response.status}.`);
  }

  return (await response.json()) as T;
}

/** Reachability without authentication — tells "wrong token" from "no server". */
export async function ping(url: string): Promise<boolean> {
  try {
    const response = await fetch(url.replace(/\/+$/, '') + '/api/ping');
    if (!response.ok) return false;
    const body = (await response.json()) as { service?: string };
    return body.service === 'levantry-sync';
  } catch {
    return false;
  }
}

export function fetchHealth(config = readConfig()): Promise<SyncHealth> {
  return request<SyncHealth>(config, '/api/health');
}

export type SyncReport = {
  /** Records this device sent that the server took. */
  pushed: number;
  /** Rows written locally from the server's copy. */
  pulled: number;
  /** Rows deleted locally because the other device deleted them. */
  removed: number;
  /** Incoming rows this device already had a newer version of. */
  keptLocal: number;
  seq: number;
  at: string;
};

export async function recordTombstone(
  collection: SyncCollection,
  key: string,
  deletedAt = new Date().toISOString(),
): Promise<void> {
  await db.tombstones.put({ collection, key, deletedAt } satisfies Tombstone);
}

/**
 * One full exchange with the server.
 *
 * Push and pull are a single round trip on purpose: the server merges what it
 * is given and reports what has changed since this device's cursor against the
 * very same snapshot, so no write can land between the two halves and go
 * unnoticed until the sync after next.
 */
export async function runSync(): Promise<SyncReport> {
  const config = readConfig();
  if (!config.url || !config.token) {
    throw new Error('Add the server address and token before syncing.');
  }

  const state = await loadSyncState();
  const tombstones = await db.tombstones.toArray();
  const gravesByCollection = new Map<string, Tombstone[]>();
  for (const grave of tombstones) {
    const list = gravesByCollection.get(grave.collection) ?? [];
    list.push(grave);
    gravesByCollection.set(grave.collection, list);
  }

  const changes: SyncChangeSet = {};
  for (const name of SYNC_COLLECTIONS) {
    const spec = COLLECTIONS[name];
    const rows = await spec.read();
    const records = buildOutgoing(
      rows.map((row) => ({
        key: spec.keyOf(row),
        updatedAt: spec.stampOf(row),
        value: spec.outgoing ? spec.outgoing(row) : row,
      })),
      gravesByCollection.get(name) ?? [],
    );
    if (records.length > 0) changes[name] = records;
  }

  const body: SyncPushBody = {
    deviceId: state.deviceId,
    deviceName: config.deviceName || undefined,
    since: state.seq,
    changes,
  };

  const response = await request<SyncResponse>(config, '/api/sync', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  let pulled = 0;
  let removed = 0;
  let keptLocal = 0;

  for (const name of SYNC_COLLECTIONS) {
    const incoming = response.changes[name];
    if (!incoming?.length) continue;
    const spec = COLLECTIONS[name];

    // Re-read rather than reusing what was gathered for the push: the learner
    // may have answered a card while the request was in flight, and that answer
    // must be allowed to win the comparison.
    const rows = await spec.read();
    const index = buildLocalIndex(
      rows.map((row) => ({ key: spec.keyOf(row), updatedAt: spec.stampOf(row) })),
      gravesByCollection.get(name) ?? [],
    );

    const plan = planApply(incoming, index);
    keptLocal += plan.skipped;

    for (const op of plan.ops) {
      if (op.kind === 'write') {
        await spec.write(op.value);
        pulled += 1;
      } else {
        await spec.remove(op.key);
        // The tombstone is kept here too. This device may well sync again
        // before the other one does, and without it a full push would say
        // nothing about the key at all.
        await recordTombstone(name, op.key, op.updatedAt);
        removed += 1;
      }
    }
  }

  const at = new Date().toISOString();
  await db.syncState.put({ ...state, seq: response.seq, lastSyncedAt: at, lastError: undefined });

  return { pushed: response.accepted, pulled, removed, keptLocal, seq: response.seq, at };
}
