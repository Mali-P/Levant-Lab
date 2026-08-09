import type {
  AnswerMode,
  Language,
  PromptDirection,
  StudyMode,
  StudyPhase,
  StudySession,
} from '../../types';
import type { RNG } from '../../utils/random';
import { buildRound, nextStageSize, pickNextCard, stageSizes } from './ladder';

/**
 * The study state machine.
 *
 * A deck is climbed, not dealt. The learner meets three words, is asked for
 * those three until she holds all three at once, meets two more, is asked for
 * all five, and so on up to the whole deck — and only then does the deck ask to
 * be run flawlessly, ten rounds over, before it counts as hers.
 *
 * Everything here is pure. The session passed in is never mutated, so the
 * caller can persist whatever comes back and replay from it after a reload:
 * that is what makes a half-finished climb survive a closed tab.
 */

export type AnswerInput = { hebrew: boolean; arabic: boolean };

export type StudyEvent =
  /** Recalled, and the stage or round carries on. */
  | 'continue'
  /** Missed. The card stays owed and will be back, weighted — but not next. */
  | 'retry-queued'
  /** The whole active set has been recalled; the next words are being introduced. */
  | 'stage-complete'
  /** The last stage cleared: the active set is now the deck, and mastery begins. */
  | 'full-deck-reached'
  /** A card was missed inside a mastery round. The round can no longer be perfect. */
  | 'round-missed'
  /** An imperfect round finished. Banked rounds are untouched; a new one deals. */
  | 'round-ended'
  /** Hard / brutal: a mistake ended the mastery round on the spot. */
  | 'round-reset'
  /** A flawless full-deck round, with more still required. */
  | 'perfect-round'
  /** A flawless round that also brought the ordering interlude round. */
  | 'ordering-due'
  /** The required flawless rounds are all in. The deck is mastered. */
  | 'deck-mastered'
  /** A one-card drill was answered correctly. */
  | 'drill-complete';

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
  /** The deck in its own order. The ladder deals the first three from the top. */
  cardIds: string[];
  mode: StudyMode;
  promptDirection: PromptDirection;
  answerMode: AnswerMode;
  perfectRunsRequired: number;
  /**
   * Flawless rounds already banked for this deck, from its progress row.
   * Carried in every mode: ten perfect rounds are a deck-long achievement, and
   * closing the tab is not a mistake.
   */
  perfectRoundsCompleted?: number;
  /** A single weak card being drilled, rather than a climb through the deck. */
  drill?: boolean;
  /**
   * Whether this deck's own order is worth recalling — the numbers, and nothing
   * else. Decided by the caller, which is the only place that knows what
   * category the deck sits in; see `features/ordering/sequenced`.
   */
  sequenced?: boolean;
  now: string;
  // No `rng`: a new session opens on the deck's own first three cards, in the
  // deck's own order, and nothing is drawn until the first stage is read.
};

export type AnswerOptions = {
  now: string;
  rng?: RNG;
  /**
   * Wipe the banked rounds when a hard-mode round is failed. Always on in
   * brutal. Normal never wipes: a slip costs the round, not the week.
   */
  brutalReset?: boolean;
};

export function createSession(params: CreateSessionParams): StudySession {
  if (params.cardIds.length === 0) {
    throw new Error('Cannot start a session with an empty deck.');
  }

  const deckCardIds = [...params.cardIds];

  const base: StudySession = {
    id: params.id,
    deckId: params.deckId,
    mode: params.mode,
    promptDirection: params.promptDirection,
    answerMode: params.answerMode,

    sequenced: params.sequenced,

    phase: 'introducing',
    deckCardIds,
    activeCardCount: 0,
    activeCardIds: [],
    introducedCardIds: [],
    introduceCardIds: [],
    introduceIndex: 0,
    introduceFlipped: false,

    stageCorrect: [],
    stageIncorrect: [],

    roundQueue: [],
    roundIndex: 0,
    roundPerfect: true,
    currentRound: 0,

    perfectRounds: params.perfectRoundsCompleted ?? 0,
    perfectRunsRequired: Math.max(1, params.perfectRunsRequired),
    deckMastered: false,

    answers: [],
    startedAt: params.now,
    updatedAt: params.now,
  };

  // A drill is a question about one word she has already met and got wrong.
  // Introducing it would be reading her the answer she is about to give.
  if (params.drill) {
    return {
      ...base,
      drill: true,
      phase: 'testing',
      activeCardCount: deckCardIds.length,
      activeCardIds: [...deckCardIds],
      currentCardId: deckCardIds[0],
    };
  }

  openStage(base, stageSizes(deckCardIds.length)[0]);
  return base;
}

/**
 * Grows the active set to `size` and opens on the words that are new to it.
 *
 * Only the newly added cards are introduced. The ones already in the set have
 * been read and recalled; showing them again would turn every stage into a
 * re-reading of the deck, and the point of the climb is that the older words
 * are carried by memory rather than by another look.
 */
function openStage(s: StudySession, size: number): void {
  const introduce = s.deckCardIds.slice(s.activeCardCount, size);

  s.activeCardCount = size;
  s.activeCardIds = s.deckCardIds.slice(0, size);
  s.introduceCardIds = introduce;
  s.introduceIndex = 0;
  s.introduceFlipped = false;
  s.phase = 'introducing';
  s.currentCardId = undefined;
  s.stageCorrect = [];
  s.stageIncorrect = [];
}

/** Opens the recall phase for whatever the active set has grown to. */
function openTesting(s: StudySession, rng: RNG): void {
  s.phase = 'testing';
  s.introduceCardIds = [];
  s.introduceIndex = 0;
  s.introduceFlipped = false;
  s.stageCorrect = [];
  s.stageIncorrect = [];
  // Nothing has been asked yet, so nothing is held back: the last card read is
  // as good a first question as any, and excluding it would be a pattern.
  s.currentCardId = pickNextCard({
    activeCardIds: s.activeCardIds,
    stageCorrect: s.stageCorrect,
    stageIncorrect: s.stageIncorrect,
    rng,
  });
  s.lastAskedCardId = undefined;
}

/**
 * How many flawless rounds are banked before the deck is asked to be put back
 * in order.
 *
 * Half way, near enough. Earlier than this and the words are not secure enough
 * to be worth sequencing — she would be arranging shapes she is still working
 * out. Later and it is a victory lap rather than the consolidation it is meant
 * to be: the point of dropping it in the middle of the flawless rounds is that
 * it is the one question those rounds never ask, and the rounds that follow it
 * are answered by a learner who has now had to hold the whole deck at once.
 */
export const ORDER_INTERLUDE_AFTER = 5;

/**
 * Which banked round brings the interlude round, for this deck.
 *
 * Five, unless the deck asks for so few flawless rounds that five would fall
 * after the end of it — a deck of three rounds would then be mastered without
 * ever being put in order, which is the one outcome this must not have. Such a
 * deck gets it on its second-to-last round instead: still inside the climb,
 * still with a round left to answer afterwards.
 */
function interludeAt(s: StudySession): number {
  return Math.min(ORDER_INTERLUDE_AFTER, Math.max(1, s.perfectRunsRequired - 1));
}

/** Whether the ordering interlude falls due now. */
function orderingDue(s: StudySession): boolean {
  return Boolean(
    s.sequenced && !s.drill && !s.orderingDone && s.perfectRounds >= interludeAt(s),
  );
}

/**
 * Pauses the rounds and hands the deck over to be put in order.
 *
 * Hebrew first. Nothing is dealt: the round that follows is opened by
 * `finishOrdering`, once both languages have been sat, so the deck cannot be
 * halfway through a pass while the learner is dragging tiles.
 */
function openOrdering(s: StudySession): void {
  s.phase = 'ordering';
  s.orderingLanguage = 'hebrew';
  s.currentCardId = undefined;
  s.roundQueue = [];
  s.roundIndex = 0;
  s.stageCorrect = [];
  s.stageIncorrect = [];
}

/**
 * Ends one language of the interlude.
 *
 * Hebrew hands over to Arabic — the same ten words, the same column, one toggle
 * and no menu in between, because counting in Hebrew and counting in Arabic are
 * two things to know and she is here to do both. Arabic hands back to the
 * rounds, which deal again from where they stopped with every banked round
 * intact. Nothing here is scored: the interlude consolidates, it does not
 * judge, and a deck is never lost on it.
 */
export function finishOrdering(
  session: StudySession,
  opts: { now: string; rng?: RNG },
): StudySession {
  if (session.phase !== 'ordering') return session;

  const s: StudySession = {
    ...session,
    roundQueue: [...session.roundQueue],
    stageCorrect: [],
    stageIncorrect: [],
    updatedAt: opts.now,
  };

  if (s.orderingLanguage === 'hebrew') {
    s.orderingLanguage = 'arabic';
    return s;
  }

  s.orderingDone = true;
  s.orderingLanguage = undefined;
  s.phase = 'fullDeckMastery';
  openRound(s, opts.rng ?? Math.random);
  return s;
}

/** The language the interlude is asking for, or undefined outside one. */
export function orderingLanguage(s: StudySession): Language | undefined {
  return s.phase === 'ordering' ? s.orderingLanguage : undefined;
}

/** Deals a fresh shuffled full-deck round. */
function openRound(s: StudySession, rng: RNG): void {
  s.currentRound += 1;
  s.roundQueue = buildRound(s.activeCardIds, {
    lastAskedCardId: s.lastAskedCardId,
    rng,
  });
  s.roundIndex = 0;
  s.roundPerfect = true;
  s.stageCorrect = [];
  s.stageIncorrect = [];
  s.currentCardId = s.roundQueue[0];
}

// --- introducing ---------------------------------------------------------

export function currentIntroCardId(s: StudySession): string | undefined {
  if (s.phase !== 'introducing') return undefined;
  return s.introduceCardIds[s.introduceIndex];
}

/** Cards left to read in this introduction, the one on screen included. */
export function introRemaining(s: StudySession): number {
  if (s.phase !== 'introducing') return 0;
  return Math.max(0, s.introduceCardIds.length - s.introduceIndex);
}

/**
 * Turns the card over and records that its forms have been read.
 *
 * Flipping back does not un-read it: once she has seen the answer she has seen
 * it. Nothing here is graded, and `introducedCardIds` is a tally of what has
 * been met, never a claim that it has been learned.
 */
export function flipIntroCard(s: StudySession, now: string): StudySession {
  const cardId = currentIntroCardId(s);
  if (!cardId) return s;

  const next: StudySession = {
    ...s,
    introducedCardIds: [...s.introducedCardIds],
    introduceFlipped: !s.introduceFlipped,
    updatedAt: now,
  };
  if (!next.introducedCardIds.includes(cardId)) {
    next.introducedCardIds.push(cardId);
  }
  return next;
}

/**
 * Moves to the next new word, or — past the last one — into recall.
 *
 * A card walked past without being flipped is simply not counted as read. She
 * is never marked down for it, and the testing that follows will ask for it
 * regardless, which is its own answer to skipping ahead.
 */
export function nextIntroCard(
  s: StudySession,
  opts: { now: string; rng?: RNG },
): StudySession {
  if (s.phase !== 'introducing') return s;

  const next: StudySession = { ...s, updatedAt: opts.now };
  const nextIndex = s.introduceIndex + 1;

  if (nextIndex < s.introduceCardIds.length) {
    next.introduceIndex = nextIndex;
    next.introduceFlipped = false;
    return next;
  }

  openTesting(next, opts.rng ?? Math.random);
  return next;
}

/** Steps back to the word before this one. Free: nothing here has been scored. */
export function previousIntroCard(s: StudySession, now: string): StudySession {
  if (s.phase !== 'introducing' || s.introduceIndex === 0) return s;
  return {
    ...s,
    introduceIndex: s.introduceIndex - 1,
    introduceFlipped: false,
    updatedAt: now,
  };
}

// --- testing and mastery -------------------------------------------------

/**
 * Applies one answer and returns the session that follows from it.
 *
 * The input is never mutated, so the caller can persist the result and resume
 * from exactly there.
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
  if (session.phase !== 'testing' && session.phase !== 'fullDeckMastery') {
    throw new Error('Cards can only be answered while testing.');
  }

  const rng = opts.rng ?? Math.random;
  const fullyCorrect = input.hebrew && input.arabic;

  const s: StudySession = {
    ...session,
    deckCardIds: [...session.deckCardIds],
    activeCardIds: [...session.activeCardIds],
    introducedCardIds: [...session.introducedCardIds],
    introduceCardIds: [...session.introduceCardIds],
    stageCorrect: [...session.stageCorrect],
    stageIncorrect: [...session.stageIncorrect],
    roundQueue: [...session.roundQueue],
    answers: [
      ...session.answers,
      { cardId, hebrew: input.hebrew, arabic: input.arabic, at: opts.now },
    ],
    updatedAt: opts.now,
  };
  s.lastAskedCardId = cardId;

  const event = s.drill
    ? applyDrill(s, cardId, fullyCorrect, opts.now)
    : s.phase === 'testing'
      ? applyTesting(s, cardId, fullyCorrect, rng)
      : applyMastery(s, cardId, fullyCorrect, opts, rng);

  return {
    hebrewCorrect: input.hebrew,
    arabicCorrect: input.arabic,
    fullyCorrect,
    event,
    session: s,
  };
}

/** One card, one question. Right ends it; wrong asks again. */
function applyDrill(
  s: StudySession,
  cardId: string,
  fullyCorrect: boolean,
  now: string,
): StudyEvent {
  if (!fullyCorrect) {
    if (!s.stageIncorrect.includes(cardId)) s.stageIncorrect.push(cardId);
    return 'retry-queued';
  }

  s.stageCorrect = [cardId];
  s.phase = 'completed';
  s.currentCardId = undefined;
  s.completedAt = now;
  return 'drill-complete';
}

/**
 * A stage is cleared by recalling every card in the active set — 3/3, then 5/5,
 * then 7/7, then 10/10 — with nothing outstanding.
 *
 * A miss ends nothing and costs no banked progress. It takes the card back out
 * of `stageCorrect`, which is what makes the requirement mean "all of them,
 * now" rather than "each of them, once, at some point".
 */
function applyTesting(
  s: StudySession,
  cardId: string,
  fullyCorrect: boolean,
  rng: RNG,
): StudyEvent {
  if (fullyCorrect) {
    if (!s.stageCorrect.includes(cardId)) s.stageCorrect.push(cardId);
  } else {
    s.stageCorrect = s.stageCorrect.filter((id) => id !== cardId);
    if (!s.stageIncorrect.includes(cardId)) s.stageIncorrect.push(cardId);
  }

  const cleared = s.activeCardIds.every((id) => s.stageCorrect.includes(id));

  if (!cleared) {
    s.currentCardId = pickNextCard({
      activeCardIds: s.activeCardIds,
      stageCorrect: s.stageCorrect,
      stageIncorrect: s.stageIncorrect,
      lastAskedCardId: cardId,
      rng,
    });
    return fullyCorrect ? 'continue' : 'retry-queued';
  }

  const grown = nextStageSize(s.deckCardIds.length, s.activeCardCount);
  if (grown !== undefined) {
    openStage(s, grown);
    return 'stage-complete';
  }

  openRound(s, rng);
  s.phase = 'fullDeckMastery';
  return 'full-deck-reached';
}

/**
 * A mastery round is one shuffled pass over the whole deck, and it counts only
 * if every card in it was right.
 *
 * Normal keeps its banked rounds through a miss — the round is spoiled, not the
 * week — and the missed card is pushed onto the end of the pass so it is worked
 * again before the next round deals. Hard and brutal keep the older, harsher
 * rule: a mistake ends the round where it stands.
 */
function applyMastery(
  s: StudySession,
  cardId: string,
  fullyCorrect: boolean,
  opts: AnswerOptions,
  rng: RNG,
): StudyEvent {
  if (!fullyCorrect) {
    s.stageCorrect = s.stageCorrect.filter((id) => id !== cardId);
    if (!s.stageIncorrect.includes(cardId)) s.stageIncorrect.push(cardId);
    s.roundPerfect = false;

    if (s.mode !== 'normal') {
      if (s.mode === 'brutal' || opts.brutalReset === true) s.perfectRounds = 0;
      openRound(s, rng);
      return 'round-reset';
    }

    // Reinforcement, not punishment: the word comes back inside this pass
    // rather than being written off until the next one. Only ever one copy is
    // outstanding, so a card missed twice does not queue up two more turns —
    // but it does keep being handed back until she recalls it, which is the
    // whole point of it having been missed.
    if (!s.roundQueue.slice(s.roundIndex + 1).includes(cardId)) {
      s.roundQueue.push(cardId);
    }
    return advanceRound(s, opts.now, rng);
  }

  if (!s.stageCorrect.includes(cardId)) s.stageCorrect.push(cardId);
  return advanceRound(s, opts.now, rng);
}

/** Steps through the round's pass, closing it when the queue runs out. */
function advanceRound(s: StudySession, now: string, rng: RNG): StudyEvent {
  s.roundIndex += 1;

  if (s.roundIndex < s.roundQueue.length) {
    s.currentCardId = s.roundQueue[s.roundIndex];
    return s.roundPerfect ? 'continue' : 'round-missed';
  }

  if (!s.roundPerfect) {
    openRound(s, rng);
    return 'round-ended';
  }

  s.perfectRounds += 1;

  if (s.perfectRounds >= s.perfectRunsRequired) {
    s.phase = 'completed';
    s.deckMastered = true;
    s.currentCardId = undefined;
    s.roundQueue = [];
    s.completedAt = now;
    return 'deck-mastered';
  }

  // The consolidation step, and only for a deck that runs in an order. It sits
  // between the rounds rather than after them: a deck already mastered has
  // nothing left to consolidate, and the round dealt on the way out of it is
  // answered by a learner who has just had to hold the whole sequence at once.
  if (orderingDue(s)) {
    openOrdering(s);
    return 'ordering-due';
  }

  openRound(s, rng);
  return 'perfect-round';
}

// --- reading the state ---------------------------------------------------

/** Cards recalled out of the active set, for the stage banner. */
export function stageProgress(s: StudySession): {
  recalled: number;
  total: number;
} {
  return {
    recalled: s.stageCorrect.filter((id) => s.activeCardIds.includes(id)).length,
    total: s.activeCardIds.length,
  };
}

export type StageDescription = {
  /** The headline: "Testing", "Full deck", "Perfect rounds: 3 / 10". */
  label: string;
  /** The line under it, or null where the headline says everything. */
  detail: string | null;
  phase: StudyPhase;
};

/**
 * What to call the phase the learner is in.
 *
 * The size of the set is not in the headline. It was — "Testing 3 words", said
 * so that a small set could not be misread as a ten-card test she was three
 * cards into — but naming the number at all invites the comparison it was
 * trying to head off, and the ladder's set size is bookkeeping rather than
 * something she chose. It is still counted, still shown as pips and as
 * "2 of 3 recalled" underneath, where it reads as progress through what is in
 * front of her rather than as the size of a test.
 */
export function describeStage(s: StudySession): StageDescription {
  const total = s.activeCardIds.length;
  const deckSize = s.deckCardIds.length;
  const full = total >= deckSize;

  if (s.drill) {
    return { label: 'One weak card', detail: null, phase: s.phase };
  }

  switch (s.phase) {
    case 'introducing': {
      const adding = s.introduceCardIds.length;
      const held = total - adding;
      return {
        label: held === 0 ? 'Learning' : 'Learning more words',
        detail:
          'Card ' +
          (s.introduceIndex + 1) +
          ' of ' +
          adding +
          ' · nothing is scored yet',
        phase: s.phase,
      };
    }

    case 'testing': {
      const { recalled } = stageProgress(s);
      return {
        label: full ? 'Full deck' : 'Testing',
        detail: recalled + ' of ' + total + ' recalled',
        phase: s.phase,
      };
    }

    case 'ordering':
      return {
        label:
          s.orderingLanguage === 'arabic'
            ? 'In order — Arabic'
            : 'In order — Hebrew',
        detail: 'Nothing is scored here. Your ' + s.perfectRounds + ' rounds stand.',
        phase: s.phase,
      };

    case 'fullDeckMastery':
      return {
        label:
          'Perfect rounds: ' + s.perfectRounds + ' / ' + s.perfectRunsRequired,
        detail:
          'Round ' +
          s.currentRound +
          ' · ' +
          Math.min(s.roundIndex, s.roundQueue.length) +
          ' of ' +
          s.roundQueue.length +
          ' answered' +
          (s.roundPerfect ? '' : ' · this round will not count'),
        phase: s.phase,
      };

    default:
      return {
        label: s.deckMastered ? 'Deck mastered' : 'Finished',
        detail: null,
        phase: s.phase,
      };
  }
}

export function isComplete(s: StudySession): boolean {
  return Boolean(s.completedAt);
}

/**
 * Whether a stored row is a ladder session.
 *
 * Sessions written before the ladder existed have no phase and no active set to
 * resume into, so resuming one would drop the learner on a screen with no card.
 * Callers use this to leave them alone rather than break on them.
 */
export function isLadderSession(s: StudySession | undefined): boolean {
  return Boolean(
    s && typeof s.phase === 'string' && Array.isArray(s.deckCardIds),
  );
}
