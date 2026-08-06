import type {
  AnswerMode,
  PromptDirection,
  StudyMode,
  StudySession,
} from '../../types';
import { shuffle, type RNG } from '../../utils/random';

export type AnswerInput = { hebrew: boolean; arabic: boolean };

export type StudyEvent =
  /** Normal mode: both languages correct, moved to the next card. */
  | 'continue'
  /** Normal mode: at least one language wrong, card sent to the retry pile. */
  | 'retry-queued'
  /** Normal mode: the active stack emptied and the retry pile was promoted. */
  | 'retry-round'
  /** Normal mode: active stack and retry pile are both empty. */
  | 'session-complete'
  /** Hard / brutal: a mistake ended the run; the deck was reshuffled. */
  | 'run-failed'
  /** Hard / brutal: a flawless full-deck run finished, more runs still required. */
  | 'perfect-run'
  /** Hard / brutal: the required number of perfect runs is complete. */
  | 'deck-mastered';

export type AnswerOutcome = {
  hebrewCorrect: boolean;
  arabicCorrect: boolean;
  fullyCorrect: boolean;
  event: StudyEvent;
  session: StudySession;
};

export type CreateSessionParams = {
  id: string;
  deckId: string;
  cardIds: string[];
  mode: StudyMode;
  promptDirection: PromptDirection;
  answerMode: AnswerMode;
  perfectRunsRequired: number;
  /** Carried over from deck progress so hard-mode runs accumulate across sessions. */
  perfectRunsCompleted?: number;
  shuffleCards?: boolean;
  now: string;
  rng?: RNG;
};

export type AnswerOptions = {
  now: string;
  rng?: RNG;
  /** Reshuffle the stack after a failed hard-mode run. */
  shuffleAfterFailure?: boolean;
  /** Wipe accumulated perfect runs on a hard-mode failure. Always on in brutal mode. */
  brutalReset?: boolean;
};

export function createSession(params: CreateSessionParams): StudySession {
  if (params.cardIds.length === 0) {
    throw new Error('Cannot start a session with an empty deck.');
  }
  const rng = params.rng ?? Math.random;
  // Only the opening order is optional. Hard and brutal runs always reshuffle
  // after a failure regardless of this flag, per the hard-mode rules.
  const order =
    params.shuffleCards === false
      ? [...params.cardIds]
      : shuffle(params.cardIds, rng);

  return {
    id: params.id,
    deckId: params.deckId,
    mode: params.mode,
    promptDirection: params.promptDirection,
    answerMode: params.answerMode,
    activeCardIds: order,
    retryCardIds: [],
    completedCardIds: [],
    currentCardId: order[0],
    currentIndex: 0,
    currentRunCorrect: 0,
    currentRunFailed: false,
    perfectRunsCompleted: params.perfectRunsCompleted ?? 0,
    perfectRunsRequired: Math.max(1, params.perfectRunsRequired),
    answers: [],
    startedAt: params.now,
    updatedAt: params.now,
  };
}

/**
 * Applies one answer to the session and returns the next session state.
 *
 * Pure: the input session is never mutated, so the caller can persist the
 * returned value and replay from it after a reload.
 */
export function answerCurrentCard(
  session: StudySession,
  input: AnswerInput,
  opts: AnswerOptions,
): AnswerOutcome {
  const cardId = session.currentCardId;
  if (!cardId || session.completedAt) {
    throw new Error('There is no active card to answer.');
  }

  const rng = opts.rng ?? Math.random;
  const fullyCorrect = input.hebrew && input.arabic;

  const s: StudySession = {
    ...session,
    activeCardIds: [...session.activeCardIds],
    retryCardIds: [...session.retryCardIds],
    completedCardIds: [...session.completedCardIds],
    answers: [
      ...session.answers,
      { cardId, hebrew: input.hebrew, arabic: input.arabic, at: opts.now },
    ],
    updatedAt: opts.now,
  };

  const event =
    s.mode === 'normal'
      ? applyNormal(s, cardId, fullyCorrect, opts.now)
      : applyStrict(s, cardId, fullyCorrect, opts, rng);

  return {
    hebrewCorrect: input.hebrew,
    arabicCorrect: input.arabic,
    fullyCorrect,
    event,
    session: s,
  };
}

function applyNormal(
  s: StudySession,
  cardId: string,
  fullyCorrect: boolean,
  now: string,
): StudyEvent {
  if (fullyCorrect) {
    if (!s.completedCardIds.includes(cardId)) s.completedCardIds.push(cardId);
    s.currentRunCorrect += 1;
  } else {
    // Duplicate retry prevention: a card sits in the pile at most once.
    if (!s.retryCardIds.includes(cardId)) s.retryCardIds.push(cardId);
    // A partially correct card is not mastered, so drop any earlier completion.
    s.completedCardIds = s.completedCardIds.filter((id) => id !== cardId);
  }

  const nextIndex = s.currentIndex + 1;

  if (nextIndex < s.activeCardIds.length) {
    s.currentIndex = nextIndex;
    s.currentCardId = s.activeCardIds[nextIndex];
    return fullyCorrect ? 'continue' : 'retry-queued';
  }

  if (s.retryCardIds.length > 0) {
    s.activeCardIds = s.retryCardIds;
    s.retryCardIds = [];
    s.currentIndex = 0;
    s.currentCardId = s.activeCardIds[0];
    return 'retry-round';
  }

  s.currentIndex = nextIndex;
  s.currentCardId = undefined;
  s.completedAt = now;
  return 'session-complete';
}

function applyStrict(
  s: StudySession,
  cardId: string,
  fullyCorrect: boolean,
  opts: AnswerOptions,
  rng: RNG,
): StudyEvent {
  if (!fullyCorrect) {
    const wipeProgress = s.mode === 'brutal' || opts.brutalReset === true;
    if (wipeProgress) s.perfectRunsCompleted = 0;
    restartRun(s, opts.shuffleAfterFailure !== false, rng);
    return 'run-failed';
  }

  s.currentRunCorrect += 1;
  if (!s.completedCardIds.includes(cardId)) s.completedCardIds.push(cardId);

  const nextIndex = s.currentIndex + 1;
  if (nextIndex < s.activeCardIds.length) {
    s.currentIndex = nextIndex;
    s.currentCardId = s.activeCardIds[nextIndex];
    return 'continue';
  }

  // Flawless full-deck run.
  s.perfectRunsCompleted += 1;

  if (s.perfectRunsCompleted >= s.perfectRunsRequired) {
    s.currentIndex = nextIndex;
    s.currentCardId = undefined;
    s.currentRunFailed = false;
    s.completedAt = opts.now;
    return 'deck-mastered';
  }

  restartRun(s, true, rng);
  return 'perfect-run';
}

function restartRun(s: StudySession, reshuffle: boolean, rng: RNG): void {
  if (reshuffle) s.activeCardIds = shuffle(s.activeCardIds, rng);
  s.completedCardIds = [];
  s.retryCardIds = [];
  s.currentIndex = 0;
  s.currentCardId = s.activeCardIds[0];
  s.currentRunCorrect = 0;
  // The failed run is over; the fresh one starts clean.
  s.currentRunFailed = false;
}

/** Cards left in the current pass, including the one on screen. */
export function remainingInStack(s: StudySession): number {
  return Math.max(0, s.activeCardIds.length - s.currentIndex);
}

export function isComplete(s: StudySession): boolean {
  return Boolean(s.completedAt);
}
