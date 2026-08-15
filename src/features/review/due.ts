import type { CardProgress, Category, Deck, Flashcard } from '../../types';
import { isDueForReview } from './mastery';
import {
  BASICS_CATEGORY_NAME,
  basicsBaseName,
  basicsStage,
} from './languagePolicy';

export type DueDeck = {
  deck: Deck;
  due: number;
  total: number;
  nextReviewAt: string;
  label: string;
};

type DueCard = Pick<Flashcard, 'id' | 'deckId'>;

function stageRank(deck: Pick<Deck, 'name' | 'studyLanguages'>): number {
  const stage = basicsStage(deck);
  if (stage === 'hebrew') return 0;
  if (stage === 'arabic') return 1;
  if (stage === 'both') return 2;
  return 3;
}

function dueCardsForDeck(
  deck: Pick<Deck, 'id'>,
  cards: readonly DueCard[],
  cardProgress: Record<string, CardProgress | undefined>,
  now: string,
): { due: number; total: number; nextReviewAt?: string } {
  let due = 0;
  let nextReviewAt: string | undefined;
  const deckCards = cards.filter((card) => card.deckId === deck.id);

  for (const card of deckCards) {
    const progress = cardProgress[card.id];
    if (!isDueForReview(progress, now)) continue;
    due += 1;
    if (
      progress?.nextReviewAt &&
      (!nextReviewAt || progress.nextReviewAt < nextReviewAt)
    ) {
      nextReviewAt = progress.nextReviewAt;
    }
  }

  return { due, total: deckCards.length, nextReviewAt };
}

/**
 * Decks whose scheduled review date has arrived, ordered by urgency and
 * collapsed across Basics language stages so one concept appears once.
 */
export function dueDecksForReview(params: {
  categories: readonly Category[];
  decks: readonly Deck[];
  cards: readonly Flashcard[];
  cardProgress: Record<string, CardProgress | undefined>;
  now: string;
  limit?: number;
}): DueDeck[] {
  const categoryById = new Map(params.categories.map((category) => [category.id, category]));
  const groups = new Map<string, DueDeck>();

  for (const deck of params.decks) {
    const due = dueCardsForDeck(deck, params.cards, params.cardProgress, params.now);
    if (!due.nextReviewAt || due.due === 0) continue;

    const category = categoryById.get(deck.categoryId);
    const basics = category?.name === BASICS_CATEGORY_NAME;
    const label = basics ? basicsBaseName(deck) : deck.name;
    const key = basics ? deck.categoryId + '|' + label.toLowerCase() : deck.id;
    const row: DueDeck = {
      deck,
      due: due.due,
      total: due.total,
      nextReviewAt: due.nextReviewAt,
      label,
    };
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, row);
      continue;
    }

    groups.set(key, {
      deck:
        due.nextReviewAt < existing.nextReviewAt ||
        (due.nextReviewAt === existing.nextReviewAt &&
          stageRank(deck) < stageRank(existing.deck))
          ? deck
          : existing.deck,
      due: existing.due + due.due,
      total: existing.total + due.total,
      nextReviewAt:
        due.nextReviewAt < existing.nextReviewAt ? due.nextReviewAt : existing.nextReviewAt,
      label: existing.label,
    });
  }

  const ordered = [...groups.values()].sort((a, b) => {
    const dueOrder = a.nextReviewAt.localeCompare(b.nextReviewAt);
    if (dueOrder !== 0) return dueOrder;
    return (
      (a.deck.order ?? Number.MAX_SAFE_INTEGER) -
        (b.deck.order ?? Number.MAX_SAFE_INTEGER) ||
      a.label.localeCompare(b.label)
    );
  });

  return typeof params.limit === 'number' ? ordered.slice(0, params.limit) : ordered;
}
