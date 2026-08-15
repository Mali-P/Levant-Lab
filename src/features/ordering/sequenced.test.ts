import { describe, expect, it } from 'vitest';
import type { Category, Deck } from '../../types';
import { isSequencedDeck } from './sequenced';

const categories = [
  category('basics', 'Basics of Basics'),
  category('numbers', 'Counting and numbers'),
  category('greetings', 'Greetings'),
];

function category(id: string, name: string): Category {
  return {
    id,
    name,
    icon: '',
    order: 0,
    createdAt: '',
    updatedAt: '',
  };
}

function deck(name: string, categoryId: string): Deck {
  return {
    id: name,
    categoryId,
    name,
    perfectRunsRequired: 1,
    promptDirections: [],
    createdAt: '',
    updatedAt: '',
  };
}

describe('isSequencedDeck', () => {
  it('allows every counting deck through to ordering', () => {
    expect(isSequencedDeck(deck('One to ten', 'numbers'), categories)).toBe(true);
  });

  it('allows the ordered basics decks in every staged language form', () => {
    expect(isSequencedDeck(deck('Question words — Hebrew', 'basics'), categories)).toBe(true);
    expect(isSequencedDeck(deck('Days of the week — Palestinian Arabic', 'basics'), categories)).toBe(true);
    expect(isSequencedDeck(deck('Days of the week — Both', 'basics'), categories)).toBe(true);
  });

  it('leaves unordered basics and ordinary vocabulary alone', () => {
    expect(isSequencedDeck(deck('Colours — Hebrew', 'basics'), categories)).toBe(false);
    expect(isSequencedDeck(deck('Hello and goodbye', 'greetings'), categories)).toBe(false);
  });
});
