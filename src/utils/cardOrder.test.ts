import { describe, expect, it } from 'vitest';
import type { Flashcard } from '../types';
import { sortCards } from './cardOrder';

function card(english: string, order?: number, createdAt = '2026-01-01T00:00:00.000Z'): Flashcard {
  return {
    id: 'card_' + english,
    categoryId: 'cat',
    deckId: 'deck',
    english,
    order,
    hebrew: { script: '' },
    arabic: { script: '' },
    createdAt,
    updatedAt: createdAt,
  };
}

describe('sortCards', () => {
  it('reads a counting deck in its seeded order, whatever order the rows arrive in', () => {
    const sorted = sortCards([card('three', 2), card('one', 0), card('two', 1)]);
    expect(sorted.map((c) => c.english)).toEqual(['one', 'two', 'three']);
  });

  it('puts the learner’s own unordered cards after the starter words, oldest first', () => {
    const sorted = sortCards([
      card('mine (new)', undefined, '2026-03-01T00:00:00.000Z'),
      card('one', 0),
      card('mine (old)', undefined, '2026-02-01T00:00:00.000Z'),
    ]);
    expect(sorted.map((c) => c.english)).toEqual(['one', 'mine (old)', 'mine (new)']);
  });

  it('leaves the input array alone', () => {
    const input = [card('two', 1), card('one', 0)];
    sortCards(input);
    expect(input.map((c) => c.english)).toEqual(['two', 'one']);
  });
});
