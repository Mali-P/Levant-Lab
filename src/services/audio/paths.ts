import {
  SPEECH_PERSPECTIVES,
  type GenderedForm,
  type LanguageSide,
} from '../../types';
import { speechWordForms } from '../../utils/wordForms';

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
 * What the generator should send to the provider: the pronunciation override
 * when the entry carries one, otherwise the text the learner reads. Never a
 * rewrite of the stored wording — the Arabic stays Levantine as written.
 */
export function textToSpeak(form: GenderedForm | LanguageSide): string {
  return (form.pronunciationText ?? form.script).trim();
}

export type ClipSpec = {
  audioId: string;
  language: AudioLanguage;
  form: FormName;
  /** What the learner sees. */
  text: string;
  /** What the provider is asked to say. */
  spoken: string;
  transliteration?: string;
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
      spoken: textToSpeak(form),
      transliteration: form.transliteration,
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
    spoken: textToSpeak(source),
    transliteration: source.transliteration,
    path: clipPath(audioId, language, form),
    key: clipKey(audioId, language, form),
  }));
}
