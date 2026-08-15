import { describe, expect, it } from 'vitest';
import type { CardProgress, Category, Deck, Flashcard } from '../../types';
import { emptyCardProgress } from '../../services/database/defaults';
import { dueDecksForReview } from './due';

const NOW = '2026-08-15T10:00:00.000Z';
const YESTERDAY = '2026-08-14T10:00:00.000Z';
const TOMORROW = '2026-08-16T10:00:00.000Z';

function category(id: string, name: string, order = 0): Category {
  return {
    id,
    name,
    icon: '',
    order,
    createdAt: '',
    updatedAt: '',
  };
}

function deck(
  id: string,
  categoryId: string,
  name: string,
  order: number,
  studyLanguages?: Deck['studyLanguages'],
): Deck {
  return {
    id,
    categoryId,
    name,
    order,
    studyLanguages,
    perfectRunsRequired: 10,
    promptDirections: [],
    createdAt: '',
    updatedAt: '',
  };
}

function card(id: string, deck: Deck): Flashcard {
  return {
    id,
    categoryId: deck.categoryId,
    deckId: deck.id,
    english: id,
    hebrew: { script: '', transliteration: '' },
    arabic: { script: '', transliteration: '' },
    createdAt: '',
    updatedAt: '',
  };
}

function progress(cardId: string, nextReviewAt: string): CardProgress {
  return {
    ...emptyCardProgress(cardId),
    cardId,
    nextReviewAt,
    bothCorrectCount: 2,
    consecutiveBothCorrect: 2,
    hebrew: {
      correct: 2,
      incorrect: 0,
      currentStreak: 2,
      longestStreak: 2,
      lastReviewedAt: YESTERDAY,
    },
    arabic: {
      correct: 2,
      incorrect: 0,
      currentStreak: 2,
      longestStreak: 2,
      lastReviewedAt: YESTERDAY,
    },
    masteryScore: 0.9,
  };
}

describe('dueDecksForReview', () => {
  it('only includes cards whose scheduled review date has arrived', () => {
    const cat = category('numbers', 'Counting and numbers');
    const oneToTen = deck('one-ten', cat.id, 'One to ten', 0);
    const dueCard = card('one', oneToTen);
    const reviewedCard = card('two', oneToTen);

    const due = dueDecksForReview({
      categories: [cat],
      decks: [oneToTen],
      cards: [dueCard, reviewedCard],
      cardProgress: {
        [dueCard.id]: progress(dueCard.id, YESTERDAY),
        [reviewedCard.id]: progress(reviewedCard.id, TOMORROW),
      },
      now: NOW,
    });

    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({
      deck: oneToTen,
      due: 1,
      total: 2,
      label: 'One to ten',
    });
  });

  it('collapses Basics language stages into one concept row', () => {
    const basics = category('basics', 'Basics of Basics');
    const hebrew = deck('directions-he', basics.id, 'Directions — Hebrew', 0, ['hebrew']);
    const arabic = deck(
      'directions-ar',
      basics.id,
      'Directions — Palestinian Arabic',
      1,
      ['arabic'],
    );
    const both = deck('directions-both', basics.id, 'Directions — Both', 2, [
      'hebrew',
      'arabic',
    ]);
    const cards = [card('up-he', hebrew), card('up-ar', arabic), card('up-both', both)];

    const due = dueDecksForReview({
      categories: [basics],
      decks: [hebrew, arabic, both],
      cards,
      cardProgress: Object.fromEntries(
        cards.map((entry) => [entry.id, progress(entry.id, YESTERDAY)]),
      ),
      now: NOW,
    });

    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({
      deck: hebrew,
      due: 3,
      total: 3,
      label: 'Directions',
    });
  });
});
