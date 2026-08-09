import { describe, expect, it } from 'vitest';
import type { Flashcard, Language } from '../types';
import { activeLanguages } from './languageSelection';
import {
  buildPromptPlan,
  gradePlan,
  resolveDirection,
} from '../features/study/prompts';
import {
  answerCurrentCard,
  createSession,
  nextIntroCard,
} from '../features/study/engine';
import {
  applyAnswerToProgress,
  computeMasteryScore,
  statusFor,
} from '../features/review/mastery';
import { migrateSettings } from '../stores/settingsStore';

const T0 = '2026-08-09T10:00:00.000Z';
const HEBREW_ONLY: readonly Language[] = ['hebrew'];
const ARABIC_ONLY: readonly Language[] = ['arabic'];

const card: Flashcard = {
  id: 'c1',
  categoryId: 'cat',
  deckId: 'deck',
  english: 'apple',
  hebrew: { script: 'תפוח' },
  arabic: { script: 'تفاحة', dialect: 'Palestinian' },
  createdAt: T0,
  updatedAt: T0,
};

describe('activeLanguages', () => {
  it('gives both by default, and for a row that predates the choice', () => {
    expect(activeLanguages('both')).toEqual(['hebrew', 'arabic']);
    expect(activeLanguages(undefined)).toEqual(['hebrew', 'arabic']);
  });

  it('gives exactly the language chosen', () => {
    expect(activeLanguages('hebrew')).toEqual(['hebrew']);
    expect(activeLanguages('arabic')).toEqual(['arabic']);
  });

  it('is what a stored settings row resolves to, junk included', () => {
    expect(migrateSettings({ studyLanguages: 'hebrew' }).studyLanguages).toBe(
      'hebrew',
    );
    expect(migrateSettings({}).studyLanguages).toBe('both');
    expect(
      migrateSettings({ studyLanguages: 'klingon' as never }).studyLanguages,
    ).toBe('both');
  });
});

describe('the prompt plan under one language', () => {
  it('is untouched when both are on', () => {
    const plan = buildPromptPlan(card, 'en>he+ar');
    expect(plan.fields.map((f) => f.scores)).toEqual(['hebrew', 'arabic']);
  });

  it('asks for only the language being studied', () => {
    expect(
      buildPromptPlan(card, 'en>he+ar', { languages: HEBREW_ONLY }).fields.map(
        (f) => f.scores,
      ),
    ).toEqual(['hebrew']);
    expect(
      buildPromptPlan(card, 'en>he+ar', { languages: ARABIC_ONLY }).fields.map(
        (f) => f.scores,
      ),
    ).toEqual(['arabic']);
  });

  it('never prompts in the language that has been switched off', () => {
    // An Arabic prompt with Arabic off would open the card on a word she is
    // not studying, with nothing underneath it.
    expect(resolveDirection('ar>en+he', HEBREW_ONLY)).toBe('he>en+ar');
    expect(resolveDirection('arAudio>ar+he', HEBREW_ONLY)).toBe('heAudio>he+ar');
    expect(resolveDirection('he>en+ar', ARABIC_ONLY)).toBe('ar>en+he');
    expect(resolveDirection('heAudio>he+ar', ARABIC_ONLY)).toBe('arAudio>ar+he');
    // The English-audio prompt speaks Hebrew, so it moves too.
    expect(resolveDirection('enAudio>he+ar', ARABIC_ONLY)).toBe('arAudio>ar+he');
  });

  it('leaves every direction alone when both languages are on', () => {
    for (const direction of [
      'en>he+ar',
      'he>en+ar',
      'ar>en+he',
      'heAudio>he+ar',
      'arAudio>ar+he',
      'enAudio>he+ar',
    ] as const) {
      expect(resolveDirection(direction)).toBe(direction);
    }
  });

  it('keeps the English field that scores the studied language', () => {
    // Hebrew prompt, Hebrew only: recalling the English meaning is what proves
    // the Hebrew link, so the card still carries a question.
    const plan = buildPromptPlan(card, 'he>en+ar', { languages: HEBREW_ONLY });
    expect(plan.promptLanguage).toBe('hebrew');
    expect(plan.fields).toHaveLength(1);
    expect(plan.fields[0].input).toBe('english');
    expect(plan.fields[0].scores).toBe('hebrew');
  });
});

describe('grading under one language', () => {
  it('counts the card correct on the studied language alone', () => {
    const plan = buildPromptPlan(card, 'en>he+ar', { languages: HEBREW_ONLY });
    const result = gradePlan(
      plan,
      card,
      { hebrew: 'תפוח', arabic: '' },
      { languages: HEBREW_ONLY },
    );
    expect(result.hebrew).toBe(true);
    // Not a claim about her Arabic — it is how "every language asked for" reads
    // when only one was asked, and nothing is recorded against it.
    expect(result.arabic).toBe(true);
  });

  it('still fails the card when the studied language is wrong', () => {
    const plan = buildPromptPlan(card, 'en>he+ar', { languages: HEBREW_ONLY });
    const result = gradePlan(
      plan,
      card,
      { hebrew: 'שגוי', arabic: '' },
      { languages: HEBREW_ONLY },
    );
    expect(result.hebrew).toBe(false);
  });

  it('is unchanged when both languages are on', () => {
    const plan = buildPromptPlan(card, 'en>he+ar');
    expect(gradePlan(plan, card, { hebrew: 'תפוח', arabic: '' })).toEqual({
      hebrew: true,
      arabic: false,
    });
  });
});

describe('the retry queue under one language', () => {
  /**
   * The seam the whole preference turns on: whatever the screen collects, the
   * engine is handed one pair of booleans and decides from `hebrew && arabic`
   * whether the card comes back. A language switched off has to arrive correct,
   * or every card in the deck would queue for retry for ever.
   */
  function testing(languages: readonly Language[]) {
    let session = createSession({
      id: 'session_1',
      deckId: 'deck_1',
      cardIds: ['c1', 'c2', 'c3'],
      mode: 'normal',
      promptDirection: 'en>he+ar',
      answerMode: 'typed',
      perfectRunsRequired: 10,
      now: T0,
    });
    while (session.phase === 'introducing') {
      session = nextIntroCard(session, { now: T0 });
    }
    return { session, plan: buildPromptPlan(card, 'en>he+ar', { languages }) };
  }

  it('lets a card pass on the studied language alone', () => {
    for (const languages of [HEBREW_ONLY, ARABIC_ONLY]) {
      const { session, plan } = testing(languages);
      const typed = languages[0] === 'hebrew' ? 'תפוח' : 'تفاحة';
      const graded = gradePlan(
        plan,
        card,
        { hebrew: '', arabic: '', [languages[0]]: typed },
        { languages },
      );
      const out = answerCurrentCard(session, graded, { now: T0 });
      expect(out.fullyCorrect).toBe(true);
      expect(out.event).not.toBe('retry-queued');
    }
  });

  it('still sends it back when the studied language is wrong', () => {
    const { session, plan } = testing(HEBREW_ONLY);
    const graded = gradePlan(
      plan,
      card,
      { hebrew: 'שגוי', arabic: '' },
      { languages: HEBREW_ONLY },
    );
    const out = answerCurrentCard(session, graded, { now: T0 });
    expect(out.fullyCorrect).toBe(false);
    expect(out.event).toBe('retry-queued');
  });

  it('needs both when both are on, exactly as before', () => {
    const { session, plan } = testing(['hebrew', 'arabic']);
    const graded = gradePlan(plan, card, { hebrew: 'תפוח', arabic: '' });
    const out = answerCurrentCard(session, graded, { now: T0 });
    expect(out.fullyCorrect).toBe(false);
    expect(out.event).toBe('retry-queued');
  });
});

describe('progress under one language', () => {
  it('leaves the unstudied language exactly as it stood', () => {
    let p = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: false }, T0);
    const arabicBefore = p.arabic;

    p = applyAnswerToProgress(
      p,
      'c1',
      { hebrew: true, arabic: true },
      T0,
      HEBREW_ONLY,
    );

    expect(p.hebrew.correct).toBe(2);
    // Not credited, not marked down, not even re-stamped.
    expect(p.arabic).toEqual(arabicBefore);
  });

  it('counts a card correct on the studied language alone', () => {
    const p = applyAnswerToProgress(
      undefined,
      'c1',
      { hebrew: true, arabic: true },
      T0,
      HEBREW_ONLY,
    );
    expect(p.bothCorrectCount).toBe(1);
    expect(p.consecutiveBothCorrect).toBe(1);
  });

  it('does not let an unasked language cap mastery', () => {
    let p = applyAnswerToProgress(
      undefined,
      'c1',
      { hebrew: true, arabic: true },
      T0,
      HEBREW_ONLY,
    );
    for (let i = 0; i < 7; i += 1) {
      p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: true }, T0, HEBREW_ONLY);
    }

    expect(computeMasteryScore(p, HEBREW_ONLY)).toBe(1);
    expect(statusFor(p, T0, false, HEBREW_ONLY)).toBe('mastered');
    // The same row read as a two-language row is still held back by the half
    // that was never asked — which is why the languages have to be passed in.
    expect(computeMasteryScore(p)).toBeLessThan(0.85);
  });

  it('calls a card new when the studied language has never been asked', () => {
    const p = applyAnswerToProgress(
      undefined,
      'c1',
      { hebrew: true, arabic: true },
      T0,
      HEBREW_ONLY,
    );
    expect(statusFor(p, T0, false, ARABIC_ONLY)).toBe('new');
    expect(statusFor(p, T0, false, HEBREW_ONLY)).not.toBe('new');
  });

  it('restores the other language untouched when both come back on', () => {
    let p = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: true }, T0);
    const arabicBefore = { ...p.arabic };

    // A spell of Hebrew-only study...
    for (let i = 0; i < 5; i += 1) {
      p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: true }, T0, HEBREW_ONLY);
    }
    // ...leaves the Arabic accuracy exactly where she left it.
    expect(p.arabic).toEqual(arabicBefore);
  });
});
