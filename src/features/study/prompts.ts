import type { Flashcard, PromptDirection } from '../../types';
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

export function buildPromptPlan(
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
 * only mastered when both halves are right.
 */
export function gradePlan(
  plan: PromptPlan,
  card: Flashcard,
  values: Record<string, string>,
  opts: ValidationOptions = {},
): { hebrew: boolean; arabic: boolean } {
  const result = { hebrew: false, arabic: false };
  for (const field of plan.fields) {
    result[field.scores] = gradeField(field, values[field.scores] ?? '', card, opts);
  }
  return result;
}
