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

describe('Sentence Building categories', () => {
  const ability: Category = {
    id: 'ability',
    name: 'Saying what you can',
    icon: '',
    order: 30,
    createdAt: T0,
    updatedAt: T0,
  };
  const abilityDecks = [
    ...lot('I can go', 0).map((d) => ({ ...d, categoryId: ability.id })),
    ...lot('I can do it', 1).map((d) => ({ ...d, categoryId: ability.id })),
  ];

  it('opens every chain at once, but keeps the rungs in order', () => {
    // Chains are a library, not a march: she picks any sentence she wants to
    // say next. Inside a chain the language ladder still holds - Hebrew,
    // then Arabic, then both.
    const gates = gateCategoryDecks(ability, abilityDecks, {}, ['hebrew', 'arabic']);
    expect(gates.map((gate) => [gate.deck.id, gate.unlocked])).toEqual([
      ['I can go-he', true],
      ['I can go-ar', false],
      ['I can go-both', false],
      ['I can do it-he', true],
      ['I can do it-ar', false],
      ['I can do it-both', false],
    ]);
  });

  it('opens a chain rung by rung as the one before it is mastered', () => {
    const gates = gateCategoryDecks(
      ability,
      abilityDecks,
      { 'I can go-he': progress('I can go-he', 10) },
      ['hebrew', 'arabic'],
    );
    const open = new Map(gates.map((gate) => [gate.deck.id, gate.unlocked]));
    expect(open.get('I can go-ar')).toBe(true);
    expect(open.get('I can go-both')).toBe(false);
    expect(open.get('I can do it-he')).toBe(true);
  });

  it('never blocks the course, and is never blocked by it', () => {
    // The promise the feature was asked for: sentence work is separately
    // navigable, and finishing or ignoring it moves nothing in Practice.
    const lots = lot('Hello', 0);
    const rows = gateCategories(
      [greetings, ability],
      [...lots, ...abilityDecks],
      // The greetings lot is open and half-done, which locks every *course*
      // category behind it.
      { [lots[0].id]: progress(lots[0].id, 3) },
      ['hebrew', 'arabic'],
    );
    const sentenceRow = rows.find((row) => row.category.id === ability.id);
    expect(sentenceRow?.unlocked).toBe(true);
    expect(sentenceRow?.gated).toBe(false);

    // And the reverse: a half-finished chain makes nothing busy, so a course
    // category she has not opened stays exactly what it was - hers to choose.
    const reversed = gateCategories(
      [greetings, ability],
      [...lots, ...abilityDecks],
      { 'I can go-he': progress('I can go-he', 3) },
      ['hebrew', 'arabic'],
    );
    const greetingsRow = reversed.find((row) => row.category.id === greetings.id);
    expect(greetingsRow?.choosable).toBe(true);
    expect(greetingsRow?.blockedBy).toBeUndefined();
  });
});

describe('Conversation Flow categories', () => {
  const talking: Category = {
    id: 'talking',
    name: 'Answering the question',
    icon: '',
    order: 50,
    createdAt: T0,
    updatedAt: T0,
  };
  const talkingDecks = [
    ...lot('Where, when and why', 0).map((d) => ({ ...d, categoryId: talking.id })),
    ...lot('Who, and with who', 1).map((d) => ({ ...d, categoryId: talking.id })),
  ];

  const sentences: Category = {
    id: 'ability',
    name: 'Saying what you can',
    icon: '',
    order: 30,
    createdAt: T0,
    updatedAt: T0,
  };
  const sentenceDecks = lot('I can go', 0).map((d) => ({
    ...d,
    categoryId: sentences.id,
  }));

  it('opens every exchange at once, but keeps the rungs in order', () => {
    // The same rule the chains follow: she picks the conversation she wants to
    // be able to hold next, and inside it the language ladder still holds.
    const gates = gateCategoryDecks(talking, talkingDecks, {}, ['hebrew', 'arabic']);
    expect(gates.map((gate) => [gate.deck.id, gate.unlocked])).toEqual([
      ['Where, when and why-he', true],
      ['Where, when and why-ar', false],
      ['Where, when and why-both', false],
      ['Who, and with who-he', true],
      ['Who, and with who-ar', false],
      ['Who, and with who-both', false],
    ]);
  });

  it('keeps its progress apart from the course and from Sentence Building', () => {
    // The promise the level was asked for, in every direction at once: a
    // half-finished course lot, a half-finished chain and a half-finished
    // exchange each leave the other two exactly as they were.
    const greetingLot = lot('Hello', 0);
    const decks = [...greetingLot, ...sentenceDecks, ...talkingDecks];

    const busyElsewhere = gateCategories(
      [greetings, sentences, talking],
      decks,
      {
        [greetingLot[0].id]: progress(greetingLot[0].id, 3),
        'I can go-he': progress('I can go-he', 3),
      },
      ['hebrew', 'arabic'],
    );
    const talkingRow = busyElsewhere.find((row) => row.category.id === talking.id);
    expect(talkingRow?.unlocked).toBe(true);
    expect(talkingRow?.gated).toBe(false);
    expect(talkingRow?.blockedBy).toBeUndefined();

    // And the reverse: an exchange in progress makes nothing busy anywhere.
    const busyHere = gateCategories(
      [greetings, sentences, talking],
      decks,
      { 'Where, when and why-he': progress('Where, when and why-he', 3) },
      ['hebrew', 'arabic'],
    );
    expect(
      busyHere.find((row) => row.category.id === greetings.id)?.choosable,
    ).toBe(true);
    expect(
      busyHere.find((row) => row.category.id === sentences.id)?.blockedBy,
    ).toBeUndefined();
  });

  it('does not count a finished exchange towards the course', () => {
    // Mastering every rung completes this category and nothing else: the
    // course category beside it is untouched, and still hers to open.
    const greetingLot = lot('Hello', 0);
    const rows = gateCategories(
      [greetings, talking],
      [...greetingLot, ...talkingDecks],
      Object.fromEntries(talkingDecks.map((d) => [d.id, progress(d.id, 10)])),
      ['hebrew', 'arabic'],
    );

    expect(rows.find((row) => row.category.id === talking.id)?.complete).toBe(true);
    expect(rows.find((row) => row.category.id === greetings.id)?.complete).toBe(
      false,
    );
    expect(rows.find((row) => row.category.id === greetings.id)?.choosable).toBe(
      true,
    );
  });
});
