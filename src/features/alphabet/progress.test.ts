import { describe, expect, it } from 'vitest';
import { ARABIC_LETTERS, HEBREW_LETTERS } from '../../data/alphabets';
import {
  applyAlphabetAnswer,
  emptyAlphabetProgress,
  needsReview,
  requiredSkills,
  summarise,
} from './progress';
import type { AlphabetProgress, AlphabetSkill } from '../../types/alphabet';

const NOW = '2026-08-06T12:00:00.000Z';

const letter = (id: string) => HEBREW_LETTERS.find((l) => l.id === id)!;
const arabic = (id: string) => ARABIC_LETTERS.find((l) => l.id === id)!;

function answerRepeatedly(
  start: AlphabetProgress | undefined,
  skill: AlphabetSkill,
  times: number,
  required: AlphabetSkill[],
): AlphabetProgress {
  let row = start;
  for (let i = 0; i < times; i++) {
    row = applyAlphabetAnswer(row, 'alef', 'hebrew', {
      skill,
      correct: true,
      now: NOW,
      required,
    });
  }
  return row!;
}

describe('requiredSkills', () => {
  it('does not demand handwriting from a letter with no handwritten asset', () => {
    expect(requiredSkills(letter('alef'))).not.toContain('handwrittenRecognition');
  });

  it('asks a four-form Arabic letter for contextual recognition', () => {
    expect(requiredSkills(arabic('ba'))).toContain('contextualFormRecognition');
  });

  it('still asks a non-connecting letter for its one contextual shape', () => {
    // Alif breaks the join, so it has no initial or medial form -- but its
    // joined final shape is real and a reader has to recognise it.
    expect(requiredSkills(arabic('alif'))).toContain('contextualFormRecognition');
  });

  it('asks nothing contextual of a letter with only an isolated shape', () => {
    expect(
      requiredSkills({ ...arabic('alif'), forms: { isolated: 'x' } }),
    ).not.toContain('contextualFormRecognition');
  });
});

describe('applyAlphabetAnswer', () => {
  const required: AlphabetSkill[] = [
    'typedRecognition',
    'listeningRecognition',
    'writingAccuracy',
  ];

  it('never masters a letter on typed recognition alone', () => {
    const row = answerRepeatedly(undefined, 'typedRecognition', 8, required);
    expect(row.typedRecognition).toBe(1);
    expect(row.mastered).toBe(false);
  });

  it('masters a letter once every required skill is confident', () => {
    let row = answerRepeatedly(undefined, 'typedRecognition', 3, required);
    row = answerRepeatedly(row, 'listeningRecognition', 3, required);
    row = answerRepeatedly(row, 'writingAccuracy', 3, required);
    expect(row.mastered).toBe(true);
  });

  it('costs more to get wrong than to get right, and drops mastery again', () => {
    let row = answerRepeatedly(undefined, 'typedRecognition', 3, required);
    row = answerRepeatedly(row, 'listeningRecognition', 3, required);
    row = answerRepeatedly(row, 'writingAccuracy', 3, required);

    row = applyAlphabetAnswer(row, 'alef', 'hebrew', {
      skill: 'typedRecognition',
      correct: false,
      now: NOW,
      required,
    });

    expect(row.typedRecognition).toBeCloseTo(0.25);
    expect(row.incorrectCount).toBe(1);
    expect(row.mastered).toBe(false);
  });

  it('leaves the input untouched', () => {
    const before = emptyAlphabetProgress('alef', 'hebrew');
    applyAlphabetAnswer(before, 'alef', 'hebrew', {
      skill: 'typedRecognition',
      correct: true,
      now: NOW,
      required,
    });
    expect(before.typedRecognition).toBe(0);
    expect(before.lastPractisedAt).toBeUndefined();
  });

  it('never falls below zero', () => {
    const row = applyAlphabetAnswer(undefined, 'alef', 'hebrew', {
      skill: 'writingAccuracy',
      correct: false,
      now: NOW,
      required,
    });
    expect(row.writingAccuracy).toBe(0);
  });
});

describe('summarise', () => {
  it('counts a letter as introduced only after it has been practised', () => {
    const empty = summarise(HEBREW_LETTERS, {});
    expect(empty.total).toBe(22);
    expect(empty.introduced).toBe(0);
    expect(empty.averageConfidence).toBe(0);
  });

  it('averages over required skills only', () => {
    const progress: Record<string, AlphabetProgress> = {
      alef: {
        ...emptyAlphabetProgress('alef', 'hebrew'),
        typedRecognition: 1,
        listeningRecognition: 1,
        writingAccuracy: 1,
        lastPractisedAt: NOW,
        mastered: true,
      },
    };
    const summary = summarise([letter('alef')], progress);
    expect(summary.averageConfidence).toBe(1);
    expect(summary.mastered).toBe(1);
    expect(summary.introduced).toBe(1);
  });
});

describe('needsReview', () => {
  it('ranks the most-missed letters first and ignores mastered ones', () => {
    const progress: Record<string, AlphabetProgress> = {
      alef: {
        ...emptyAlphabetProgress('alef', 'hebrew'),
        incorrectCount: 1,
        lastPractisedAt: NOW,
      },
      bet: {
        ...emptyAlphabetProgress('bet', 'hebrew'),
        incorrectCount: 4,
        lastPractisedAt: NOW,
      },
      gimel: {
        ...emptyAlphabetProgress('gimel', 'hebrew'),
        incorrectCount: 9,
        lastPractisedAt: NOW,
        mastered: true,
      },
    };
    const ids = needsReview(HEBREW_LETTERS, progress).map((l) => l.id);
    expect(ids).toEqual(['bet', 'alef']);
  });
});
