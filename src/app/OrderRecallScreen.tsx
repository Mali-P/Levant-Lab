import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Language } from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { sortCards } from '../utils/cardOrder';
import { gateDecks } from '../features/review/unlock';
import { isSequencedCategory } from '../features/ordering/sequenced';
import { fireFeedback } from '../services/audio/feedback';
import DeckOrdering from '../components/ordering/DeckOrdering';
import ScreenHeader from '../components/controls/ScreenHeader';
import Confetti from '../components/feedback/Confetti';

/**
 * Put the deck back in order, on its own.
 *
 * The main run asks this once, part-way through the flawless rounds, and that
 * is where a learner normally meets it. This screen is the same drill on
 * demand: the deck arrives jumbled, she hangs each word on the number it
 * belongs to, and a word put in the wrong place goes straight back to the pile.
 *
 * Hebrew first, then Arabic, with nothing in between — one toggle rather than a
 * menu, because they are two halves of the same sitting. The pass is recorded
 * per language for the same reason it is asked per language: counting to ten in
 * Hebrew says nothing whatever about counting to ten in Arabic.
 *
 * Only decks that run in an order ever reach here. See `features/ordering`.
 */

const LANGUAGE_LABEL: Record<Language, string> = {
  hebrew: 'Hebrew',
  arabic: 'Levantine Arabic',
};

export default function OrderRecallScreen() {
  const { deckId = '' } = useParams();
  const navigate = useNavigate();

  const settings = useSettings((s) => s.settings);
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const decks = useData((s) => s.decks);
  const categories = useData((s) => s.categories);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);
  const saveDeckProgress = useData((s) => s.saveDeckProgress);

  const deck = decks.find((d) => d.id === deckId);
  const category = categories.find((c) => c.id === deck?.categoryId);
  const progress = deckProgress[deckId];

  /** The deck in its own order — which, for a counting deck, is the answer. */
  const deckCards = useMemo(
    () => sortCards(cards.filter((c) => c.deckId === deckId)),
    [cards, deckId],
  );

  const [language, setLanguage] = useState<Language>('hebrew');
  const [passed, setPassed] = useState<Partial<Record<Language, boolean>>>({});
  const [finished, setFinished] = useState(false);
  /** Bumped by "go again", so the pile is dealt afresh rather than remembered. */
  const [attempt, setAttempt] = useState(0);

  const onDone = useCallback(
    ({ solved }: { solved: boolean; slips: number }) => {
      setPassed((current) => ({ ...current, [language]: solved }));

      if (solved) {
        // Only a clean column counts. A deck the learner was shown most of the
        // way through is not a deck she can count in, and a stamp saying
        // otherwise is worse than no stamp at all.
        void saveDeckProgress(deckId, {
          orderRecallPassedAt: {
            ...(progress?.orderRecallPassedAt ?? {}),
            [language]: new Date().toISOString(),
          },
        });
      }

      if (language === 'hebrew') {
        setLanguage('arabic');
        return;
      }

      fireFeedback('deck-mastered', settings);
      setFinished(true);
    },
    [language, deckId, progress, saveDeckProgress, settings],
  );

  const restart = useCallback(() => {
    setPassed({});
    setLanguage('hebrew');
    setFinished(false);
    setAttempt((n) => n + 1);
  }, []);

  if (!deck) {
    return (
      <div className="screen">
        <ScreenHeader title="Deck not found" back />
      </div>
    );
  }

  // A deck of words has no order to recall — its cards sit in the order
  // somebody wrote them down. A bookmark can still point here, so it is said
  // plainly rather than quietly quizzing her on a sequence that means nothing.
  if (!isSequencedCategory(category)) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow={category?.name} back />
        <div className="empty">
          <p>
            There is no order to put this deck in. Its cards are words rather
            than a sequence, so what comes after what is not a question about
            the language. The numbers and the alphabets are.
          </p>
          <Link className="btn btn-primary" to={'/deck/' + deck.id}>
            Back to {deck.name}
          </Link>
        </div>
      </div>
    );
  }

  // The same ladder every other way into a deck is held to, enforced here too
  // so a bookmark cannot walk past it.
  const gate = gateDecks(
    decks.filter((d) => d.categoryId === deck.categoryId),
    deckProgress,
  ).find((g) => g.deck.id === deck.id);

  if (gate && !gate.unlocked) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow={category?.name} back />
        <div className="empty">
          <p>
            This deck is still locked. Master <strong>{gate.blockedBy!.name}</strong>{' '}
            first — {gate.perfectRunsRequired} flawless runs through it.
          </p>
          <Link className="btn btn-primary" to={'/category/' + deck.categoryId}>
            Back to {category?.name ?? 'the category'}
          </Link>
        </div>
      </div>
    );
  }

  if (deckCards.length === 0) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow="Put them in order" back />
        <div className="empty">
          <p>This deck has no cards to put in order yet.</p>
          <Link className="btn btn-primary" to="/manage">
            Add cards
          </Link>
        </div>
      </div>
    );
  }

  /* ---- the summary ------------------------------------------------------ */

  if (finished) {
    const both = passed.hebrew === true && passed.arabic === true;

    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow="In order" back />
        <Confetti active={both} />

        <div className="panel">
          <div className="headline">{both ? 'In order' : 'Not quite'}</div>
          <p className="muted">
            {both
              ? 'All ' +
                deckCards.length +
                ' back in the right order, in both languages.'
              : (['hebrew', 'arabic'] as const)
                  .map(
                    (entry) =>
                      LANGUAGE_LABEL[entry] +
                      ': ' +
                      (passed[entry] ? 'in order' : 'shown'),
                  )
                  .join(' · ')}
          </p>
          <p className="small muted">
            {both
              ? 'That is the sequence itself, not just the words — the one thing a run through the cards never asks.'
              : 'Nothing was marked against your cards. The order is worth reading through again before another go.'}
          </p>

          <div className="stack">
            <button className="btn btn-block" onClick={restart}>
              Go again
            </button>
            <button
              className="btn btn-primary btn-block"
              onClick={() => navigate('/deck/' + deck.id)}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- the run ---------------------------------------------------------- */

  return (
    <div className="screen">
      <ScreenHeader
        title={deck.name}
        eyebrow={LANGUAGE_LABEL[language] + ' · In order'}
        back
      />

      <div className="panel">
        <div className="headline">
          {language === 'hebrew' ? 'Put them in order' : 'And again in Arabic'}
        </div>
        <p className="small muted">
          {language === 'hebrew'
            ? 'Drag each word onto the number it belongs to. Put one in the wrong place and it goes back to the pile.'
            : 'The same ' +
              deckCards.length +
              ', the other language. Counting in Hebrew and counting in Arabic are two things to know.'}
        </p>
      </div>

      <DeckOrdering
        // Keyed by language and by attempt, so each leg is dealt afresh rather
        // than carried over from the one before it.
        key={language + '|' + attempt}
        cards={deckCards}
        language={language}
        perspectives={perspectives}
        lead={lead}
        showTransliteration={settings.showTransliteration}
        reducedMotion={settings.reducedMotion}
        onFeedback={(kind) => fireFeedback(kind, settings)}
        onDone={onDone}
        doneLabel={language === 'hebrew' ? 'Now in Arabic' : 'Finish'}
      />
    </div>
  );
}
