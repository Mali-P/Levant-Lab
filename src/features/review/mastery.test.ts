import { describe, expect, it } from 'vitest';
import {
  accuracy,
  applyAnswerToProgress,
  computeMasteryScore,
  isDueForReview,
  isRecovered,
  isWeak,
  statusFor,
  weaknessRank,
  RECOVERY_STREAK,
} from './mastery';

const T0 = '2026-08-06T10:00:00.000Z';
const plusDays = (days: number) =>
  new Date(new Date(T0).getTime() + days * 86400000).toISOString();

describe('per-language statistics', () => {
  it('tracks Hebrew and Arabic independently', () => {
    let p = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: false }, T0);
    p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: false }, T0);

    expect(p.hebrew.correct).toBe(2);
    expect(p.hebrew.incorrect).toBe(0);
    expect(p.arabic.correct).toBe(0);
    expect(p.arabic.incorrect).toBe(2);
    expect(accuracy(p.hebrew)).toBe(1);
    expect(accuracy(p.arabic)).toBe(0);
  });

  it('counts a both-correct answer only when both languages pass', () => {
    let p = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: false }, T0);
    expect(p.bothCorrectCount).toBe(0);
    p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: true }, T0);
    expect(p.bothCorrectCount).toBe(1);
    expect(p.consecutiveBothCorrect).toBe(1);
  });

  it('breaks the consecutive streak on any miss', () => {
    let p = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: true }, T0);
    p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: true }, T0);
    expect(p.consecutiveBothCorrect).toBe(2);
    p = applyAnswerToProgress(p, 'c1', { hebrew: false, arabic: true }, T0);
    expect(p.consecutiveBothCorrect).toBe(0);
    expect(p.bothCorrectCount).toBe(2);
  });

  it('remembers the longest streak per language', () => {
    let p = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: true }, T0);
    p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: false }, T0);
    p = applyAnswerToProgress(p, 'c1', { hebrew: false, arabic: false }, T0);
    expect(p.hebrew.longestStreak).toBe(2);
    expect(p.hebrew.currentStreak).toBe(0);
    expect(p.arabic.longestStreak).toBe(1);
  });
});

describe('mastery scoring', () => {
  it('never rates a one-sided card as mastered', () => {
    let p = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: false }, T0);
    for (let i = 0; i < 20; i++) {
      p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: false }, T0);
    }
    expect(accuracy(p.hebrew)).toBe(1);
    expect(computeMasteryScore(p)).toBeLessThan(0.4);
    expect(statusFor(p, T0)).not.toBe('mastered');
  });

  it('rates a consistently dual-correct card as mastered', () => {
    let p = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: true }, T0);
    for (let i = 0; i < 9; i++) {
      p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: true }, T0);
    }
    expect(statusFor(p, T0)).toBe('mastered');
  });

  it('reports a card that has never been studied as new', () => {
    expect(statusFor(undefined, T0)).toBe('new');
  });
});

describe('decay and review scheduling', () => {
  it('lets a mastered card go rusty over time', () => {
    let p = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: true }, T0);
    for (let i = 0; i < 9; i++) {
      p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: true }, T0);
    }
    expect(statusFor(p, T0)).toBe('mastered');
    expect(statusFor(p, plusDays(5))).toBe('strong');
    // The spec's own dashboard example: mastered 12 days ago reads as Rusty.
    expect(statusFor(p, plusDays(12))).toBe('rusty');
    expect(statusFor(p, plusDays(30))).toBe('needs-review');
  });

  it('does not decay when the setting is off', () => {
    let p = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: true }, T0);
    for (let i = 0; i < 9; i++) {
      p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: true }, T0);
    }
    expect(statusFor(p, plusDays(90), false)).toBe('mastered');
  });

  it('schedules a longer gap as the streak grows', () => {
    const first = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: true }, T0);
    let later = first;
    for (let i = 0; i < 4; i++) {
      later = applyAnswerToProgress(later, 'c1', { hebrew: true, arabic: true }, T0);
    }
    expect(new Date(later.nextReviewAt!).getTime()).toBeGreaterThan(
      new Date(first.nextReviewAt!).getTime(),
    );
  });

  it('uses a consolidation ladder of tomorrow, three days, a week, then a month', () => {
    let p = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: true }, T0);
    expect(p.nextReviewAt).toBe(plusDays(1));

    p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: true }, T0);
    expect(p.nextReviewAt).toBe(plusDays(3));

    p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: true }, T0);
    expect(p.nextReviewAt).toBe(plusDays(7));

    p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: true }, T0);
    expect(p.nextReviewAt).toBe(plusDays(30));
  });

  it('becomes due once the scheduled date passes', () => {
    const p = applyAnswerToProgress(undefined, 'c1', { hebrew: true, arabic: true }, T0);
    expect(isDueForReview(p, T0)).toBe(false);
    expect(isDueForReview(p, plusDays(3))).toBe(true);
  });
});

describe('the weakest list', () => {
  const right = (p: Parameters<typeof applyAnswerToProgress>[0]) =>
    applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: true }, T0);
  const wrong = (p: Parameters<typeof applyAnswerToProgress>[0]) =>
    applyAnswerToProgress(p, 'c1', { hebrew: false, arabic: false }, T0);

  it('leaves a card that has never been missed off it', () => {
    expect(isWeak(right(right(undefined)))).toBe(false);
    expect(isWeak(undefined)).toBe(false);
  });

  it('puts a missed card on it', () => {
    expect(isWeak(wrong(undefined))).toBe(true);
  });

  it('takes a card off once she has earned it back', () => {
    // The bug: a card missed once sat here forever, because the old test was
    // "ever missed" and lifetime accuracy could never climb far enough to
    // matter. Redoing it correctly now clears it.
    let p = wrong(undefined);
    for (let i = 0; i < RECOVERY_STREAK; i += 1) {
      expect(isWeak(p)).toBe(true);
      p = right(p);
    }
    expect(isRecovered(p)).toBe(true);
    expect(isWeak(p)).toBe(false);
  });

  it('puts it straight back the moment she misses it again', () => {
    let p = wrong(undefined);
    for (let i = 0; i < RECOVERY_STREAK; i += 1) p = right(p);
    expect(isWeak(p)).toBe(false);
    expect(isWeak(wrong(p))).toBe(true);
  });

  it('needs the recovery in every language being studied', () => {
    let p = applyAnswerToProgress(undefined, 'c1', { hebrew: false, arabic: false }, T0);
    p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: false }, T0);
    p = applyAnswerToProgress(p, 'c1', { hebrew: true, arabic: false }, T0);
    // Hebrew is back; Arabic is still being missed, so the card stays.
    expect(isWeak(p)).toBe(true);
    // To a learner studying Hebrew alone, it is a card she has put right.
    expect(isWeak(p, ['hebrew'])).toBe(false);
  });

  it('ranks a card missed just now above one half rebuilt since', () => {
    const fresh = wrong(undefined);
    const rebuilding = right(wrong(undefined));
    expect(weaknessRank(fresh)).toBeLessThan(weaknessRank(rebuilding));
  });
});
