import type { GenderedForm, LanguageSide } from '../../types';

export type AudioLanguage = 'hebrew' | 'arabic';

/**
 * Which of a word's forms a clip belongs to. `neutral` is the single form of a
 * word that everyone says the same way — never an invented third variant of a
 * word that does have a feminine/masculine pair.
 */
export type FormName = 'feminine' | 'masculine' | 'neutral';

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
 * Every clip one side of one word needs: a feminine/masculine pair when the
 * two differ, otherwise a single neutral clip. Words with only one valid form
 * never get a fabricated second one.
 */
export function clipsForSide(
  audioId: string,
  language: AudioLanguage,
  side: LanguageSide,
): ClipSpec[] {
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
