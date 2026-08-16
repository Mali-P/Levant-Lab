import { LANGUAGES, type Flashcard, type Language, type PromptDirection } from '../../types';
import {
  checkLanguage,
  expectedAnswers,
  normalise,
  type ValidationOptions,
} from '../../services/answerValidation';

export type FieldLanguage = 'english' | 'hebrew' | 'arabic';

export type PromptField = {
  /**
   * Which language's statistics this field feeds. When Hebrew is the prompt,
   * recalling its English meaning is what proves the Hebrew link, so that
   * field still scores against Hebrew.
   */
  scores: 'hebrew' | 'arabic';
  input: FieldLanguage;
  label: string;
  expected: string[];
};

export type PromptPlan = {
  promptLanguage: FieldLanguage;
  promptText: string;
  /** Set when the prompt is heard rather than read. */
  audio?: 'hebrew' | 'arabic';
  fields: PromptField[];
};

export const PROMPT_DIRECTION_LABELS: Record<PromptDirection, string> = {
  'en>he+ar': 'English to Hebrew and Arabic',
  'he>en+ar': 'Hebrew to English and Arabic',
  'ar>en+he': 'Arabic to English and Hebrew',
  'heAudio>he+ar': 'Hebrew audio to Hebrew and Arabic',
  'arAudio>ar+he': 'Arabic audio to Arabic and Hebrew',
  'enAudio>he+ar': 'English audio to Hebrew and Arabic',
};

export const PROMPT_DIRECTIONS = Object.keys(
  PROMPT_DIRECTION_LABELS,
) as PromptDirection[];

/**
 * Where each direction lands when only one language is being studied.
 *
 * A direction names two things at once — what the prompt is, and what is asked
 * for — and switching a language off can invalidate either. Asking for Arabic
 * is simply dropped, which the field filter below handles. Being *prompted* in
 * Arabic cannot be: the card would open with a word she is not studying and
 * nothing underneath it. So a prompt in the language she has switched off moves
 * to its twin in the language she has switched on, and the direction survives
 * as the thing it was really expressing — read the script, hear it, or start
 * from English.
 *
 * Consulted only when exactly one language is on, so nothing about the existing
 * dual-language behaviour is routed through it.
 */
const SINGLE_LANGUAGE_DIRECTION: Record<
  Language,
  Partial<Record<PromptDirection, PromptDirection>>
> = {
  hebrew: {
    'ar>en+he': 'he>en+ar',
    'arAudio>ar+he': 'heAudio>he+ar',
  },
  arabic: {
    'he>en+ar': 'ar>en+he',
    'heAudio>he+ar': 'arAudio>ar+he',
    // This one speaks Hebrew on the way in; with Hebrew off, the only voice
    // left to prompt with is the Arabic one.
    'enAudio>he+ar': 'arAudio>ar+he',
  },
};

/**
 * The direction actually asked, given the languages switched on. Identity when
 * both are on, so a dual-language run is untouched.
 */
export function resolveDirection(
  direction: PromptDirection,
  languages: readonly Language[] = LANGUAGES,
): PromptDirection {
  if (languages.length !== 1) return direction;
  return SINGLE_LANGUAGE_DIRECTION[languages[0]][direction] ?? direction;
}

/** Whether a card carries anything at all to be asked in a language. */
export function hasSideFor(card: Flashcard, language: Language): boolean {
  const side = card[language];
  if (side.script.trim()) return true;
  if (side.forms) {
    return Boolean(
      side.forms.feminine.script.trim() || side.forms.masculine.script.trim(),
    );
  }
  // A perspective that is `sameAs` another, or `notApplicable`, carries no
  // wording of its own — only a plain form can stand in for a missing script.
  return Object.values(side.speechForms ?? {}).some(
    (variant) => 'script' in variant && Boolean(variant.script.trim()),
  );
}

/**
 * The languages a card can actually be asked in: the ones being studied, minus
 * any the card has no side for.
 *
 * A half-filled card — one saved with its Hebrew still blank, which is how
 * every new card starts — has no Hebrew answer for anything typed into it to
 * match, so grading marked her wrong every single time and no amount of review
 * could ever move it. An absent half is not a wrong one. It is treated here
 * exactly as a language she has switched off is treated: never asked, never
 * shown, and never written to her statistics.
 */
export function askableLanguages(
  card: Flashcard,
  languages: readonly Language[] = LANGUAGES,
): readonly Language[] {
  return languages.filter((language) => hasSideFor(card, language));
}

export function buildPromptPlan(
  card: Flashcard,
  direction: PromptDirection,
  opts: ValidationOptions = {},
): PromptPlan {
  const languages = askableLanguages(card, opts.languages ?? LANGUAGES);
  const plan = buildFullPlan(card, resolveDirection(direction, languages), opts);

  // The prompt stands; only what is asked for narrows. A field scoring a
  // language she is not studying is not so much hidden as never asked — there
  // is nothing for it to grade and nothing for it to feed.
  //
  // Narrowing to what the card holds also reroutes the prompt itself, through
  // the same single-language rule: a card with no Hebrew can no more be asked
  // *in* Hebrew than it can be asked *for* it, and `he>en+ar` over such a card
  // used to open on an empty line where the word should have been.
  return {
    ...plan,
    fields: plan.fields.filter((field) => languages.includes(field.scores)),
  };
}

/** Every field the direction implies, before any language filter. */
function buildFullPlan(
  card: Flashcard,
  direction: PromptDirection,
  opts: ValidationOptions = {},
): PromptPlan {
  const hebrewField: PromptField = {
    scores: 'hebrew',
    input: 'hebrew',
    label: 'Hebrew',
    expected: expectedAnswers(card.hebrew, opts),
  };
  const arabicField: PromptField = {
    scores: 'arabic',
    input: 'arabic',
    label: 'Arabic',
    expected: expectedAnswers(card.arabic, opts),
  };
  const englishFor = (scores: 'hebrew' | 'arabic'): PromptField => ({
    scores,
    input: 'english',
    label: 'English',
    expected: [card.english],
  });

  switch (direction) {
    case 'he>en+ar':
      return {
        promptLanguage: 'hebrew',
        promptText: card.hebrew.script,
        fields: [englishFor('hebrew'), arabicField],
      };
    case 'ar>en+he':
      return {
        promptLanguage: 'arabic',
        promptText: card.arabic.script,
        fields: [englishFor('arabic'), hebrewField],
      };
    case 'heAudio>he+ar':
      return {
        promptLanguage: 'hebrew',
        promptText: card.hebrew.script,
        audio: 'hebrew',
        fields: [hebrewField, arabicField],
      };
    case 'arAudio>ar+he':
      return {
        promptLanguage: 'arabic',
        promptText: card.arabic.script,
        audio: 'arabic',
        fields: [arabicField, hebrewField],
      };
    case 'enAudio>he+ar':
      return {
        promptLanguage: 'english',
        promptText: card.english,
        audio: 'hebrew',
        fields: [hebrewField, arabicField],
      };
    case 'en>he+ar':
    default:
      return {
        promptLanguage: 'english',
        promptText: card.english,
        fields: [hebrewField, arabicField],
      };
  }
}

/** Grades typed input for one field, returning a plain pass or fail. */
export function gradeField(
  field: PromptField,
  submitted: string,
  card: Flashcard,
  opts: ValidationOptions = {},
): boolean {
  if (field.input === 'english') {
    const needle = normalise(submitted, 'english', opts);
    return needle.length > 0 && needle === normalise(card.english, 'english', opts);
  }
  const side = field.input === 'hebrew' ? card.hebrew : card.arabic;
  return checkLanguage(submitted, side, field.input, opts).correct;
}

/**
 * Grades a whole card. The result stays split by language because a card is
 * only mastered when every language being studied is right.
 *
 * A language switched off starts — and stays — correct. That is not a mark in
 * its favour: nothing is recorded against it either, and `recordAnswer` leaves
 * its statistics exactly where they were. It is how "both halves right" reads
 * when there is only one half being asked, and it is what keeps a learner
 * studying Hebrew alone from being held back by an Arabic answer she was never
 * shown.
 *
 * A language the *card* has nothing in behaves the same way, for the same
 * reason. The caller must pass the same languages on to `recordAnswer`, or a
 * half that was never asked will be marked down for staying silent.
 */
export function gradePlan(
  plan: PromptPlan,
  card: Flashcard,
  values: Record<string, string>,
  opts: ValidationOptions = {},
): { hebrew: boolean; arabic: boolean } {
  const languages = askableLanguages(card, opts.languages ?? LANGUAGES);
  const result = {
    hebrew: !languages.includes('hebrew'),
    arabic: !languages.includes('arabic'),
  };
  for (const field of plan.fields) {
    result[field.scores] = gradeField(field, values[field.scores] ?? '', card, opts);
  }
  return result;
}
