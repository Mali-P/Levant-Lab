import { describe, expect, it } from 'vitest';
import { ARABIC_LETTERS, HEBREW_LETTERS } from '../../data/alphabets';
import { mulberry32 } from '../../utils/random';
import {
  MODE_SKILL,
  OPTION_COUNT,
  buildQuestion,
  lettersForMode,
  supportsMode,
  type PracticeMode,
} from './questions';
import { contextualForms, printFormOf } from './forms';

const hebrew = (id: string) => HEBREW_LETTERS.find((l) => l.id === id)!;
const arabic = (id: string) => ARABIC_LETTERS.find((l) => l.id === id)!;

/** A fixed seed, so a failure is a failure and not a reroll. */
const rng = () => mulberry32(42);

describe('supportsMode', () => {
  it('refuses a handwriting question for a letter with no drawn asset', () => {
    // No handwritten assets ship yet, which is exactly the case to hold.
    expect(supportsMode(hebrew('alef'), 'handwritten')).toBe(false);
    expect(lettersForMode([...HEBREW_LETTERS], 'handwritten')).toEqual([]);
  });

  it('refuses a contextual question for Hebrew, which has no joined shapes', () => {
    expect(supportsMode(hebrew('alef'), 'contextual')).toBe(false);
  });

  it('asks a four-shape Arabic letter about its joined forms', () => {
    expect(supportsMode(arabic('ba'), 'contextual')).toBe(true);
  });

  it('does not ask alif for a medial shape it does not have', () => {
    const forms = contextualForms(arabic('alif')).map((entry) => entry.form);
    expect(forms).not.toContain('medial');
  });
});

describe('buildQuestion', () => {
  const modes: PracticeMode[] = ['recognise', 'recall', 'listen'];

  it.each(modes)('puts the right answer among the options in %s mode', (mode) => {
    const question = buildQuestion(hebrew('bet'), 'hebrew', {
      mode,
      pool: [...HEBREW_LETTERS],
      rng: rng(),
    })!;

    expect(question.options).toHaveLength(OPTION_COUNT);
    expect(question.options[question.correctIndex].letterId).toBe('bet');
    expect(question.skill).toBe(MODE_SKILL[mode]);
  });

  it('never offers the same option twice', () => {
    for (const letter of HEBREW_LETTERS) {
      const question = buildQuestion(letter, 'hebrew', {
        mode: 'recall',
        pool: [...HEBREW_LETTERS],
        rng: rng(),
      })!;
      const shown = question.options.map((option) =>
        option.kind === 'glyph' ? option.glyph : option.name,
      );
      expect(new Set(shown).size).toBe(shown.length);
    }
  });

  it('prefers the letters a learner actually confuses as distractors', () => {
    // Bet's only listed lookalike is kaf, so it must be on the board.
    const question = buildQuestion(hebrew('bet'), 'hebrew', {
      mode: 'recognise',
      pool: [...HEBREW_LETTERS],
      rng: rng(),
    })!;

    expect(question.options.map((option) => option.letterId)).toContain('kaf');
  });

  it('shows the glyph and offers names when reading a printed letter', () => {
    const question = buildQuestion(hebrew('shin'), 'hebrew', {
      mode: 'recognise',
      pool: [...HEBREW_LETTERS],
      rng: rng(),
    })!;

    expect(question.prompt).toMatchObject({
      kind: 'glyph',
      glyph: printFormOf(hebrew('shin')),
    });
    expect(question.options.every((option) => option.kind === 'name')).toBe(true);
  });

  it('offers glyphs, not names, when the prompt is a recording', () => {
    const question = buildQuestion(arabic('ba'), 'arabic', {
      mode: 'listen',
      pool: [...ARABIC_LETTERS],
      rng: rng(),
    })!;

    expect(question.prompt.kind).toBe('audio');
    expect(question.options.every((option) => option.kind === 'glyph')).toBe(true);
  });

  it('shows a joined shape, not the isolated one, in contextual mode', () => {
    const question = buildQuestion(arabic('ba'), 'arabic', {
      mode: 'contextual',
      pool: [...ARABIC_LETTERS],
      rng: rng(),
      form: 'medial',
    })!;

    expect(question.prompt).toMatchObject({
      kind: 'glyph',
      glyph: arabic('ba').forms.medial,
    });
    expect(question.prompt.caption).toMatch(/middle of a word/);
  });

  it('returns nothing for a mode the letter cannot honestly be asked', () => {
    expect(
      buildQuestion(hebrew('alef'), 'hebrew', {
        mode: 'handwritten',
        pool: [...HEBREW_LETTERS],
        rng: rng(),
      }),
    ).toBeUndefined();

    expect(
      buildQuestion(hebrew('alef'), 'hebrew', {
        mode: 'write',
        pool: [...HEBREW_LETTERS],
        rng: rng(),
      }),
    ).toBeUndefined();
  });

  it('still builds a question when the pool is smaller than the option count', () => {
    const pool = [hebrew('bet'), hebrew('kaf')];
    const question = buildQuestion(hebrew('bet'), 'hebrew', {
      mode: 'recognise',
      pool,
      rng: rng(),
    })!;

    expect(question.options).toHaveLength(2);
    expect(question.options[question.correctIndex].letterId).toBe('bet');
  });
});
