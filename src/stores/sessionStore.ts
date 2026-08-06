import { create } from 'zustand';
import type {
  AnswerMode,
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
};

type SessionState = {
  session: StudySession | null;
  lastOutcome: AnswerOutcome | null;
  /** Set while the feedback panel is showing, before the next card appears. */
  awaitingAdvance: boolean;

  start: (params: StartParams) => Promise<StudySession>;
  resumeLatest: () => Promise<StudySession | null>;
  submit: (input: AnswerInput) => Promise<AnswerOutcome | null>;
  advance: () => void;
  abandon: () => Promise<void>;
};

export const useSession = create<SessionState>((set, get) => ({
  session: null,
  lastOutcome: null,
  awaitingAdvance: false,

  async start(params) {
    const { settings } = useSettings.getState();
    const stored = useData.getState().deckProgress[params.deckId];

    const session = createSession({
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

    await db.sessions.put(session);
    set({ session, lastOutcome: null, awaitingAdvance: false });
    return session;
  },

  async resumeLatest() {
    const open = await db.sessions
      .orderBy('updatedAt')
      .reverse()
      .filter((s) => !s.completedAt)
      .first();
    set({ session: open ?? null, lastOutcome: null, awaitingAdvance: false });
    return open ?? null;
  },

  async submit(input) {
    const session = get().session;
    if (!session || get().awaitingAdvance) return null;

    const { settings } = useSettings.getState();
    const data = useData.getState();

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

    if (outcome.event === 'run-failed') {
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

    set({ session: outcome.session, lastOutcome: outcome, awaitingAdvance: true });
    return outcome;
  },

  advance() {
    set({ awaitingAdvance: false, lastOutcome: null });
  },

  async abandon() {
    const session = get().session;
    if (session) await db.sessions.delete(session.id);
    set({ session: null, lastOutcome: null, awaitingAdvance: false });
  },
}));
