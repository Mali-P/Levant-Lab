import { SPEECH_PERSPECTIVES, type SpeechPerspective } from '../types';

/**
 * The two questions a learner can actually answer about herself — *who am I*
 * and *who am I speaking to* — and the translation between them and the
 * four-way `speechPerspectives` list every other consumer reads.
 *
 * The stored setting stays the canonical one. Nothing here is persisted: the
 * pair is read back out of the perspectives on every render, so grading, audio
 * and `WordForms` keep their single source of truth.
 */

export type SpeakerGender = 'female' | 'male';

/** Who she practises speaking to. `both` is the default this app ships with. */
export type ListenerChoice = 'male' | 'female' | 'both';

const SPEAKER: Record<SpeechPerspective, SpeakerGender> = {
  femaleToMale: 'female',
  femaleToFemale: 'female',
  maleToFemale: 'male',
  maleToMale: 'male',
};

const LISTENER: Record<SpeechPerspective, 'male' | 'female'> = {
  femaleToMale: 'male',
  femaleToFemale: 'female',
  maleToFemale: 'female',
  maleToMale: 'male',
};

/**
 * The perspectives that follow from the pair, in canonical female-first order.
 *
 * A listener choice of `both` puts the male listener first, matching the order
 * of `SPEECH_PERSPECTIVES` — the first entry is the primary one, the form a
 * card leads with.
 */
export function derivePerspectives(
  speaker: SpeakerGender,
  listeners: ListenerChoice,
): SpeechPerspective[] {
  return SPEECH_PERSPECTIVES.filter(
    (p) =>
      SPEAKER[p] === speaker &&
      (listeners === 'both' || LISTENER[p] === listeners),
  );
}

/**
 * Which speaker the stored list describes. Female wins where a hand-edited
 * backup mixes the two, because the female forms are the ones this app leads
 * with and the safer thing to show her is the default she started from.
 */
export function speakerOf(
  perspectives: readonly SpeechPerspective[],
): SpeakerGender {
  return perspectives.some((p) => SPEAKER[p] === 'female') ? 'female' : 'male';
}

/** Which listeners the stored list covers, for the speaker it describes. */
export function listenersOf(
  perspectives: readonly SpeechPerspective[],
): ListenerChoice {
  const speaker = speakerOf(perspectives);
  const mine = perspectives.filter((p) => SPEAKER[p] === speaker);
  const male = mine.some((p) => LISTENER[p] === 'male');
  const female = mine.some((p) => LISTENER[p] === 'female');
  if (male && female) return 'both';
  return female ? 'female' : 'male';
}
