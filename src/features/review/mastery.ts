import {
  LANGUAGES,
  type CardProgress,
  type Language,
  type LanguageProgress,
  type MasteryStatus,
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
 * Mastery blends the languages being studied and is capped by the weakest of
 * them: a card the learner only half knows must never read as mastered.
 *
 * With one language on, the weakest and the mean are that one language and the
 * formula keeps its shape — the same weights over a set of one. This is what
 * stops an unstudied half from reading as 0% accuracy and pinning every card to
 * "forgotten": a language nobody is being asked about has no accuracy, not a
 * bad one.
 */
export function computeMasteryScore(
  p: CardProgress,
  languages: readonly Language[] = LANGUAGES,
): number {
  const scores = languages.map((language) => accuracy(p[language]));
  const exposure = Math.min(1, p.bothCorrectCount / 6);
  const consistency = Math.min(1, p.consecutiveBothCorrect / 4);
  const weakest = Math.min(...scores);
  const mean = scores.reduce((n, v) => n + v, 0) / scores.length;
  const blended = weakest * 0.5 + mean * 0.2 + exposure * 0.2 + consistency * 0.1;
  return Math.max(0, Math.min(1, Number(blended.toFixed(4))));
}

function scheduleNextReview(p: CardProgress, now: string): string {
  const step = Math.min(p.consecutiveBothCorrect, REVIEW_LADDER.length) - 1;
  const days = step < 0 ? 1 : REVIEW_LADDER[step];
  return new Date(new Date(now).getTime() + days * DAY_MS).toISOString();
}

/**
 * Folds one graded answer into a card's stored progress. Pure.
 *
 * A language that is not being studied is left exactly as it stands — not
 * credited, not marked down, not even re-stamped with a review date. It was
 * never asked, so it has learned nothing about her either way, and switching it
 * back on returns its accuracy untouched rather than diluted by a run it sat
 * out. `bothCorrectCount` and the consecutive count then mean "every language
 * asked for, correct", which is the same thing they always meant.
 */
export function applyAnswerToProgress(
  existing: CardProgress | undefined,
  cardId: string,
  result: { hebrew: boolean; arabic: boolean },
  now: string,
  languages: readonly Language[] = LANGUAGES,
): CardProgress {
  const base = existing ?? emptyCardProgress(cardId);
  const all = languages.every((language) => result[language]);

  const next: CardProgress = {
    ...base,
    cardId,
    hebrew: languages.includes('hebrew')
      ? applyLanguage(base.hebrew, result.hebrew, now)
      : base.hebrew,
    arabic: languages.includes('arabic')
      ? applyLanguage(base.arabic, result.arabic, now)
      : base.arabic,
    bothCorrectCount: base.bothCorrectCount + (all ? 1 : 0),
    consecutiveBothCorrect: all ? base.consecutiveBothCorrect + 1 : 0,
    masteryScore: base.masteryScore,
  };

  next.masteryScore = computeMasteryScore(next, languages);
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
  languages: readonly Language[] = LANGUAGES,
): MasteryStatus {
  if (!p) return 'new';
  // Only the languages being studied count towards "has this been met at all".
  // A card answered ten times in Hebrew is not new because its Arabic half was
  // never asked.
  const asked = languages.reduce((n, language) => n + attempts(p[language]), 0);
  if (asked === 0) return 'new';

  const elapsed = daysSinceReview(p, now) ?? 0;
  // Calibrated so a fully mastered card reads as "Rusty" about twelve days
  // after its last session, and bottoms out rather than decaying forever.
  const decay = decayEnabled ? Math.min(0.7, elapsed / 30) : 0;
  // Recomputed rather than read off the row: the stored score was written under
  // whichever languages were on at the time, and a learner who has just
  // narrowed or widened her study should see the status that follows from what
  // she is studying now, not from what she was studying last week. With both on
  // it returns exactly what was stored.
  const effective = computeMasteryScore(p, languages) - decay;

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
