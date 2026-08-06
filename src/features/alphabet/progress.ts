import type {
  AlphabetProgress,
  AlphabetScript,
  AlphabetSkill,
  ArabicLetter,
  HebrewLetter,
} from '../../types/alphabet';

/**
 * Progress through an alphabet, scored per skill.
 *
 * Recognising printed aleph tells you nothing about reading it in cursive,
 * hearing it, or writing it, so each skill carries its own 0-1 confidence and
 * a letter is only mastered once every skill it actually offers is up. A
 * letter with no handwritten asset is not held back by a skill it cannot yet
 * be taught.
 *
 * Pure, like the vocabulary study engine: nothing here touches Dexie, so the
 * rules can be tested without a database and reused by any screen.
 */

/** A right answer moves a skill this much closer to confident. */
export const CORRECT_STEP = 0.25;

/** A wrong answer costs twice a right one: forgetting is faster than learning. */
export const INCORRECT_STEP = 0.5;

/** At or above this, a skill counts as learned. */
export const MASTERY_THRESHOLD = 0.75;

export function emptyAlphabetProgress(
  letterId: string,
  script: AlphabetScript,
): AlphabetProgress {
  return {
    letterId,
    script,
    typedRecognition: 0,
    handwrittenRecognition: 0,
    listeningRecognition: 0,
    writingAccuracy: 0,
    incorrectCount: 0,
    mastered: false,
  };
}

/**
 * Which skills a letter can honestly be scored on.
 *
 * Handwriting is only required once a real handwritten asset exists, and
 * contextual forms only for Arabic letters that actually change shape. Marking
 * a letter "mastered" on a skill the app cannot teach would be a lie the
 * progress screen then repeats.
 */
export function requiredSkills(
  letter: HebrewLetter | ArabicLetter,
): AlphabetSkill[] {
  const skills: AlphabetSkill[] = [
    'typedRecognition',
    'listeningRecognition',
    'writingAccuracy',
  ];

  if ('printForm' in letter) {
    if (letter.handwrittenForm) skills.push('handwrittenRecognition');
    return skills;
  }

  if (letter.handwrittenForms && Object.keys(letter.handwrittenForms).length > 0) {
    skills.push('handwrittenRecognition');
  }
  // Only a letter with more than the isolated shape has contextual forms to
  // recognise. Alif and its five non-connecting cousins have two, not four.
  if (Object.keys(letter.forms).length > 1) {
    skills.push('contextualFormRecognition');
  }
  return skills;
}

export function skillScore(
  progress: AlphabetProgress,
  skill: AlphabetSkill,
): number {
  return progress[skill] ?? 0;
}

export type AlphabetAnswer = {
  skill: AlphabetSkill;
  correct: boolean;
  /** ISO-8601 timestamp of the answer. */
  now: string;
  /** The skills this letter is judged on. From `requiredSkills`. */
  required: AlphabetSkill[];
};

/**
 * Applies one answer and returns the next progress row. The input is never
 * mutated, so a caller can persist the result and re-render from it.
 */
export function applyAlphabetAnswer(
  current: AlphabetProgress | undefined,
  letterId: string,
  script: AlphabetScript,
  answer: AlphabetAnswer,
): AlphabetProgress {
  const base = current ?? emptyAlphabetProgress(letterId, script);
  const before = skillScore(base, answer.skill);
  const after = answer.correct
    ? Math.min(1, before + CORRECT_STEP)
    : Math.max(0, before - INCORRECT_STEP);

  const next: AlphabetProgress = {
    ...base,
    [answer.skill]: after,
    lastPractisedAt: answer.now,
    incorrectCount: base.incorrectCount + (answer.correct ? 0 : 1),
  };

  next.mastered = answer.required.every(
    (skill) => skillScore(next, skill) >= MASTERY_THRESHOLD,
  );
  return next;
}

/** True once the learner has answered anything at all about this letter. */
export function isIntroduced(progress: AlphabetProgress | undefined): boolean {
  return Boolean(progress?.lastPractisedAt);
}

export type AlphabetSummary = {
  total: number;
  introduced: number;
  mastered: number;
  /** Mean confidence across every required skill of every letter, 0-1. */
  averageConfidence: number;
  incorrectTotal: number;
  lastPractisedAt?: string;
};

/**
 * The numbers behind the progress overview. Averaged over required skills
 * only, so an Arabic letter is not punished for a handwritten asset the build
 * does not ship.
 */
export function summarise(
  letters: Array<HebrewLetter | ArabicLetter>,
  progress: Record<string, AlphabetProgress | undefined>,
): AlphabetSummary {
  let scoreSum = 0;
  let scoreCount = 0;
  let introduced = 0;
  let mastered = 0;
  let incorrectTotal = 0;
  let lastPractisedAt: string | undefined;

  for (const letter of letters) {
    const row = progress[letter.id];
    if (isIntroduced(row)) introduced++;
    if (row?.mastered) mastered++;
    incorrectTotal += row?.incorrectCount ?? 0;
    if (row?.lastPractisedAt && (!lastPractisedAt || row.lastPractisedAt > lastPractisedAt)) {
      lastPractisedAt = row.lastPractisedAt;
    }
    for (const skill of requiredSkills(letter)) {
      scoreSum += row ? skillScore(row, skill) : 0;
      scoreCount++;
    }
  }

  return {
    total: letters.length,
    introduced,
    mastered,
    averageConfidence: scoreCount === 0 ? 0 : scoreSum / scoreCount,
    incorrectTotal,
    lastPractisedAt,
  };
}

/**
 * Letters to put in front of the learner next: anything answered wrongly more
 * often than it is confident, worst first. This is what the "Review mistakes"
 * deck is built from.
 */
export function needsReview(
  letters: Array<HebrewLetter | ArabicLetter>,
  progress: Record<string, AlphabetProgress | undefined>,
): Array<HebrewLetter | ArabicLetter> {
  return letters
    .filter((letter) => {
      const row = progress[letter.id];
      return Boolean(row) && !row!.mastered && row!.incorrectCount > 0;
    })
    .sort(
      (a, b) =>
        (progress[b.id]?.incorrectCount ?? 0) - (progress[a.id]?.incorrectCount ?? 0),
    );
}
