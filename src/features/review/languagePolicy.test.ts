import { describe, expect, it } from 'vitest';
import type { Category, Deck, DeckProgress } from '../../types';
import { gateCategoryDecks, sameStudyLanguages } from './languagePolicy';

const T0 = '2026-01-02T09:00:00.000Z';
const basics: Category = {
  id: 'basics',
  name: 'Basics of Basics',
  icon: '',
  order: 0,
  createdAt: T0,
  updatedAt: T0,
};

function deck(
  id: string,
  name: string,
  order: number,
  language: 'hebrew' | 'arabic',
): Deck {
  return {
    id,
    categoryId: basics.id,
    name,
    order,
    studyLanguages: [language],
    perfectRunsRequired: 10,
    promptDirections: ['en>he+ar'],
    createdAt: T0,
    updatedAt: T0,
  };
}

function progress(deckId: string, perfectRunsCompleted: number): DeckProgress {
  return { deckId, perfectRunsCompleted, hardModeFailures: 0 };
}

describe('gateCategoryDecks', () => {
  it('opens the next Basics lot once the previous Hebrew and Arabic stages are mastered', () => {
    const decks = [
      deck('directions-he', 'Directions — Hebrew', 0, 'hebrew'),
      deck('directions-ar', 'Directions — Palestinian Arabic', 1, 'arabic'),
      deck('questions-he', 'Question words — Hebrew', 2, 'hebrew'),
      deck('questions-ar', 'Question words — Palestinian Arabic', 3, 'arabic'),
    ];

    const gates = gateCategoryDecks(
      basics,
      decks,
      {
        'directions-he': progress('directions-he', 10),
        'directions-ar': progress('directions-ar', 10),
      },
      ['hebrew', 'arabic'],
    );

    expect(gates.map((gate) => [gate.deck.id, gate.unlocked])).toEqual([
      ['directions-he', true],
      ['directions-ar', true],
      ['questions-he', true],
      ['questions-ar', false],
    ]);
    expect(gates.find((gate) => gate.deck.id === 'questions-he')?.blockedBy).toBeUndefined();
  });
});

describe('sameStudyLanguages', () => {
  it('does not resume an old mixed session for a single-language Basics stage', () => {
    expect(sameStudyLanguages(undefined, ['hebrew'])).toBe(false);
    expect(sameStudyLanguages(undefined, ['arabic'])).toBe(false);
  });

  it('still treats a session with no stored language as a both-language run', () => {
    expect(sameStudyLanguages(undefined, ['hebrew', 'arabic'])).toBe(true);
  });
});
