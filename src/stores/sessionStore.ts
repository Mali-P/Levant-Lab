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

export const useSession = create<SessionState>((set, get) => ({
  session: null,
  lastOutcome: null,
  awaitingAdvance: false,
  history: [],

  async start(params) {
    const { settings } = useSettings.getState();
    const stored = useData.getState().deckProgress[params.deckId];

    const built = createSession({
      id: uid('session'),
      deckId: params.deckId,
      cardIds: params.cards.map((c) => c.id),
      mode: params.mode,
      answerMode: params.answerMode,
      promptDirection: params.promptDirection,
      perfectRunsRequired: params.perfectRunsRequired,
      // Hard-mode runs accumulate across sessions unless the deck was passed.
      perfectRunsCompleted:
        params.mode === 'normal' ? 0 : (stored?.perfectRunsCompleted ?? 0),
      shuffleCards: settings.shuffleCards,
      now: new Date().toISOString(),
    });

    // The flag rides on the row rather than on the engine: nothing about
    // grading a drill differs, only what the rest of the app does with it.
    const session = params.drill ? { ...built, drill: true } : built;

    await db.sessions.put(session);
    set({ session, lastOutcome: null, awaitingAdvance: false, history: [] });
    return session;
  },

  async resumeLatest() {
    const open = await db.sessions
      .orderBy('updatedAt')
      .reverse()
      .filter((s) => !s.completedAt && !s.drill)
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
      shuffleAfterFailure: settings.shuffleAfterFailure,
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
    if (session.drill) {
      await data.saveDeckProgress(deckId, { lastStudiedAt: now });
    } else if (outcome.event === 'run-failed') {
      await data.saveDeckProgress(deckId, {
        perfectRunsCompleted: outcome.session.perfectRunsCompleted,
        hardModeFailures: (current?.hardModeFailures ?? 0) + 1,
        lastStudiedAt: now,
      });
    } else if (outcome.event === 'perfect-run') {
      await data.saveDeckProgress(deckId, {
        perfectRunsCompleted: outcome.session.perfectRunsCompleted,
        lastStudiedAt: now,
      });
    } else if (outcome.event === 'deck-mastered') {
      await data.saveDeckProgress(deckId, {
        perfectRunsCompleted: outcome.session.perfectRunsCompleted,
        hardModePassedAt: now,
        lastStudiedAt: now,
      });
    } else if (outcome.event === 'session-complete') {
      await data.saveDeckProgress(deckId, {
        normalModeCompletedAt: now,
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
