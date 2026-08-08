import { create } from 'zustand';
import { SPEECH_PERSPECTIVES, type Settings } from '../types';
import { db } from '../services/database/db';
import { DEFAULT_SETTINGS } from '../services/database/defaults';

/**
 * Repairs the perspective list before anything reads it.
 *
 * An empty set would leave every gendered card with nothing to show and
 * nothing to grade against, so it falls back to the default rather than
 * rendering a blank answer. Unknown strings — from an older build, or a
 * hand-edited backup — are dropped, and the survivors are put back into
 * canonical female-first order however they happened to be stored.
 */
function normalisePerspectives(settings: Settings): Settings {
  const kept = SPEECH_PERSPECTIVES.filter((p) =>
    settings.speechPerspectives?.includes(p),
  );
  return {
    ...settings,
    speechPerspectives:
      kept.length > 0 ? kept : DEFAULT_SETTINGS.speechPerspectives,
  };
}

type SettingsState = {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
  reset: () => Promise<void>;
};

export const useSettings = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  async load() {
    const stored = await db.settings.get('settings');
    // Merge onto the defaults so a backup from an older build still loads.
    set({
      settings: normalisePerspectives({
        ...DEFAULT_SETTINGS,
        ...stored,
        id: 'settings',
      }),
      loaded: true,
    });
  },

  async update(patch) {
    // Stamped so sync can tell which device changed a preference last. The
    // whole settings row is one syncable unit, so any change moves the stamp.
    const next: Settings = normalisePerspectives({
      ...get().settings,
      ...patch,
      id: 'settings',
      updatedAt: new Date().toISOString(),
    });
    set({ settings: next });
    await db.settings.put(next);
  },

  async reset() {
    const next: Settings = { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() };
    set({ settings: next });
    await db.settings.put(next);
  },
}));
