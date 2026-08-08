import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Settings, SpeechPerspective } from '../types';
import { db } from '../services/database/db';
import { DEFAULT_SETTINGS } from '../services/database/defaults';
import { migrateSettings, useSettings } from './settingsStore';

/**
 * The three migration rows from the plan, plus the rule that keeps identity and
 * practice selection out of each other: an override survives a reload, clearing
 * it returns her to herself, and editing who she is never silently discards
 * what she chose to drill.
 */

/**
 * A row as an older build wrote it: the legacy list, and none of the identity
 * fields — which is what makes it legacy. A row carrying `learnerGender` has
 * already been migrated and must not be read backwards a second time.
 */
function legacyRow(speechPerspectives: SpeechPerspective[]) {
  const {
    learnerGender: _g,
    listenerGenders: _ls,
    identityConfirmed: _c,
    ...rest
  } = DEFAULT_SETTINGS;
  return { ...rest, speechPerspectives } as unknown as Settings;
}

async function loadFrom(row: unknown) {
  await db.settings.clear();
  if (row) await db.settings.put(row as Settings);
  await useSettings.getState().load();
  return useSettings.getState();
}

beforeEach(async () => {
  await db.settings.clear();
  await useSettings.getState().reset();
});

describe('migrating off the legacy perspective list', () => {
  it('reads an install that predates the setting as the unconfirmed default', async () => {
    const state = await loadFrom(undefined);
    expect(state.settings.learnerGender).toBe('female');
    expect(state.settings.listenerGenders).toEqual(['male', 'female']);
    expect(state.settings.identityConfirmed).toBe(false);
    expect(state.perspectives).toEqual(['femaleToMale', 'femaleToFemale']);
  });

  it('turns a single-speaker list into an identity and no override', async () => {
    const state = await loadFrom(legacyRow(['maleToFemale', 'maleToMale']));
    expect(state.settings.learnerGender).toBe('male');
    expect(state.settings.listenerGenders).toEqual(['male', 'female']);
    expect(state.settings.identityConfirmed).toBe(true);
    expect(state.settings.practicePerspectiveOverride).toBeUndefined();
  });

  it('keeps a mixed-speaker list verbatim rather than dropping half of it', async () => {
    const state = await loadFrom(legacyRow(['femaleToMale', 'maleToMale']));
    expect(state.settings.practicePerspectiveOverride).toEqual([
      'femaleToMale',
      'maleToMale',
    ]);
    expect(state.settings.identityConfirmed).toBe(false);
    // What she sees is exactly what she was studying before the upgrade.
    expect(state.perspectives).toEqual(['femaleToMale', 'maleToMale']);
  });

  it('never writes the retired field back to disk', async () => {
    await loadFrom(legacyRow(['femaleToMale', 'maleToMale']));
    await useSettings.getState().update({ showHints: false });
    const stored = await db.settings.get('settings');
    expect(stored).not.toHaveProperty('speechPerspectives');
    expect(stored?.practicePerspectiveOverride).toEqual([
      'femaleToMale',
      'maleToMale',
    ]);
  });
});

describe('identity and practice selection stay separate', () => {
  it('round-trips an override through a reload', async () => {
    await useSettings
      .getState()
      .update({ practicePerspectiveOverride: ['maleToMale'] });
    const state = await loadFrom(await db.settings.get('settings'));
    expect(state.settings.practicePerspectiveOverride).toEqual(['maleToMale']);
    expect(state.perspectives).toEqual(['maleToMale']);
  });

  it('restores the derived perspectives when the override is cleared', async () => {
    await useSettings
      .getState()
      .update({ practicePerspectiveOverride: ['maleToMale'] });
    await useSettings
      .getState()
      .update({ practicePerspectiveOverride: undefined });

    const state = useSettings.getState();
    expect(state.settings.practicePerspectiveOverride).toBeUndefined();
    expect(state.perspectives).toEqual(['femaleToMale', 'femaleToFemale']);
  });

  it('does not silently discard an override when identity is edited', async () => {
    await useSettings
      .getState()
      .update({ practicePerspectiveOverride: ['maleToMale'] });
    await useSettings
      .getState()
      .update({ learnerGender: 'male', listenerGenders: ['female'] });

    const state = useSettings.getState();
    // The edit changes what she would return to, not what she sees now — and
    // the banner in Settings is what says so.
    expect(state.settings.learnerGender).toBe('male');
    expect(state.settings.practicePerspectiveOverride).toEqual(['maleToMale']);
    expect(state.perspectives).toEqual(['maleToMale']);
  });

  it('reads an override of nothing as no override at all', () => {
    const migrated = migrateSettings({
      ...DEFAULT_SETTINGS,
      practicePerspectiveOverride: [],
    });
    expect(migrated.practicePerspectiveOverride).toBeUndefined();
  });

  it('refuses to leave a learner with no listeners', () => {
    const migrated = migrateSettings({
      ...DEFAULT_SETTINGS,
      listenerGenders: [],
    });
    expect(migrated.listenerGenders).toEqual(['male', 'female']);
  });
});

describe('what a card leads with', () => {
  it('follows identity rather than the perspectives in force', async () => {
    expect(useSettings.getState().lead).toBe('feminine');
    await useSettings.getState().update({ learnerGender: 'male' });
    expect(useSettings.getState().lead).toBe('masculine');

    // An override changes what is rendered, not who he is, so it must not
    // change which of his own forms he reads first.
    await useSettings
      .getState()
      .update({ practicePerspectiveOverride: ['femaleToFemale'] });
    expect(useSettings.getState().lead).toBe('masculine');
  });
});
