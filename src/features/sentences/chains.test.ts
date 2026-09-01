import { describe, expect, it } from 'vitest';
import type { Category, Deck, DeckProgress, Flashcard } from '../../types';
import {
  SENTENCE_CATEGORIES,
  SENTENCE_FINAL_TEST_CATEGORY,
} from '../../constants/sentences';
import {
  addedPiece,
  chainFinished,
  chainsOf,
  chainSteps,
  finalTestCategory,
  rungsMastered,
  sentenceGroups,
} from './chains';

const NOW = '2026-08-31T10:00:00.000Z';

function category(id: string, name: string, order: number): Category {
  return { id, name, icon: 'x', order, createdAt: NOW, updatedAt: NOW };
}

function deck(id: string, categoryId: string, name: string, order: number): Deck {
  return {
    id,
    categoryId,
    name,
    order,
    perfectRunsRequired: 5,
    promptDirections: ['en>he+ar'],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function card(id: string, deckId: string, english: string, order: number): Flashcard {
  return {
    id,
    deckId,
    categoryId: 'g1',
    english,
    order,
    hebrew: { script: 'x' },
    arabic: { script: 'x' },
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function mastered(deckId: string): DeckProgress {
  return {
    deckId,
    perfectRunsCompleted: 5,
    hardModeFailures: 0,
    lastStudiedAt: NOW,
  };
}

describe('the authored sentence content', () => {
  it('stages every chain into the three language rungs', () => {
    for (const group of SENTENCE_CATEGORIES) {
      if (group.name === SENTENCE_FINAL_TEST_CATEGORY) continue;
      expect(group.decks.length % 3, group.name).toBe(0);
      for (let i = 0; i < group.decks.length; i += 3) {
        expect(group.decks[i].name).toMatch(/ — Hebrew$/);
        expect(group.decks[i + 1].name).toMatch(/ — Palestinian Arabic$/);
        expect(group.decks[i + 2].name).toMatch(/ — Both$/);
      }
    }
  });

  it('asks a lighter bar of a chain than of the course', () => {
    for (const group of SENTENCE_CATEGORIES) {
      if (group.name === SENTENCE_FINAL_TEST_CATEGORY) continue;
      for (const rung of group.decks) {
        expect(rung.perfectRunsRequired, rung.name).toBe(5);
      }
    }
  });

  it('grows or swaps: consecutive steps never merely repeat', () => {
    for (const group of SENTENCE_CATEGORIES) {
      for (const rung of group.decks) {
        for (let i = 1; i < rung.cards.length; i++) {
          expect(
            rung.cards[i].english,
            rung.name,
          ).not.toBe(rung.cards[i - 1].english);
        }
      }
    }
  });

  it('deals the final test in batches of ten, ten flawless times', () => {
    const test = SENTENCE_CATEGORIES.find(
      (group) => group.name === SENTENCE_FINAL_TEST_CATEGORY,
    );
    expect(test?.decks).toHaveLength(1);
    const testDeck = test!.decks[0];
    expect(testDeck.masteryOnly).toBe(true);
    expect(testDeck.roundSize).toBe(10);
    expect(testDeck.perfectRunsRequired).toBe(10);
    expect(testDeck.studyLanguages).toEqual(['hebrew', 'arabic']);
    // The pool is every sentence the chains teach, each exactly once —
    // a duplicate would make the official-word count unreachable and the
    // top-up run on every launch.
    const englishes = testDeck.cards.map((c) => c.english);
    expect(new Set(englishes).size).toBe(englishes.length);
    expect(englishes.length).toBeGreaterThan(100);
  });

  it('stops the "I need help" chain where the sentence is complete', () => {
    const needs = SENTENCE_CATEGORIES.find(
      (group) => group.name === 'Saying what you need',
    );
    const chain = needs?.decks.find((d) => d.name === 'I need help — Hebrew');
    expect(chain?.cards.map((c) => c.english)).toEqual(['I need', 'I need help']);
  });
});

describe('sentenceGroups', () => {
  it('keeps the final test out of the groups list, in order', () => {
    const rows = [
      category('t', SENTENCE_FINAL_TEST_CATEGORY, 40),
      category('g2', 'Saying what you want', 32),
      category('g1', 'Saying what you can', 31),
      category('c1', 'Greetings', 2),
    ];
    expect(sentenceGroups(rows).map((c) => c.id)).toEqual(['g1', 'g2']);
    expect(finalTestCategory(rows)?.id).toBe('t');
  });
});

describe('a chain read off its decks', () => {
  const rungs = [
    deck('d1', 'g1', 'I need help — Hebrew', 0),
    deck('d2', 'g1', 'I need help — Palestinian Arabic', 1),
    deck('d3', 'g1', 'I need help — Both', 2),
  ];
  const cards = [
    card('c2', 'd1', 'I need help', 1),
    card('c1', 'd1', 'I need', 0),
  ];

  it('folds the three rungs into one chain and reads steps in order', () => {
    const chains = chainsOf(rungs);
    expect(chains).toHaveLength(1);
    expect(chainSteps(chains[0], cards).map((c) => c.english)).toEqual([
      'I need',
      'I need help',
    ]);
  });

  it('counts rungs mastered and only calls all three finished', () => {
    const chain = chainsOf(rungs)[0];
    const progress = { d1: mastered('d1'), d2: mastered('d2') };
    expect(rungsMastered(chain, progress)).toBe(2);
    expect(chainFinished(chain, progress)).toBe(false);
    expect(
      chainFinished(chain, { ...progress, d3: mastered('d3') }),
    ).toBe(true);
  });
});

describe('addedPiece', () => {
  it('reads the added words off a plain extension', () => {
    expect(addedPiece('I can', 'I can go')).toBe('go');
    expect(addedPiece('I can go there', 'I can go there tomorrow morning')).toBe(
      'tomorrow morning',
    );
  });

  it('refuses a boundary inside a word', () => {
    // "I can't" starts like "I can" but adds nothing - it changes the verb.
    expect(addedPiece('I can', "I can't")).toBeUndefined();
  });

  it('reads a substitution as no addition', () => {
    expect(addedPiece('I want water', 'I want coffee')).toBeUndefined();
  });

  it('has nothing to say about the first step', () => {
    expect(addedPiece(undefined, 'I can')).toBeUndefined();
  });
});
