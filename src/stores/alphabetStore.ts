import { create } from 'zustand';
import type {
  AlphabetProgress,
  AlphabetScript,
  AlphabetSkill,
  ArabicLetter,
  HebrewLetter,
} from '../types/alphabet';
import { db } from '../services/database/db';
import { applyAlphabetAnswer, requiredSkills } from '../features/alphabet/progress';
import type { SyncCollection } from '../services/sync/protocol';

/** See the equivalent in `dataStore`: a deletion has to be remembered to travel. */
async function recordDeletions(collection: SyncCollection, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const deletedAt = new Date().toISOString();
  await db.tombstones.bulkPut(keys.map((key) => ({ collection, key, deletedAt })));
}

type AlphabetState = {
  /** Keyed `script:letterId`, because ids are only unique within a script. */
  progress: Record<string, AlphabetProgress>;
  loaded: boolean;

  load: () => Promise<void>;
  get: (script: AlphabetScript, letterId: string) => AlphabetProgress | undefined;
  /** Every row of one script, keyed by bare letter id, for the summary helpers. */
  forScript: (script: AlphabetScript) => Record<string, AlphabetProgress>;
  recordAnswer: (
    letter: HebrewLetter | ArabicLetter,
    script: AlphabetScript,
    skill: AlphabetSkill,
    correct: boolean,
  ) => Promise<void>;
  resetScript: (script: AlphabetScript) => Promise<void>;
};

export function progressKey(script: AlphabetScript, letterId: string): string {
  return script + ':' + letterId;
}

export const useAlphabet = create<AlphabetState>((set, get) => ({
  progress: {},
  loaded: false,

  async load() {
    const rows = await db.alphabetProgress.toArray();
    set({
      progress: Object.fromEntries(
        rows.map((row) => [progressKey(row.script, row.letterId), row]),
      ),
      loaded: true,
    });
  },

  get(script, letterId) {
    return get().progress[progressKey(script, letterId)];
  },

  forScript(script) {
    const rows = Object.values(get().progress).filter((row) => row.script === script);
    return Object.fromEntries(rows.map((row) => [row.letterId, row]));
  },

  async recordAnswer(letter, script, skill, correct) {
    const key = progressKey(script, letter.id);
    const now = new Date().toISOString();
    const scored = applyAlphabetAnswer(get().progress[key], letter.id, script, {
      skill,
      correct,
      now,
      required: requiredSkills(letter),
    });
    // Stamped here, outside the pure scoring function, purely so sync can tell
    // which device holds the later version of this letter's standing.
    const next: AlphabetProgress = { ...scored, updatedAt: now };
    await db.alphabetProgress.put(next);
    set({ progress: { ...get().progress, [key]: next } });
  },

  async resetScript(script) {
    const cleared = Object.values(get().progress).filter((row) => row.script === script);
    await db.alphabetProgress.where('script').equals(script).delete();
    await recordDeletions(
      'alphabetProgress',
      cleared.map((row) => progressKey(row.script, row.letterId)),
    );
    set({
      progress: Object.fromEntries(
        Object.entries(get().progress).filter(([, row]) => row.script !== script),
      ),
    });
  },
}));
