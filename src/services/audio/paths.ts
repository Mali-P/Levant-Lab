import {
  SPEECH_PERSPECTIVES,
  type GenderedForm,
  type LanguageSide,
} from '../../types';
import { speechWordForms } from '../../utils/wordForms';
import { resolveSpokenPlan, type TtsSource } from './ttsPlan';

export type AudioLanguage = 'hebrew' | 'arabic';

/**
 * Which of a word's forms a clip belongs to.
 *
 * `neutral` is the single form of a word everyone says the same way — never an
 * invented third variant of a word that does have a feminine/masculine pair.
 * `feminine` and `masculine` are grammatical forms. Anything else is a
 * speaker/listener variant, named for every perspective sharing that exact
 * wording: `f2m`, or `f2m+m2m` where two perspectives say the same thing and
 * therefore need one recording between them rather than two.
 */
export type FormName = string;

/** The names a word without speaker/listener variants can take. */
export const FORM_NAMES: readonly FormName[] = ['feminine', 'masculine', 'neutral'];

/** Directory segment per language, matching `assets/audio/he` and `.../ar`. */
export const LANGUAGE_DIR: Record<AudioLanguage, string> = {
  hebrew: 'he',
  arabic: 'ar',
};

export const AUDIO_ROOT = 'assets/audio';
export const AUDIO_EXTENSION = 'mp3';

/**
 * An ASCII, filesystem-safe fragment of an English label. Combining marks are
 * folded away, everything else collapses to single hyphens.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The stable audio key for a starter word.
 *
 * Deliberately built from the same `category | deck | english` identity the
 * seeder already uses to match a word across installs, and never from the
 * Hebrew or Arabic spelling: fixing a niqqud or a hamza must not orphan a
 * recording, and neither script is safe in a filename. Card `id`s cannot be
 * used because they are generated per device.
 */
export function audioIdFor(
  categoryName: string,
  deckName: string,
  english: string,
): string {
  return [categoryName, deckName, english].map(slugify).join('__');
}

/** `assets/audio/he/animals__pets__cat_feminine.mp3` */
export function clipPath(
  audioId: string,
  language: AudioLanguage,
  form: FormName,
): string {
  return (
    AUDIO_ROOT +
    '/' +
    LANGUAGE_DIR[language] +
    '/' +
    audioId +
    '_' +
    form +
    '.' +
    AUDIO_EXTENSION
  );
}

/** Key into the generated manifest: `he/animals__pets__cat_feminine`. */
export function clipKey(
  audioId: string,
  language: AudioLanguage,
  form: FormName,
): string {
  return LANGUAGE_DIR[language] + '/' + audioId + '_' + form;
}

/**
 * What the generator should send to the provider, and on whose authority.
 *
 * The whole ladder bar the clip itself, because at generation time the clip is
 * the thing being made: the form's own override, then the Palestinian
 * dictionary, then the spelling. Never a rewrite of the stored wording — the
 * Arabic the learner reads stays Levantine as written, and only the engine's
 * copy is vocalised.
 */
function speechFor(
  form: GenderedForm | LanguageSide,
  language: AudioLanguage,
): { spoken: string; transliteration?: string; ttsSource: TtsSource; locked: boolean } {
  const plan = resolveSpokenPlan(form, { language });
  return {
    spoken: plan.text.trim(),
    // The plan's target, not the form's own romanisation: where a reviewer has
    // corrected one without the other, the corrected one is what the recording
    // has to match.
    transliteration: plan.target,
    ttsSource: plan.source,
    locked: plan.locked,
  };
}

/**
 * What the generator should send to the provider for one form.
 *
 * Kept as a named export because it is the one-line question the rest of the
 * pipeline asks; `speechFor` is the same answer with its provenance attached.
 */
export function textToSpeak(
  form: GenderedForm | LanguageSide,
  language: AudioLanguage,
): string {
  return speechFor(form, language).spoken;
}

export type ClipSpec = {
  audioId: string;
  language: AudioLanguage;
  form: FormName;
  /** What the learner sees. */
  text: string;
  /** What the provider is asked to say. */
  spoken: string;
  /**
   * The romanisation the recording has to come out as, handed to providers that
   * take direction in prose. Levantry's target, not the engine's guess.
   */
  transliteration?: string;
  /**
   * Which tier decided `spoken`. `'inferred'` means nothing did — the engine is
   * reading undiacritized spelling and choosing the vowels itself, which is what
   * `validate-pronunciation` fails the starter set on.
   */
  ttsSource: TtsSource;
  /** Set when the pronunciation is course data that must not be re-derived. */
  locked: boolean;
  path: string;
  key: string;
};

/**
 * Every clip one side of one word needs.
 *
 * A word with speaker/listener variants is recorded once per *distinct spoken
 * form* across all four perspectives — not once per perspective. Two
 * perspectives worded identically resolve to a single entry whose name carries
 * both (`f2m+m2m`), so they share one asset and the generator is never asked
 * to record the same sentence twice.
 *
 * Otherwise: a feminine/masculine pair when the two differ, else a single
 * neutral clip. Words with one valid form never get a fabricated second one.
 */
export function clipsForSide(
  audioId: string,
  language: AudioLanguage,
  side: LanguageSide,
): ClipSpec[] {
  if (side.speechForms) {
    // All four, because a recording has to exist for a perspective before the
    // learner can switch to it — the *selection* narrows what she is shown and
    // graded on, never what the app is able to say.
    return speechWordForms(side, SPEECH_PERSPECTIVES).map((form) => ({
      audioId,
      language,
      form: form.key,
      text: form.script,
      ...speechFor(form, language),
      path: clipPath(audioId, language, form.key),
      key: clipKey(audioId, language, form.key),
    }));
  }

  const entries: Array<[FormName, GenderedForm | LanguageSide]> = side.forms
    ? [
        ['feminine', side.forms.feminine],
        ['masculine', side.forms.masculine],
      ]
    : [['neutral', side]];

  return entries.map(([form, source]) => ({
    audioId,
    language,
    form,
    text: source.script,
    ...speechFor(source, language),
    path: clipPath(audioId, language, form),
    key: clipKey(audioId, language, form),
  }));
}
