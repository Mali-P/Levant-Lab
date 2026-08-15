import {
  LANGUAGES,
  type AnswerMode,
  type Language,
  type PromptDirection,
  type StudyMode,
  type StudyPhase,
  type StudySession,
} from '../../types';
import { LANGUAGE_LONG_LABEL } from '../../utils/languageSelection';
import type { RNG } from '../../utils/random';
import {
  buildRound,
  nextStageSize,
  pickNextCard,
  STAGE_PERFECT_ROUNDS,
  stageSizes,
} from './ladder';

/**
 * The study state machine.
 *
 * A deck is climbed, not dealt. The learner meets two words, is asked for those
 * two until she has held both at once twice running, meets a third, is asked
 * for all three until she holds those, and so on one word at a time up to the
 * whole deck — and only then does the deck ask to be run flawlessly, ten rounds
 * over, before it counts as hers.
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
  /** The active set was cleared, but the rung wants another pass before it grows. */
  | 'stage-pass-complete'
  /** The rung is bought: the next word is being introduced. */
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
  studyLanguages?: Language[];
  /** The deck in its own order. The ladder deals the first two from the top. */
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
  /** Skip the learning ladder and begin shuffled full-pool mastery immediately. */
  masteryOnly?: boolean;
  /** A single weak card being drilled, rather than a climb through the deck. */
  drill?: boolean;
  /**
   * Whether this deck's own order is worth recalling — the numbers, and nothing
   * else. Decided by the caller, which is the only place that knows what
   * category the deck sits in; see `features/ordering/sequenced`.
   */
  sequenced?: boolean;
  now: string;
  // No `rng`: a new session opens on the deck's own first two cards, in the
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
    studyLanguages: params.studyLanguages ? [...params.studyLanguages] : undefined,
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
    stagePerfectRounds: 0,
    stagePerfect: true,

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

  if (params.masteryOnly) {
    base.activeCardCount = deckCardIds.length;
    base.activeCardIds = [...deckCardIds];
    base.introducedCardIds = [...deckCardIds];
    base.phase = 'fullDeckMastery';
    openRound(base, Math.random);
    return base;
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
  s.stagePerfectRounds = 0;
  s.stagePerfect = true;
}

/** Opens the recall phase for whatever the active set has grown to. */
function openTesting(s: StudySession, rng: RNG): void {
  s.phase = 'testing';
  s.introduceCardIds = [];
  s.introduceIndex = 0;
  s.introduceFlipped = false;
  s.stageCorrect = [];
  s.stageIncorrect = [];
  s.stagePerfectRounds = 0;
  s.stagePerfect = true;
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
 * Sends her round the same set again, for the second of the two clean passes.
 *
 * Only what the pass itself owns is wiped. `stageIncorrect` is deliberately
 * carried over: a word she fumbled at the start of this rung is still the shaky
 * one on the pass that follows, and it should keep coming round sooner than the
 * words that never gave her trouble.
 */
function openPass(s: StudySession, rng: RNG): void {
  s.stageCorrect = [];
  s.stagePerfect = true;
  s.currentCardId = pickNextCard({
    activeCardIds: s.activeCardIds,
    stageCorrect: s.stageCorrect,
    stageIncorrect: s.stageIncorrect,
    lastAskedCardId: s.lastAskedCardId,
    rng,
  });
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
 * Both languages at once — they are two columns on one screen rather than two
 * legs of a phase, so there is nothing here for the session to remember about
 * which one is being asked for. Nothing is dealt either: the round that follows
 * is opened by `finishOrdering`, so the deck cannot be halfway through a pass
 * while the learner is still moving words about.
 */
function openOrdering(s: StudySession): void {
  s.phase = 'ordering';
  s.currentCardId = undefined;
  s.roundQueue = [];
  s.roundIndex = 0;
  s.stageCorrect = [];
  s.stageIncorrect = [];
}

/**
 * Ends the interlude and hands back to the rounds.
 *
 * One call, because the interlude is one sitting: both columns are on the
 * screen together and the learner leaves them together. The rounds deal again
 * from where they stopped with every banked one intact. Nothing here is scored:
 * the interlude consolidates, it does not judge, and a deck is never lost on
 * it.
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

  s.orderingDone = true;
  s.phase = 'fullDeckMastery';
  openRound(s, opts.rng ?? Math.random);
  return s;
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
    // A run left open before the one-card ladder existed has neither of these
    // counters. They are read as "nothing banked, and the pass in hand is still
    // clean", which costs her one more pass over a set she is already holding
    // and nothing at all that was scored.
    stagePerfectRounds: session.stagePerfectRounds ?? 0,
    stagePerfect: session.stagePerfect ?? true,
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
 * A pass is cleared by recalling every card in the active set — 2/2, then 3/3,
 * then 4/4 — with nothing outstanding, and a rung is bought with two clean
 * passes in a row.
 *
 * A miss costs no banked round and takes nothing away that she has already
 * recalled in this pass. What it does is take the card back out of
 * `stageCorrect` — which is what makes clearing mean "all of them, now" rather
 * than "each of them, once, at some point" — and spoil the pass, so that the
 * two that buy the next word have to be two she got right end to end.
 *
 * The last rung follows the same rule. The final word has only just arrived,
 * so one lucky recall of it is not enough to throw the learner into mastery:
 * it has to survive the same two clean passes mixed back through the older
 * words before the full-deck rounds begin.
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
    s.stagePerfect = false;
    s.stagePerfectRounds = 0;
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

  if (s.stagePerfect) s.stagePerfectRounds += 1;

  if (s.stagePerfectRounds < STAGE_PERFECT_ROUNDS) {
    openPass(s, rng);
    return 'stage-pass-complete';
  }

  if (grown === undefined) {
    openRound(s, rng);
    s.phase = 'fullDeckMastery';
    return 'full-deck-reached';
  }

  openStage(s, grown);
  return 'stage-complete';
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
export function describeStage(
  s: StudySession,
  /**
   * The languages being studied, for the one line that names them. Nothing
   * about the ladder turns on this — the interlude is one sitting whether it
   * holds one column or two — so it is a label and only a label.
   */
  languages: readonly Language[] = LANGUAGES,
): StageDescription {
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
      // Not the count. The banner already gives it a line of its own beside the
      // headline, and the pips under that; saying it a third time here left the
      // strip repeating itself. This line is kept for the one thing nothing
      // else on the screen says — whether the pass in hand still buys a word.
      //
      // `??` for the same reason as in `answerCurrentCard`: a row written
      // before the one-card ladder can be read before it is ever answered.
      const banked = s.stagePerfectRounds ?? 0;
      return {
        label: full ? 'Full deck' : 'Testing',
        detail:
          s.stagePerfect ?? true
            ? 'Clean pass ' + (banked + 1) + ' of ' + STAGE_PERFECT_ROUNDS
            : 'This pass will not count',
        phase: s.phase,
      };
    }

    case 'ordering':
      return {
        label:
          languages.length > 1
            ? 'In order — both languages'
            : 'In order — ' + LANGUAGE_LONG_LABEL[languages[0]],
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
