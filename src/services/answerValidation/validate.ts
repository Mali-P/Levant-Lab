import type {
  AnswerResult,
  Flashcard,
  LanguageAnswerResult,
  LanguageSide,
} from '../../types';
import { normalise, type NormaliseOptions } from './normalise';

export type ValidationOptions = NormaliseOptions & {
  /** When false, only `script` is accepted and alternates are ignored. */
  acceptAlternateAnswers?: boolean;
};

/**
 * Every string that should count as a correct answer for one language.
 *
 * Both gendered forms always count. They are not alternate spellings the
 * learner opted into: the prompt asks for the word, and a learner who answers
 * with the form that matches their own gender has answered it.
 */
export function expectedAnswers(
  side: LanguageSide,
  opts: ValidationOptions = {},
): string[] {
  const values = [side.script];
  if (side.forms) {
    values.push(side.forms.feminine.script, side.forms.masculine.script);
  }
  if (opts.acceptAlternateAnswers !== false && side.accepted) {
    for (const alt of side.accepted) {
      if (alt.value) values.push(alt.value);
    }
  }
  // `script` mirrors the masculine form, so deduplicate before the list is
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
