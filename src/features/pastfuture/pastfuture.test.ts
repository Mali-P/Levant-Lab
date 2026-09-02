import { describe, expect, it } from 'vitest';
import type { Category, Deck, DeckProgress, Flashcard } from '../../types';
import {
  PAST_FUTURE_CATEGORIES,
  PAST_FUTURE_CONTRAST_CATEGORY,
  PAST_FUTURE_FINAL_TEST_CATEGORY,
  SECTION_BANDS,
  TENSE_TRIADS,
} from '../../constants/pastfuture';
import { SENTENCE_CATEGORY_NAMES } from '../../constants/sentences';
import { CONVERSATION_CATEGORY_NAMES } from '../../constants/conversations';
import { SITUATION_CATEGORY_NAMES } from '../../constants/situations';
import { isStandaloneLevel } from '../review/languagePolicy';
import {
  bandOf,
  contrastCategory,
  finalTestCategory,
  lessonFinished,
  lessonLines,
  lessonsOf,
  levelProgress,
  pastFutureSections,
  rungsMastered,
  tensesUnlocked,
} from './pastfuture';

const NOW = '2026-09-01T10:00:00.000Z';

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

describe('the authored past and future content', () => {
  it('stages every lesson into the three language rungs', () => {
    for (const section of PAST_FUTURE_CATEGORIES) {
      if (section.name === PAST_FUTURE_FINAL_TEST_CATEGORY) continue;
      expect(section.decks.length % 3, section.name).toBe(0);
      for (let i = 0; i < section.decks.length; i += 3) {
        expect(section.decks[i].name).toMatch(/ — Hebrew$/);
        expect(section.decks[i + 1].name).toMatch(/ — Palestinian Arabic$/);
        expect(section.decks[i + 2].name).toMatch(/ — Both$/);
      }
    }
  });

  it('asks the same light bar of a lesson that a chain asks', () => {
    for (const section of PAST_FUTURE_CATEGORIES) {
      if (section.name === PAST_FUTURE_FINAL_TEST_CATEGORY) continue;
      for (const rung of section.decks) {
        expect(rung.perfectRunsRequired, rung.name).toBe(5);
      }
    }
  });

  it('gives every installed section a name no other area owns', () => {
    // The areas are told apart by name, and the installer matches by name too,
    // so a duplicate would be installed as a single category holding two
    // levels' decks and would appear under both levels' screens at once.
    for (const section of PAST_FUTURE_CATEGORIES) {
      const name = section.name.toLowerCase();
      expect(SENTENCE_CATEGORY_NAMES.has(name), section.name).toBe(false);
      expect(CONVERSATION_CATEGORY_NAMES.has(name), section.name).toBe(false);
      expect(SITUATION_CATEGORY_NAMES.has(name), section.name).toBe(false);
    }
  });

  it('counts as a standalone level, so it gates nothing and nothing gates it', () => {
    for (const section of PAST_FUTURE_CATEGORIES) {
      expect(isStandaloneLevel({ name: section.name }), section.name).toBe(true);
    }
  });

  it('places every section on the timeline', () => {
    // A section with no band would fall through to "past" and be filed under
    // the wrong heading on the hub, which is the one thing that screen says.
    for (const section of PAST_FUTURE_CATEGORIES) {
      if (section.name === PAST_FUTURE_FINAL_TEST_CATEGORY) continue;
      expect(SECTION_BANDS.has(section.name.toLowerCase()), section.name).toBe(
        true,
      );
    }
  });

  it('never writes a gendered pair on a first-person past verb', () => {
    // Both languages say halakhti and ruḥt one way for everybody. A pair here
    // would be manufacturing a distinction and then teaching it. The lesson
    // swept is the plain past one; the states ("I was tired") genuinely are
    // gendered, in the adjective rather than the verb, and live elsewhere.
    const plainPast = PAST_FUTURE_CATEGORIES.find(
      (section) => section.name === 'What I did',
    );
    const rung = plainPast?.decks.find((d) => d.name === 'The first ten — Hebrew');
    expect(rung?.cards.length).toBe(10);
    for (const entry of rung?.cards ?? []) {
      expect(entry.hebrew.forms, entry.english).toBeUndefined();
      expect(entry.arabic.forms, entry.english).toBeUndefined();
    }
  });

  it('gives every question lesson a line for its answers to answer', () => {
    const asking = PAST_FUTURE_CATEGORIES.find(
      (section) => section.name === 'Asking about yesterday',
    );
    expect(asking?.decks.length).toBeGreaterThan(0);
    for (const rung of asking?.decks ?? []) {
      for (const entry of rung.cards) {
        expect(entry.cue?.english, rung.name + ' › ' + entry.english).toBeTruthy();
        expect(entry.english, rung.name).not.toBe(entry.cue?.english);
      }
    }
  });

  it('builds the contrast decks out of the triads, so the two cannot drift', () => {
    const contrast = PAST_FUTURE_CATEGORIES.find(
      (section) => section.name === PAST_FUTURE_CONTRAST_CATEGORY,
    );
    const yesterday = contrast?.decks.find(
      (d) => d.name === 'Yesterday I … — Hebrew',
    );
    const tomorrow = contrast?.decks.find(
      (d) => d.name === 'Tomorrow I … — Hebrew',
    );
    expect(yesterday?.cards.map((entry) => entry.english)).toEqual(
      TENSE_TRIADS.map((triad) => triad.past.english),
    );
    expect(tomorrow?.cards.map((entry) => entry.english)).toEqual(
      TENSE_TRIADS.map((triad) => triad.future.english),
    );
  });

  it('gives every triad three genuinely different lines', () => {
    for (const triad of TENSE_TRIADS) {
      const englishes = [
        triad.past.english,
        triad.present.english,
        triad.future.english,
      ];
      expect(new Set(englishes).size, triad.idea).toBe(3);
      const hebrew = [
        triad.past.hebrew.script,
        triad.present.hebrew.script,
        triad.future.hebrew.script,
      ];
      expect(new Set(hebrew).size, triad.idea + ' (hebrew)').toBe(3);
      const arabic = [
        triad.past.arabic.script,
        triad.present.arabic.script,
        triad.future.arabic.script,
      ];
      expect(new Set(arabic).size, triad.idea + ' (arabic)').toBe(3);
    }
  });

  it('deals the final test in batches of ten, ten flawless times', () => {
    const test = PAST_FUTURE_CATEGORIES.find(
      (section) => section.name === PAST_FUTURE_FINAL_TEST_CATEGORY,
    );
    expect(test?.decks).toHaveLength(1);
    const testDeck = test!.decks[0];
    expect(testDeck.masteryOnly).toBe(true);
    expect(testDeck.roundSize).toBe(10);
    expect(testDeck.perfectRunsRequired).toBe(10);
    expect(testDeck.studyLanguages).toEqual(['hebrew', 'arabic']);
    // Each English exactly once. A repeat would make the official-word count
    // unreachable, so the starter top-up would run on every single launch.
    const englishes = testDeck.cards.map((entry) => entry.english);
    expect(new Set(englishes).size).toBe(englishes.length);
    expect(englishes.length).toBeGreaterThan(100);
  });
});

describe('reading the level off its installed rows', () => {
  const rows = [
    category('t', PAST_FUTURE_FINAL_TEST_CATEGORY, 90),
    category('s2', 'Tomorrow and after', 82),
    category('s1', 'Yesterday and before', 81),
    category('c1', 'Greetings', 2),
  ];

  it('keeps the final test out of the sections list, in order', () => {
    expect(pastFutureSections(rows).map((c) => c.id)).toEqual(['s1', 's2']);
    expect(finalTestCategory(rows)?.id).toBe('t');
  });

  it('finds the contrast section by name, whatever its case', () => {
    const withContrast = [...rows, category('x', 'Before, Now and Later', 89)];
    expect(contrastCategory(withContrast)?.id).toBe('x');
    expect(contrastCategory(rows)).toBeUndefined();
  });

  it('reads a section back to its band, and an unknown one to the past', () => {
    expect(bandOf({ name: 'Yesterday and before' })).toBe('past');
    expect(bandOf({ name: 'Tomorrow and after' })).toBe('future');
    expect(bandOf({ name: 'Before, now and later' })).toBe('contrast');
    expect(bandOf({ name: 'Something she renamed' })).toBe('past');
    expect(bandOf(undefined)).toBe('past');
  });
});

describe('a lesson read off its decks', () => {
  const rungs = [
    deck('d1', 's1', 'I worked yesterday — Hebrew', 0),
    deck('d2', 's1', 'I worked yesterday — Palestinian Arabic', 1),
    deck('d3', 's1', 'I worked yesterday — Both', 2),
  ];
  const cards = [
    card('c2', 'd1', 'I worked yesterday', 1),
    card('c1', 'd1', 'I worked', 0),
  ];

  it('folds the three rungs into one lesson and reads lines in order', () => {
    const lessons = lessonsOf(rungs);
    expect(lessons).toHaveLength(1);
    expect(lessonLines(lessons[0], cards).map((c) => c.english)).toEqual([
      'I worked',
      'I worked yesterday',
    ]);
  });

  it('counts rungs mastered and only calls all three finished', () => {
    const lesson = lessonsOf(rungs)[0];
    const progress = { d1: mastered('d1'), d2: mastered('d2') };
    expect(rungsMastered(lesson, progress)).toBe(2);
    expect(lessonFinished(lesson, progress)).toBe(false);
    expect(lessonFinished(lesson, { ...progress, d3: mastered('d3') })).toBe(true);
  });
});

describe('how far through the level she is', () => {
  const categories = [
    category('s1', 'Yesterday and before', 81),
    category('s2', 'Tomorrow and after', 82),
  ];
  const decks = [
    deck('a1', 's1', 'When it happened — Hebrew', 0),
    deck('a2', 's1', 'When it happened — Palestinian Arabic', 1),
    deck('a3', 's1', 'When it happened — Both', 2),
    deck('b1', 's2', 'When it will be — Hebrew', 0),
    deck('b2', 's2', 'When it will be — Palestinian Arabic', 1),
    deck('b3', 's2', 'When it will be — Both', 2),
  ];
  const half = {
    a1: mastered('a1'),
    a2: mastered('a2'),
    a3: mastered('a3'),
  };

  it('counts lessons rather than decks', () => {
    expect(levelProgress(categories, decks, {})).toEqual({ done: 0, total: 2 });
    expect(levelProgress(categories, decks, half)).toEqual({ done: 1, total: 2 });
  });

  it('opens past and future to Free Conversation at the half-way mark', () => {
    expect(tensesUnlocked(categories, decks, {})).toBe(false);
    expect(tensesUnlocked(categories, decks, half)).toBe(true);
  });

  it('says no on a device with none of the level installed', () => {
    // Zero of zero is not "finished" — it is "nothing to go on", and the
    // partner should keep to the present exactly as it does before she starts.
    expect(tensesUnlocked([], [], {})).toBe(false);
  });
});
