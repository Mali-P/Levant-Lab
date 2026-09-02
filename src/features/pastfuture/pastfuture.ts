import type { Category, Deck, DeckProgress, Flashcard } from '../../types';
import {
  PAST_FUTURE_CONTRAST_CATEGORY,
  PAST_FUTURE_FINAL_TEST_CATEGORY,
  SECTION_BANDS,
  type TimeBand,
} from '../../constants/pastfuture';
import { deckLots, isPastFutureCategory, type Lot } from '../review/languagePolicy';
import { isDeckMastered } from '../review/unlock';
import { sortCards } from '../../utils/cardOrder';

/**
 * The pure half of the Past & Future screens: which installed categories are
 * its sections, which decks make one lesson, how far a lesson has got, and
 * which band of time a section sits in.
 *
 * Like the two levels before it, this leans entirely on shapes that already
 * exist — a lesson is a lot, three language rungs over the same lines, grouped
 * by `deckLots` exactly as the course groups its own. Nothing here re-derives
 * staging; it only reads it. The single question this level asks that no other
 * one does is `bandOf`, and that is a lookup rather than a machine.
 */

/** The sections, in course order, with the final test kept apart. */
export function pastFutureSections(categories: Category[]): Category[] {
  return categories
    .filter(
      (category) =>
        isPastFutureCategory(category) &&
        category.name !== PAST_FUTURE_FINAL_TEST_CATEGORY,
    )
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** The final test's category, once the learner's install has one. */
export function finalTestCategory(categories: Category[]): Category | undefined {
  return categories.find(
    (category) => category.name === PAST_FUTURE_FINAL_TEST_CATEGORY,
  );
}

/** The contrast section, which the level also offers as a timeline drill. */
export function contrastCategory(categories: Category[]): Category | undefined {
  const name = PAST_FUTURE_CONTRAST_CATEGORY.toLowerCase();
  return categories.find((category) => category.name.toLowerCase() === name);
}

/**
 * Which band of time a section teaches, for the level's own signposting.
 *
 * Anything the authored list does not name — a category renamed on a device,
 * or one from a build this one has never seen — reads as `past`, which is
 * where the level starts and the only harmless place to put an unknown.
 */
export function bandOf(category: Pick<Category, 'name'> | undefined): TimeBand {
  if (!category) return 'past';
  return SECTION_BANDS.get(category.name.toLowerCase()) ?? 'past';
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

/** How much of the level is finished, counted in lessons. */
export function levelProgress(
  categories: Category[],
  decks: Deck[],
  deckProgress: Record<string, DeckProgress | undefined>,
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const section of pastFutureSections(categories)) {
    const lessons = lessonsOf(decks.filter((deck) => deck.categoryId === section.id));
    total += lessons.length;
    done += lessons.filter((lesson) => lessonFinished(lesson, deckProgress)).length;
  }
  return { done, total };
}

/**
 * How much of the level she has to have behind her before Free Conversation
 * starts reaching for past and future freely.
 *
 * Half the lessons, and deliberately a low bar: the point of the signal is that
 * a conversation stops avoiding yesterday and tomorrow once she can handle them
 * at all, not that she has finished a level. Below it the partner stays inside
 * what the earlier levels taught, which is what the spec asks for.
 */
export const TENSES_UNLOCKED_SHARE = 0.5;

/**
 * Whether that bar is met.
 *
 * A device with none of this content installed answers false, because `total`
 * is zero — the same answer as a learner who has not started, and the correct
 * one either way.
 */
export function tensesUnlocked(
  categories: Category[],
  decks: Deck[],
  deckProgress: Record<string, DeckProgress | undefined>,
): boolean {
  const { done, total } = levelProgress(categories, decks, deckProgress);
  return total > 0 && done >= Math.ceil(total * TENSES_UNLOCKED_SHARE);
}
