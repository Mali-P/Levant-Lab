import { describe, expect, it } from 'vitest';
import { wordForms } from './wordForms';
import { CUSTOM_CATEGORY, CUSTOM_DECK, SEED_CATEGORIES } from '../constants/seed';

describe('wordForms', () => {
  it('returns one unmarked form when a word has no gendered pair', () => {
    const forms = wordForms({ script: 'מים', transliteration: 'mayim' });
    expect(forms).toEqual([{ script: 'מים', transliteration: 'mayim' }]);
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
    expect(SEED_CATEGORIES).toHaveLength(20);
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

  it('keeps the headline word in step with the masculine form', () => {
    for (const card of cards) {
      for (const side of [card.hebrew, card.arabic]) {
        if (!side.forms) continue;
        expect(side.script, card.english).toBe(side.forms.masculine.script);
        expect(side.transliteration, card.english).toBe(
          side.forms.masculine.transliteration,
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
