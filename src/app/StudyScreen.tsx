import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { AnswerMode, Flashcard, PromptDirection, StudyMode } from '../types';
import { useData } from '../stores/dataStore';
import { useSession } from '../stores/sessionStore';
import { useSettings } from '../stores/settingsStore';
import { usePronunciation } from '../hooks/usePronunciation';
import { wordForms } from '../utils/wordForms';
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
  const abandon = useSession((s) => s.abandon);

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

  const deckCards = useMemo(
    () => cards.filter((c) => c.deckId === deckId),
    [cards, deckId],
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
      if (!deck || locked || deckCards.length === 0) {
        setBooting(false);
        return;
      }

      const open = await db.sessions
        .orderBy('updatedAt')
        .reverse()
        .filter((s) => s.deckId === deckId && !s.completedAt && s.mode === mode)
        .first();

      if (cancelled) return;

      if (open) {
        // Resume exactly where the last session stopped.
        useSession.setState({
          session: open,
          lastOutcome: null,
          awaitingAdvance: false,
        });
      } else {
        await startSession({
          deckId,
          cards: deckCards,
          mode,
          answerMode,
          promptDirection: direction,
          perfectRunsRequired: deck.perfectRunsRequired,
        });
      }
      if (!cancelled) setBooting(false);
    })();

    return () => {
      cancelled = true;
    };
    // Restarting on every settings tweak would discard the user's place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, mode, deckCards.length, locked]);

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
          })
        : null,
    [
      currentCard,
      direction,
      settings.ignoreDiacritics,
      settings.lenientArabicLetters,
      settings.acceptAlternateAnswers,
    ],
  );

  const grade = useCallback(
    async (result: { hebrew: boolean; arabic: boolean }) => {
      setGradedCardId(useSession.getState().session?.currentCardId ?? null);
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
    [submitAnswer, settings],
  );

  const submitTyped = useCallback(() => {
    if (!plan || !currentCard || awaitingAdvance) return;
    void grade(
      gradePlan(plan, currentCard, values, {
        ignoreDiacritics: settings.ignoreDiacritics,
        lenientArabicLetters: settings.lenientArabicLetters,
        acceptAlternateAnswers: settings.acceptAlternateAnswers,
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
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [awaitingAdvance, answerMode, revealed, submitTyped, continueNext]);

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

  if (deckCards.length === 0) {
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
    const mastered = session.mode !== 'normal';
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
        eyebrow={(category?.name ?? '') + ' · ' + modeLabel}
        back
      />

      <div className="study-meta small">
        <span>
          Card {position} of {session.activeCardIds.length}
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
        onSwipeLeft={() => void grade({ hebrew: false, arabic: false })}
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

      {!revealed && (
        <p className="small muted" style={{ textAlign: 'center' }}>
          Swipe right for correct, left for retry, up to reveal.
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
