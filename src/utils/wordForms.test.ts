import { describe, expect, it } from 'vitest';
import { wordForms } from './wordForms';
import { expectedAnswers } from '../services/answerValidation';
import { CUSTOM_CATEGORY, CUSTOM_DECK, SEED_CATEGORIES } from '../constants/seed';
import type { LanguageSide } from '../types';

/** "How are you?" — the ending follows the listener, not the speaker. */
const HOW_ARE_YOU: LanguageSide = {
  script: 'كيفك',
  transliteration: 'kīfak',
  speechForms: {
    femaleToMale: { script: 'كيفك', transliteration: 'kīfak' },
    femaleToFemale: { script: 'كيفك', transliteration: 'kīfik' },
    maleToFemale: { sameAs: 'femaleToFemale' },
    maleToMale: { sameAs: 'femaleToMale' },
  },
};

describe('speaker and listener perspectives', () => {
  it('leads with the female-speaker form whatever order the setting is in', () => {
    const forms = wordForms(HOW_ARE_YOU, ['maleToMale', 'femaleToFemale', 'femaleToMale']);
    expect(forms.map((f) => f.transliteration)).toEqual(['kīfak', 'kīfik']);
  });

  it('collapses perspectives that share a wording into one form', () => {
    // ♀→♂ and ♂→♂ are the same words, so they are one line carrying both
    // markers rather than two identical lines.
    const forms = wordForms(HOW_ARE_YOU, ['femaleToMale', 'maleToMale']);
    expect(forms).toHaveLength(1);
    expect(forms[0].perspectives).toEqual(['femaleToMale', 'maleToMale']);
    expect(forms[0].marker).toBeUndefined();
  });

  it('marks a form only when there is another form to tell it from', () => {
    const forms = wordForms(HOW_ARE_YOU, ['femaleToMale', 'femaleToFemale']);
    expect(forms.map((f) => f.marker)).toEqual(['♀→♂', '♀→♀']);
  });

  it('grades only against the perspectives the learner enabled', () => {
    const onlyToMen = expectedAnswers(HOW_ARE_YOU, { perspectives: ['femaleToMale'] });
    // Written identically, so the script is all that can be checked — what
    // matters is that no *extra* wording sneaks in from a perspective she has
    // not turned on.
    expect(onlyToMen).toEqual(['كيفك']);
  });

  it('skips a perspective a phrase is not said in', () => {
    const forms = wordForms(
      {
        script: 'x',
        speechForms: {
          femaleToMale: { script: 'x' },
          femaleToFemale: { notApplicable: true },
        },
      },
      ['femaleToMale', 'femaleToFemale'],
    );
    expect(forms).toHaveLength(1);
  });

  it('falls back to the word itself rather than looping on a circular sameAs', () => {
    const forms = wordForms(
      {
        script: 'base',
        speechForms: {
          femaleToMale: { sameAs: 'femaleToFemale' },
          femaleToFemale: { sameAs: 'femaleToMale' },
        },
      },
      ['femaleToMale', 'femaleToFemale'],
    );
    expect(forms.map((f) => f.script)).toEqual(['base']);
  });
});

describe('wordForms', () => {
  it('returns one unmarked form when a word has no gendered pair', () => {
    const forms = wordForms({ script: 'מים', transliteration: 'mayim' });
    expect(forms).toEqual([
      {
        script: 'מים',
        transliteration: 'mayim',
        key: 'only',
        audioPath: undefined,
        pronunciationText: undefined,
      },
    ]);
  });

  it('returns the feminine form first, then the masculine', () => {
    const forms = wordForms({
      script: 'טוב',
      transliteration: 'tov',
      forms: {
        feminine: { script: 'טובה', transliteration: 'tova' },
        masculine: { script: 'טוב', transliteration: 'tov' },
      },
    });
    expect(forms.map((f) => f.gender)).toEqual(['feminine', 'masculine']);
    expect(forms.map((f) => f.script)).toEqual(['טובה', 'טוב']);
    expect(forms.map((f) => f.marker)).toEqual(['♀', '♂']);
  });
});

describe('starter cards', () => {
  const cards = SEED_CATEGORIES.flatMap((category) =>
    category.decks.flatMap((deck) => deck.cards),
  );

  it('ships every taught category with full decks', () => {
    expect(SEED_CATEGORIES).toHaveLength(24);
    // Custom is the learner's own and grows from inside the app, so it is the
    // one category not held to a full ten.
    for (const category of SEED_CATEGORIES.filter((c) => c.name !== CUSTOM_CATEGORY)) {
      expect(category.decks.length, category.name).toBeGreaterThan(0);
      for (const deck of category.decks) {
        expect(deck.cards, category.name + ' / ' + deck.name).toHaveLength(10);
      }
    }
  });

  it('opens the custom category with the sentences written by hand', () => {
    const custom = SEED_CATEGORIES.find((c) => c.name === CUSTOM_CATEGORY)!;
    expect(custom.decks.map((d) => d.name)).toEqual([CUSTOM_DECK]);
    expect(custom.decks[0].cards.map((c) => c.english)).toEqual([
      'hi',
      'how are you, mom?',
      'my name is Mali',
      'I want to help you at your home, mom',
      'do you want?',
      'may I ask — are you Jewish or Arab?',
      'do you speak Hebrew?',
      'do you speak Arabic?',
      'do you speak English?',
    ]);
  });

  it('counts from one to a hundred, ten to a deck', () => {
    const numbers = SEED_CATEGORIES.find((c) => c.name === 'Counting and numbers')!;
    expect(numbers.decks.map((d) => d.name)).toEqual([
      'One to ten',
      'Eleven to twenty',
      'Twenty-one to thirty',
      'Thirty-one to forty',
      'Forty-one to fifty',
      'Fifty-one to sixty',
      'Sixty-one to seventy',
      'Seventy-one to eighty',
      'Eighty-one to ninety',
      'Ninety-one to one hundred',
    ]);

    const last = numbers.decks.at(-1)!.cards;
    expect(last[0].english).toBe('ninety-one');
    expect(last[0].hebrew.forms?.feminine.script).toBe('תשעים ואחת');
    expect(last[0].arabic.script).toBe('واحد وتسعين');
    expect(last.at(-1)!.english).toBe('one hundred');
  });

  it('gives every card a word on both sides', () => {
    for (const card of cards) {
      expect(card.english.length, card.english).toBeGreaterThan(0);
      expect(card.hebrew.script.length, card.english).toBeGreaterThan(0);
      expect(card.arabic.script.length, card.english).toBeGreaterThan(0);
    }
  });

  it('keeps the headline word in step with the feminine form', () => {
    for (const card of cards) {
      for (const side of [card.hebrew, card.arabic]) {
        if (!side.forms) continue;
        expect(side.script, card.english).toBe(side.forms.feminine.script);
        expect(side.transliteration, card.english).toBe(
          side.forms.feminine.transliteration,
        );
      }
    }
  });

  it('only splits a word when the two forms actually differ', () => {
    for (const card of cards) {
      for (const side of [card.hebrew, card.arabic]) {
        if (!side.forms) continue;
        const { feminine, masculine } = side.forms;
        expect(
          feminine.script !== masculine.script ||
            feminine.transliteration !== masculine.transliteration,
          card.english,
        ).toBe(true);
      }
    }
  });

  it('teaches Palestinian Arabic throughout', () => {
    for (const card of cards) {
      expect(card.arabic.dialect, card.english).toBe('Palestinian');
    }
  });
});
