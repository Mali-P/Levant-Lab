import { describe, expect, it } from 'vitest';
import {
  answerCurrentCard,
  createSession,
  remainingInStack,
  type AnswerInput,
} from './engine';
import { mulberry32 } from '../../utils/random';
import type { StudyMode, StudySession } from '../../types';

const NOW = '2026-08-06T10:00:00.000Z';
const CARDS = ['c1', 'c2', 'c3', 'c4'];

type StartOverrides = {
  cardIds?: string[];
  perfectRunsRequired?: number;
  perfectRunsCompleted?: number;
};

function start(mode: StudyMode, o: StartOverrides = {}): StudySession {
  return createSession({
    id: 's1',
    deckId: 'd1',
    cardIds: o.cardIds ?? CARDS,
    mode,
    promptDirection: 'en>he+ar',
    answerMode: 'typed',
    perfectRunsRequired: o.perfectRunsRequired ?? 10,
    perfectRunsCompleted: o.perfectRunsCompleted,
    shuffleCards: false,
    now: NOW,
    rng: mulberry32(42),
  });
}

const BOTH: AnswerInput = { hebrew: true, arabic: true };
const HE_ONLY: AnswerInput = { hebrew: true, arabic: false };
const AR_ONLY: AnswerInput = { hebrew: false, arabic: true };
const NEITHER: AnswerInput = { hebrew: false, arabic: false };

function answer(s: StudySession, input: AnswerInput) {
  return answerCurrentCard(s, input, {
    now: NOW,
    rng: mulberry32(7),
    shuffleAfterFailure: true,
  });
}

/** Answers every card of the current stack with the same input. */
function answerWholeStack(s: StudySession, input: AnswerInput) {
  const total = s.activeCardIds.length;
  let out = answer(s, input);
  for (let i = 1; i < total; i++) out = answer(out.session, input);
  return out;
}

describe('grading both languages independently', () => {
  it('is fully correct only when both languages are right', () => {
    const out = answer(start('normal'), BOTH);
    expect(out.hebrewCorrect).toBe(true);
    expect(out.arabicCorrect).toBe(true);
    expect(out.fullyCorrect).toBe(true);
    expect(out.session.completedCardIds).toEqual(['c1']);
    expect(out.session.retryCardIds).toEqual([]);
  });

  it('fails the card when only Hebrew is right', () => {
    const out = answer(start('normal'), HE_ONLY);
    expect(out.hebrewCorrect).toBe(true);
    expect(out.arabicCorrect).toBe(false);
    expect(out.fullyCorrect).toBe(false);
    expect(out.session.retryCardIds).toEqual(['c1']);
    expect(out.session.completedCardIds).toEqual([]);
  });

  it('fails the card when only Arabic is right', () => {
    const out = answer(start('normal'), AR_ONLY);
    expect(out.fullyCorrect).toBe(false);
    expect(out.session.retryCardIds).toEqual(['c1']);
  });

  it('fails the card when both languages are wrong', () => {
    const out = answer(start('normal'), NEITHER);
    expect(out.hebrewCorrect).toBe(false);
    expect(out.arabicCorrect).toBe(false);
    expect(out.session.retryCardIds).toEqual(['c1']);
  });
});

describe('normal mode retry pile', () => {
  it('queues a partially correct card for retry', () => {
    const out = answer(start('normal'), HE_ONLY);
    expect(out.event).toBe('retry-queued');
    expect(out.session.retryCardIds).toContain('c1');
  });

  it('never lists the same card twice in the retry pile', () => {
    let s = start('normal', { cardIds: ['c1', 'c2'] });
    s = answer(s, HE_ONLY).session;
    const promoted = answer(s, AR_ONLY);
    expect(promoted.event).toBe('retry-round');
    expect(promoted.session.activeCardIds).toEqual(['c1', 'c2']);
    expect(promoted.session.retryCardIds).toEqual([]);

    const again = answer(promoted.session, NEITHER);
    expect(again.session.retryCardIds).toEqual(['c1']);
  });

  it('un-completes a card that is later answered partially', () => {
    let s = start('normal', { cardIds: ['c1', 'c2'] });
    s = answer(s, BOTH).session;
    s = answer(s, NEITHER).session;
    expect(s.activeCardIds).toEqual(['c2']);
    expect(s.completedCardIds).toEqual(['c1']);
  });

  it('completes only when stack and retry pile are both empty', () => {
    let s = start('normal', { cardIds: ['c1', 'c2'] });
    s = answer(s, BOTH).session;
    const promoted = answer(s, HE_ONLY);
    expect(promoted.event).toBe('retry-round');
    expect(promoted.session.completedAt).toBeUndefined();

    const finished = answer(promoted.session, BOTH);
    expect(finished.event).toBe('session-complete');
    expect(finished.session.completedAt).toBe(NOW);
    expect(finished.session.currentCardId).toBeUndefined();
    expect([...finished.session.completedCardIds].sort()).toEqual(['c1', 'c2']);
  });

  it('keeps cycling failed cards until every one is fully correct', () => {
    const s = start('normal', { cardIds: ['c1', 'c2', 'c3'] });
    let out = answerWholeStack(s, NEITHER);
    expect(out.event).toBe('retry-round');
    expect(out.session.activeCardIds).toHaveLength(3);

    out = answerWholeStack(out.session, HE_ONLY);
    expect(out.event).toBe('retry-round');
    expect(out.session.activeCardIds).toHaveLength(3);

    out = answerWholeStack(out.session, BOTH);
    expect(out.event).toBe('session-complete');
  });

  it('reports the cards remaining in the current pass', () => {
    const s = start('normal');
    expect(remainingInStack(s)).toBe(4);
    expect(remainingInStack(answer(s, BOTH).session)).toBe(3);
  });
});

describe('hard mode', () => {
  it('restarts the whole deck after a single mistake', () => {
    let s = start('hard');
    s = answer(s, BOTH).session;
    s = answer(s, BOTH).session;
    expect(s.currentIndex).toBe(2);

    const failed = answer(s, AR_ONLY);
    expect(failed.event).toBe('run-failed');
    expect(failed.session.currentIndex).toBe(0);
    expect(failed.session.currentRunCorrect).toBe(0);
    expect(failed.session.completedCardIds).toEqual([]);
    expect([...failed.session.activeCardIds].sort()).toEqual(CARDS);
  });

  it('keeps earned perfect runs after a failed run', () => {
    const s = start('hard', { perfectRunsCompleted: 4 });
    expect(answer(s, NEITHER).session.perfectRunsCompleted).toBe(4);
  });

  it('wipes perfect runs on failure when brutal reset is enabled', () => {
    const s = start('hard', { perfectRunsCompleted: 4 });
    const failed = answerCurrentCard(s, NEITHER, {
      now: NOW,
      rng: mulberry32(7),
      brutalReset: true,
    });
    expect(failed.session.perfectRunsCompleted).toBe(0);
  });

  it('increments perfect runs exactly once per flawless deck run', () => {
    const out = answerWholeStack(start('hard'), BOTH);
    expect(out.event).toBe('perfect-run');
    expect(out.session.perfectRunsCompleted).toBe(1);
    expect(out.session.currentIndex).toBe(0);
    expect(out.session.currentRunCorrect).toBe(0);
    expect(out.session.completedAt).toBeUndefined();
    expect([...out.session.activeCardIds].sort()).toEqual(CARDS);
  });

  it('passes the deck only after the required perfect runs', () => {
    let s = start('hard', { cardIds: ['c1', 'c2'], perfectRunsRequired: 10 });
    for (let run = 1; run <= 9; run++) {
      const out = answerWholeStack(s, BOTH);
      expect(out.event).toBe('perfect-run');
      expect(out.session.perfectRunsCompleted).toBe(run);
      s = out.session;
    }
    const mastered = answerWholeStack(s, BOTH);
    expect(mastered.event).toBe('deck-mastered');
    expect(mastered.session.perfectRunsCompleted).toBe(10);
    expect(mastered.session.completedAt).toBe(NOW);
  });

  it('demands 100 flawless answers for a 10-card, 10-run deck', () => {
    const cards = Array.from({ length: 10 }, (_unused, i) => 'c' + i);
    let out = answerWholeStack(
      start('hard', { cardIds: cards, perfectRunsRequired: 10 }),
      BOTH,
    );
    for (let run = 2; run <= 10; run++) {
      out = answerWholeStack(out.session, BOTH);
    }
    expect(out.event).toBe('deck-mastered');
    expect(out.session.answers).toHaveLength(100);
  });

  it('refuses to grade once the deck is mastered', () => {
    const out = answerWholeStack(
      start('hard', { cardIds: ['c1'], perfectRunsRequired: 1 }),
      BOTH,
    );
    expect(out.event).toBe('deck-mastered');
    expect(() => answer(out.session, BOTH)).toThrow();
  });
});

describe('brutal mode', () => {
  it('resets perfect run progress to zero on any mistake', () => {
    const failed = answer(start('brutal', { perfectRunsCompleted: 6 }), HE_ONLY);
    expect(failed.event).toBe('run-failed');
    expect(failed.session.perfectRunsCompleted).toBe(0);
    expect(failed.session.currentIndex).toBe(0);
  });

  it('still awards perfect runs for flawless passes', () => {
    const out = answerWholeStack(start('brutal'), BOTH);
    expect(out.event).toBe('perfect-run');
    expect(out.session.perfectRunsCompleted).toBe(1);
  });
});

describe('session restoration', () => {
  it('resumes a serialised session with identical behaviour', () => {
    let s = start('normal');
    s = answer(s, BOTH).session;
    s = answer(s, HE_ONLY).session;

    const restored: StudySession = JSON.parse(JSON.stringify(s));
    expect(restored).toEqual(s);
    expect(answer(restored, BOTH).session).toEqual(answer(s, BOTH).session);
  });

  it('does not mutate the session it was handed', () => {
    const s = start('normal');
    const snapshot = JSON.parse(JSON.stringify(s));
    answer(s, NEITHER);
    expect(s).toEqual(snapshot);
  });

  it('rejects an empty deck', () => {
    expect(() => start('normal', { cardIds: [] })).toThrow();
  });
});
