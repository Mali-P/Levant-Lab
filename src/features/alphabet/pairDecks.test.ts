import { describe, expect, it } from 'vitest';
import {
  ARABIC_LETTERS,
  HEBREW_LETTERS,
  LETTER_PAIRS,
  pairLetters,
} from '../../data/alphabets';
import {
  PAIR_DECK_SIZE,
  RUNS_TO_UNLOCK,
  buildPairDecks,
  deckPairs,
  findPairDeck,
  gatePairDecks,
  nextPairDeck,
  recordPairRun,
} from './pairDecks';

describe('LETTER_PAIRS', () => {
  it('names only letters this build actually ships', () => {
    for (const pair of LETTER_PAIRS) {
      const { hebrew, arabic } = pairLetters(pair);
      if (pair.hebrewId) expect(hebrew, pair.id + ' hebrew').toBeDefined();
      if (pair.arabicId) expect(arabic, pair.id + ' arabic').toBeDefined();
      expect(hebrew ?? arabic, pair.id + ' has neither half').toBeDefined();
    }
  });

  it('accounts for every letter of both alphabets exactly once', () => {
    const hebrewIds = LETTER_PAIRS.map((pair) => pair.hebrewId).filter(Boolean);
    const arabicIds = LETTER_PAIRS.map((pair) => pair.arabicId).filter(Boolean);

    expect(new Set(hebrewIds).size).toBe(hebrewIds.length);
    expect(new Set(arabicIds).size).toBe(arabicIds.length);
    expect(hebrewIds).toHaveLength(HEBREW_LETTERS.length);
    expect(arabicIds).toHaveLength(ARABIC_LETTERS.length);
  });

  it('carries unique ids in an unbroken order', () => {
    expect(new Set(LETTER_PAIRS.map((pair) => pair.id)).size).toBe(
      LETTER_PAIRS.length,
    );
    expect(LETTER_PAIRS.map((pair) => pair.order)).toEqual(
      LETTER_PAIRS.map((_pair, i) => i + 1),
    );
  });

  it('leaves the six Arabic-only letters without a Hebrew half, and no others', () => {
    const alone = LETTER_PAIRS.filter((pair) => !pair.hebrewId);
    expect(alone.map((pair) => pair.arabicId)).toEqual([
      'tha',
      'kha',
      'dhal',
      'dad',
      'za',
      'ghain',
    ]);
  });
});

describe('buildPairDecks', () => {
  it('cuts the pairs into sittings of ten, the last one short', () => {
    const decks = buildPairDecks();

    expect(decks).toHaveLength(Math.ceil(LETTER_PAIRS.length / PAIR_DECK_SIZE));
    expect(
      decks.slice(0, -1).every((deck) => deck.pairIds.length === PAIR_DECK_SIZE),
    ).toBe(true);
    expect(decks.flatMap((deck) => deck.pairIds)).toEqual(
      LETTER_PAIRS.map((pair) => pair.id),
    );
  });

  it('counts the letterforms in a deck, not the pairs', () => {
    const [first] = buildPairDecks();
    // Ten pairs, both halves present: twenty letters on the screen.
    expect(first.letterCount).toBe(20);
    expect(first.position).toBe(1);
  });

  it('finds a deck by id and rebuilds its pairs', () => {
    const deck = findPairDeck('pairs:0');
    expect(deck).toBeDefined();
    expect(deckPairs(deck!)).toHaveLength(PAIR_DECK_SIZE);
    expect(findPairDeck('pairs:nope')).toBeUndefined();
  });
});

describe('gatePairDecks', () => {
  it('opens the first deck and nothing else to begin with', () => {
    const gates = gatePairDecks({});

    expect(gates[0].unlocked).toBe(true);
    expect(gates.slice(1).every((gate) => gate.unlocked)).toBe(false);
    expect(gates[1].blockedBy?.id).toBe(gates[0].deck.id);
    expect(nextPairDeck(gates)?.deck.id).toBe('pairs:0');
  });

  it('opens the next deck once the one before it has been run clean', () => {
    const gates = gatePairDecks({ 'pairs:0': RUNS_TO_UNLOCK });

    expect(gates[0].passed).toBe(true);
    expect(gates[1].unlocked).toBe(true);
    expect(gates[1].blockedBy).toBeUndefined();
    expect(gates[2]?.unlocked).toBe(false);
    expect(nextPairDeck(gates)?.deck.id).toBe('pairs:10');
  });

  it('keeps a deck open on a later miss, since a pass cannot be undone', () => {
    // Runs only ever go up, so the far end of the ladder stays reachable.
    const gates = gatePairDecks({ 'pairs:0': 3, 'pairs:10': 1 });
    expect(gates.every((gate) => gate.unlocked)).toBe(true);
  });
});

describe('recordPairRun', () => {
  it('banks a flawless run', () => {
    expect(recordPairRun({}, 'pairs:0', true)).toEqual({ 'pairs:0': 1 });
    expect(recordPairRun({ 'pairs:0': 1 }, 'pairs:0', true)).toEqual({
      'pairs:0': 2,
    });
  });

  it('leaves a run with a miss in it alone', () => {
    expect(recordPairRun({ 'pairs:0': 1 }, 'pairs:10', false)).toEqual({
      'pairs:0': 1,
    });
  });

  it('drops keys a stored row left undefined rather than writing them back', () => {
    expect(recordPairRun({ 'pairs:0': undefined }, 'pairs:0', true)).toEqual({
      'pairs:0': 1,
    });
  });
});
