import { describe, expect, it } from 'vitest';
import type { Category, Deck, DeckProgress, Language } from '../../types';
import {
  gateCategories,
  gateCategoryDecks,
  sameStudyLanguages,
  sortByFinished,
} from './languagePolicy';

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

const greetings: Category = {
  id: 'greetings',
  name: 'Greetings',
  icon: '',
  order: 1,
  createdAt: T0,
  updatedAt: T0,
};

/** The three rungs of one lot, in a category the course gates. */
function lot(base: string, order: number): Deck[] {
  const rung = (stage: 'he' | 'ar' | 'both', language: Language[], step: number): Deck => ({
    id: base + '-' + stage,
    categoryId: greetings.id,
    name:
      base +
      ' — ' +
      (stage === 'he' ? 'Hebrew' : stage === 'ar' ? 'Palestinian Arabic' : 'Both'),
    order: order * 3 + step,
    studyLanguages: language,
    perfectRunsRequired: 10,
    promptDirections: ['en>he+ar'],
    createdAt: T0,
    updatedAt: T0,
  });
  return [
    rung('he', ['hebrew'], 0),
    rung('ar', ['arabic'], 1),
    rung('both', ['hebrew', 'arabic'], 2),
  ];
}

function progress(deckId: string, perfectRunsCompleted: number): DeckProgress {
  return { deckId, perfectRunsCompleted, hardModeFailures: 0 };
}

function bothDeck(id: string, name: string, order: number): Deck {
  return { ...deck(id, name, order, 'hebrew'), studyLanguages: ['hebrew', 'arabic'] as Language[] };
}

describe('gateCategoryDecks', () => {
  const basicsDecks = [
    deck('directions-he', 'Directions — Hebrew', 0, 'hebrew'),
    deck('directions-ar', 'Directions — Palestinian Arabic', 1, 'arabic'),
    bothDeck('directions-both', 'Directions — Both', 2),
    deck('questions-he', 'Question words — Hebrew', 3, 'hebrew'),
    deck('questions-ar', 'Question words — Palestinian Arabic', 4, 'arabic'),
  ];

  it('leaves the whole of Basics open, lot and stage alike', () => {
    // Basics is the ground floor. She dips into whichever lot and whichever
    // language she needs, with nothing behind a gate.
    const gates = gateCategoryDecks(basics, basicsDecks, {}, ['hebrew', 'arabic']);

    expect(gates.map((gate) => [gate.deck.id, gate.unlocked])).toEqual([
      ['directions-he', true],
      ['directions-ar', true],
      ['directions-both', true],
      ['questions-he', true],
      ['questions-ar', true],
    ]);
  });

  it('opens a stageless Basics deck along with the rest of Basics', () => {
    // The shape a device seeded before the language split ends up in while its
    // old deck is still standing beside the stages.
    const spare: Deck = {
      ...deck('questions-old', 'Question words', 4, 'hebrew'),
      studyLanguages: undefined,
    };

    const gates = gateCategoryDecks(basics, [...basicsDecks, spare], {}, [
      'hebrew',
      'arabic',
    ]);

    expect(gates.every((gate) => gate.unlocked)).toBe(true);
  });

  it('offers every lot of a gated category until one is opened', () => {
    const decks = [...lot('Hello', 0), ...lot('Times of day', 1)];
    const gates = gateCategoryDecks(greetings, decks, {}, ['hebrew', 'arabic']);

    // Nothing is open, so nothing is studyable — but the first rung of each lot
    // carries the choice, and she may take either.
    expect(gates.some((gate) => gate.unlocked)).toBe(false);
    expect(gates.filter((gate) => gate.choosable).map((gate) => gate.deck.id)).toEqual([
      'Hello-he',
      'Times of day-he',
    ]);
  });

  it('holds every other lot once one is opened, whichever she picked', () => {
    const decks = [...lot('Hello', 0), ...lot('Times of day', 1)];
    // She skipped the first and opened the second.
    const gates = gateCategoryDecks(greetings, decks, {}, ['hebrew', 'arabic'], {
      deckIds: ['Times of day-he'],
    });

    expect(gates.filter((gate) => gate.unlocked).map((gate) => gate.deck.id)).toEqual([
      'Times of day-he',
    ]);
    expect(gates.some((gate) => gate.choosable)).toBe(false);
    expect(gates.find((gate) => gate.deck.id === 'Hello-he')?.blockedBy?.id).toBe(
      'Times of day-he',
    );
  });

  it('walks the rungs of an open lot in order: Hebrew, Arabic, then both', () => {
    const decks = lot('Hello', 0);
    const opened = { deckIds: ['Hello-he'] };

    const first = gateCategoryDecks(greetings, decks, {}, ['hebrew', 'arabic'], opened);
    expect(first.map((gate) => gate.unlocked)).toEqual([true, false, false]);

    const afterHebrew = gateCategoryDecks(
      greetings,
      decks,
      { 'Hello-he': progress('Hello-he', 10) },
      ['hebrew', 'arabic'],
      opened,
    );
    expect(afterHebrew.map((gate) => gate.unlocked)).toEqual([true, true, false]);

    const afterArabic = gateCategoryDecks(
      greetings,
      decks,
      {
        'Hello-he': progress('Hello-he', 10),
        'Hello-ar': progress('Hello-ar', 10),
      },
      ['hebrew', 'arabic'],
      opened,
    );
    expect(afterArabic.map((gate) => gate.unlocked)).toEqual([true, true, true]);
  });

  it('hands the choice back once a lot is finished in both languages', () => {
    const decks = [...lot('Hello', 0), ...lot('Times of day', 1)];
    const done = Object.fromEntries(
      ['Hello-he', 'Hello-ar', 'Hello-both'].map((id) => [id, progress(id, 10)]),
    );

    const gates = gateCategoryDecks(greetings, decks, done, ['hebrew', 'arabic'], {
      deckIds: ['Hello-he'],
    });

    // The finished lot stays open for revision, and the unfinished one is hers
    // to choose again.
    expect(gates.filter((gate) => gate.unlocked).map((gate) => gate.deck.id)).toEqual([
      'Hello-he',
      'Hello-ar',
      'Hello-both',
    ]);
    expect(gates.find((gate) => gate.deck.id === 'Times of day-he')?.choosable).toBe(
      true,
    );
  });

  it('counts a lot finished only when Arabic is done as well as Hebrew', () => {
    const decks = [...lot('Hello', 0), ...lot('Times of day', 1)];
    const halfway = {
      'Hello-he': progress('Hello-he', 10),
      'Hello-ar': progress('Hello-ar', 10),
    };

    const gates = gateCategoryDecks(greetings, decks, halfway, ['hebrew', 'arabic'], {
      deckIds: ['Hello-he'],
    });

    expect(gates.find((gate) => gate.deck.id === 'Hello-both')?.lotComplete).toBe(false);
    expect(gates.find((gate) => gate.deck.id === 'Times of day-he')?.choosable).toBe(
      false,
    );
  });
});

describe('gateCategories', () => {
  const decks = [
    deck('directions-he', 'Directions — Hebrew', 0, 'hebrew'),
    ...lot('Hello', 0),
  ];

  it('keeps Basics open and offers every gated category until one is picked', () => {
    const entries = gateCategories([basics, greetings], decks, {}, [
      'hebrew',
      'arabic',
    ]);

    const basicsGate = entries.find((e) => e.category.id === 'basics')!;
    expect(basicsGate.gated).toBe(false);
    expect(basicsGate.unlocked).toBe(true);

    const greetingsGate = entries.find((e) => e.category.id === 'greetings')!;
    expect(greetingsGate.unlocked).toBe(false);
    expect(greetingsGate.choosable).toBe(true);
  });

  it('opens the category she chose and shuts the rest', () => {
    const other: Category = { ...greetings, id: 'phrases', name: 'Phrases', order: 2 };
    const phraseDecks = lot('Please', 0).map((d) => ({ ...d, categoryId: other.id }));

    const entries = gateCategories(
      [basics, greetings, other],
      [...decks, ...phraseDecks],
      {},
      ['hebrew', 'arabic'],
      { categoryIds: ['greetings'] },
    );

    expect(entries.find((e) => e.category.id === 'greetings')?.unlocked).toBe(true);
    const shut = entries.find((e) => e.category.id === 'phrases')!;
    expect(shut.unlocked).toBe(false);
    expect(shut.choosable).toBe(false);
    expect(shut.blockedBy?.id).toBe('greetings');
    // Nothing inside a shut category is studyable either.
    expect(shut.gates.every((gate) => !gate.unlocked)).toBe(true);
  });
});

describe('sortByFinished', () => {
  const items = [
    { id: 'a', done: false },
    { id: 'b', done: true },
    { id: 'c', done: false },
    { id: 'd', done: true },
  ];
  const done = (item: { done: boolean }) => item.done;

  it('leaves the course order alone by default', () => {
    expect(sortByFinished(items, done, 'course').map((i) => i.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('gathers finished work at either end, consecutively', () => {
    expect(sortByFinished(items, done, 'first').map((i) => i.id)).toEqual([
      'b',
      'd',
      'a',
      'c',
    ]);
    expect(sortByFinished(items, done, 'last').map((i) => i.id)).toEqual([
      'a',
      'c',
      'b',
      'd',
    ]);
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
