import { describe, expect, it } from 'vitest';
import { selfGradeResult } from './selfGrade';

describe('selfGradeResult', () => {
  it('hands an unused language to the engine as correct in Hebrew-only practice', () => {
    expect(selfGradeResult('correct', 'hebrew')).toEqual({
      hebrew: true,
      arabic: true,
    });
    expect(selfGradeResult('wrong', 'hebrew')).toEqual({
      hebrew: false,
      arabic: true,
    });
  });

  it('hands an unused language to the engine as correct in Arabic-only practice', () => {
    expect(selfGradeResult('correct', 'arabic')).toEqual({
      hebrew: true,
      arabic: true,
    });
    expect(selfGradeResult('wrong', 'arabic')).toEqual({
      hebrew: true,
      arabic: false,
    });
  });

  it('keeps the four both-language buttons explicit', () => {
    expect(selfGradeResult('both-correct')).toEqual({ hebrew: true, arabic: true });
    expect(selfGradeResult('both-wrong')).toEqual({ hebrew: false, arabic: false });
    expect(selfGradeResult('hebrew-wrong')).toEqual({ hebrew: false, arabic: true });
    expect(selfGradeResult('arabic-wrong')).toEqual({ hebrew: true, arabic: false });
  });
});
