import { create } from 'zustand';
import type { Language, Settings, SpeechPerspective } from '../types';
import { db } from '../services/database/db';
import { DEFAULT_SETTINGS } from '../services/database/defaults';
import { activeLanguages } from '../utils/languageSelection';
import {
  effectivePerspectives,
  identityFromLegacy,
  normaliseListeners,
  normalisePerspectives,
} from '../utils/speechIdentity';

/**
 * A row as it might come off disk: anything may be missing, and a row written
 * before identity was recorded carries the retired field instead.
 */
type StoredSettings = Partial<Settings> & {
  /**
   * Retired. Read exactly once, migrated into identity, and never written
   * back — a derived mirror on disk is the stale-inference bug this phase
   * exists to remove.
   */
  speechPerspectives?: SpeechPerspective[];
};

/**
 * Brings any stored row up to the current shape, before anything reads it.
 *
 * Three repairs, in order:
 *
 * 1. A row with no `learnerGender` predates identity, so its legacy list is
 *    read back into one — the only place in the app allowed to do that.
 * 2. Listeners can never be empty, or every gendered card would have nothing
 *    to show and nothing to grade.
 * 3. An override is filtered to perspectives that exist and dropped entirely
 *    when nothing survives, so "no override" has one representation rather
 *    than two.
 *
 * Exported because backup restore writes the settings row directly and must
 * come through the same path; a file from an older build then restores its
 * identity rather than losing it.
 */
export function migrateSettings(stored: StoredSettings | undefined): Settings {
  const { speechPerspectives, ...rest } = stored ?? {};
  const merged: Settings = { ...DEFAULT_SETTINGS, ...rest, id: 'settings' };

  const next: Settings = stored?.learnerGender
    ? merged
    : { ...merged, ...identityFromLegacy(speechPerspectives) };

  // Anything that is not one of the two languages is both — the behaviour of
  // every install written before the choice existed.
  if (next.studyLanguages !== 'hebrew' && next.studyLanguages !== 'arabic') {
    next.studyLanguages = 'both';
  }

  next.learnerGender = next.learnerGender === 'male' ? 'male' : 'female';
  next.listenerGenders = normaliseListeners(next.listenerGenders);

  const override = normalisePerspectives(next.practicePerspectiveOverride);
  if (override.length > 0) next.practicePerspectiveOverride = override;
  else delete next.practicePerspectiveOverride;

  return next;
}

type SettingsState = {
  settings: Settings;
  /**
   * The languages to teach, ask for, speak and score — derived from
   * `studyLanguages` and held here for the same reason `perspectives` is: one
   * array, one reference, and no persisted copy of a value that follows from
   * the row it would sit beside.
   *
   * Never empty. Narrowing is display and grading only: no progress row is
   * keyed by language, so switching between one and both loses nothing.
   */
  languages: readonly Language[];
  /**
   * What to render and grade, derived from the settings above.
   *
   * Held in the store rather than recomputed per component, so every surface
   * shares one array and one reference; and never written to the row, because
   * a persisted copy of a derived value is exactly what Phase 0 removes. It is
   * rebuilt on every write, so it cannot drift.
   */
  perspectives: SpeechPerspective[];
  /**
   * Which half of a grammatical pair a card leads with, for the pairs the
   * speaker controls.
   *
   * The one place in the app that maps a person's gender onto a word's, and it
   * does so deliberately and locally rather than by sharing a type: a learner
   * should read her own form first. It follows `learnerGender` and not the
   * perspective being rendered, so it cannot flip mid-drill, and it never
   * reaches grading.
   */
  lead: 'feminine' | 'masculine';
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
  reset: () => Promise<void>;
};

/** The store slices that follow from a settings row, rebuilt on every write. */
function derived(settings: Settings) {
  return {
    settings,
    languages: activeLanguages(settings.studyLanguages),
    perspectives: effectivePerspectives(settings),
    lead:
      settings.learnerGender === 'male'
        ? ('masculine' as const)
        : ('feminine' as const),
  };
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...derived(DEFAULT_SETTINGS),
  loaded: false,

  async load() {
    const stored = (await db.settings.get('settings')) as
      | StoredSettings
      | undefined;
    // Merged onto the defaults so a row from an older build still loads.
    set({ ...derived(migrateSettings(stored)), loaded: true });
  },

  async update(patch) {
    // Stamped so sync can tell which device changed a preference last. The
    // whole settings row is one syncable unit, so any change moves the stamp.
    const next = migrateSettings({
      ...get().settings,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    set(derived(next));
    await db.settings.put(next);
  },

  async reset() {
    const next: Settings = {
      ...DEFAULT_SETTINGS,
      updatedAt: new Date().toISOString(),
    };
    set(derived(next));
    await db.settings.put(next);
  },
}));
