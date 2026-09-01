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
let goingHome: Flashcard;

beforeAll(async () => {
  await installStarterCards();
  const cards = await db.cards.toArray();
  howAreYou = cards.find((card) => card.english === 'how are you?')!;
  takeCare = cards.find((card) => card.english === 'take care')!;
  toothbrush = cards.find((card) => card.english === 'toothbrush')!;
  // A Conversation Flow turn — the only kind of card carrying the line it
  // answers — taken off the exchange that opens the level.
  goingHome = cards.find((card) => card.english === 'Home' && Boolean(card.cue))!;
});

describe('a Conversation Flow turn, once installed', () => {
  it('carries the line it answers into the database', () => {
    // Dropped on the way in, the card still renders — as a bare "Home" with
    // nothing asking it anything, which is Sentence Building again rather than
    // this level. The failure is silent, so it is pinned here.
    expect(goingHome).toBeDefined();
    expect(goingHome.cue?.english).toBe('Where are you going?');
    expect(goingHome.cue?.hebrew.script).toBeTruthy();
    expect(goingHome.cue?.arabic.script).toBeTruthy();
  });

  it('keeps the cue gendered by the learner, who is the one being asked', () => {
    // A question put *to* her follows her own gender, which the app stores as
    // `speaker`. Arriving without it, the pair would read as word gender and
    // both halves would show on every card for ever.
    expect(goingHome.cue?.hebrew.agreement).toBe('speaker');
    expect(goingHome.cue?.hebrew.forms?.feminine.script).toBeTruthy();
    expect(goingHome.cue?.hebrew.forms?.masculine.script).toBeTruthy();
    expect(goingHome.cue?.hebrew.script).toBe(
      goingHome.cue?.hebrew.forms?.feminine.script,
    );
  });

  it('marks the cue as Palestinian, like every other Arabic side', () => {
    expect(goingHome.cue?.arabic.dialect).toBe('Palestinian');
  });

  it('leaves every other card without one', () => {
    expect(toothbrush.cue).toBeUndefined();
    expect(howAreYou.cue).toBeUndefined();
  });
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
  }, 300000);

  it('attaches newly bundled Arabic clips to starter cards', () => {
    expect(toothbrush.arabic.audioPath).toBe(
      'assets/audio/ar/care-and-hygiene__bathroom-shelf__toothbrush_neutral.mp3',
    );
  });
});
