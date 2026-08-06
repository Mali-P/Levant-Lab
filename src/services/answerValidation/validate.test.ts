import { describe, expect, it } from 'vitest';
import { normalise } from './normalise';
import { checkLanguage, expectedAnswers, validateAnswer } from './validate';
import type { Flashcard } from '../../types';

const card: Flashcard = {
  id: 'c1',
  categoryId: 'cat1',
  deckId: 'd1',
  english: 'apple',
  hebrew: {
    script: 'תפוח',
    transliteration: 'tapuach',
    accepted: [{ value: 'תפוח עץ', label: 'literal: tree apple' }],
  },
  arabic: {
    script: 'تفاحة',
    transliteration: 'tuffaha',
    dialect: 'General Levantine',
    accepted: [{ value: 'تفاح', label: 'collective', dialect: 'Palestinian' }],
  },
  createdAt: '2026-08-06T10:00:00.000Z',
  updatedAt: '2026-08-06T10:00:00.000Z',
};

describe('answer normalisation', () => {
  it('ignores leading and trailing whitespace', () => {
    expect(normalise('   תפוח  ', 'hebrew')).toBe('תפוח');
  });

  it('collapses repeated spaces', () => {
    expect(normalise('תפוח    עץ', 'hebrew')).toBe('תפוח עץ');
  });

  it('ignores Hebrew niqqud by default', () => {
    expect(normalise('שָׁלוֹם', 'hebrew')).toBe(normalise('שלום', 'hebrew'));
  });

  it('keeps niqqud when diacritics are not ignored', () => {
    const withMarks = normalise('שָׁלוֹם', 'hebrew', { ignoreDiacritics: false });
    expect(withMarks).not.toBe(normalise('שלום', 'hebrew'));
  });

  it('ignores Arabic vowel marks and tatweel by default', () => {
    expect(normalise('تُفَّاحَة', 'arabic')).toBe(normalise('تفاحة', 'arabic'));
    expect(normalise('تفـــاحة', 'arabic')).toBe(normalise('تفاحة', 'arabic'));
  });

  it('treats hamza and ta marbuta variants as the same letter', () => {
    expect(normalise('أكل', 'arabic')).toBe(normalise('اكل', 'arabic'));
    expect(normalise('تفاحة', 'arabic')).toBe(normalise('تفاحه', 'arabic'));
  });

  it('can be told to respect Arabic letter variants', () => {
    const strict = { lenientArabicLetters: false };
    expect(normalise('أكل', 'arabic', strict)).not.toBe(
      normalise('اكل', 'arabic', strict),
    );
  });

  it('never treats Hebrew or Arabic punctuation as a meaningful error', () => {
    expect(normalise('תפוח.', 'hebrew')).toBe(normalise('תפוח', 'hebrew'));
    expect(normalise('تفاحة،', 'arabic')).toBe(normalise('تفاحة', 'arabic'));
    expect(normalise('שלום־עולם', 'hebrew')).toBe(normalise('שלוםעולם', 'hebrew'));
  });

  it('lowercases English but leaves the scripts alone', () => {
    expect(normalise('  Apple ', 'english')).toBe('apple');
  });
});

describe('per-language checking', () => {
  it('accepts the primary script', () => {
    expect(checkLanguage('תפוח', card.hebrew, 'hebrew').correct).toBe(true);
  });

  it('accepts a configured alternate spelling', () => {
    expect(checkLanguage('תפוח עץ', card.hebrew, 'hebrew').correct).toBe(true);
    expect(checkLanguage('تفاح', card.arabic, 'arabic').correct).toBe(true);
  });

  it('rejects alternates when the setting is off', () => {
    const result = checkLanguage('تفاح', card.arabic, 'arabic', {
      acceptAlternateAnswers: false,
    });
    expect(result.correct).toBe(false);
    expect(result.expected).toEqual(['تفاحة']);
  });

  it('rejects a blank answer', () => {
    expect(checkLanguage('   ', card.hebrew, 'hebrew').correct).toBe(false);
  });

  it('rejects a wrong answer', () => {
    expect(checkLanguage('לחם', card.hebrew, 'hebrew').correct).toBe(false);
  });

  it('reports every accepted answer so the UI can show them', () => {
    expect(expectedAnswers(card.arabic)).toEqual(['تفاحة', 'تفاح']);
  });
});

describe('gendered forms', () => {
  // "good": טובה / טוב and منيحة / منيح.
  const gendered: Flashcard = {
    ...card,
    english: 'good',
    hebrew: {
      script: 'טוב',
      transliteration: 'tov',
      forms: {
        feminine: { script: 'טובה', transliteration: 'tova' },
        masculine: { script: 'טוב', transliteration: 'tov' },
      },
    },
    arabic: {
      script: 'منيح',
      transliteration: 'mnīḥ',
      dialect: 'Palestinian',
      forms: {
        feminine: { script: 'منيحة', transliteration: 'mnīḥa' },
        masculine: { script: 'منيح', transliteration: 'mnīḥ' },
      },
    },
  };

  it('accepts the feminine form', () => {
    expect(checkLanguage('טובה', gendered.hebrew, 'hebrew').correct).toBe(true);
    expect(checkLanguage('منيحة', gendered.arabic, 'arabic').correct).toBe(true);
  });

  it('accepts the masculine form', () => {
    expect(checkLanguage('טוב', gendered.hebrew, 'hebrew').correct).toBe(true);
    expect(checkLanguage('منيح', gendered.arabic, 'arabic').correct).toBe(true);
  });

  it('still accepts both forms with alternate answers switched off', () => {
    const strict = { acceptAlternateAnswers: false };
    expect(checkLanguage('טובה', gendered.hebrew, 'hebrew', strict).correct).toBe(true);
    expect(checkLanguage('טוב', gendered.hebrew, 'hebrew', strict).correct).toBe(true);
  });

  it('lists each form once, with no duplicate of the headline word', () => {
    expect(expectedAnswers(gendered.hebrew)).toEqual(['טוב', 'טובה']);
  });

  it('still rejects a wrong answer', () => {
    expect(checkLanguage('רע', gendered.hebrew, 'hebrew').correct).toBe(false);
  });
});

describe('validateAnswer', () => {
  it('keeps the two languages separate rather than collapsing to one flag', () => {
    const result = validateAnswer(card, { hebrew: 'תפוח', arabic: 'خبز' });
    expect(result.hebrew.correct).toBe(true);
    expect(result.arabic.correct).toBe(false);
    expect(result.fullyCorrect).toBe(false);
    expect(result.arabic.submitted).toBe('خبز');
    expect(result.arabic.expected).toContain('تفاحة');
  });

  it('is fully correct only when both languages pass', () => {
    const both = validateAnswer(card, { hebrew: ' תפוח ', arabic: 'تُفاحة' });
    expect(both.hebrew.correct).toBe(true);
    expect(both.arabic.correct).toBe(true);
    expect(both.fullyCorrect).toBe(true);
  });

  it('is not fully correct when only Arabic passes', () => {
    const result = validateAnswer(card, { hebrew: '', arabic: 'تفاحة' });
    expect(result.hebrew.correct).toBe(false);
    expect(result.fullyCorrect).toBe(false);
  });
});
