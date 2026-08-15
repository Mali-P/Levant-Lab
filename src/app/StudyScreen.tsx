import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type {
  AnswerMode,
  Flashcard,
  Language,
  PromptDirection,
  StudyMode,
} from '../types';
import { useData } from '../stores/dataStore';
import { useSession } from '../stores/sessionStore';
import { useSettings } from '../stores/settingsStore';
import { usePronunciation } from '../hooks/usePronunciation';
import { wordForms } from '../utils/wordForms';
import { LANGUAGE_LONG_LABEL } from '../utils/languageSelection';
import { sortCards } from '../utils/cardOrder';
import { buildPromptPlan, gradePlan } from '../features/study/prompts';
import { selfGradeResult } from '../features/study/selfGrade';
import {
  currentIntroCardId,
  introRemaining,
  isLadderSession,
  type StudyEvent,
} from '../features/study/engine';
import { isSequencedDeck } from '../features/ordering/sequenced';
import { nextDeck } from '../features/review/unlock';
import {
  basicsBaseName,
  deckStudyLanguages,
  gateCategoryDecks,
  isBasicsCategory,
} from '../features/review/languagePolicy';
import { db } from '../services/database/db';
import { fireFeedback } from '../services/audio/feedback';
import StudyCard from '../components/cards/StudyCard';
import MemoriseCard from '../components/cards/MemoriseCard';
import AnswerFeedback from '../components/feedback/AnswerFeedback';
import Confetti from '../components/feedback/Confetti';
import StageBanner from '../components/progress/StageBanner';
import ScreenHeader from '../components/controls/ScreenHeader';
import DeckOrderingPair from '../components/ordering/DeckOrderingPair';

const EMPTY_VALUES = { hebrew: '', arabic: '' };

/**
 * Outcomes the run passes over without stopping.
 *
 * These are the marks on a single card — recalled, missed, missed inside a
 * mastery round. The score is written before anything renders, so there is
 * nothing for a sheet to add beyond making her tap Continue to be told what she
 * just graded herself. Every other event changes the shape of the run and keeps
 * its sheet.
 *
 * Which outcomes are worth stopping for is a question about this screen, not
 * about the ladder, so the list lives here rather than in the engine.
 */
const QUIET_EVENTS: readonly StudyEvent[] = [
  'continue',
  'retry-queued',
  'round-missed',
];

function sameLanguages(
  left: readonly Language[] | undefined,
  right: readonly Language[],
): boolean {
  return (left ?? right).join('|') === right.join('|');
}

export default function StudyScreen() {
  const { deckId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const settings = useSettings((s) => s.settings);
  const perspectives = useSettings((s) => s.perspectives);
  const languages = useSettings((s) => s.languages);
  const lead = useSettings((s) => s.lead);
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
  const flipIntro = useSession((s) => s.flipIntro);
  const nextIntro = useSession((s) => s.nextIntro);
  const prevIntro = useSession((s) => s.prevIntro);
  const finishOrdering = useSession((s) => s.finishOrdering);
  // The store only fills its history in normal mode, so this is already false
  // in hard and brutal without the screen having to know why.
  const canStepBack = useSession((s) => s.history.length > 0);

  const { play } = usePronunciation(settings);

  // The prompt button and the autoplay settings speak the word's leading form:
  // where a card has a pair, the learner's own half of it, matching how the
  // forms are read.
  const speak = useCallback(
    (card: Flashcard, language: 'hebrew' | 'arabic') => {
      const [first] = wordForms(
        language === 'hebrew' ? card.hebrew : card.arabic,
        undefined,
        lead,
      );
      if (first) void play(first, language);
    },
    [play, lead],
  );

  const [values, setValues] = useState(EMPTY_VALUES);
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
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
  const studyLanguages = deckStudyLanguages(deck, languages);
  const single = studyLanguages.length === 1;
  const only = studyLanguages[0];

  // A bookmark or a stale link can point straight at a deck the learner has
  // not earned yet, so the ladder is enforced here too, not only in the UI
  // that hides the button.
  const gate = deck
    ? gateCategoryDecks(
        category,
        decks.filter((d) => d.categoryId === deck.categoryId),
        deckProgress,
        languages,
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
                s.mode === mode &&
                sameLanguages(s.studyLanguages, studyLanguages) &&
                // A row from before the ladder has no stage to come back to.
                // Left in place rather than resumed; the climb starts again.
                isLadderSession(s),
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
          studyLanguages,
          masteryOnly: deck.masteryOnly,
          drill: Boolean(drillCardId),
          // Only a deck that runs in an order gets the ordering interlude, and
          // the decision is written onto the session rather than looked up each
          // round: a run in progress should not change shape because a
          // category was renamed halfway through it.
          sequenced: isSequencedDeck(deck, categories),
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
  const revealed = Boolean(currentCard && revealedCardId === currentCard.id);

  const gradedCard = gradedCardId
    ? deckCards.find((c) => c.id === gradedCardId)
    : undefined;

  // The word being read, in the stage's opening phase. Only one of `introCard`
  // and `currentCard` is ever set: the session is either introducing or asking.
  const introCard = session
    ? deckCards.find((c) => c.id === currentIntroCardId(session))
    : undefined;
  const introducing = session?.phase === 'introducing';

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
            perspectives,
            // And only the languages she is studying. The plan drops the other
            // one's field entirely, so it is never shown, never typed into and
            // never graded.
            languages: studyLanguages,
          })
        : null,
    [
      currentCard,
      direction,
      settings.ignoreDiacritics,
      settings.lenientArabicLetters,
      settings.acceptAlternateAnswers,
      perspectives,
      studyLanguages,
    ],
  );

  // Whether an answer given now could be taken back afterwards. Kept in step
  // with the condition the store uses, so `typedHistory` never drifts out of
  // alignment with the snapshots it is indexed against.
  const rewindable = mode === 'normal' && !drillCardId;

  const continueNext = useCallback(() => {
    setValues(EMPTY_VALUES);
    setRevealedCardId(null);
    setCelebrate(false);
    setGradedCardId(null);
    advance();
  }, [advance]);

  const grade = useCallback(
    async (result: { hebrew: boolean; arabic: boolean }) => {
      setGradedCardId(useSession.getState().session?.currentCardId ?? null);
      if (rewindable) typedHistory.current.push(values);
      const outcome = await submitAnswer(result);
      if (!outcome) return;

      if (outcome.event === 'round-reset' || outcome.event === 'round-ended') {
        fireFeedback('run-failed', settings);
      } else if (outcome.event === 'deck-mastered') {
        fireFeedback('deck-mastered', settings);
        setCelebrate(true);
      } else if (
        outcome.event === 'perfect-round' ||
        outcome.event === 'ordering-due'
      ) {
        fireFeedback('perfect-run', settings);
        setCelebrate(true);
      } else if (
        outcome.event === 'stage-pass-complete' ||
        outcome.event === 'stage-complete' ||
        outcome.event === 'full-deck-reached'
      ) {
        // Clearing a set is worth marking, but it is a rung rather than a
        // summit: the accept sound, and no confetti until the deck is hers.
        fireFeedback('accept', settings);
      } else {
        fireFeedback(outcome.fullyCorrect ? 'accept' : 'reject', settings);
      }

      // An ordinary answer is recorded and left at that. The sheet used to stop
      // her on every card to say "Perfect." or "Not yet." over an answer she had
      // just graded herself, and to print the word back at her — a verdict she
      // had already reached and a correction she had already read off the
      // revealed card. The score was written before any of it rendered, so
      // stepping straight to the next card loses nothing but the interruption.
      //
      // Milestones keep their sheet. Clearing a stage, mastering the deck or
      // having a round dealt again are things the run does *to* her rather than
      // marks on one card, and each of them changes what happens next.
      if (QUIET_EVENTS.includes(outcome.event)) continueNext();
    },
    [submitAnswer, settings, rewindable, values, continueNext],
  );

  const submitTyped = useCallback(() => {
    if (!plan || !currentCard || awaitingAdvance) return;
    void grade(
      gradePlan(plan, currentCard, values, {
        ignoreDiacritics: settings.ignoreDiacritics,
        lenientArabicLetters: settings.lenientArabicLetters,
        acceptAlternateAnswers: settings.acceptAlternateAnswers,
        perspectives,
        languages: studyLanguages,
      }),
    );
  }, [
    plan,
    currentCard,
    values,
    awaitingAdvance,
    grade,
    settings,
    perspectives,
    studyLanguages,
  ]);

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
    setRevealedCardId(answerMode !== 'typed' ? cardId : null);
    setCelebrate(false);
    setGradedCardId(null);
  }, [stepBack, awaitingAdvance, answerMode]);

  // Desktop keyboard support.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // The feedback sheet is checked first even in the introducing phase: the
      // answer that cleared a stage is still waiting to be acknowledged, and
      // Enter must dismiss it rather than skip a word behind it.
      if (awaitingAdvance) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          continueNext();
        }
        return;
      }

      // Reading the new words has its own keys, and none of them can grade
      // anything: space turns the card over, enter and the left arrow move on,
      // the right arrow steps back — the same bindings as the Memorise tab.
      if (introducing) {
        if (event.key === ' ') {
          event.preventDefault();
          void flipIntro();
        } else if (event.key === 'Enter' || event.key === 'ArrowLeft') {
          event.preventDefault();
          void nextIntro();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          void prevIntro();
        }
        return;
      }

      if (event.key === 'Enter' && answerMode === 'typed') {
        event.preventDefault();
        submitTyped();
      }
      if (event.key === ' ' && answerMode === 'self' && !revealed) {
        event.preventDefault();
        setRevealedCardId(useSession.getState().session?.currentCardId ?? null);
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
    introducing,
    flipIntro,
    nextIntro,
    prevIntro,
  ]);

  // Auto-play on reveal, per language.
  useEffect(() => {
    if (!revealed || !currentCard) return;
    // A language switched off is never spoken, whatever its auto-play toggle
    // says: the setting is about when to speak it, not whether it is studied.
    if (settings.autoPlayHebrew && studyLanguages.includes('hebrew')) {
      void speak(currentCard, 'hebrew');
    }
    if (settings.autoPlayArabic && studyLanguages.includes('arabic')) {
      void speak(currentCard, 'arabic');
    }
  }, [
    revealed,
    currentCard,
    settings.autoPlayHebrew,
    settings.autoPlayArabic,
    studyLanguages,
    speak,
  ]);

  // The same, for a word being met rather than recalled: turning the card over
  // is the moment she first hears it.
  const introFlipped = session?.introduceFlipped ?? false;
  useEffect(() => {
    if (!introFlipped || !introCard) return;
    if (settings.autoPlayHebrew && studyLanguages.includes('hebrew')) {
      void speak(introCard, 'hebrew');
    }
    if (settings.autoPlayArabic && studyLanguages.includes('arabic')) {
      void speak(introCard, 'arabic');
    }
  }, [
    introFlipped,
    introCard,
    settings.autoPlayHebrew,
    settings.autoPlayArabic,
    studyLanguages,
    speak,
  ]);

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
              {single
                ? 'Answered correctly in ' + LANGUAGE_LONG_LABEL[only] + '.'
                : 'Answered correctly in both Hebrew and Arabic.'}{' '}
              It stays on the weakest list until its accuracy catches up.
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

    // The deck is only ever finished by mastering it now, so the panel says so
    // and then points at what comes next. The ladder is meant to run on: the
    // learner who has just held ten words through ten clean rounds should not
    // be dropped back into a menu to work out what to open.
    const upNext = nextDeck(
      gateCategoryDecks(
        category,
        decks.filter((d) => d.categoryId === deck.categoryId),
        deckProgress,
        languages,
      ),
    )?.deck;
    const basics = isBasicsCategory(category);
    const deckLanguage = deck.studyLanguages?.[0];
    const sameBasicsLot =
      basics && upNext && basicsBaseName(deck) === basicsBaseName(upNext);
    const nextBasicsLot = basics && upNext && !sameBasicsLot;
    const headline =
      basics && deckLanguage === 'hebrew'
        ? 'Hebrew mastered'
        : basics && deckLanguage === 'arabic'
          ? 'Basics lot mastered'
          : 'Deck mastered';
    const detail =
      basics && deckLanguage === 'hebrew'
        ? 'Hebrew is complete for ' +
          basicsBaseName(deck) +
          '. Arabic is the next half of this lot.'
        : basics && deckLanguage === 'arabic'
          ? 'Hebrew and Arabic are both complete for ' + basicsBaseName(deck) + '.'
          : session.perfectRunsRequired + ' perfect rounds over the whole deck.';
    const startLabel = sameBasicsLot
      ? 'Start Arabic'
      : nextBasicsLot
        ? 'Start ' + basicsBaseName(upNext) + ' — Hebrew'
        : upNext
          ? 'Start ' + upNext.name + ' — first words'
          : '';

    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow={category?.name} back />
        <Confetti active />
        <div className="panel">
          <div className="headline">{headline}</div>
          <p className="muted">{detail}</p>

          <div className="stack">
            {upNext && (
              <button
                className="btn btn-primary btn-block"
                onClick={async () => {
                  await abandon();
                  navigate('/study/' + upNext.id + '?mode=' + mode);
                }}
              >
                {startLabel}
              </button>
            )}
            <button
              className={'btn btn-block' + (upNext ? '' : ' btn-primary')}
              onClick={async () => {
                await abandon();
                navigate('/category/' + deck.categoryId);
              }}
            >
              {upNext ? 'Not now' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const modeLabel =
    mode === 'normal' ? 'Normal' : mode === 'hard' ? 'Hard mode' : 'Brutal mode';
  const eyebrow = session?.drill
    ? 'Weak card · ' + (category?.name ?? '')
    : (category?.name ?? '') + ' · ' + modeLabel;

  /*
   * Reading the new words, before anything is asked.
   *
   * The same card the Memorise tab uses, on the study screen and inside the
   * same session — so the stage she is on, and how far through its new words
   * she has read, are written down with everything else rather than lost to a
   * navigation. Nothing here can be graded: there is no answer to give, and no
   * score moves because somebody looked at a word.
   */
  if (session && introducing && introCard) {
    const last = introRemaining(session) === 1;

    return (
      <div className="screen study">
        <ScreenHeader title={deck.name} eyebrow={eyebrow} back />

        <StageBanner session={session} languages={studyLanguages} />

        <MemoriseCard
          card={introCard}
          flipped={session.introduceFlipped}
          perspectives={perspectives}
          languages={studyLanguages}
          lead={lead}
          // Her own setting, even in brutal mode. Brutal strips the crutches
          // from the asking; it has no business taking the pronunciation away
          // from a word she is reading for the first time.
          showTransliteration={settings.showTransliteration}
          animationIntensity={settings.cardAnimationIntensity}
          reducedMotion={settings.reducedMotion}
          onFlip={() => void flipIntro()}
          onNext={() => void nextIntro()}
          onPrevious={() => void prevIntro()}
          canGoBack={session.introduceIndex > 0}
        />

        <div className="row">
          <button
            className="btn"
            onClick={() => void prevIntro()}
            disabled={session.introduceIndex === 0}
            aria-label="Previous card"
          >
            Back
          </button>
          <button className="btn grow" onClick={() => void flipIntro()}>
            {session.introduceFlipped ? 'Hide' : 'Flip'}
          </button>
          <button className="btn btn-primary grow" onClick={() => void nextIntro()}>
            {last ? 'Start testing' : 'Next'}
          </button>
        </div>

        {/* The answer that cleared the stage is graded against the session it
            was given in, but the session has already moved on to the words it
            unlocked. Without this the sheet reporting "Stage cleared" would be
            skipped entirely, and the last answer of every stage would pass
            unmarked. */}
        {awaitingAdvance && lastOutcome && gradedCard && (
          <AnswerFeedback
            outcome={lastOutcome}
            card={gradedCard}
            languages={studyLanguages}
            onContinue={continueNext}
          />
        )}
      </div>
    );
  }

  /*
   * The consolidation step, part-way through the flawless rounds.
   *
   * Ten perfect rounds establish that she knows what each word means. Not one
   * of them ever asks what comes after what, and for a deck of numbers that is
   * most of the point — so the run stops here, once, and asks for the sequence
   * itself. Both languages side by side, worked in whichever order suits her,
   * then straight back into the rounds with every banked one intact. Nothing
   * here is scored: it cannot cost her the deck, and it is not meant to.
   */
  if (session && session.phase === 'ordering') {
    // In the session's own order, which for a sequenced deck is the answer.
    const ordered = session.deckCardIds
      .map((id) => deckCards.find((c) => c.id === id))
      .filter((card): card is Flashcard => Boolean(card));

    return (
      <div className="screen study">
        <ScreenHeader title={deck.name} eyebrow={eyebrow} back />

        <StageBanner session={session} languages={studyLanguages} />

        <div className="panel order-brief">
          <div className="headline">Reorder the cards</div>
          <p className="small muted">Drag the numbers into the correct order.</p>
        </div>

        <DeckOrderingPair
          cards={ordered}
          perspectives={perspectives}
          languages={studyLanguages}
          lead={lead}
          showTransliteration={showTransliteration}
          reducedMotion={settings.reducedMotion}
          onFeedback={(kind) => fireFeedback(kind, settings)}
          onDone={({ solved }) => {
            if (solved) fireFeedback('perfect-run', settings);
            void finishOrdering();
          }}
          doneLabel="Back to the rounds"
        />

        {/* The answer that brought the interlude round is still waiting to be
            acknowledged, and the session has already moved on past it. */}
        {awaitingAdvance && lastOutcome && gradedCard && (
          <AnswerFeedback
            outcome={lastOutcome}
            card={gradedCard}
            languages={studyLanguages}
            onContinue={continueNext}
          />
        )}
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

  return (
    <div className="screen study">
      <ScreenHeader title={deck.name} eyebrow={eyebrow} back />

      <StageBanner session={session} languages={studyLanguages} />

      <StudyCard
        card={currentCard}
        plan={plan}
        revealed={revealed}
        typed={answerMode === 'typed'}
        values={values}
        perspectives={perspectives}
        lead={lead}
        showTransliteration={showTransliteration}
        animationIntensity={settings.cardAnimationIntensity}
        reducedMotion={settings.reducedMotion}
        onChange={(scores, value) =>
          setValues((prev) => ({ ...prev, [scores]: value }))
        }
        onReveal={() => setRevealedCardId(currentCard.id)}
        onSpeak={(language) => void speak(currentCard, language)}
        onSwipeRight={() => {
          if (answerMode === 'typed') submitTyped();
          else void grade(selfGradeResult('both-correct'));
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
        /* With one language there is no partial answer to describe, so the
           four-way grid collapses to the only two verdicts there are. The
           language she is not studying is handed to the engine correct, so it
           can never be the reason a card comes back. */
        single ? (
          <div className="grade-grid">
            <button
              className="btn btn-primary"
              onClick={() => void grade(selfGradeResult('correct', only))}
            >
              ✓ Correct
            </button>
            <button
              className="btn btn-danger"
              onClick={() => void grade(selfGradeResult('wrong', only))}
            >
              ✗ Wrong
            </button>
          </div>
        ) : (
          <div className="grade-grid">
            <button
              className="btn btn-primary"
              onClick={() => void grade(selfGradeResult('both-correct'))}
            >
              ✓ Both correct
            </button>
            <button
              className="btn btn-danger"
              onClick={() => void grade(selfGradeResult('both-wrong'))}
            >
              ✗ Both wrong
            </button>
            <button
              className="btn"
              onClick={() => void grade(selfGradeResult('hebrew-wrong'))}
            >
              Hebrew wrong
            </button>
            <button
              className="btn"
              onClick={() => void grade(selfGradeResult('arabic-wrong'))}
            >
              Arabic wrong
            </button>
          </div>
        )
      ) : (
        <button
          className="btn btn-primary btn-block"
          onClick={() => setRevealedCardId(currentCard.id)}
        >
          {single ? 'Reveal the answer' : 'Reveal both answers'}
        </button>
      )}

      {/* The gesture's equivalent for anyone not swiping. Only rendered where
          the gesture itself is offered, so the two never disagree about
          whether going back is possible. */}
      {canStepBack && (
        <button
          className="btn btn-ghost btn-block btn-compact"
          onClick={() => void goBack()}
        >
          ← Back to the last card
        </button>
      )}

      <Confetti active={celebrate} />

      {awaitingAdvance && lastOutcome && gradedCard && (
        <AnswerFeedback
          outcome={lastOutcome}
          card={gradedCard}
          languages={studyLanguages}
          onContinue={continueNext}
        />
      )}
    </div>
  );
}
