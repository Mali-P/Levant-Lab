import type { AlphabetScript } from '../../types/alphabet';
import { shuffle, type RNG } from '../../utils/random';
import type { PracticeMode } from './questions';

/**
 * A run through one letter deck.
 *
 * Modelled on the vocabulary study engine and deliberately not sharing it: a
 * `StudySession` grades Hebrew and Arabic separately on every card, and a
 * letter has one answer, not two. What is shared is the shape — pure
 * functions, a session value that is replaced rather than mutated, and a
 * retry pile that a letter rejoins until it is right.
 *
 * Nothing here is persisted. A half-finished letter drill is not worth
 * resuming across a reload, and the score that matters was already written to
 * `alphabetProgress` on each answer.
 */

export type PracticeEvent =
  /** Right answer, moved on. */
  | 'continue'
  /** Wrong answer; the letter goes to the back of the pile. */
  | 'retry-queued'
  /** The pass emptied and the retry pile became the new pass. */
  | 'retry-round'
  /** Every letter has been answered correctly. */
  | 'session-complete';

export type PracticeSession = {
  id: string;
  script: AlphabetScript;
  deckId: string;
  mode: PracticeMode;

  /** Letter ids in the current pass. */
  queue: string[];
  index: number;
  /** Letters missed this pass, promoted to the queue when it empties. */
  retry: string[];
  /** Letters answered correctly and not since missed. */
  completed: string[];

  asked: number;
  correct: number;
  /** Ids missed at least once, for the summary at the end. */
  missed: string[];

  startedAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type CreatePracticeSessionParams = {
  id: string;
  script: AlphabetScript;
  deckId: string;
  mode: PracticeMode;
  letterIds: string[];
  now: string;
  /** Off for the review decks, which are already ordered worst-first. */
  shuffleLetters?: boolean;
  rng?: RNG;
};

export function createPracticeSession(
  params: CreatePracticeSessionParams,
): PracticeSession {
  if (params.letterIds.length === 0) {
    throw new Error('Cannot practise an empty deck.');
  }
  const queue =
    params.shuffleLetters === false
      ? [...params.letterIds]
      : shuffle(params.letterIds, params.rng ?? Math.random);

  return {
    id: params.id,
    script: params.script,
    deckId: params.deckId,
    mode: params.mode,
    queue,
    index: 0,
    retry: [],
    completed: [],
    asked: 0,
    correct: 0,
    missed: [],
    startedAt: params.now,
    updatedAt: params.now,
  };
}

export function currentLetterId(session: PracticeSession): string | undefined {
  return session.completedAt ? undefined : session.queue[session.index];
}

/** Letters left in this pass, the one on screen included. */
export function remainingInPass(session: PracticeSession): number {
  return Math.max(0, session.queue.length - session.index);
}

/**
 * How much of the deck is done, 0-1.
 *
 * Counted over distinct letters rather than answers, so a letter missed three
 * times does not make the bar go backwards past where it started.
 */
export function practiceProgress(session: PracticeSession): number {
  const total =
    session.completed.length + session.retry.length + remainingInPass(session);
  if (total === 0) return 1;
  return session.completed.length / total;
}

export type PracticeAnswerOptions = {
  now: string;
  rng?: RNG;
  /** Reshuffle the promoted retry pile. On by default. */
  shuffleRetry?: boolean;
};

export type PracticeOutcome = {
  correct: boolean;
  letterId: string;
  event: PracticeEvent;
  session: PracticeSession;
};

/**
 * Applies one answer and returns the next session. The input is never mutated,
 * so a caller can render straight from the returned value.
 */
export function answerPractice(
  session: PracticeSession,
  correct: boolean,
  opts: PracticeAnswerOptions,
): PracticeOutcome {
  const letterId = currentLetterId(session);
  if (!letterId) throw new Error('There is no letter to answer.');

  const next: PracticeSession = {
    ...session,
    queue: [...session.queue],
    retry: [...session.retry],
    completed: [...session.completed],
    missed: [...session.missed],
    asked: session.asked + 1,
    correct: session.correct + (correct ? 1 : 0),
    updatedAt: opts.now,
  };

  if (correct) {
    if (!next.completed.includes(letterId)) next.completed.push(letterId);
  } else {
    // At most one copy in the pile, however many times it has been missed.
    if (!next.retry.includes(letterId)) next.retry.push(letterId);
    if (!next.missed.includes(letterId)) next.missed.push(letterId);
    // A letter in the retry pile is not learned, so an earlier pass through it
    // no longer counts.
    next.completed = next.completed.filter((id) => id !== letterId);
  }

  const nextIndex = next.index + 1;

  if (nextIndex < next.queue.length) {
    next.index = nextIndex;
    return {
      correct,
      letterId,
      event: correct ? 'continue' : 'retry-queued',
      session: next,
    };
  }

  if (next.retry.length > 0) {
    next.queue =
      opts.shuffleRetry === false
        ? next.retry
        : shuffle(next.retry, opts.rng ?? Math.random);
    next.retry = [];
    next.index = 0;
    return { correct, letterId, event: 'retry-round', session: next };
  }

  next.index = nextIndex;
  next.completedAt = opts.now;
  return { correct, letterId, event: 'session-complete', session: next };
}

/**
 * Drops a letter the current mode turns out not to be able to ask.
 *
 * The deck screens filter by `supportsMode` before starting, but a question
 * can still come back undefined for a letter whose only handwritten asset is
 * for a form this question does not use. Skipping is not an answer: nothing is
 * scored and the letter does not join the retry pile.
 */
export function skipCurrent(
  session: PracticeSession,
  opts: PracticeAnswerOptions,
): PracticeSession {
  const letterId = currentLetterId(session);
  if (!letterId) return session;

  const next: PracticeSession = {
    ...session,
    queue: session.queue.filter((_, i) => i !== session.index),
    updatedAt: opts.now,
  };

  if (next.index < next.queue.length) return next;

  if (next.retry.length > 0) {
    next.queue =
      opts.shuffleRetry === false
        ? [...next.retry]
        : shuffle(next.retry, opts.rng ?? Math.random);
    next.retry = [];
    next.index = 0;
    return next;
  }

  next.completedAt = opts.now;
  return next;
}
