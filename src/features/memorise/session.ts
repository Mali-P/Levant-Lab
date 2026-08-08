import { shuffle, type RNG } from '../../utils/random';

/**
 * One pass through a deck in Memorise mode.
 *
 * Memorise is not a test. There is nothing to recall, nothing to grade, no
 * retry pile, and no perfect runs — the learner flips each card, reads every
 * form, and moves on. That is why this deliberately does not reuse
 * `StudySession`: touching the study engine would feed answers into
 * `cardProgress`, the Hebrew / Arabic accuracy figures and the deck unlock
 * ladder, none of which should move because somebody looked at a word.
 *
 * Nothing here is persisted either. A half-finished flip-through is cheap to
 * repeat, and there is no score worth carrying across a reload.
 */

export type MemoriseSession = {
  deckId: string;
  /** Card ids in the order they will be shown. */
  order: string[];
  index: number;
  /**
   * Cards whose back has actually been revealed. Counted separately from
   * `index` so the tally means "read", not "scrolled past" — and it is a tally
   * only. Seeing a card never makes it mastered.
   */
  viewed: string[];
  /** Whether the card on screen is showing its back. */
  flipped: boolean;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type CreateMemoriseSessionParams = {
  deckId: string;
  cardIds: string[];
  now: string;
  /** Follows the learner's shuffle setting; off keeps the deck's own order. */
  shuffleCards?: boolean;
  rng?: RNG;
};

export function createMemoriseSession(
  params: CreateMemoriseSessionParams,
): MemoriseSession {
  if (params.cardIds.length === 0) {
    throw new Error('Cannot memorise an empty deck.');
  }

  const order =
    params.shuffleCards === false
      ? [...params.cardIds]
      : shuffle(params.cardIds, params.rng ?? Math.random);

  return {
    deckId: params.deckId,
    order,
    index: 0,
    viewed: [],
    flipped: false,
    startedAt: params.now,
    updatedAt: params.now,
  };
}

export function currentMemoriseCardId(
  session: MemoriseSession,
): string | undefined {
  return session.completedAt ? undefined : session.order[session.index];
}

/** Cards left in the pass, the one on screen included. */
export function remainingToView(session: MemoriseSession): number {
  if (session.completedAt) return 0;
  return Math.max(0, session.order.length - session.index);
}

/**
 * Turns the current card over and records that its forms have been read.
 *
 * Flipping back is allowed and does not un-view the card: once the learner has
 * seen the answer, they have seen it.
 */
export function flipCard(
  session: MemoriseSession,
  now: string,
): MemoriseSession {
  const cardId = currentMemoriseCardId(session);
  if (!cardId) return session;

  const next: MemoriseSession = {
    ...session,
    viewed: [...session.viewed],
    flipped: !session.flipped,
    updatedAt: now,
  };

  if (!next.viewed.includes(cardId)) next.viewed.push(cardId);
  return next;
}

/**
 * Moves to the next card, or ends the pass on the last one.
 *
 * A card advanced past without flipping is simply not counted as viewed — the
 * learner is never asked about it and nothing is marked wrong.
 */
export function nextCard(
  session: MemoriseSession,
  now: string,
): MemoriseSession {
  if (session.completedAt) return session;

  const nextIndex = session.index + 1;

  if (nextIndex < session.order.length) {
    return { ...session, index: nextIndex, flipped: false, updatedAt: now };
  }

  return {
    ...session,
    index: nextIndex,
    flipped: false,
    updatedAt: now,
    completedAt: now,
  };
}

/**
 * Steps back to the card before this one.
 *
 * Free in both directions because nothing here is graded: there is no answer to
 * un-record and no score to hand back. The view tally is deliberately left
 * alone — a card whose back has been read stays read, however many times the
 * learner walks past it again.
 *
 * The first card and a finished pass both have nowhere to go, and say so by
 * returning the session untouched rather than by wrapping around.
 */
export function previousCard(
  session: MemoriseSession,
  now: string,
): MemoriseSession {
  if (session.completedAt || session.index === 0) return session;
  return {
    ...session,
    index: session.index - 1,
    flipped: false,
    updatedAt: now,
  };
}

export type RestartMemoriseOptions = {
  now: string;
  shuffleCards?: boolean;
  rng?: RNG;
};

/** A fresh pass over the same cards, with the view tally reset. */
export function restartMemorise(
  session: MemoriseSession,
  opts: RestartMemoriseOptions,
): MemoriseSession {
  return createMemoriseSession({
    deckId: session.deckId,
    cardIds: session.order,
    now: opts.now,
    shuffleCards: opts.shuffleCards,
    rng: opts.rng,
  });
}

/** How far through the pass the learner is, 0-1. */
export function memoriseProgress(session: MemoriseSession): number {
  if (session.order.length === 0) return 1;
  return Math.min(1, session.index / session.order.length);
}
