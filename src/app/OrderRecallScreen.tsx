import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Language } from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { LANGUAGE_LONG_LABEL } from '../utils/languageSelection';
import { sortCards } from '../utils/cardOrder';
import {
  deckStudyLanguages,
  gateCategories,
} from '../features/review/languagePolicy';
import { isSequencedDeck } from '../features/ordering/sequenced';
import { fireFeedback } from '../services/audio/feedback';
import DeckOrderingPair, {
  type OrderingResult,
} from '../components/ordering/DeckOrderingPair';
import ScreenHeader from '../components/controls/ScreenHeader';
import Confetti from '../components/feedback/Confetti';

/**
 * Put the deck back in order, on its own.
 *
 * The main run asks this once, part-way through the flawless rounds, and that
 * is where a learner normally meets it. This screen is the same drill on
 * demand: the deck arrives laid out in the wrong order, she carries each word
 * to the place she thinks it holds, and hands the column in when she is
 * satisfied. As many goes as she likes — a column handed in three times is one
 * she has read through three times.
 *
 * Both languages at once, side by side, worked in whichever order suits her.
 * The pass is still recorded per language, for the same reason it is still two
 * columns rather than one: counting to ten in Hebrew says nothing whatever
 * about counting to ten in Arabic.
 *
 * Only decks that run in an order ever reach here. See `features/ordering`.
 */

export default function OrderRecallScreen() {
  const { deckId = '' } = useParams();
  const navigate = useNavigate();

  const settings = useSettings((s) => s.settings);
  const perspectives = useSettings((s) => s.perspectives);
  const languages = useSettings((s) => s.languages);
  const lead = useSettings((s) => s.lead);
  const decks = useData((s) => s.decks);
  const categories = useData((s) => s.categories);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);
  const saveDeckProgress = useData((s) => s.saveDeckProgress);

  const deck = decks.find((d) => d.id === deckId);
  const category = categories.find((c) => c.id === deck?.categoryId);
  const studyLanguages = deckStudyLanguages(deck, languages);

  /** The deck in its own order — which, for a counting deck, is the answer. */
  const deckCards = useMemo(
    () => sortCards(cards.filter((c) => c.deckId === deckId)),
    [cards, deckId],
  );

  const [passed, setPassed] = useState<Partial<Record<Language, boolean>>>({});
  const [finished, setFinished] = useState(false);
  /** Bumped by "go again", so both columns are dealt afresh rather than kept. */
  const [attempt, setAttempt] = useState(0);

  // Stamped the moment a column comes out right, rather than held back until
  // both are in: the two are separate skills and one of them is now proven.
  const onLanguageDone = useCallback(
    (language: Language, { solved }: OrderingResult) => {
      setPassed((current) => ({ ...current, [language]: solved }));
      if (!solved) return;

      // Only a clean column counts. A deck the learner was shown most of the
      // way through is not a deck she can count in, and a stamp saying
      // otherwise is worse than no stamp at all.
      //
      // Read from the store rather than from the render that set this callback
      // up: the two columns can now be finished a few seconds apart, and the
      // whole `orderRecallPassedAt` map is written at once, so a stale copy
      // would rub out the language that finished first.
      const stamped =
        useData.getState().deckProgress[deckId]?.orderRecallPassedAt ?? {};

      void saveDeckProgress(deckId, {
        orderRecallPassedAt: { ...stamped, [language]: new Date().toISOString() },
      });
    },
    [deckId, saveDeckProgress],
  );

  const onDone = useCallback(() => {
    fireFeedback('deck-mastered', settings);
    setFinished(true);
  }, [settings]);

  const restart = useCallback(() => {
    setPassed({});
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
  if (!isSequencedDeck(deck, categories)) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow={category?.name} back />
        <div className="empty">
          <p>
            There is no order to put this deck in. Its cards are words rather
            than a sequence, so what comes after what is not a question about
            the language. The numbers, alphabets, and a few basics sequences are.
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
  const gate = gateCategories(categories, decks, deckProgress, languages, {
    deckIds: settings.openedDeckIds,
    categoryIds: settings.openedCategoryIds,
  })
    .find((entry) => entry.category.id === deck.categoryId)
    ?.gates.find((g) => g.deck.id === deck.id);

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
        <ScreenHeader title={deck.name} eyebrow="Activity: Memory Consolidation" back />
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
    // Every column she was asked for, not every column that exists: a learner
    // studying Hebrew alone has put the deck in order when the Hebrew is in
    // order.
    const both = studyLanguages.every((language) => passed[language] === true);

    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow="Activity: Memory Consolidation" back />
        <Confetti active={both} />

        <div className="panel">
          <div className="headline">{both ? 'In order' : 'Not quite'}</div>
          <p className="muted">
            {both
              ? 'All ' +
                deckCards.length +
                ' back in the right order' +
                (studyLanguages.length > 1
                  ? ', in both languages.'
                  : ', in ' + LANGUAGE_LONG_LABEL[studyLanguages[0]] + '.')
              : studyLanguages
                  .map(
                    (entry) =>
                      LANGUAGE_LONG_LABEL[entry] +
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
      <ScreenHeader title={deck.name} eyebrow="Activity: Memory Consolidation" back />

      <div className="panel order-brief">
        <div className="headline">Reorder the cards</div>
        <p className="small muted">Drag the cards into the correct order.</p>
      </div>

      <DeckOrderingPair
        // Keyed by attempt, so "go again" deals both columns afresh rather than
        // handing back the ones already arranged.
        key={attempt}
        cards={deckCards}
        perspectives={perspectives}
        languages={studyLanguages}
        lead={lead}
        showTransliteration={settings.showTransliteration}
        reducedMotion={settings.reducedMotion}
        onFeedback={(kind) => fireFeedback(kind, settings)}
        onLanguageDone={onLanguageDone}
        onDone={onDone}
        doneLabel="Finish"
      />
    </div>
  );
}
