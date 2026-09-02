import type { Category, Deck, DeckProgress, Flashcard, Settings } from '../../types';
import type { SeedCard } from '../../constants/seed';
import {
  SECTION_STRANDS,
  STORY_BUILDS,
  TELL_ME_CONNECTOR_CATEGORY,
  TELL_ME_CONNECTOR_LESSON,
  TELL_ME_FINAL_TEST_CATEGORY,
  type BuildAnswer,
  type StoryBuild,
  type Strand,
} from '../../constants/tellme';
import { deckLots, isTellMeCategory, type Lot } from '../review/languagePolicy';
import { isDeckMastered } from '../review/unlock';
import { sortCards } from '../../utils/cardOrder';

/**
 * The pure half of the Tell Me About It screens: which installed categories are
 * its sections, which decks make one lesson, how far a lesson has got, which
 * strand of the skill a section sits in — and the small machine this level
 * adds, the story build.
 *
 * As with the level below it, the deck side leans entirely on shapes that
 * already exist: a lesson is a lot, three language rungs over the same lines,
 * grouped by `deckLots` exactly as the course groups its own. Nothing here
 * re-derives staging; it only reads it.
 */

/** The sections, in course order, with the final test kept apart. */
export function tellMeSections(categories: Category[]): Category[] {
  return categories
    .filter(
      (category) =>
        isTellMeCategory(category) && category.name !== TELL_ME_FINAL_TEST_CATEGORY,
    )
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** The final test's category, once the learner's install has one. */
export function finalTestCategory(categories: Category[]): Category | undefined {
  return categories.find((category) => category.name === TELL_ME_FINAL_TEST_CATEGORY);
}

/** The section whose first lesson the connector map practises. */
export function connectorCategory(categories: Category[]): Category | undefined {
  const name = TELL_ME_CONNECTOR_CATEGORY.toLowerCase();
  return categories.find((category) => category.name.toLowerCase() === name);
}

/**
 * Which strand of the skill a section teaches, for the level's own signposting.
 *
 * Anything the authored list does not name — a category renamed on a device, or
 * one from a build this one has never seen — reads as `joining`, which is where
 * the level starts and the only harmless place to put an unknown.
 */
export function strandOf(category: Pick<Category, 'name'> | undefined): Strand {
  if (!category) return 'joining';
  return SECTION_STRANDS.get(category.name.toLowerCase()) ?? 'joining';
}

/** One section's lessons: its decks folded back into lots, in course order. */
export function lessonsOf(sectionDecks: Deck[]): Lot[] {
  return deckLots(sectionDecks);
}

/** Whether every rung of the lesson is mastered — Hebrew and Arabic alike. */
export function lessonFinished(
  lesson: Lot,
  deckProgress: Record<string, DeckProgress | undefined>,
): boolean {
  return lesson.decks.every((deck) => isDeckMastered(deck, deckProgress[deck.id]));
}

/** Rungs of the lesson already mastered, for a "2 of 3" line. */
export function rungsMastered(
  lesson: Lot,
  deckProgress: Record<string, DeckProgress | undefined>,
): number {
  return lesson.decks.filter((deck) => isDeckMastered(deck, deckProgress[deck.id]))
    .length;
}

/**
 * The lesson's lines in the order they are taught, read off one rung.
 *
 * Any rung serves: all three deal the same lines in the same order, so the
 * first deck of the lot is as good as the Hebrew one and covers a lot that is
 * missing a rung.
 */
export function lessonLines(lesson: Lot, cards: Flashcard[]): Flashcard[] {
  const deck = lesson.hebrew ?? lesson.decks[0];
  if (!deck) return [];
  return sortCards(cards.filter((card) => card.deckId === deck.id));
}

/**
 * The lesson the connector map hands off to, found by name inside its section.
 *
 * By name rather than by position: the map is a picture of `CONNECTORS`, and
 * the deck built out of `CONNECTORS` is the one it should practise, whatever
 * else is ever added to that section ahead of it.
 */
export function connectorLesson(sectionDecks: Deck[]): Lot | undefined {
  const name = TELL_ME_CONNECTOR_LESSON.toLowerCase();
  return lessonsOf(sectionDecks).find((lot) => lot.name.toLowerCase() === name);
}

/** How much of the level is finished, counted in lessons. */
export function levelProgress(
  categories: Category[],
  decks: Deck[],
  deckProgress: Record<string, DeckProgress | undefined>,
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const section of tellMeSections(categories)) {
    const lessons = lessonsOf(decks.filter((deck) => deck.categoryId === section.id));
    total += lessons.length;
    done += lessons.filter((lesson) => lessonFinished(lesson, deckProgress)).length;
  }
  return { done, total };
}

/**
 * How much of the level she has to have behind her before Free Conversation
 * starts asking the broad questions.
 *
 * A third of the lessons, and deliberately a lower bar than the tense one: the
 * claim being made is only "she can answer with more than one sentence", and
 * that becomes true once the joining words and one telling section are in hand,
 * not when the level is finished. Below it the partner keeps to questions a
 * single sentence answers, which is what every level before this prepared her
 * for.
 */
export const NARRATIVE_UNLOCKED_SHARE = 1 / 3;

/**
 * Whether that bar is met.
 *
 * A device with none of this content installed answers false, because `total`
 * is zero — the same answer as a learner who has not started, and the correct
 * one either way.
 */
export function narrativeUnlocked(
  categories: Category[],
  decks: Deck[],
  deckProgress: Record<string, DeckProgress | undefined>,
): boolean {
  const { done, total } = levelProgress(categories, decks, deckProgress);
  return total > 0 && done >= Math.ceil(total * NARRATIVE_UNLOCKED_SHARE);
}

// --- building a story out of four answers ------------------------------------

/**
 * A build in progress: one chosen answer index per question, in question order.
 *
 * Plain data, so the screen holds it in state and every transition below is a
 * pure function of it. `undefined` is a question not yet answered — she may
 * change an earlier answer at any point, and the joined version simply redraws.
 */
export type BuildState = (number | undefined)[];

export function startBuild(build: StoryBuild): BuildState {
  return build.questions.map(() => undefined);
}

export function chooseAnswer(
  state: BuildState,
  question: number,
  option: number,
): BuildState {
  return state.map((chosen, index) => (index === question ? option : chosen));
}

/** Whether every question has an answer, which is when the story can be read. */
export function buildComplete(state: BuildState): boolean {
  return state.length > 0 && state.every((chosen) => chosen !== undefined);
}

/** How many questions have been answered, for a "2 of 4" line. */
export function buildAnswered(state: BuildState): number {
  return state.filter((chosen) => chosen !== undefined).length;
}

/** The answers she picked, in order, skipping any question not yet answered. */
export function chosenAnswers(build: StoryBuild, state: BuildState): BuildAnswer[] {
  const picked: BuildAnswer[] = [];
  build.questions.forEach((question, index) => {
    const option = state[index];
    if (option === undefined) return;
    const answer = question.answers[option];
    if (answer) picked.push(answer);
  });
  return picked;
}

/**
 * The connected version: her chosen answers in their joined shapes.
 *
 * Returned as the ordered fragments rather than as one glued-together string.
 * Half of these clauses carry a gendered form, and gluing `script` to `script`
 * would silently pick one perspective and throw the other away — so the screen
 * renders each fragment through the same `wordForms` every other surface reads
 * through, and the *run* of them is what reads as one piece of speech.
 */
export function joinedStory(build: StoryBuild, state: BuildState): SeedCard[] {
  return chosenAnswers(build, state).map((answer) => answer.joined);
}

/**
 * The fragments a `joined` clause may open with and still belong to the
 * sentence before it, rather than starting one of its own.
 *
 * An explicit list rather than a rule about English: these are the six words
 * any authored fragment actually begins with, and a guess would have to be
 * re-guessed every time a build is added.
 */
const RUNS_ON = /^(and|but|so|because|then)\b/i;

/**
 * The English of the connected version, which does glue safely into a line.
 *
 * A fragment that runs on is joined with a comma; anything else starts a new
 * sentence. Only English is assembled this way — see `joinedStory` for why the
 * two languages are not.
 */
export function joinedEnglish(build: StoryBuild, state: BuildState): string {
  const parts = joinedStory(build, state).map((card) => card.english.trim());
  if (parts.length === 0) return '';

  let text = parts[0];
  for (const part of parts.slice(1)) {
    text += RUNS_ON.test(part) ? ', ' + part : '. ' + part;
  }
  return text + '.';
}

/** The build with this id, or nothing when a link names one that is gone. */
export function buildById(id: string): StoryBuild | undefined {
  return STORY_BUILDS.find((build) => build.id === id);
}

// --- the level's own record --------------------------------------------------

/**
 * What the two unscored exercises have amounted to.
 *
 * Neither is a deck, so neither has a progress row: a build has no single right
 * answer to grade, and a story quiz is comprehension rather than production.
 * Counts only — how many stories she has put together, how many she has
 * listened through — riding the settings row exactly as `situationRehearsals`
 * and `freeTalkStats` do.
 */
export const EMPTY_TELL_ME_STATS = { builds: 0, stories: 0 };

export function tellMeStats(settings: Pick<Settings, 'tellMeStats'>): {
  builds: number;
  stories: number;
} {
  return { ...EMPTY_TELL_ME_STATS, ...settings.tellMeStats };
}

/** The patch a finished build writes onto the settings row. */
export function recordBuild(
  settings: Pick<Settings, 'tellMeStats'>,
): Pick<Settings, 'tellMeStats'> {
  const current = tellMeStats(settings);
  return { tellMeStats: { ...current, builds: current.builds + 1 } };
}

/** The patch a story answered right through writes. */
export function recordStory(
  settings: Pick<Settings, 'tellMeStats'>,
): Pick<Settings, 'tellMeStats'> {
  const current = tellMeStats(settings);
  return { tellMeStats: { ...current, stories: current.stories + 1 } };
}
