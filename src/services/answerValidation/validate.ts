import type {
  AnswerResult,
  Flashcard,
  Language,
  LanguageAnswerResult,
  LanguageSide,
  SpeechPerspective,
} from '../../types';
import { speechWordForms } from '../../utils/wordForms';
import { normalise, type NormaliseOptions } from './normalise';

export type ValidationOptions = NormaliseOptions & {
  /** When false, only `script` is accepted and alternates are ignored. */
  acceptAlternateAnswers?: boolean;
  /**
   * The conversation perspectives the learner is studying. A card carrying
   * speaker/listener variants is graded against these and no others.
   */
  perspectives?: readonly SpeechPerspective[];
  /**
   * The languages she is studying. A language left out is never asked for and
   * so is never marked either way — see `gradePlan`, which is where that is
   * applied. Absent means both, which is what every existing caller means.
   */
  languages?: readonly Language[];
};

/**
 * Every string that should count as a correct answer for one language.
 *
 * Both *grammatical* forms always count. They are not alternate spellings the
 * learner opted into: the prompt asks for the word, and a learner who answers
 * with the form that matches their own gender has answered it.
 *
 * Speaker/listener variants are graded differently — only against the
 * perspectives the learner has enabled. Someone studying ♀→♂ is never marked
 * wrong for failing to produce ♂→♀, and is never quietly credited for it
 * either. Where a side has no variants, or the caller passes no perspectives,
 * this falls back to the whole word.
 */
export function expectedAnswers(
  side: LanguageSide,
  opts: ValidationOptions = {},
): string[] {
  const values: string[] = [];

  const speech =
    side.speechForms && opts.perspectives?.length
      ? speechWordForms(side, opts.perspectives)
      : [];

  if (speech.length > 0) {
    for (const form of speech) values.push(form.script);
  } else {
    values.push(side.script);
    if (side.forms) {
      values.push(side.forms.feminine.script, side.forms.masculine.script);
    }
  }

  if (opts.acceptAlternateAnswers !== false && side.accepted) {
    for (const alt of side.accepted) {
      if (alt.value) values.push(alt.value);
    }
  }
  // Forms overlap constantly — `script` mirrors the leading form, and two
  // perspectives often share one wording — so deduplicate before the list is
  // shown back to the learner as "these would have been right".
  return [...new Set(values.filter((v) => v && v.trim().length > 0))];
}

export function checkLanguage(
  submitted: string,
  side: LanguageSide,
  language: 'hebrew' | 'arabic',
  opts: ValidationOptions = {},
): LanguageAnswerResult {
  const expected = expectedAnswers(side, opts);
  const needle = normalise(submitted, language, opts);
  const correct =
    needle.length > 0 &&
    expected.some((value) => normalise(value, language, opts) === needle);

  return { correct, submitted, expected };
}

/**
 * Grades both languages independently. The caller must keep both results:
 * collapsing to a single boolean loses the per-language statistics the app
 * is built around.
 */
export function validateAnswer(
  card: Flashcard,
  submitted: { hebrew: string; arabic: string },
  opts: ValidationOptions = {},
): AnswerResult {
  const hebrew = checkLanguage(submitted.hebrew, card.hebrew, 'hebrew', opts);
  const arabic = checkLanguage(submitted.arabic, card.arabic, 'arabic', opts);
  return { hebrew, arabic, fullyCorrect: hebrew.correct && arabic.correct };
}
