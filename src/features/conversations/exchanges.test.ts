import { describe, expect, it } from 'vitest';
import type { Category, Deck, DeckProgress, Flashcard } from '../../types';
import {
  CONVERSATION_CATEGORIES,
  CONVERSATION_FINAL_TEST_CATEGORY,
} from '../../constants/conversations';
import { SENTENCE_CATEGORY_NAMES } from '../../constants/sentences';
import { GLOSSED_CATEGORIES } from '../../utils/glossary';
import {
  conversationGroups,
  exchangeFinished,
  exchangeTurns,
  exchangesOf,
  finalTestCategory,
  isBranching,
  rungsMastered,
  transcript,
} from './exchanges';

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

function card(
  id: string,
  deckId: string,
  english: string,
  order: number,
  asked?: string,
): Flashcard {
  return {
    id,
    deckId,
    categoryId: 'g1',
    english,
    order,
    hebrew: { script: 'x' },
    arabic: { script: 'x' },
    ...(asked
      ? { cue: { english: asked, hebrew: { script: 'q' }, arabic: { script: 'q' } } }
      : {}),
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

/** The authored cards of one rung, in the shape the pure readers take. */
function turnsOf(deckName: string, groupName: string): Flashcard[] {
  const group = CONVERSATION_CATEGORIES.find((entry) => entry.name === groupName);
  const rung = group?.decks.find((d) => d.name.startsWith(deckName));
  return (rung?.cards ?? []).map((seed, index) =>
    card('x' + index, 'd', seed.english, index, seed.cue?.english),
  );
}

describe('the authored conversation content', () => {
  it('stages every exchange into the three language rungs', () => {
    for (const group of CONVERSATION_CATEGORIES) {
      if (group.name === CONVERSATION_FINAL_TEST_CATEGORY) continue;
      expect(group.decks.length % 3, group.name).toBe(0);
      for (let i = 0; i < group.decks.length; i += 3) {
        expect(group.decks[i].name).toMatch(/ — Hebrew$/);
        expect(group.decks[i + 1].name).toMatch(/ — Palestinian Arabic$/);
        expect(group.decks[i + 2].name).toMatch(/ — Both$/);
      }
    }
  });

  it('asks the same light bar of an exchange that a chain asks', () => {
    for (const group of CONVERSATION_CATEGORIES) {
      if (group.name === CONVERSATION_FINAL_TEST_CATEGORY) continue;
      for (const rung of group.decks) {
        expect(rung.perfectRunsRequired, rung.name).toBe(5);
      }
    }
  });

  it('gives every turn a line to answer', () => {
    // A card with no cue is a sentence, not a turn. It would be dealt with
    // nothing said to it, which is the one thing this level exists to add.
    for (const group of CONVERSATION_CATEGORIES) {
      for (const rung of group.decks) {
        for (const turn of rung.cards) {
          expect(turn.cue?.english, rung.name + ' › ' + turn.english).toBeTruthy();
        }
      }
    }
  });

  it('never answers a question with the question', () => {
    for (const group of CONVERSATION_CATEGORIES) {
      for (const rung of group.decks) {
        for (const turn of rung.cards) {
          expect(turn.english, rung.name).not.toBe(turn.cue?.english);
        }
      }
    }
  });

  it('gives every installed category a name of its own', () => {
    // Two categories sharing a name are not two categories. The areas are told
    // apart by name, and the installer matches by name too, so a duplicate
    // would be installed as a single category holding both levels' decks and
    // would answer yes to both `isSentenceCategory` and
    // `isConversationCategory` — appearing under both levels' screens at once.
    const seen = new Set<string>();
    const clashes: string[] = [];
    for (const group of GLOSSED_CATEGORIES) {
      const name = group.name.toLowerCase();
      if (seen.has(name)) clashes.push(group.name);
      seen.add(name);
    }
    expect(clashes).toEqual([]);

    for (const group of CONVERSATION_CATEGORIES) {
      expect(
        SENTENCE_CATEGORY_NAMES.has(group.name.toLowerCase()),
        group.name,
      ).toBe(false);
    }
  });

  it('deals the final test in batches of ten, ten flawless times', () => {
    const test = CONVERSATION_CATEGORIES.find(
      (group) => group.name === CONVERSATION_FINAL_TEST_CATEGORY,
    );
    expect(test?.decks).toHaveLength(1);
    const testDeck = test!.decks[0];
    expect(testDeck.masteryOnly).toBe(true);
    expect(testDeck.roundSize).toBe(10);
    expect(testDeck.perfectRunsRequired).toBe(10);
    expect(testDeck.studyLanguages).toEqual(['hebrew', 'arabic']);
    // Each English exactly once. A repeat would make the official-word count
    // unreachable, so the starter top-up would run on every single launch.
    const englishes = testDeck.cards.map((c) => c.english);
    expect(new Set(englishes).size).toBe(englishes.length);
    expect(englishes.length).toBeGreaterThan(80);
  });

  it('offers more than one honest answer to the coffee question', () => {
    // The branching promise, pinned: this exchange has to keep answering one
    // question several different ways, or the level quietly goes back to
    // teaching that a prompt has a single correct response.
    const turns = turnsOf('Do you want coffee?', 'Yes, no and in between');
    expect(turns.length).toBeGreaterThan(2);
    expect(isBranching(turns)).toBe(true);
  });

  it('builds a real conversation out of the follow-up exchanges', () => {
    // The opposite shape, and the reason `isBranching` is derived rather than
    // tagged: here each answer meets a different question.
    const turns = turnsOf(
      'Going home, and everything after it',
      'One answer leads to another',
    );
    expect(turns.length).toBeGreaterThan(2);
    expect(isBranching(turns)).toBe(false);
    expect(transcript(turns).filter((line) => line.who === 'theirs').length).toBe(
      turns.length,
    );
  });
});

describe('conversationGroups', () => {
  it('keeps the final test out of the groups list, in order', () => {
    const rows = [
      category('t', CONVERSATION_FINAL_TEST_CATEGORY, 60),
      category('g2', 'Asking back', 52),
      category('g1', 'Answering the question', 51),
      category('s1', 'Saying what you can', 31),
      category('c1', 'Greetings', 2),
    ];
    expect(conversationGroups(rows).map((c) => c.id)).toEqual(['g1', 'g2']);
    expect(finalTestCategory(rows)?.id).toBe('t');
  });
});

describe('an exchange read off its decks', () => {
  const rungs = [
    deck('d1', 'g1', 'Where, when and why — Hebrew', 0),
    deck('d2', 'g1', 'Where, when and why — Palestinian Arabic', 1),
    deck('d3', 'g1', 'Where, when and why — Both', 2),
  ];
  const cards = [
    card('c2', 'd1', 'Tonight', 1, 'When?'),
    card('c1', 'd1', 'Home', 0, 'Where are you going?'),
  ];

  it('folds the three rungs into one exchange and reads turns in order', () => {
    const exchanges = exchangesOf(rungs);
    expect(exchanges).toHaveLength(1);
    expect(exchangeTurns(exchanges[0], cards).map((c) => c.english)).toEqual([
      'Home',
      'Tonight',
    ]);
  });

  it('counts rungs mastered and only calls all three finished', () => {
    const exchange = exchangesOf(rungs)[0];
    const progress = { d1: mastered('d1'), d2: mastered('d2') };
    expect(rungsMastered(exchange, progress)).toBe(2);
    expect(exchangeFinished(exchange, progress)).toBe(false);
    expect(exchangeFinished(exchange, { ...progress, d3: mastered('d3') })).toBe(
      true,
    );
  });
});

describe('transcript', () => {
  it('alternates their line and hers, numbering only her turns', () => {
    const lines = transcript([
      card('c1', 'd1', 'Home', 0, 'Where are you going?'),
      card('c2', 'd1', 'Tonight', 1, 'When?'),
    ]);

    expect(lines.map((line) => [line.who, line.english])).toEqual([
      ['theirs', 'Where are you going?'],
      ['hers', 'Home'],
      ['theirs', 'When?'],
      ['hers', 'Tonight'],
    ]);
    expect(
      lines.flatMap((line) => (line.who === 'hers' ? [line.turn] : [])),
    ).toEqual([1, 2]);
  });

  it('says a repeated question once, however many answers follow it', () => {
    // Four answers to one question is one question asked once, not somebody
    // asking about coffee four times over.
    const asked = 'Do you want coffee?';
    const lines = transcript([
      card('c1', 'd1', 'Yes, please', 0, asked),
      card('c2', 'd1', 'No, thank you', 1, asked),
      card('c3', 'd1', 'I want tea', 2, asked),
    ]);

    expect(lines.filter((line) => line.who === 'theirs')).toHaveLength(1);
    expect(lines.filter((line) => line.who === 'hers')).toHaveLength(3);
  });

  it('asks again when the same question returns after another', () => {
    const lines = transcript([
      card('c1', 'd1', 'Home', 0, 'Where?'),
      card('c2', 'd1', 'Later', 1, 'When?'),
      card('c3', 'd1', 'To the shop', 2, 'Where?'),
    ]);

    expect(lines.filter((line) => line.who === 'theirs')).toHaveLength(3);
  });

  it('carries a turn that answers nothing', () => {
    const lines = transcript([card('c1', 'd1', 'Hello', 0)]);
    expect(lines).toHaveLength(1);
    expect(lines[0].who).toBe('hers');
  });
});

describe('isBranching', () => {
  it('is true only where every answer meets the same question', () => {
    const asked = 'Do you want coffee?';
    expect(
      isBranching([
        card('c1', 'd1', 'Yes, please', 0, asked),
        card('c2', 'd1', 'No, thank you', 1, asked),
      ]),
    ).toBe(true);

    expect(
      isBranching([
        card('c1', 'd1', 'Home', 0, 'Where?'),
        card('c2', 'd1', 'Later', 1, 'When?'),
      ]),
    ).toBe(false);
  });

  it('is false for a single turn, and for turns with nothing asked', () => {
    expect(isBranching([card('c1', 'd1', 'Home', 0, 'Where?')])).toBe(false);
    expect(
      isBranching([card('c1', 'd1', 'Home', 0), card('c2', 'd1', 'Later', 1)]),
    ).toBe(false);
  });
});
