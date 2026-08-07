import { describe, expect, it } from 'vitest';
import { buildLocalIndex, buildOutgoing, planApply } from './reconcile';
import { EPOCH, supersedes } from './protocol';

const EARLY = '2026-01-01T00:00:00.000Z';
const LATE = '2026-06-01T00:00:00.000Z';

describe('supersedes', () => {
  it('accepts anything when nothing is held', () => {
    expect(supersedes({ updatedAt: EPOCH }, undefined)).toBe(true);
  });

  it('keeps the incumbent on an exact tie, so a repeated push changes nothing', () => {
    expect(supersedes({ updatedAt: LATE }, { updatedAt: LATE })).toBe(false);
  });

  it('takes the newer of the two', () => {
    expect(supersedes({ updatedAt: LATE }, { updatedAt: EARLY })).toBe(true);
    expect(supersedes({ updatedAt: EARLY }, { updatedAt: LATE })).toBe(false);
  });
});

describe('buildLocalIndex', () => {
  it('lets a deletion stand in for the row it removed', () => {
    const index = buildLocalIndex([], [{ key: 'card_1', deletedAt: LATE }]);
    expect(index.get('card_1')).toBe(LATE);
  });

  it('prefers whichever of a row and its tombstone happened later', () => {
    const recreated = buildLocalIndex(
      [{ key: 'card_1', updatedAt: LATE }],
      [{ key: 'card_1', deletedAt: EARLY }],
    );
    expect(recreated.get('card_1')).toBe(LATE);

    const deleted = buildLocalIndex(
      [{ key: 'card_1', updatedAt: EARLY }],
      [{ key: 'card_1', deletedAt: LATE }],
    );
    expect(deleted.get('card_1')).toBe(LATE);
  });

  it('treats an unstamped legacy row as the oldest possible', () => {
    const index = buildLocalIndex([{ key: 'card_1', updatedAt: '' }]);
    expect(index.get('card_1')).toBe(EPOCH);
  });
});

describe('planApply', () => {
  it('writes a row this device has never seen', () => {
    const plan = planApply(
      [{ key: 'card_1', updatedAt: EARLY, value: { id: 'card_1' } }],
      new Map(),
    );
    expect(plan.ops).toEqual([
      { kind: 'write', key: 'card_1', value: { id: 'card_1' }, updatedAt: EARLY },
    ]);
    expect(plan.skipped).toBe(0);
  });

  it('leaves a local edit alone when the incoming copy is older', () => {
    const local = buildLocalIndex([{ key: 'card_1', updatedAt: LATE }]);
    const plan = planApply([{ key: 'card_1', updatedAt: EARLY, value: { id: 'card_1' } }], local);
    expect(plan.ops).toEqual([]);
    expect(plan.skipped).toBe(1);
  });

  it('applies an incoming deletion', () => {
    const local = buildLocalIndex([{ key: 'card_1', updatedAt: EARLY }]);
    const plan = planApply([{ key: 'card_1', updatedAt: LATE, deleted: true }], local);
    expect(plan.ops).toEqual([{ kind: 'remove', key: 'card_1', updatedAt: LATE }]);
  });

  it('does not resurrect a card this device deleted more recently', () => {
    // The other device edited the card, then this one deleted it. The edit
    // arrives afterwards and must not bring the card back.
    const local = buildLocalIndex([], [{ key: 'card_1', deletedAt: LATE }]);
    const plan = planApply([{ key: 'card_1', updatedAt: EARLY, value: { id: 'card_1' } }], local);
    expect(plan.ops).toEqual([]);
    expect(plan.skipped).toBe(1);
  });

  it('does bring a card back when it was re-created after the deletion', () => {
    const local = buildLocalIndex([], [{ key: 'card_1', deletedAt: EARLY }]);
    const plan = planApply([{ key: 'card_1', updatedAt: LATE, value: { id: 'card_1' } }], local);
    expect(plan.ops).toHaveLength(1);
    expect(plan.ops[0].kind).toBe('write');
  });

  it('is idempotent: applying the same response twice does nothing the second time', () => {
    const incoming = [{ key: 'card_1', updatedAt: LATE, value: { id: 'card_1' } }];
    expect(planApply(incoming, new Map()).ops).toHaveLength(1);

    const after = buildLocalIndex([{ key: 'card_1', updatedAt: LATE }]);
    expect(planApply(incoming, after).ops).toEqual([]);
  });
});

describe('buildOutgoing', () => {
  it('sends every row it holds, changed or not', () => {
    const records = buildOutgoing([
      { key: 'card_1', updatedAt: EARLY, value: { id: 'card_1' } },
      { key: 'card_2', updatedAt: LATE, value: { id: 'card_2' } },
    ]);
    expect(records.map((r) => r.key)).toEqual(['card_1', 'card_2']);
    expect(records.every((r) => !r.deleted)).toBe(true);
  });

  it('sends a deletion as a tombstone with no value', () => {
    const records = buildOutgoing([], [{ key: 'card_1', deletedAt: LATE }]);
    expect(records).toEqual([{ key: 'card_1', updatedAt: LATE, deleted: true }]);
  });

  it('sends only the tombstone when a row was deleted after it was written', () => {
    const records = buildOutgoing(
      [{ key: 'card_1', updatedAt: EARLY, value: { id: 'card_1' } }],
      [{ key: 'card_1', deletedAt: LATE }],
    );
    expect(records).toEqual([{ key: 'card_1', updatedAt: LATE, deleted: true }]);
  });

  it('sends only the row when it was re-created after the deletion', () => {
    const records = buildOutgoing(
      [{ key: 'card_1', updatedAt: LATE, value: { id: 'card_1' } }],
      [{ key: 'card_1', deletedAt: EARLY }],
    );
    expect(records).toEqual([{ key: 'card_1', updatedAt: LATE, value: { id: 'card_1' } }]);
  });

  it('normalises stamps so they compare correctly as strings', () => {
    const records = buildOutgoing([
      { key: 'card_1', updatedAt: '2026-06-01T02:00:00+02:00', value: {} },
    ]);
    expect(records[0].updatedAt).toBe('2026-06-01T00:00:00.000Z');
  });
});
