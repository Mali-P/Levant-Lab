import { describe, expect, it } from 'vitest';
import type { Category, Deck, DeckProgress, Flashcard } from '../../types';
import {
  OPINION_BUILDS,
  OPINION_SECTION_STRANDS,
  OPINION_STANDS,
  OPINION_STRENGTHS,
  OPINIONS_CATEGORIES,
  OPINIONS_FINAL_TEST_CATEGORY,
  OPINIONS_STRENGTH_CATEGORY,
  OPINIONS_STRENGTH_LESSON,
  STRENGTH_STEPS,
} from '../../constants/opinions';
import { SENTENCE_CATEGORY_NAMES } from '../../constants/sentences';
import { CONVERSATION_CATEGORY_NAMES } from '../../constants/conversations';
import { SITUATION_CATEGORY_NAMES } from '../../constants/situations';
import { PAST_FUTURE_CATEGORY_NAMES } from '../../constants/pastfuture';
import { TELL_ME_CATEGORY_NAMES } from '../../constants/tellme';
import { isStandaloneLevel } from '../review/languagePolicy';
import {
  EMPTY_STAND,
  buildAnswered,
  buildById,
  buildComplete,
  chooseAnswer,
  chosenReason,
  giveReason,
  joinedEnglish,
  joinedOpinion,
  lessonFinished,
  lessonLines,
  lessonsOf,
  levelProgress,
  opinionSections,
  opinionStats,
  opinionsUnlocked,
  recordOpinionBuild,
  recordStand,
  rungsMastered,
  standAnswer,
  standById,
  standComplete,
  standEnglish,
  startBuild,
  strandOf,
  strengthLesson,
  takePosition,
} from './opinions';

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

/** Every installed line, by its English, for the content assertions below. */
const BY_ENGLISH = new Map(
  OPINIONS_CATEGORIES.flatMap((section) =>
    section.decks.flatMap((entry) =>
      entry.cards.map((line) => [line.english, line] as const),
    ),
  ),
);

describe('the authored Opinions & Reasons content', () => {
  it('stages every lesson into the three language rungs', () => {
    for (const section of OPINIONS_CATEGORIES) {
      if (section.name === OPINIONS_FINAL_TEST_CATEGORY) continue;
      expect(section.decks.length % 3, section.name).toBe(0);
      for (let i = 0; i < section.decks.length; i += 3) {
        expect(section.decks[i].name).toMatch(/ — Hebrew$/);
        expect(section.decks[i + 1].name).toMatch(/ — Palestinian Arabic$/);
        expect(section.decks[i + 2].name).toMatch(/ — Both$/);
      }
    }
  });

  it('asks the same light bar of a lesson that a chain asks', () => {
    for (const section of OPINIONS_CATEGORIES) {
      if (section.name === OPINIONS_FINAL_TEST_CATEGORY) continue;
      for (const entry of section.decks) {
        expect(entry.perfectRunsRequired, section.name + ' › ' + entry.name).toBe(5);
      }
    }
  });

  it('gives every installed section a name no other area owns', () => {
    for (const section of OPINIONS_CATEGORIES) {
      const name = section.name.toLowerCase();
      expect(SENTENCE_CATEGORY_NAMES.has(name), name).toBe(false);
      expect(CONVERSATION_CATEGORY_NAMES.has(name), name).toBe(false);
      expect(SITUATION_CATEGORY_NAMES.has(name), name).toBe(false);
      expect(PAST_FUTURE_CATEGORY_NAMES.has(name), name).toBe(false);
      expect(TELL_ME_CATEGORY_NAMES.has(name), name).toBe(false);
    }
  });

  it('counts as a standalone level, so it gates nothing and nothing gates it', () => {
    for (const section of OPINIONS_CATEGORIES) {
      expect(isStandaloneLevel({ name: section.name }), section.name).toBe(true);
    }
  });

  it('files every section under a strand', () => {
    for (const section of OPINIONS_CATEGORIES) {
      if (section.name === OPINIONS_FINAL_TEST_CATEGORY) continue;
      expect(
        OPINION_SECTION_STRANDS.has(section.name.toLowerCase()),
        section.name,
      ).toBe(true);
    }
  });

  it('names a strength section and a strength lesson that actually exist', () => {
    const section = OPINIONS_CATEGORIES.find(
      (entry) => entry.name === OPINIONS_STRENGTH_CATEGORY,
    );
    expect(section).toBeDefined();
    expect(
      section?.decks.some((entry) =>
        entry.name.startsWith(OPINIONS_STRENGTH_LESSON),
      ),
    ).toBe(true);
  });

  it('builds the strength lesson out of the scale itself', () => {
    // The picture and the practice are one list. Authored twice, they would
    // drift the first time a rung was reworded.
    const section = OPINIONS_CATEGORIES.find(
      (entry) => entry.name === OPINIONS_STRENGTH_CATEGORY,
    );
    const lesson = section?.decks.find((entry) =>
      entry.name.startsWith(OPINIONS_STRENGTH_LESSON),
    );
    expect(lesson?.cards.map((entry) => entry.english)).toEqual(
      OPINION_STRENGTHS.map((step) => step.word.english),
    );
  });

  it('lays the scale out weakest first, with a heading for every rung', () => {
    const levels = OPINION_STRENGTHS.map((step) => step.level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    for (const step of OPINION_STRENGTHS) {
      expect(
        STRENGTH_STEPS.some((heading) => heading.level === step.level),
        String(step.level),
      ).toBe(true);
    }
  });
});

/**
 * The level's own content rule, pinned the way Past & Future pinned the
 * genderless past.
 *
 * The frames this level opens on carry one form in both languages: Hebrew's
 * nir'e li is impersonal, and Arabic's baẓunn is a first-person imperfect. That
 * is what lets a learner say what she thinks about a dozen things before she
 * meets agreement at all — so if either side ever grows a second form, it
 * should fail here rather than quietly turn the opening lesson into a grammar
 * lesson.
 */
describe('the opinion frames', () => {
  const GENDERLESS = [
    'It seems to me',
    'I think so',
    'I do not think so',
    'I think it is good',
    'I do not think it is good',
  ];

  it('carries one form in both languages', () => {
    for (const english of GENDERLESS) {
      const found = BY_ENGLISH.get(english);
      expect(found, english).toBeDefined();
      if (!found) continue;
      for (const side of [found.hebrew, found.arabic]) {
        expect(side.forms, english).toBeUndefined();
        expect(side.speechForms, english).toBeUndefined();
      }
    }
  });

  it('does gender the agreement words, in both languages alike', () => {
    // The mirror of the rule above, and the reason it is worth stating: what
    // is gendered here is the participles — מסכימה, موافقة — not the verbs.
    for (const english of ['I agree', 'I do not agree', 'I am not sure']) {
      const found = BY_ENGLISH.get(english);
      expect(found, english).toBeDefined();
      if (!found) continue;
      for (const side of [found.hebrew, found.arabic]) {
        expect(side.forms, english).toBeDefined();
        // And gendered by the speaker rather than the listener: whether she
        // agrees is about her, not about who she is agreeing with.
        expect(side.agreement, english).toBe('speaker');
      }
    }
  });
});

describe('reading the level off an install', () => {
  const sections = [
    category('g1', 'It seems to me', 1),
    category('g2', 'I agree', 2),
    category('gz', OPINIONS_FINAL_TEST_CATEGORY, 3),
    category('gx', 'Animals', 4),
  ];

  const decks = [
    deck('d1', 'g1', 'It seems to me — Hebrew', 1),
    deck('d2', 'g1', 'It seems to me — Palestinian Arabic', 2),
    deck('d3', 'g1', 'It seems to me — Both', 3),
    deck('d4', 'g2', 'Ways of agreeing — Hebrew', 1),
    deck('d5', 'g2', 'Ways of agreeing — Palestinian Arabic', 2),
    deck('d6', 'g2', 'Ways of agreeing — Both', 3),
  ];

  it('keeps the final test out of the sections', () => {
    expect(opinionSections(sections).map((entry) => entry.name)).toEqual([
      'It seems to me',
      'I agree',
    ]);
  });

  it('folds a section into lessons rather than decks', () => {
    const lessons = lessonsOf(decks.filter((entry) => entry.categoryId === 'g1'));
    expect(lessons).toHaveLength(1);
    expect(lessons[0].decks).toHaveLength(3);
  });

  it('calls a lesson finished only when every rung is', () => {
    const lesson = lessonsOf(decks.filter((entry) => entry.categoryId === 'g1'))[0];
    const part = { d1: mastered('d1'), d2: mastered('d2') };
    expect(lessonFinished(lesson, part)).toBe(false);
    expect(rungsMastered(lesson, part)).toBe(2);
    expect(lessonFinished(lesson, { ...part, d3: mastered('d3') })).toBe(true);
  });

  it('reads a lesson’s lines off one rung, in order', () => {
    const lesson = lessonsOf(decks.filter((entry) => entry.categoryId === 'g1'))[0];
    const cards = [
      card('c2', 'd1', 'I think so', 2),
      card('c1', 'd1', 'It seems to me', 1),
      card('c9', 'd2', 'the Arabic rung', 1),
    ];
    expect(lessonLines(lesson, cards).map((entry) => entry.english)).toEqual([
      'It seems to me',
      'I think so',
    ]);
  });

  it('counts lessons rather than decks', () => {
    expect(levelProgress(sections, decks, {})).toEqual({ done: 0, total: 2 });
    expect(
      levelProgress(sections, decks, {
        d1: mastered('d1'),
        d2: mastered('d2'),
        d3: mastered('d3'),
      }),
    ).toEqual({ done: 1, total: 2 });
  });

  it('opens the opinion questions to Free Conversation at a third of the lessons', () => {
    const progress = { d1: mastered('d1'), d2: mastered('d2'), d3: mastered('d3') };
    expect(opinionsUnlocked(sections, decks, {})).toBe(false);
    expect(opinionsUnlocked(sections, decks, progress)).toBe(true);
  });

  it('says no on a device with none of the level installed', () => {
    expect(opinionsUnlocked([category('gx', 'Animals', 1)], [], {})).toBe(false);
  });

  it('finds the strength lesson by name', () => {
    const lots = [
      deck('e1', 'gc', OPINIONS_STRENGTH_LESSON + ' — Hebrew', 1),
      deck('e2', 'gc', OPINIONS_STRENGTH_LESSON + ' — Palestinian Arabic', 2),
      deck('e3', 'gc', 'Maybe not — Hebrew', 3),
    ];
    expect(strengthLesson(lots)?.name).toBe(OPINIONS_STRENGTH_LESSON);
  });

  it('files an unknown section under the strand the level starts on', () => {
    expect(strandOf({ name: 'Something nobody authored' })).toBe('thinking');
    expect(strandOf(undefined)).toBe('thinking');
    expect(strandOf({ name: 'I agree' })).toBe('answering');
  });
});

describe('building one opinion out of three answers', () => {
  const build = OPINION_BUILDS[0];

  it('starts with nothing answered', () => {
    const state = startBuild(build);
    expect(buildAnswered(state)).toBe(0);
    expect(buildComplete(state)).toBe(false);
    expect(joinedEnglish(build, state)).toBe('');
  });

  it('is complete only once every question has an answer', () => {
    let state = startBuild(build);
    build.questions.forEach((_, index) => {
      state = chooseAnswer(state, index, 0);
    });
    expect(buildComplete(state)).toBe(true);
    expect(joinedOpinion(build, state)).toHaveLength(build.questions.length);
  });

  it('lets an earlier answer be changed without losing the later ones', () => {
    let state = startBuild(build);
    state = chooseAnswer(state, 0, 0);
    state = chooseAnswer(state, 1, 1);
    state = chooseAnswer(state, 0, 2);
    expect(state[0]).toBe(2);
    expect(state[1]).toBe(1);
  });

  it('runs a joining fragment on with a comma and starts a new sentence otherwise', () => {
    let state = startBuild(build);
    build.questions.forEach((_, index) => {
      state = chooseAnswer(state, index, 0);
    });
    const english = joinedEnglish(build, state);
    // The café build's second and third answers open with "because" and "but",
    // so the whole thing reads as one sentence rather than three.
    expect(english).toContain(', because');
    expect(english).toContain(', but');
    expect(english.endsWith('.')).toBe(true);
  });

  it('finds a build by id and nothing by a stale one', () => {
    expect(buildById(build.id)?.name).toBe(build.name);
    expect(buildById('no-such-build')).toBeUndefined();
  });

  it('gives every question at least two honest answers', () => {
    for (const entry of OPINION_BUILDS) {
      for (const question of entry.questions) {
        expect(
          question.answers.length,
          entry.id + ' › ' + question.ask.english,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('taking a position', () => {
  const stand = OPINION_STANDS[0];

  it('needs both a position and a reason', () => {
    expect(standComplete(stand, EMPTY_STAND)).toBe(false);
    const taken = takePosition(0);
    expect(standComplete(stand, taken)).toBe(false);
    expect(standComplete(stand, giveReason(taken, 0))).toBe(true);
  });

  it('drops the reason when the position changes', () => {
    // A reason belongs to the position it was given for: the reasons for
    // agreeing are not the reasons for disagreeing, and carrying an index
    // across would attach her to a sentence she never picked.
    const state = giveReason(takePosition(0), 1);
    const moved = takePosition(1);
    expect(chosenReason(stand, state)).toBeDefined();
    expect(moved.reason).toBeUndefined();
    expect(standComplete(stand, moved)).toBe(false);
  });

  it('reads back the position and the reason, in that order', () => {
    const state = giveReason(takePosition(0), 0);
    const parts = standAnswer(stand, state);
    expect(parts).toHaveLength(2);
    expect(parts[0].english).toBe(stand.positions[0].said.english);
    expect(parts[1].english).toBe(stand.positions[0].reasons[0].english);
    expect(standEnglish(stand, state).endsWith('.')).toBe(true);
  });

  it('ignores an index that names nothing', () => {
    const state = giveReason(takePosition(99), 99);
    expect(standComplete(stand, state)).toBe(false);
    expect(standAnswer(stand, state)).toEqual([]);
    expect(standEnglish(stand, state)).toBe('');
  });

  it('finds a stand by id and nothing by a stale one', () => {
    expect(standById(stand.id)?.name).toBe(stand.name);
    expect(standById('no-such-stand')).toBeUndefined();
  });

  it('gives every position its own reasons, so none is the right answer', () => {
    // The level's whole claim, asserted about the content rather than about the
    // interface: a position with no reasons behind it would be one the learner
    // cannot actually take, which is a right answer by omission.
    for (const entry of OPINION_STANDS) {
      expect(entry.positions.length, entry.id).toBeGreaterThanOrEqual(2);
      for (const position of entry.positions) {
        expect(
          position.reasons.length,
          entry.id + ' › ' + position.said.english,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe("the level's own record", () => {
  it('reads zeroes off a settings row that has never had one', () => {
    expect(opinionStats({})).toEqual({ builds: 0, stands: 0 });
  });

  it('counts a build and a stand apart', () => {
    let settings: { opinionStats?: { builds: number; stands: number } } = {};
    settings = { ...settings, ...recordOpinionBuild(settings) };
    settings = { ...settings, ...recordStand(settings) };
    settings = { ...settings, ...recordStand(settings) };
    expect(opinionStats(settings)).toEqual({ builds: 1, stands: 2 });
  });
});
