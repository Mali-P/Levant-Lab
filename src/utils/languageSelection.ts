import { LANGUAGES, type Language, type LanguageChoice } from '../types';

/**
 * Which languages are switched on, in the app's canonical order.
 *
 * The one place the stored choice is turned into a list, so every surface —
 * the cards, the grading, the audio, the statistics — narrows against the same
 * array rather than each testing the string its own way.
 *
 * An unrecognised or missing value reads as `both`. That is the honest default
 * for a row written before this preference existed, and the safe one in either
 * direction: it can never hide a language the learner was studying.
 */
export function activeLanguages(
  choice: LanguageChoice | undefined,
): readonly Language[] {
  if (choice === 'hebrew' || choice === 'arabic') return [choice];
  return LANGUAGES;
}

/** Whether one language is being studied. An absent list means both. */
export function isActive(
  languages: readonly Language[] | undefined,
  language: Language,
): boolean {
  return !languages || languages.includes(language);
}

/**
 * Whether both languages are on — the original dual-language behaviour, which
 * a good deal of the copy is written for.
 */
export function isBoth(languages: readonly Language[]): boolean {
  return languages.length > 1;
}

export const LANGUAGE_LABEL: Record<Language, string> = {
  hebrew: 'Hebrew',
  arabic: 'Arabic',
};

/** How each is named where there is room for the full name. */
export const LANGUAGE_LONG_LABEL: Record<Language, string> = {
  hebrew: 'Hebrew',
  arabic: 'Levantine Arabic',
};
