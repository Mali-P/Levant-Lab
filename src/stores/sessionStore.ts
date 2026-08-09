import { create } from 'zustand';
import type {
  AnswerMode,
  CardProgress,
  DeckProgress,
  Flashcard,
  PromptDirection,
  StudyMode,
  StudySession,
} from '../types';
import {
  answerCurrentCard,
  createSession,
  finishOrdering as finishOrderingStep,
  flipIntroCard,
  isLadderSession,
  nextIntroCard,
  previousIntroCard,
  type AnswerInput,
  type AnswerOutcome,
} from '../features/study/engine';
import { db } from '../services/database/db';
import { uid } from '../utils/random';
import { useData } from './dataStore';
import { useSettings } from './settingsStore';

type StartParams = {
  deckId: string;
  cards: Flashcard[];
  mode: StudyMode;
  answerMode: AnswerMode;
  promptDirection: PromptDirection;
  perfectRunsRequired: number;
  /** A single weak card being drilled, rather than a run through the deck. */
  drill?: boolean;
  /** Whether this deck runs in an order, and so gets the ordering interlude. */
  sequenced?: boolean;
};

/**
 * Everything one answer overwrote, kept so it can be put back.
 *
 * A snapshot rather than a reversal. Neither half of grading is invertible:
 * `applyAnswerToProgress` folds a longest streak and a review date into the
 * card, and `applyNormal` can swap the whole active stack for the retry pile,
 * discarding the order it replaced. Undoing by subtraction would be guesswork,
 * so the store simply remembers the three rows as they stood.
 */
type AnswerStep = {
  /** The session as it was before the answer, ready to be persisted again. */
  session: StudySession;
  cardId: string;
  /** Undefined where the card had never been answered before. */
  cardProgress?: CardProgress;
  deckProgress?: DeckProgress;
};

type SessionState = {
  session: StudySession | null;
  lastOutcome: AnswerOutcome | null;
  /** Set while the feedback panel is showing, before the next card appears. */
  awaitingAdvance: boolean;
  /**
   * Answers that can still be taken back, oldest first.
   *
   * Only normal mode fills this. Hard and brutal exist to make a mistake cost
   * something — a run that can be rewound is not a run — and a drill is a
   * single card with nothing behind it. In-memory only: a session resumed after
   * a reload starts with nothing to undo, which is the honest answer, since the
   * progress rows it would restore were never kept.
   */
  history: AnswerStep[];

  start: (params: StartParams) => Promise<StudySession>;
  resumeLatest: () => Promise<StudySession | null>;
  submit: (input: AnswerInput) => Promise<AnswerOutcome | null>;
  advance: () => void;

  /*
   * The introducing phase.
   *
   * Reading a word is not answering one, so these three write nothing to
   * `cardProgress` and nothing to the deck's accuracy — but they do persist the
   * session, because which of the new words she has reached is part of the
   * progression and must survive a reload like everything else on the ladder.
   */
  flipIntro: () => Promise<void>;
  nextIntro: () => Promise<void>;
  prevIntro: () => Promise<void>;

  /**
   * Ends one language of the ordering interlude: Hebrew hands over to Arabic,
   * Arabic hands back to the rounds.
   *
   * Persisted like every other step of the run, and scoring nothing. A learner
   * who closes the tab mid-column comes back to the same column rather than to
   * a round she has not been dealt.
   */
  finishOrdering: () => Promise<void>;
  /**
   * Takes back the last answer and returns to the card that was asked.
   *
   * Restores the session, the card's progress and the deck's progress together,
   * so the learner is not merely shown the old card while her score keeps the
   * answer she is about to replace. Returns the card id she has landed back on,
   * or null when there is nothing to undo.
   */
  stepBack: () => Promise<string | null>;
  abandon: () => Promise<void>;
};

/**
 * Applies one move of the introducing phase and writes it down.
 *
 * Persisted for the same reason the rest of the ladder is: which of the new
 * words she has reached is progression, not screen state, and it has to be
 * there when she comes back. Nothing scored moves — these steps never touch
 * `cardProgress` or the deck's accuracy.
 */
async function stepIntro(
  set: (partial: Partial<SessionState>) => void,
  get: () => SessionState,
  step: (s: StudySession) => StudySession,
): Promise<void> {
  const session = get().session;
  if (!session || session.phase !== 'introducing') return;

  const next = step(session);
  if (next === session) return;

  await db.sessions.put(next);
  set({ session: next });
}

export const useSession = create<SessionState>((set, get) => ({
  session: null,
  lastOutcome: null,
  awaitingAdvance: false,
  history: [],

  async start(params) {
    const stored = useData.getState().deckProgress[params.deckId];

    const session = createSession({
      id: uid('session'),
      deckId: params.deckId,
      // In the deck's own order: the ladder introduces cards 1-3, then 4-5,
      // and a counting deck only makes sense met that way.
      cardIds: params.cards.map((c) => c.id),
      mode: params.mode,
      answerMode: params.answerMode,
      promptDirection: params.promptDirection,
      perfectRunsRequired: params.perfectRunsRequired,
      // Banked rounds carry across sessions in every mode now. Ten flawless
      // rounds is a deck-long achievement; closing the tab is not a mistake.
      perfectRoundsCompleted: params.drill
        ? 0
        : (stored?.perfectRunsCompleted ?? 0),
      drill: params.drill,
      sequenced: params.sequenced,
      now: new Date().toISOString(),
    });

    await db.sessions.put(session);
    set({ session, lastOutcome: null, awaitingAdvance: false, history: [] });
    return session;
  },

  async resumeLatest() {
    // Sessions written before the ladder have no phase to resume into, so they
    // are stepped over rather than opened onto an empty screen.
    const open = await db.sessions
      .orderBy('updatedAt')
      .reverse()
      .filter((s) => !s.completedAt && !s.drill && isLadderSession(s))
      .first();
    set({
      session: open ?? null,
      lastOutcome: null,
      awaitingAdvance: false,
      history: [],
    });
    return open ?? null;
  },

  async submit(input) {
    const session = get().session;
    if (!session || get().awaitingAdvance) return null;

    const { settings } = useSettings.getState();
    const data = useData.getState();

    // Taken before anything is written, and only where going back is offered:
    // holding snapshots for a hard-mode run would be dead weight the screen
    // never reads. `session.currentCardId` is guaranteed by `answerCurrentCard`
    // below, which throws without one.
    const cardId = session.currentCardId!;
    const step: AnswerStep | null =
      session.mode === 'normal' && !session.drill
        ? {
            session,
            cardId,
            cardProgress: data.cardProgress[cardId],
            deckProgress: data.deckProgress[session.deckId],
          }
        : null;

    const outcome = answerCurrentCard(session, input, {
      now: new Date().toISOString(),
      brutalReset: settings.brutalResetOnHardFailure,
    });

    // Persist before anything renders, so a crash mid-feedback loses nothing.
    await db.sessions.put(outcome.session);
    await data.recordAnswer(session.currentCardId!, {
      hebrew: outcome.hebrewCorrect,
      arabic: outcome.arabicCorrect,
    });

    const now = new Date().toISOString();
    const deckId = session.deckId;
    const current = data.deckProgress[deckId];

    // A drill is one weak card, so finishing it says nothing about the deck.
    // Only the card's own progress, recorded above, moves; the deck keeps its
    // completion stamps and its perfect-run count exactly as they were.
    // The banked-round count still lives in `perfectRunsCompleted` on the deck's
    // progress row. That is the field the unlock ladder and sync already read,
    // so a round earned on the phone still opens the next deck on the laptop
    // without either of them learning anything about stages.
    if (session.drill) {
      await data.saveDeckProgress(deckId, { lastStudiedAt: now });
    } else if (outcome.event === 'round-reset') {
      await data.saveDeckProgress(deckId, {
        perfectRunsCompleted: outcome.session.perfectRounds,
        hardModeFailures: (current?.hardModeFailures ?? 0) + 1,
        lastStudiedAt: now,
      });
    } else if (
      outcome.event === 'perfect-round' ||
      // A round that also brought the ordering interlude round is still a
      // banked round, and it is banked here rather than after the interlude:
      // walking away mid-column must not cost her the round that earned it.
      outcome.event === 'ordering-due' ||
      outcome.event === 'round-ended'
    ) {
      await data.saveDeckProgress(deckId, {
        perfectRunsCompleted: outcome.session.perfectRounds,
        lastStudiedAt: now,
      });
    } else if (outcome.event === 'deck-mastered') {
      // `hardModePassedAt` is what marks a deck permanently mastered, and it is
      // what the next deck in the category is waiting on.
      await data.saveDeckProgress(deckId, {
        perfectRunsCompleted: outcome.session.perfectRounds,
        hardModePassedAt: now,
        lastStudiedAt: now,
      });
    } else if (outcome.event === 'full-deck-reached') {
      // The first clean pass over every card in the deck. Worth stamping, but
      // it is the start of mastery rather than the end of it.
      await data.saveDeckProgress(deckId, {
        normalModeCompletedAt: current?.normalModeCompletedAt ?? now,
        lastStudiedAt: now,
      });
    } else {
      await data.saveDeckProgress(deckId, { lastStudiedAt: now });
    }

    set({
      session: outcome.session,
      lastOutcome: outcome,
      awaitingAdvance: true,
      history: step ? [...get().history, step] : get().history,
    });
    return outcome;
  },

  advance() {
    set({ awaitingAdvance: false, lastOutcome: null });
  },

  async flipIntro() {
    await stepIntro(set, get, (s) => flipIntroCard(s, new Date().toISOString()));
  },

  async nextIntro() {
    await stepIntro(set, get, (s) =>
      nextIntroCard(s, { now: new Date().toISOString() }),
    );
  },

  async prevIntro() {
    await stepIntro(set, get, (s) =>
      previousIntroCard(s, new Date().toISOString()),
    );
  },

  async finishOrdering() {
    const session = get().session;
    if (!session || session.phase !== 'ordering') return;

    const next = finishOrderingStep(session, { now: new Date().toISOString() });
    if (next === session) return;

    await db.sessions.put(next);
    // The interlude marks nothing on the deck and nothing on a card. It is
    // consolidation sat between rounds, and the rounds it sits between are the
    // things that count.
    set({ session: next, lastOutcome: null, awaitingAdvance: false });
  },

  async stepBack() {
    const history = get().history;
    const step = history[history.length - 1];
    if (!step) return null;

    // Session first, then the scores, in the reverse order `submit` wrote them.
    // A crash between the two leaves a session pointing at a card whose score
    // still holds the answer — the same window `submit` already lives with, and
    // in the harmless direction: the card is simply asked again.
    await db.sessions.put(step.session);
    await useData
      .getState()
      .restoreProgress(
        step.cardId,
        step.cardProgress,
        step.session.deckId,
        step.deckProgress,
      );

    set({
      session: step.session,
      history: history.slice(0, -1),
      lastOutcome: null,
      awaitingAdvance: false,
    });
    return step.cardId;
  },

  async abandon() {
    const session = get().session;
    if (session) await db.sessions.delete(session.id);
    set({
      session: null,
      lastOutcome: null,
      awaitingAdvance: false,
      history: [],
    });
  },
}));
