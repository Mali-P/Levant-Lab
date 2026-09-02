import { describe, expect, it } from 'vitest';
import type { Category, Deck, DeckProgress, Flashcard } from '../../types';
import {
  CONNECTOR_ROLES,
  CONNECTORS,
  SECTION_STRANDS,
  SHORT_STORIES,
  STORY_BUILDS,
  TELL_ME_CATEGORIES,
  TELL_ME_CONNECTOR_CATEGORY,
  TELL_ME_CONNECTOR_LESSON,
  TELL_ME_FINAL_TEST_CATEGORY,
} from '../../constants/tellme';
import { SENTENCE_CATEGORY_NAMES } from '../../constants/sentences';
import { CONVERSATION_CATEGORY_NAMES } from '../../constants/conversations';
import { SITUATION_CATEGORY_NAMES } from '../../constants/situations';
import { PAST_FUTURE_CATEGORY_NAMES } from '../../constants/pastfuture';
import { isStandaloneLevel } from '../review/languagePolicy';
import {
  buildAnswered,
  buildById,
  buildComplete,
  chooseAnswer,
  connectorLesson,
  joinedEnglish,
  joinedStory,
  lessonFinished,
  lessonLines,
  lessonsOf,
  levelProgress,
  narrativeUnlocked,
  recordBuild,
  recordStory,
  rungsMastered,
  startBuild,
  strandOf,
  tellMeSections,
  tellMeStats,
} from './tellme';

const NOW = '2026-09-02T10:00:00.000Z';

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

describe('the authored Tell Me About It content', () => {
  it('stages every lesson into the three language rungs', () => {
    for (const section of TELL_ME_CATEGORIES) {
      if (section.name === TELL_ME_FINAL_TEST_CATEGORY) continue;
      expect(section.decks.length % 3, section.name).toBe(0);
      for (let i = 0; i < section.decks.length; i += 3) {
        expect(section.decks[i].name).toMatch(/ — Hebrew$/);
        expect(section.decks[i + 1].name).toMatch(/ — Palestinian Arabic$/);
        expect(section.decks[i + 2].name).toMatch(/ — Both$/);
      }
    }
  });

  it('asks the same light bar of a lesson that a chain asks', () => {
    for (const section of TELL_ME_CATEGORIES) {
      if (section.name === TELL_ME_FINAL_TEST_CATEGORY) continue;
      for (const entry of section.decks) {
        expect(entry.perfectRunsRequired, section.name + ' › ' + entry.name).toBe(5);
      }
    }
  });

  it('gives every installed section a name no other area owns', () => {
    for (const section of TELL_ME_CATEGORIES) {
      const name = section.name.toLowerCase();
      expect(SENTENCE_CATEGORY_NAMES.has(name), name).toBe(false);
      expect(CONVERSATION_CATEGORY_NAMES.has(name), name).toBe(false);
      expect(SITUATION_CATEGORY_NAMES.has(name), name).toBe(false);
      expect(PAST_FUTURE_CATEGORY_NAMES.has(name), name).toBe(false);
    }
  });

  it('counts as a standalone level, so it gates nothing and nothing gates it', () => {
    for (const section of TELL_ME_CATEGORIES) {
      expect(isStandaloneLevel({ name: section.name }), section.name).toBe(true);
    }
  });

  it('places every section on a strand', () => {
    for (const section of TELL_ME_CATEGORIES) {
      if (section.name === TELL_ME_FINAL_TEST_CATEGORY) continue;
      expect(
        SECTION_STRANDS.has(section.name.toLowerCase()),
        section.name,
      ).toBe(true);
    }
    expect(strandOf({ name: 'Because and so' })).toBe('joining');
    expect(strandOf({ name: 'Telling what happened' })).toBe('telling');
    expect(strandOf({ name: 'never heard of it' })).toBe('joining');
    expect(strandOf(undefined)).toBe('joining');
  });

  it('builds the first joining lesson out of the connector map, so the two cannot drift', () => {
    const section = TELL_ME_CATEGORIES.find(
      (entry) => entry.name === TELL_ME_CONNECTOR_CATEGORY,
    );
    expect(section).toBeDefined();
    const hebrewRung = section?.decks.find(
      (entry) => entry.name === TELL_ME_CONNECTOR_LESSON + ' — Hebrew',
    );
    expect(hebrewRung).toBeDefined();
    expect(hebrewRung?.cards.map((entry) => entry.english)).toEqual(
      CONNECTORS.map((connector) => connector.word.english),
    );
  });

  it('files every connector under a role the map draws', () => {
    const drawn = new Set(CONNECTOR_ROLES.map((role) => role.role));
    for (const connector of CONNECTORS) {
      expect(drawn.has(connector.role), connector.word.english).toBe(true);
    }
  });

  it('deals the final test in batches of ten, ten flawless times', () => {
    const test = TELL_ME_CATEGORIES.find(
      (entry) => entry.name === TELL_ME_FINAL_TEST_CATEGORY,
    );
    expect(test).toBeDefined();
    expect(test?.decks).toHaveLength(1);
    const only = test?.decks[0];
    expect(only?.masteryOnly).toBe(true);
    expect(only?.roundSize).toBe(10);
    expect(only?.perfectRunsRequired).toBe(10);
    expect(only?.studyLanguages).toEqual(['hebrew', 'arabic']);
    // Each English exactly once, or the official top-up would run for ever.
    const englishes = (only?.cards ?? []).map((entry) => entry.english.toLowerCase());
    expect(new Set(englishes).size).toBe(englishes.length);
  });
});

describe('the story builds', () => {
  it('offers only complete answers: a said shape and a joined shape apiece', () => {
    for (const build of STORY_BUILDS) {
      expect(build.questions.length).toBeGreaterThan(0);
      for (const question of build.questions) {
        expect(question.answers.length).toBeGreaterThan(1);
        for (const answer of question.answers) {
          expect(answer.said.english, build.id).toBeTruthy();
          expect(answer.joined.english, build.id).toBeTruthy();
          expect(answer.joined.hebrew.script, build.id).toBeTruthy();
          expect(answer.joined.arabic.script, build.id).toBeTruthy();
        }
      }
    }
  });

  it('walks from empty to complete one answer at a time', () => {
    const build = STORY_BUILDS[0];
    let state = startBuild(build);
    expect(buildComplete(state)).toBe(false);
    expect(buildAnswered(state)).toBe(0);

    build.questions.forEach((_, index) => {
      state = chooseAnswer(state, index, 0);
    });
    expect(buildAnswered(state)).toBe(build.questions.length);
    expect(buildComplete(state)).toBe(true);

    // Changing an earlier answer keeps the build complete and swaps the clause.
    const swapped = chooseAnswer(state, 0, 1);
    expect(buildComplete(swapped)).toBe(true);
    expect(joinedStory(build, swapped)[0]).toBe(build.questions[0].answers[1].joined);
  });

  it('reads the joined English as one flowing piece', () => {
    const build = buildById('day');
    expect(build).toBeDefined();
    if (!build) return;
    let state = startBuild(build);
    build.questions.forEach((_, index) => {
      state = chooseAnswer(state, index, 0);
    });
    // "I was at work" + "I worked all day" + "It was good" + "so I went home".
    expect(joinedEnglish(build, state)).toBe(
      'I was at work. I worked all day. It was good, so I went home.',
    );
  });

  it('finds a build by id and nothing by a stale one', () => {
    expect(buildById('day')?.name).toBe('Tell me about your day');
    expect(buildById('gone')).toBeUndefined();
  });
});

describe('the short stories', () => {
  it('keeps every question answerable: the right answer is among the options', () => {
    for (const story of SHORT_STORIES) {
      expect(story.lines.length).toBeGreaterThan(1);
      for (const question of story.questions) {
        expect(question.options[question.correct], story.id).toBeTruthy();
      }
    }
  });
});

describe('the level record on the settings row', () => {
  it('starts at zero and counts builds and stories separately', () => {
    expect(tellMeStats({})).toEqual({ builds: 0, stories: 0 });
    const one = recordBuild({});
    expect(one.tellMeStats).toEqual({ builds: 1, stories: 0 });
    const two = recordStory(one);
    expect(two.tellMeStats).toEqual({ builds: 1, stories: 1 });
  });
});

describe('reading an install back as the level', () => {
  const sections = [
    category('g1', 'Because and so', 1),
    category('g2', 'Telling what happened', 2),
    category('gt', TELL_ME_FINAL_TEST_CATEGORY, 3),
    category('gx', 'Animals', 4),
  ];
  const decks = [
    deck('d1', 'g1', 'Why it happened — Hebrew', 1),
    deck('d2', 'g1', 'Why it happened — Palestinian Arabic', 2),
    deck('d3', 'g1', 'Why it happened — Both', 3),
    deck('d4', 'g2', 'Saying what happened — Hebrew', 1),
    deck('d5', 'g2', 'Saying what happened — Palestinian Arabic', 2),
    deck('d6', 'g2', 'Saying what happened — Both', 3),
    deck('dt', 'gt', 'Ten lines at a time', 1),
  ];

  it('lists the sections in order and keeps the final test apart', () => {
    const listed = tellMeSections(sections);
    expect(listed.map((entry) => entry.id)).toEqual(['g1', 'g2']);
  });

  it('folds the three rungs into one lesson and reads lines in order', () => {
    const lessons = lessonsOf(decks.filter((entry) => entry.categoryId === 'g1'));
    expect(lessons).toHaveLength(1);
    const cards = [
      card('c2', 'd1', 'second', 2),
      card('c1', 'd1', 'first', 1),
      card('c3', 'd2', 'other rung', 1),
    ];
    expect(lessonLines(lessons[0], cards).map((entry) => entry.english)).toEqual([
      'first',
      'second',
    ]);
  });

  it('counts rungs mastered and only calls all three finished', () => {
    const lessons = lessonsOf(decks.filter((entry) => entry.categoryId === 'g1'));
    const partway = { d1: mastered('d1'), d2: mastered('d2') };
    expect(rungsMastered(lessons[0], partway)).toBe(2);
    expect(lessonFinished(lessons[0], partway)).toBe(false);
    const all = { ...partway, d3: mastered('d3') };
    expect(lessonFinished(lessons[0], all)).toBe(true);
  });

  it('counts lessons rather than decks', () => {
    const none = levelProgress(sections, decks, {});
    expect(none).toEqual({ done: 0, total: 2 });
    const one = levelProgress(sections, decks, {
      d1: mastered('d1'),
      d2: mastered('d2'),
      d3: mastered('d3'),
    });
    expect(one).toEqual({ done: 1, total: 2 });
  });

  it('opens the broad questions to Free Conversation at a third of the lessons', () => {
    const progress = {
      d1: mastered('d1'),
      d2: mastered('d2'),
      d3: mastered('d3'),
    };
    expect(narrativeUnlocked(sections, decks, {})).toBe(false);
    expect(narrativeUnlocked(sections, decks, progress)).toBe(true);
  });

  it('says no on a device with none of the level installed', () => {
    expect(narrativeUnlocked([category('gx', 'Animals', 1)], [], {})).toBe(false);
  });

  it('finds the connector lesson by name', () => {
    const lots = [
      deck('e1', 'gc', TELL_ME_CONNECTOR_LESSON + ' — Hebrew', 1),
      deck('e2', 'gc', TELL_ME_CONNECTOR_LESSON + ' — Palestinian Arabic', 2),
      deck('e3', 'gc', 'Two things at once — Hebrew', 3),
    ];
    expect(connectorLesson(lots)?.name).toBe(TELL_ME_CONNECTOR_LESSON);
    expect(connectorLesson([lots[2]])).toBeUndefined();
  });
});
