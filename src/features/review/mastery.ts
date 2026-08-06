import type {
  CardProgress,
  LanguageProgress,
  MasteryStatus,
} from '../../types';
import { emptyCardProgress } from '../../services/database/defaults';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Interval in days after N consecutive both-correct answers. */
const REVIEW_LADDER = [1, 2, 4, 8, 16, 32, 64];

export function accuracy(p: LanguageProgress): number {
  const total = p.correct + p.incorrect;
  return total === 0 ? 0 : p.correct / total;
}

export function attempts(p: LanguageProgress): number {
  return p.correct + p.incorrect;
}

function applyLanguage(
  p: LanguageProgress,
  correct: boolean,
  now: string,
): LanguageProgress {
  const currentStreak = correct ? p.currentStreak + 1 : 0;
  return {
    correct: p.correct + (correct ? 1 : 0),
    incorrect: p.incorrect + (correct ? 0 : 1),
    currentStreak,
    longestStreak: Math.max(p.longestStreak, currentStreak),
    lastReviewedAt: now,
  };
}

/**
 * Mastery blends both languages but is capped by the weaker one: a card the
 * user only half knows must never read as mastered.
 */
export function computeMasteryScore(p: CardProgress): number {
  const he = accuracy(p.hebrew);
  const ar = accuracy(p.arabic);
  const exposure = Math.min(1, p.bothCorrectCount / 6);
  const consistency = Math.min(1, p.consecutiveBothCorrect / 4);
  const weaker = Math.min(he, ar);
  const blended = weaker * 0.5 + ((he + ar) / 2) * 0.2 + exposure * 0.2 + consistency * 0.1;
  return Math.max(0, Math.min(1, Number(blended.toFixed(4))));
}

function scheduleNextReview(p: CardProgress, now: string): string {
  const step = Math.min(p.consecutiveBothCorrect, REVIEW_LADDER.length) - 1;
  const days = step < 0 ? 1 : REVIEW_LADDER[step];
  return new Date(new Date(now).getTime() + days * DAY_MS).toISOString();
}

/** Folds one graded answer into a card's stored progress. Pure. */
export function applyAnswerToProgress(
  existing: CardProgress | undefined,
  cardId: string,
  result: { hebrew: boolean; arabic: boolean },
  now: string,
): CardProgress {
  const base = existing ?? emptyCardProgress(cardId);
  const both = result.hebrew && result.arabic;

  const next: CardProgress = {
    ...base,
    cardId,
    hebrew: applyLanguage(base.hebrew, result.hebrew, now),
    arabic: applyLanguage(base.arabic, result.arabic, now),
    bothCorrectCount: base.bothCorrectCount + (both ? 1 : 0),
    consecutiveBothCorrect: both ? base.consecutiveBothCorrect + 1 : 0,
    masteryScore: base.masteryScore,
  };

  next.masteryScore = computeMasteryScore(next);
  next.nextReviewAt = scheduleNextReview(next, now);
  return next;
}

export function daysSinceReview(p: CardProgress, now: string): number | null {
  const last = p.hebrew.lastReviewedAt ?? p.arabic.lastReviewedAt;
  if (!last) return null;
  return (new Date(now).getTime() - new Date(last).getTime()) / DAY_MS;
}

/**
 * Mastery decays with time away. A card mastered a fortnight ago is not the
 * same as one mastered this morning, so status is scored on both.
 */
export function statusFor(
  p: CardProgress | undefined,
  now: string,
  decayEnabled = true,
): MasteryStatus {
  if (!p || attempts(p.hebrew) + attempts(p.arabic) === 0) return 'new';

  const elapsed = daysSinceReview(p, now) ?? 0;
  // Calibrated so a fully mastered card reads as "Rusty" about twelve days
  // after its last session, and bottoms out rather than decaying forever.
  const decay = decayEnabled ? Math.min(0.7, elapsed / 30) : 0;
  const effective = p.masteryScore - decay;

  if (effective >= 0.85) return 'mastered';
  if (effective >= 0.65) return 'strong';
  if (effective >= 0.45) return 'rusty';
  if (effective >= 0.2) return 'needs-review';
  return 'forgotten';
}

export function isDueForReview(
  p: CardProgress | undefined,
  now: string,
): boolean {
  if (!p || !p.nextReviewAt) return false;
  return new Date(p.nextReviewAt).getTime() <= new Date(now).getTime();
}

export const STATUS_LABELS: Record<MasteryStatus, string> = {
  new: 'Not studied',
  mastered: 'Mastered',
  strong: 'Strong',
  rusty: 'Rusty',
  'needs-review': 'Needs review',
  forgotten: 'Forgotten',
};
