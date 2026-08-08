import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { AnswerMode, Flashcard, PromptDirection, StudyMode } from '../types';
import { useData } from '../stores/dataStore';
import { useSession } from '../stores/sessionStore';
import { useSettings } from '../stores/settingsStore';
import { usePronunciation } from '../hooks/usePronunciation';
import { wordForms } from '../utils/wordForms';
import { sortCards } from '../utils/cardOrder';
import { buildPromptPlan, gradePlan } from '../features/study/prompts';
import { remainingInStack } from '../features/study/engine';
import { gateDecks } from '../features/review/unlock';
import { db } from '../services/database/db';
import { fireFeedback } from '../services/audio/feedback';
import StudyCard from '../components/cards/StudyCard';
import AnswerFeedback from '../components/feedback/AnswerFeedback';
import Confetti from '../components/feedback/Confetti';
import PerfectRuns from '../components/progress/PerfectRuns';
import ScreenHeader from '../components/controls/ScreenHeader';

const EMPTY_VALUES = { hebrew: '', arabic: '' };

export default function StudyScreen() {
  const { deckId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const settings = useSettings((s) => s.settings);
  const decks = useData((s) => s.decks);
  const categories = useData((s) => s.categories);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);

  const session = useSession((s) => s.session);
  const lastOutcome = useSession((s) => s.lastOutcome);
  const awaitingAdvance = useSession((s) => s.awaitingAdvance);
  const startSession = useSession((s) => s.start);
  const submitAnswer = useSession((s) => s.submit);
  const advance = useSession((s) => s.advance);
  const stepBack = useSession((s) => s.stepBack);
  const abandon = useSession((s) => s.abandon);
  // The store only fills its history in normal mode, so this is already false
  // in hard and brutal without the screen having to know why.
  const canStepBack = useSession((s) => s.history.length > 0);

  const { play } = usePronunciation(settings);

  // The prompt button and the autoplay settings speak the word's leading form:
  // the feminine one where a card has a pair, matching how the forms are read.
  const speak = useCallback(
    (card: Flashcard, language: 'hebrew' | 'arabic') => {
      const [first] = wordForms(language === 'hebrew' ? card.hebrew : card.arabic);
      if (first) void play(first, language);
    },
    [play],
  );

  const [values, setValues] = useState(EMPTY_VALUES);
  const [revealed, setRevealed] = useState(false);
  const [booting, setBooting] = useState(true);
  const [celebrate, setCelebrate] = useState(false);
  // The session advances the moment an answer is graded, so the feedback sheet
  // needs its own handle on the card that was just answered.
  const [gradedCardId, setGradedCardId] = useState<string | null>(null);
  // What was typed into each card that can still be taken back, oldest first,
  // kept in step with the store's own undo stack. A ref rather than state
  // because nothing renders from it until a card is actually walked back to —
  // and it is screen business, not session business: the store has no interest
  // in half-typed text.
  const typedHistory = useRef<{ hebrew: string; arabic: string }[]>([]);

  const deck = decks.find((d) => d.id === deckId);
  const category = categories.find((c) => c.id === deck?.categoryId);

  // A bookmark or a stale link can point straight at a deck the learner has
  // not earned yet, so the ladder is enforced here too, not only in the UI
  // that hides the button.
  const gate = deck
    ? gateDecks(
        decks.filter((d) => d.categoryId === deck.categoryId),
        deckProgress,
      ).find((g) => g.deck.id === deck.id)
    : undefined;
  const locked = Boolean(gate && !gate.unlocked);

  // In the deck's own order, so a run with shuffling turned off asks one to ten
  // in that order rather than in whatever order IndexedDB returned the rows.
  const deckCards = useMemo(
    () => sortCards(cards.filter((c) => c.deckId === deckId)),
    [cards, deckId],
  );

  // `?card=` turns the screen into a drill on one weak word: the same quiz and
  // the same grading, over a stack of one. It is what the weakest-cards list on
  // the home screen opens, so a word answered wrongly comes back as a question
  // rather than as the card editor.
  const drillCardId = params.get('card');
  const drillCard = drillCardId
    ? deckCards.find((c) => c.id === drillCardId)
    : undefined;
  const sessionCards = useMemo(
    () => (drillCardId ? (drillCard ? [drillCard] : []) : deckCards),
    [drillCardId, drillCard, deckCards],
  );

  const mode = (params.get('mode') as StudyMode) || settings.defaultMode;
  const answerModeParam = params.get('answer') as AnswerMode | null;
  // Brutal mode makes typing mandatory, whatever the deck default says.
  const answerMode: AnswerMode =
    mode === 'brutal'
      ? 'typed'
      : answerModeParam ??
        (settings.requireTyping ? 'typed' : settings.defaultAnswerMode);
  const direction = (params.get('direction') as PromptDirection) ||
    deck?.promptDirections[0] ||
    'en>he+ar';

  // Brutal mode strips the crutches.
  const showTransliteration =
    mode === 'brutal' ? false : settings.showTransliteration;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // A different deck or mode is a different run: whatever was typed into
      // the last one can never be gone back to, and the store clears its own
      // snapshots alongside.
      typedHistory.current = [];

      if (!deck || locked || sessionCards.length === 0) {
        setBooting(false);
        return;
      }

      // A drill always starts fresh, and never resumes or is resumed into: the
      // deck's own half-finished run is a different session and stays put.
      // Drills walked away from are cleared here rather than left to pile up,
      // since nothing else will ever open one again.
      if (drillCardId) {
        const abandoned = await db.sessions
          .filter((s) => Boolean(s.drill) && !s.completedAt)
          .primaryKeys();
        if (abandoned.length) await db.sessions.bulkDelete(abandoned);
      }

      const open = drillCardId
        ? undefined
        : await db.sessions
            .orderBy('updatedAt')
            .reverse()
            .filter(
              (s) =>
                s.deckId === deckId &&
                !s.completedAt &&
                !s.drill &&
                s.mode === mode,
            )
            .first();

      if (cancelled) return;

      if (open) {
        // Resume exactly where the last session stopped. Nothing can be taken
        // back across that gap: the progress rows an undo would restore were
        // only ever held in memory, and they went with the last visit.
        useSession.setState({
          session: open,
          lastOutcome: null,
          awaitingAdvance: false,
          history: [],
        });
      } else {
        await startSession({
          deckId,
          cards: sessionCards,
          mode,
          answerMode,
          promptDirection: direction,
          perfectRunsRequired: deck.perfectRunsRequired,
          drill: Boolean(drillCardId),
        });
      }
      if (!cancelled) setBooting(false);
    })();

    return () => {
      cancelled = true;
    };
    // Restarting on every settings tweak would discard the user's place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, mode, sessionCards.length, drillCardId, locked]);

  const currentCard = session?.currentCardId
    ? deckCards.find((c) => c.id === session.currentCardId)
    : undefined;

  const gradedCard = gradedCardId
    ? deckCards.find((c) => c.id === gradedCardId)
    : undefined;

  const plan = useMemo(
    () =>
      currentCard
        ? buildPromptPlan(currentCard, direction, {
            ignoreDiacritics: settings.ignoreDiacritics,
            lenientArabicLetters: settings.lenientArabicLetters,
            acceptAlternateAnswers: settings.acceptAlternateAnswers,
            // Only the perspectives she is studying are asked for, so a card
            // with speaker/listener variants never grades her against a form
            // she has not turned on.
            perspectives: settings.speechPerspectives,
          })
        : null,
    [
      currentCard,
      direction,
      settings.ignoreDiacritics,
      settings.lenientArabicLetters,
      settings.acceptAlternateAnswers,
      settings.speechPerspectives,
    ],
  );

  // Whether an answer given now could be taken back afterwards. Kept in step
  // with the condition the store uses, so `typedHistory` never drifts out of
  // alignment with the snapshots it is indexed against.
  const rewindable = mode === 'normal' && !drillCardId;

  const grade = useCallback(
    async (result: { hebrew: boolean; arabic: boolean }) => {
      setGradedCardId(useSession.getState().session?.currentCardId ?? null);
      if (rewindable) typedHistory.current.push(values);
      const outcome = await submitAnswer(result);
      if (!outcome) return;

      if (outcome.event === 'run-failed') {
        fireFeedback('run-failed', settings);
      } else if (outcome.event === 'deck-mastered') {
        fireFeedback('deck-mastered', settings);
        setCelebrate(true);
      } else if (outcome.event === 'perfect-run') {
        fireFeedback('perfect-run', settings);
        setCelebrate(true);
      } else {
        fireFeedback(outcome.fullyCorrect ? 'accept' : 'reject', settings);
      }
    },
    [submitAnswer, settings, rewindable, values],
  );

  const submitTyped = useCallback(() => {
    if (!plan || !currentCard || awaitingAdvance) return;
    void grade(
      gradePlan(plan, currentCard, values, {
        ignoreDiacritics: settings.ignoreDiacritics,
        lenientArabicLetters: settings.lenientArabicLetters,
        acceptAlternateAnswers: settings.acceptAlternateAnswers,
        perspectives: settings.speechPerspectives,
      }),
    );
  }, [plan, currentCard, values, awaitingAdvance, grade, settings]);

  const continueNext = useCallback(() => {
    setValues(EMPTY_VALUES);
    setRevealed(false);
    setCelebrate(false);
    setGradedCardId(null);
    advance();
  }, [advance]);

  /**
   * Swipe left: take back the last answer and stand on that card again.
   *
   * The whole point is a second look, so the learner lands with what she typed
   * still in the fields, ready to be corrected and sent again. Her score is put
   * back at the same moment — the answer she is replacing must not still be
   * sitting in the card's accuracy while she replaces it.
   *
   * The reveal is deliberately asymmetric. Self-graded cards come back open, so
   * she can see the answer and judge herself again; typed cards come back
   * closed, because handing her the transliteration for a word she is about to
   * retype would be marking her own homework.
   */
  const goBack = useCallback(async () => {
    if (awaitingAdvance) return;

    const cardId = await stepBack();
    if (!cardId) return;

    setValues(typedHistory.current.pop() ?? EMPTY_VALUES);
    setRevealed(answerMode !== 'typed');
    setCelebrate(false);
    setGradedCardId(null);
  }, [stepBack, awaitingAdvance, answerMode]);

  // Desktop keyboard support.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (awaitingAdvance) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          continueNext();
        }
        return;
      }
      if (event.key === 'Enter' && answerMode === 'typed') {
        event.preventDefault();
        submitTyped();
      }
      if (event.key === ' ' && answerMode === 'self' && !revealed) {
        event.preventDefault();
        setRevealed(true);
      }
      // The keyboard twin of the back swipe. Left alone in a typed field, where
      // the arrow is how you move the caret through what you are writing.
      if (event.key === 'ArrowLeft' && canStepBack) {
        const editing = document.activeElement?.tagName === 'INPUT';
        if (editing) return;
        event.preventDefault();
        void goBack();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    awaitingAdvance,
    answerMode,
    revealed,
    submitTyped,
    continueNext,
    canStepBack,
    goBack,
  ]);

  // Auto-play on reveal, per language.
  useEffect(() => {
    if (!revealed || !currentCard) return;
    if (settings.autoPlayHebrew) void speak(currentCard, 'hebrew');
    if (settings.autoPlayArabic) void speak(currentCard, 'arabic');
  }, [revealed, currentCard, settings.autoPlayHebrew, settings.autoPlayArabic, speak]);

  if (booting) {
    return (
      <div className="screen">
        <p className="muted">Shuffling…</p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="screen">
        <ScreenHeader title="Deck not found" back />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow={category?.name} back />
        <div className="empty">
          <p>
            This deck is still locked. Master{' '}
            <strong>{gate!.blockedBy!.name}</strong> first —{' '}
            {gate!.perfectRunsRequired} flawless runs through it.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/category/' + deck.categoryId)}
          >
            Back to {category?.name ?? 'the category'}
          </button>
        </div>
      </div>
    );
  }

  // A drill whose card has since been deleted or moved: say so plainly rather
  // than silently quizzing the whole deck instead.
  if (drillCardId && !drillCard) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow={category?.name} back />
        <div className="empty">
          <p>That card is no longer in this deck.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  if (sessionCards.length === 0) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow={category?.name} back />
        <div className="empty">
          <p>This deck has no cards yet.</p>
          <button className="btn btn-primary" onClick={() => navigate('/manage')}>
            Add cards
          </button>
        </div>
      </div>
    );
  }

  if (session?.completedAt) {
    const mastered = !session.drill && session.mode !== 'normal';

    // A drill ends on its one card, so it reports that card and sends the
    // learner back to the list they picked it from.
    if (session.drill) {
      return (
        <div className="screen">
          <ScreenHeader title={drillCard!.english} eyebrow="Weak card" back />
          <Confetti active />
          <div className="panel">
            <div className="headline">Card cleared</div>
            <p className="muted">
              Answered correctly in both Hebrew and Arabic. It stays on the
              weakest list until its accuracy catches up.
            </p>
            <button
              className="btn btn-primary btn-block"
              onClick={async () => {
                await abandon();
                navigate('/');
              }}
            >
              Done
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow={category?.name} back />
        <Confetti active />
        <div className="panel">
          <div className="headline">{mastered ? 'Deck mastered' : 'Deck complete'}</div>
          {mastered ? (
            <p className="muted">
              {session.perfectRunsRequired} perfect runs, {session.answers.length}{' '}
              flawless answers.
            </p>
          ) : (
            <p className="muted">
              Every card answered correctly in both Hebrew and Arabic.
            </p>
          )}
          <button
            className="btn btn-primary btn-block"
            onClick={async () => {
              await abandon();
              navigate('/category/' + deck.categoryId);
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!session || !currentCard || !plan) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.name} back />
        <p className="muted">No card to show.</p>
      </div>
    );
  }

  const position = session.activeCardIds.length - remainingInStack(session) + 1;
  const modeLabel =
    mode === 'normal' ? 'Normal' : mode === 'hard' ? 'Hard mode' : 'Brutal mode';

  return (
    <div className="screen study">
      <ScreenHeader
        title={deck.name}
        eyebrow={
          session.drill
            ? 'Weak card · ' + (category?.name ?? '')
            : (category?.name ?? '') + ' · ' + modeLabel
        }
        back
      />

      <div className="study-meta small">
        <span>
          {session.drill
            ? 'One weak card'
            : 'Card ' + position + ' of ' + session.activeCardIds.length}
        </span>
        <span className="muted">
          {remainingInStack(session) - 1} remaining
        </span>
        {mode === 'normal' && (
          <span className="chip">Retry pile: {session.retryCardIds.length}</span>
        )}
      </div>

      {mode !== 'normal' && (
        <PerfectRuns
          completed={session.perfectRunsCompleted}
          required={session.perfectRunsRequired}
        />
      )}

      <StudyCard
        card={currentCard}
        plan={plan}
        revealed={revealed}
        typed={answerMode === 'typed'}
        values={values}
        perspectives={settings.speechPerspectives}
        showTransliteration={showTransliteration}
        animationIntensity={settings.cardAnimationIntensity}
        reducedMotion={settings.reducedMotion}
        onChange={(scores, value) =>
          setValues((prev) => ({ ...prev, [scores]: value }))
        }
        onReveal={() => setRevealed(true)}
        onSpeak={(language) => void speak(currentCard, language)}
        onSwipeRight={() => {
          if (answerMode === 'typed') submitTyped();
          else void grade({ hebrew: true, arabic: true });
        }}
        // Only where there is an answer to take back. Hard and brutal never
        // offer it: a run you can rewind is not a run.
        onSwipeBack={canStepBack ? () => void goBack() : undefined}
      />

      {answerMode === 'typed' ? (
        <button className="btn btn-primary btn-block" onClick={submitTyped}>
          Submit
        </button>
      ) : revealed ? (
        <div className="grade-grid">
          <button
            className="btn btn-primary"
            onClick={() => void grade({ hebrew: true, arabic: true })}
          >
            ✓ Both correct
          </button>
          <button
            className="btn btn-danger"
            onClick={() => void grade({ hebrew: false, arabic: false })}
          >
            ✗ Both wrong
          </button>
          <button
            className="btn"
            onClick={() => void grade({ hebrew: false, arabic: true })}
          >
            Hebrew wrong
          </button>
          <button
            className="btn"
            onClick={() => void grade({ hebrew: true, arabic: false })}
          >
            Arabic wrong
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary btn-block"
          onClick={() => setRevealed(true)}
        >
          Reveal both answers
        </button>
      )}

      {/* The gesture's equivalent for anyone not swiping. Only rendered where
          the gesture itself is offered, so the two never disagree about
          whether going back is possible. */}
      {canStepBack && (
        <button className="btn btn-ghost btn-block" onClick={() => void goBack()}>
          ← Back to the last card
        </button>
      )}

      {!revealed && (
        <p className="small muted" style={{ textAlign: 'center' }}>
          {canStepBack
            ? 'Swipe right for correct, up to reveal, left to go back and change your last answer.'
            : 'Swipe right for correct, up to reveal.'}
        </p>
      )}

      <Confetti active={celebrate} />

      {awaitingAdvance && lastOutcome && gradedCard && (
        <AnswerFeedback
          outcome={lastOutcome}
          card={gradedCard}
          onContinue={continueNext}
        />
      )}
    </div>
  );
}
