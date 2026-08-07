import { create } from 'zustand';
import type { Settings } from '../types';
import { db } from '../services/database/db';
import { DEFAULT_SETTINGS } from '../services/database/defaults';

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
    set({ settings: { ...DEFAULT_SETTINGS, ...stored, id: 'settings' }, loaded: true });
  },

  async update(patch) {
    // Stamped so sync can tell which device changed a preference last. The
    // whole settings row is one syncable unit, so any change moves the stamp.
    const next: Settings = {
      ...get().settings,
      ...patch,
      id: 'settings',
      updatedAt: new Date().toISOString(),
    };
    set({ settings: next });
    await db.settings.put(next);
  },

  async reset() {
    const next: Settings = { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() };
    set({ settings: next });
    await db.settings.put(next);
  },
}));
