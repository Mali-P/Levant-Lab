import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Flashcard } from '../../types';
import { checkLanguage } from '../answerValidation/validate';
import { db } from './db';
import { installStarterCards } from './seed';

/**
 * The seeder is the only route the starter table has into the app. A card whose
 * speaker/listener variants are dropped on the way in still renders — it just
 * falls back to `script`, which is one perspective's wording shown as if it
 * were everybody's. That failure is silent, so it is pinned here.
 */

let howAreYou: Flashcard;
let takeCare: Flashcard;
let toothbrush: Flashcard;

beforeAll(async () => {
  await installStarterCards();
  const cards = await db.cards.toArray();
  howAreYou = cards.find((card) => card.english === 'how are you?')!;
  takeCare = cards.find((card) => card.english === 'take care')!;
  toothbrush = cards.find((card) => card.english === 'toothbrush')!;
});

describe('installStarterCards', () => {
  it('carries speaker/listener variants into the database', () => {
    expect(howAreYou).toBeDefined();
    expect(howAreYou.arabic.speechForms).toBeDefined();
    expect(howAreYou.hebrew.speechForms).toBeDefined();
  });

  it('stores the male-speaker perspectives as pointers, not copies', () => {
    expect(howAreYou.arabic.speechForms?.maleToMale).toEqual({
      sameAs: 'femaleToMale',
    });
  });

  it('leads with the wording a woman uses to a man', () => {
    const primary = howAreYou.arabic.speechForms?.femaleToMale as {
      script: string;
    };
    expect(howAreYou.arabic.script).toBe(primary.script);
  });

  it('grades only against the perspectives the learner has enabled', () => {
    // دير بالك is what she says to a man, ديري بالك to a woman.
    const toMale = checkLanguage('دير بالك', takeCare.arabic, 'arabic', {
      perspectives: ['femaleToMale'],
    });
    const toFemale = checkLanguage('ديري بالك', takeCare.arabic, 'arabic', {
      perspectives: ['femaleToMale'],
    });

    expect(toMale.correct).toBe(true);
    expect(toFemale.correct).toBe(false);

    // Widening the setting widens what counts, and nothing else.
    expect(
      checkLanguage('ديري بالك', takeCare.arabic, 'arabic', {
        perspectives: ['femaleToMale', 'femaleToFemale'],
      }).correct,
    ).toBe(true);
  });

  it('keeps progress keyed by card alone, so perspectives can change freely', async () => {
    await db.cardProgress.put({
      cardId: howAreYou.id,
      hebrew: { correct: 3, incorrect: 0, currentStreak: 3, longestStreak: 3 },
      arabic: { correct: 3, incorrect: 0, currentStreak: 3, longestStreak: 3 },
      bothCorrectCount: 3,
      consecutiveBothCorrect: 3,
      masteryScore: 60,
    });

    // A second top-up stands in for the learner switching perspectives and
    // relaunching: the card is rewritten, the score is not touched.
    await installStarterCards();

    const progress = await db.cardProgress.get(howAreYou.id);
    expect(progress?.masteryScore).toBe(60);
    expect(progress?.arabic.currentStreak).toBe(3);
  }, 20000);

  it('attaches newly bundled Arabic clips to starter cards', () => {
    expect(toothbrush.arabic.audioPath).toBe(
      'assets/audio/ar/care-and-hygiene__bathroom-shelf__toothbrush_neutral.mp3',
    );
  });
});
