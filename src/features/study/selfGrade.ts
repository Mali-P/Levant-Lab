import type { Language } from '../../types';

export type SelfGradeChoice =
  | 'correct'
  | 'wrong'
  | 'both-correct'
  | 'both-wrong'
  | 'hebrew-wrong'
  | 'arabic-wrong';

/**
 * The engine always receives both booleans. A language the learner is not
 * studying must be handed over as correct, otherwise a one-language "Correct"
 * answer reads as half-wrong and drops the card out of the recalled set.
 */
export function selfGradeResult(
  choice: SelfGradeChoice,
  only?: Language,
): { hebrew: boolean; arabic: boolean } {
  switch (choice) {
    case 'correct':
    case 'both-correct':
      return { hebrew: true, arabic: true };
    case 'wrong':
      return {
        hebrew: only !== 'arabic' ? false : true,
        arabic: only !== 'hebrew' ? false : true,
      };
    case 'both-wrong':
      return { hebrew: false, arabic: false };
    case 'hebrew-wrong':
      return { hebrew: false, arabic: true };
    case 'arabic-wrong':
      return { hebrew: true, arabic: false };
  }
}
