import { describe, expect, it } from 'vitest';
import type { AlphabetProgress } from '../../types/alphabet';
import { HEBREW_LETTERS } from '../../data/alphabets';
import { emptyAlphabetProgress } from './progress';
import {
  RANGE_SIZE,
  buildLetterDecks,
  deckLetters,
  findLetterDeck,
  singleLetterDeck,
} from './decks';

const NOW = '2026-08-06T12:00:00.000Z';

function row(
  letterId: string,
  overrides: Partial<AlphabetProgress> = {},
): AlphabetProgress {
  return {
    ...emptyAlphabetProgress(letterId, 'hebrew'),
    lastPractisedAt: NOW,
    ...overrides,
  };
}

const noProgress: Record<string, AlphabetProgress | undefined> = {};

describe('buildLetterDecks', () => {
  it('always offers the whole alphabet first', () => {
    const [first] = buildLetterDecks('hebrew', noProgress);
    expect(first.id).toBe('all');
    expect(first.letterIds).toHaveLength(HEBREW_LETTERS.length);
  });

  it('cuts the alphabet into sittings of ten, the last one short', () => {
    const ranges = buildLetterDecks('hebrew', noProgress).filter(
      (deck) => deck.kind === 'range',
    );

    expect(ranges).toHaveLength(Math.ceil(HEBREW_LETTERS.length / RANGE_SIZE));
    expect(ranges[0].letterIds).toHaveLength(RANGE_SIZE);
    expect(ranges.flatMap((deck) => deck.letterIds)).toEqual(
      HEBREW_LETTERS.map((letter) => letter.id),
    );
  });

  it('offers one deck per group of lookalikes', () => {
    const similar = buildLetterDecks('hebrew', noProgress).filter(
      (deck) => deck.kind === 'similar',
    );

    expect(similar.length).toBeGreaterThan(0);
    expect(similar.every((deck) => deck.letterIds.length >= 2)).toBe(true);
    expect(similar.map((deck) => deck.id)).toContain('similar:he-bet-kaf');
  });

  it('hides the mistakes deck from a learner who has not made any', () => {
    const decks = buildLetterDecks('hebrew', noProgress);
    expect(decks.find((deck) => deck.id === 'mistakes')).toBeUndefined();
  });

  it('builds the mistakes deck worst first', () => {
    const progress = {
      bet: row('bet', { incorrectCount: 1 }),
      kaf: row('kaf', { incorrectCount: 5 }),
      alef: row('alef', { incorrectCount: 3 }),
    };

    const mistakes = buildLetterDecks('hebrew', progress).find(
      (deck) => deck.id === 'mistakes',
    )!;

    expect(mistakes.letterIds).toEqual(['kaf', 'alef', 'bet']);
  });

  it('hides the unmastered deck once every letter is mastered', () => {
    const progress = Object.fromEntries(
      HEBREW_LETTERS.map((letter) => [letter.id, row(letter.id, { mastered: true })]),
    );

    const decks = buildLetterDecks('hebrew', progress);
    expect(decks.find((deck) => deck.id === 'unmastered')).toBeUndefined();
  });

  it('lists only the letters still short of confident', () => {
    const progress = { alef: row('alef', { mastered: true }) };
    const unmastered = buildLetterDecks('hebrew', progress).find(
      (deck) => deck.id === 'unmastered',
    )!;

    expect(unmastered.letterIds).not.toContain('alef');
    expect(unmastered.letterIds).toHaveLength(HEBREW_LETTERS.length - 1);
  });
});

describe('findLetterDeck', () => {
  it('finds a listed deck by id', () => {
    expect(findLetterDeck('hebrew', 'range:0', noProgress)?.kind).toBe('range');
  });

  it('rebuilds the mistakes deck from the progress it is given, not a cache', () => {
    const before = findLetterDeck('hebrew', 'mistakes', {
      bet: row('bet', { incorrectCount: 2 }),
    });
    const after = findLetterDeck('hebrew', 'mistakes', noProgress);

    expect(before?.letterIds).toEqual(['bet']);
    expect(after).toBeUndefined();
  });

  it('builds the single-letter deck that a letter page links to', () => {
    const deck = findLetterDeck('hebrew', 'letter:shin', noProgress)!;
    expect(deck.letterIds).toEqual(['shin']);
  });

  it('returns nothing for a letter that does not exist', () => {
    expect(singleLetterDeck('hebrew', 'not-a-letter')).toBeUndefined();
    expect(findLetterDeck('hebrew', 'letter:not-a-letter', noProgress)).toBeUndefined();
  });
});

describe('deckLetters', () => {
  it('returns the records in deck order', () => {
    const deck = singleLetterDeck('hebrew', 'bet')!;
    expect(deckLetters(deck).map((letter) => letter.id)).toEqual(['bet']);
  });

  it('drops an id no longer in the data rather than rendering a hole', () => {
    const deck = { ...singleLetterDeck('hebrew', 'bet')!, letterIds: ['bet', 'ghost'] };
    expect(deckLetters(deck)).toHaveLength(1);
  });
});
