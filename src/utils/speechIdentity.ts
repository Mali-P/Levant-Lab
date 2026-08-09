import {
  SPEECH_PERSPECTIVES,
  type PersonGender,
  type SpeechPerspective,
} from '../types';

/**
 * The two questions a learner can actually answer about herself — *who am I*
 * and *who am I speaking to* — the perspectives that follow from them, and the
 * one-way migration off the legacy list that used to stand in for both.
 *
 * Identity is what gets stored; the perspective list is derived on every read.
 * The direction matters and only runs one way: an identity produces
 * perspectives, and nothing here ever reads an identity back out of a
 * perspective list, a rendered form or a drill selection. The single exception
 * is `identityFromLegacy`, which exists precisely to stop doing that.
 */

/**
 * The two people a perspective names, read out of the perspective rather than
 * out of stored identity.
 *
 * Exported because `wordForms` needs the same answer when it resolves a
 * `forms` pair against its agreement controller, and a second copy of these
 * four rows elsewhere is exactly how the two axes drifted apart before.
 * Reading a *rendering* decision out of a perspective is allowed; reading an
 * *identity* out of one is what the file header forbids.
 */
export const PERSPECTIVE_SPEAKER: Record<SpeechPerspective, PersonGender> = {
  femaleToMale: 'female',
  femaleToFemale: 'female',
  maleToFemale: 'male',
  maleToMale: 'male',
};

export const PERSPECTIVE_LISTENER: Record<SpeechPerspective, PersonGender> = {
  femaleToMale: 'male',
  femaleToFemale: 'female',
  maleToFemale: 'female',
  maleToMale: 'male',
};

const SPEAKER = PERSPECTIVE_SPEAKER;
const LISTENER = PERSPECTIVE_LISTENER;

/**
 * Canonical listener order: ♂ first, so `['male','female']` lines up with
 * `SPEECH_PERSPECTIVES` and the first perspective derived is the one a card
 * leads with.
 */
export const LISTENER_ORDER: readonly PersonGender[] = ['male', 'female'];

/**
 * The never-empty guard, in one place.
 *
 * An empty listener set derives no perspectives at all, which would leave every
 * gendered card with nothing to show and nothing to grade. Unknown strings —
 * from an older build or a hand-edited backup — are dropped, and the survivors
 * come back in canonical order however they were stored.
 */
export function normaliseListeners(
  listeners: readonly PersonGender[] | undefined,
): PersonGender[] {
  const kept = LISTENER_ORDER.filter((g) => listeners?.includes(g));
  return kept.length > 0 ? kept : [...LISTENER_ORDER];
}

/**
 * The same tidy-up for a perspective list: unknown entries dropped, canonical
 * female-first order restored. Unlike listeners this may legitimately come back
 * empty — an override of nothing is no override, and the caller falls through
 * to the derived list rather than substituting a default.
 */
export function normalisePerspectives(
  list: readonly SpeechPerspective[] | undefined,
): SpeechPerspective[] {
  return SPEECH_PERSPECTIVES.filter((p) => list?.includes(p));
}

/** The perspectives that follow from the pair, in canonical female-first order. */
export function derivePerspectives(
  speaker: PersonGender,
  listeners: readonly PersonGender[] | undefined,
): SpeechPerspective[] {
  const wanted = normaliseListeners(listeners);
  return SPEECH_PERSPECTIVES.filter(
    (p) => SPEAKER[p] === speaker && wanted.includes(LISTENER[p]),
  );
}

/** The fields `effectivePerspectives` needs, so callers can pass anything carrying them. */
export type PerspectiveSource = {
  learnerGender: PersonGender;
  listenerGenders: PersonGender[];
  practicePerspectiveOverride?: SpeechPerspective[];
};

/**
 * The one selector every consumer reads in place of the retired stored field.
 *
 * An override wins where one is set, because it is a deliberate persistent
 * choice; absent that, she is rendered as herself. Clearing the override is
 * therefore all it takes to return her to her own identity, and nothing has to
 * be copied back into identity to make that happen.
 */
export function effectivePerspectives(
  settings: PerspectiveSource,
): SpeechPerspective[] {
  const override = normalisePerspectives(settings.practicePerspectiveOverride);
  if (override.length > 0) return override;
  return derivePerspectives(settings.learnerGender, settings.listenerGenders);
}

/** What the legacy `speechPerspectives` list becomes. */
export type MigratedIdentity = {
  learnerGender: PersonGender;
  listenerGenders: PersonGender[];
  identityConfirmed: boolean;
  practicePerspectiveOverride?: SpeechPerspective[];
};

/**
 * Reads a legacy list once, on load, and branches on whether it is *derivable*
 * — whether it equals `derivePerspectives(g, ls)` for some `g` and `ls`.
 *
 * A list with one speaker always is, since every non-empty listener subset
 * derives, so counting speakers answers the question exactly. Such a list
 * becomes an identity and is left un-overridden: turning every install into an
 * overridden one would make identity permanently decorative.
 *
 * A list with two speakers never is. The old code called that install female
 * and silently dropped the male-speaker perspectives — a drill selection being
 * read as an identity, and a learner opening the app to find a perspective she
 * was studying gone. Preserving it verbatim as an override changes nothing she
 * sees, commits to nothing about who she is, and leaves Settings free to ask
 * the question once.
 *
 * An absent or unreadable list is the default install, unconfirmed.
 */
export function identityFromLegacy(
  legacy: readonly SpeechPerspective[] | undefined,
): MigratedIdentity {
  const kept = normalisePerspectives(legacy);

  if (kept.length === 0) {
    return {
      learnerGender: 'female',
      listenerGenders: [...LISTENER_ORDER],
      identityConfirmed: false,
    };
  }

  const speakers = [...new Set(kept.map((p) => SPEAKER[p]))];
  if (speakers.length > 1) {
    return {
      learnerGender: 'female',
      listenerGenders: [...LISTENER_ORDER],
      identityConfirmed: false,
      practicePerspectiveOverride: kept,
    };
  }

  return {
    learnerGender: speakers[0],
    listenerGenders: normaliseListeners(kept.map((p) => LISTENER[p])),
    identityConfirmed: true,
  };
}
