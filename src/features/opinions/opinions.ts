import type { Category, Deck, DeckProgress, Flashcard, Settings } from '../../types';
import type { SeedCard } from '../../constants/seed';
import {
  OPINION_BUILDS,
  OPINION_SECTION_STRANDS,
  OPINION_STANDS,
  OPINIONS_FINAL_TEST_CATEGORY,
  OPINIONS_STRENGTH_CATEGORY,
  OPINIONS_STRENGTH_LESSON,
  type BuildAnswer,
  type OpinionBuild,
  type OpinionStand,
  type OpinionStrand,
  type StandPosition,
} from '../../constants/opinions';
import { deckLots, isOpinionsCategory, type Lot } from '../review/languagePolicy';
import { isDeckMastered } from '../review/unlock';
import { sortCards } from '../../utils/cardOrder';

/**
 * The pure half of the Opinions & Reasons screens: which installed categories
 * are its sections, which decks make one lesson, how far a lesson has got,
 * which strand of the skill a section sits in — and the two small machines this
 * level adds, the opinion build and the stand.
 *
 * As with the level below it, the deck side leans entirely on shapes that
 * already exist: a lesson is a lot, three language rungs over the same lines,
 * grouped by `deckLots` exactly as the course groups its own. Nothing here
 * re-derives staging; it only reads it.
 */

/** The sections, in course order, with the final test kept apart. */
export function opinionSections(categories: Category[]): Category[] {
  return categories
    .filter(
      (category) =>
        isOpinionsCategory(category) &&
        category.name !== OPINIONS_FINAL_TEST_CATEGORY,
    )
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** The final test's category, once the learner's install has one. */
export function finalTestCategory(categories: Category[]): Category | undefined {
  return categories.find(
    (category) => category.name === OPINIONS_FINAL_TEST_CATEGORY,
  );
}

/** The section whose first lesson the certainty scale practises. */
export function strengthCategory(categories: Category[]): Category | undefined {
  const name = OPINIONS_STRENGTH_CATEGORY.toLowerCase();
  return categories.find((category) => category.name.toLowerCase() === name);
}

/**
 * Which strand of the skill a section teaches, for the level's own signposting.
 *
 * Anything the authored list does not name — a category renamed on a device, or
 * one from a build this one has never seen — reads as `thinking`, which is
 * where the level starts and the only harmless place to put an unknown.
 */
export function strandOf(
  category: Pick<Category, 'name'> | undefined,
): OpinionStrand {
  if (!category) return 'thinking';
  return OPINION_SECTION_STRANDS.get(category.name.toLowerCase()) ?? 'thinking';
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
 * The lesson the certainty scale hands off to, found by name inside its
 * section.
 *
 * By name rather than by position: the scale is a picture of
 * `OPINION_STRENGTHS`, and the deck built out of `OPINION_STRENGTHS` is the one
 * it should practise, whatever else is ever added to that section ahead of it.
 */
export function strengthLesson(sectionDecks: Deck[]): Lot | undefined {
  const name = OPINIONS_STRENGTH_LESSON.toLowerCase();
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
  for (const section of opinionSections(categories)) {
    const lessons = lessonsOf(decks.filter((deck) => deck.categoryId === section.id));
    total += lessons.length;
    done += lessons.filter((lesson) => lessonFinished(lesson, deckProgress)).length;
  }
  return { done, total };
}

/**
 * How much of the level she has to have behind her before Free Conversation
 * starts asking what she thinks — and offering opinions of its own for her to
 * answer.
 *
 * A third of the lessons, the same low bar the level below it sets, and for the
 * same reason: the claim being made is only "she can say what she thinks and
 * give a reason", and that becomes true once one opinion frame and the because
 * sections are in hand, not when the level is finished. Below it the partner
 * asks about facts, which is what every level before this prepared her for.
 */
export const OPINIONS_UNLOCKED_SHARE = 1 / 3;

/**
 * Whether that bar is met.
 *
 * A device with none of this content installed answers false, because `total`
 * is zero — the same answer as a learner who has not started, and the correct
 * one either way.
 */
export function opinionsUnlocked(
  categories: Category[],
  decks: Deck[],
  deckProgress: Record<string, DeckProgress | undefined>,
): boolean {
  const { done, total } = levelProgress(categories, decks, deckProgress);
  return total > 0 && done >= Math.ceil(total * OPINIONS_UNLOCKED_SHARE);
}

// --- building one opinion out of three answers -------------------------------

/**
 * A build in progress: one chosen answer index per question, in question order.
 *
 * Plain data, so the screen holds it in state and every transition below is a
 * pure function of it. `undefined` is a question not yet answered — she may
 * change an earlier answer at any point, and the joined version simply redraws.
 */
export type BuildState = (number | undefined)[];

export function startBuild(build: OpinionBuild): BuildState {
  return build.questions.map(() => undefined);
}

export function chooseAnswer(
  state: BuildState,
  question: number,
  option: number,
): BuildState {
  return state.map((chosen, index) => (index === question ? option : chosen));
}

/** Whether every question has an answer, which is when the opinion can be read. */
export function buildComplete(state: BuildState): boolean {
  return state.length > 0 && state.every((chosen) => chosen !== undefined);
}

/** How many questions have been answered, for a "2 of 3" line. */
export function buildAnswered(state: BuildState): number {
  return state.filter((chosen) => chosen !== undefined).length;
}

/** The answers she picked, in order, skipping any question not yet answered. */
export function chosenAnswers(
  build: OpinionBuild,
  state: BuildState,
): BuildAnswer[] {
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
 * The whole opinion: her chosen answers in their joined shapes.
 *
 * Returned as the ordered fragments rather than as one glued-together string.
 * Half of these clauses carry a gendered form, and gluing `script` to `script`
 * would silently pick one perspective and throw the other away — so the screen
 * renders each fragment through the same `wordForms` every other surface reads
 * through, and the *run* of them is what reads as one piece of speech.
 */
export function joinedOpinion(build: OpinionBuild, state: BuildState): SeedCard[] {
  return chosenAnswers(build, state).map((answer) => answer.joined);
}

/**
 * The fragments a `joined` clause may open with and still belong to the
 * sentence before it, rather than starting one of its own.
 *
 * An explicit list rather than a rule about English: these are the words any
 * authored fragment here actually begins with, and a guess would have to be
 * re-guessed every time a build is added. "So" is on it because the closing
 * clause of the learning build runs on from the reason before it.
 */
const RUNS_ON = /^(and|but|so|because)\b/i;

/**
 * The English of the whole opinion, which does glue safely into a line.
 *
 * A fragment that runs on is joined with a comma; anything else starts a new
 * sentence. Only English is assembled this way — see `joinedOpinion` for why
 * the two languages are not.
 */
export function joinedEnglish(build: OpinionBuild, state: BuildState): string {
  const parts = joinedOpinion(build, state).map((card) => card.english.trim());
  if (parts.length === 0) return '';

  let text = parts[0];
  for (const part of parts.slice(1)) {
    text += RUNS_ON.test(part) ? ', ' + part : '. ' + part;
  }
  return text + '.';
}

/** The build with this id, or nothing when a link names one that is gone. */
export function buildById(id: string): OpinionBuild | undefined {
  return OPINION_BUILDS.find((build) => build.id === id);
}

// --- taking a position -------------------------------------------------------

/**
 * A stand in progress: which position she took, and which reason she gave.
 *
 * Two picks rather than a score. There is deliberately no notion here of a
 * right position or a right reason — a `StandState` can be complete and cannot
 * be correct, which is the level's whole claim about opinions expressed as a
 * type.
 */
export type StandState = { position?: number; reason?: number };

export const EMPTY_STAND: StandState = {};

/**
 * Taking a position, which clears any reason already given.
 *
 * Cleared because a reason belongs to the position it was chosen under: the
 * reasons for agreeing are not the reasons for disagreeing, and carrying an
 * index across would silently attach her to a sentence she never picked.
 */
export function takePosition(position: number): StandState {
  return { position };
}

export function giveReason(state: StandState, reason: number): StandState {
  return { ...state, reason };
}

/** The position she took, if she has taken one. */
export function chosenPosition(
  stand: OpinionStand,
  state: StandState,
): StandPosition | undefined {
  return state.position === undefined ? undefined : stand.positions[state.position];
}

/** The reason she gave, if she has given one. */
export function chosenReason(
  stand: OpinionStand,
  state: StandState,
): SeedCard | undefined {
  const position = chosenPosition(stand, state);
  if (!position || state.reason === undefined) return undefined;
  return position.reasons[state.reason];
}

/** Whether she has both taken a position and said why. */
export function standComplete(stand: OpinionStand, state: StandState): boolean {
  return Boolean(chosenPosition(stand, state) && chosenReason(stand, state));
}

/**
 * Her whole answer: the position, then the reason for it.
 *
 * Two fragments rather than one glued line, for the same reason a build's is —
 * each carries its own gendered forms and the screen renders both through
 * `wordForms`.
 */
export function standAnswer(stand: OpinionStand, state: StandState): SeedCard[] {
  const position = chosenPosition(stand, state);
  const reason = chosenReason(stand, state);
  if (!position || !reason) return [];
  return [position.said, reason];
}

/** The English of that answer, glued into one sentence. */
export function standEnglish(stand: OpinionStand, state: StandState): string {
  const parts = standAnswer(stand, state).map((card) => card.english.trim());
  if (parts.length === 0) return '';
  return parts.join(' ') + '.';
}

/** The stand with this id, or nothing when a link names one that is gone. */
export function standById(id: string): OpinionStand | undefined {
  return OPINION_STANDS.find((stand) => stand.id === id);
}

// --- the level's own record --------------------------------------------------

/**
 * What the two unscored exercises have amounted to.
 *
 * Neither is a deck, so neither has a progress row — and neither could have
 * one, because neither has a right answer to grade. Counts only: how many
 * opinions she has put together, how many positions she has taken and
 * supported. They ride the settings row exactly as `situationRehearsals`,
 * `freeTalkStats` and `tellMeStats` do.
 */
export const EMPTY_OPINION_STATS = { builds: 0, stands: 0 };

export function opinionStats(settings: Pick<Settings, 'opinionStats'>): {
  builds: number;
  stands: number;
} {
  return { ...EMPTY_OPINION_STATS, ...settings.opinionStats };
}

/** The patch a finished build writes onto the settings row. */
export function recordOpinionBuild(
  settings: Pick<Settings, 'opinionStats'>,
): Pick<Settings, 'opinionStats'> {
  const current = opinionStats(settings);
  return { opinionStats: { ...current, builds: current.builds + 1 } };
}

/** The patch a position taken and supported writes. */
export function recordStand(
  settings: Pick<Settings, 'opinionStats'>,
): Pick<Settings, 'opinionStats'> {
  const current = opinionStats(settings);
  return { opinionStats: { ...current, stands: current.stands + 1 } };
}
