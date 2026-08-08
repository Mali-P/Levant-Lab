import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { usePronunciation } from '../hooks/usePronunciation';
import { wordForms } from '../utils/wordForms';
import { sortCards } from '../utils/cardOrder';
import { gateDecks } from '../features/review/unlock';
import {
  createMemoriseSession,
  currentMemoriseCardId,
  flipCard,
  nextCard,
  previousCard,
  remainingToView,
  restartMemorise,
  type MemoriseSession,
} from '../features/memorise/session';
import { memoriseCategories, memorisePool } from '../features/memorise/selection';
import MemoriseCard from '../components/cards/MemoriseCard';
import ScreenHeader from '../components/controls/ScreenHeader';

/**
 * Memorise mode: read the cards once, one at a time.
 *
 * Two ways in, one screen. `/memorise/:deckId` reads a single deck, opened from
 * its mode picker. `/memorise` is the middle tab, and reads whichever categories
 * the learner ticked in Study — the first category until she ticks anything.
 *
 * Nothing on this screen grades anything. There is no answer to give, no
 * correct / incorrect pair, no retry pile, and not a single write to
 * `cardProgress` or `deckProgress` — the Hebrew and Arabic accuracy figures
 * cannot move while the learner is still meeting the words. The only tally is
 * how many cards have been turned over, which is kept in memory and forgotten
 * when the screen closes.
 */
export default function MemoriseScreen() {
  const { deckId } = useParams();
  const navigate = useNavigate();

  const settings = useSettings((s) => s.settings);
  const decks = useData((s) => s.decks);
  const categories = useData((s) => s.categories);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);

  const { play } = usePronunciation(settings);

  const [session, setSession] = useState<MemoriseSession | null>(null);
  // A first read through a deck follows the deck's own order — a counting deck
  // in particular only makes sense from one upwards — so the pass starts
  // unshuffled whatever the global study setting says. The learner turns
  // shuffling on here once the order itself has become the thing they remember.
  const [shuffle, setShuffle] = useState(false);

  const deck = deckId ? decks.find((d) => d.id === deckId) : undefined;
  const category = categories.find((c) => c.id === deck?.categoryId);

  // The tab's pile: the categories ticked in Study, the first category until
  // she ticks any. Deliberately not consulted in deck mode, where the deck the
  // learner opened is the pile and her tab selection has nothing to say.
  const chosen = useMemo(
    () =>
      deckId ? [] : memoriseCategories(categories, settings.memoriseCategoryIds),
    [deckId, categories, settings.memoriseCategoryIds],
  );

  // A bookmark can point straight at a deck the learner has not earned yet, so
  // the ladder is enforced here as well as in the UI that hides the button. The
  // pile has no gate of its own — `memorisePool` simply leaves locked decks out.
  const gate = deck
    ? gateDecks(
        decks.filter((d) => d.categoryId === deck.categoryId),
        deckProgress,
      ).find((g) => g.deck.id === deck.id)
    : undefined;
  const locked = Boolean(gate && !gate.unlocked);

  // Sorted, not merely filtered: IndexedDB returns rows by id, so an unsorted
  // "shuffle off" pass would still deal a counting deck out of sequence.
  const deckCards = useMemo(
    () =>
      deckId
        ? sortCards(cards.filter((c) => c.deckId === deckId))
        : memorisePool({ categories: chosen, decks, cards, deckProgress }),
    [deckId, chosen, cards, decks, deckProgress],
  );

  // What the pass is dealt from, as one string: a deck id, or the categories
  // she has chosen. Reticking a box in Study therefore deals a fresh pass, and
  // a selection that happens to hold the same number of cards is not mistaken
  // for the one before it.
  const sourceKey = deckId ?? chosen.map((c) => c.id).join(',');

  useEffect(() => {
    if (locked || deckCards.length === 0) {
      setSession(null);
      return;
    }
    setSession(
      createMemoriseSession({
        deckId: deckId ?? 'selection',
        cardIds: deckCards.map((c) => c.id),
        now: new Date().toISOString(),
        shuffleCards: shuffle,
      }),
    );
    // Flipping the toggle deliberately deals the deck again from the top:
    // re-ordering the cards under a half-finished pass would leave the learner
    // with a "card 4 of 10" that means nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, deckCards.length, locked, shuffle]);

  const currentCard = session
    ? deckCards.find((c) => c.id === currentMemoriseCardId(session))
    : undefined;

  const flip = useCallback(() => {
    setSession((s) => (s ? flipCard(s, new Date().toISOString()) : s));
  }, []);

  const advance = useCallback(() => {
    setSession((s) => (s ? nextCard(s, new Date().toISOString()) : s));
  }, []);

  const goBack = useCallback(() => {
    setSession((s) => (s ? previousCard(s, new Date().toISOString()) : s));
  }, []);

  const again = useCallback(() => {
    setSession((s) =>
      s
        ? restartMemorise(s, {
            now: new Date().toISOString(),
            shuffleCards: shuffle,
          })
        : s,
    );
  }, [shuffle]);

  // Autoplay follows the same per-language settings as the study screen and
  // speaks the leading form: her own ♀→♂ wording where the phrase has
  // speaker/listener variants, her own half of a grammatical pair where it has
  // one. Never a form she is not studying.
  const flipped = session?.flipped ?? false;
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  useEffect(() => {
    if (!flipped || !currentCard) return;
    if (settings.autoPlayHebrew) {
      const [first] = wordForms(currentCard.hebrew, perspectives, lead);
      if (first) void play(first, 'hebrew');
    }
    if (settings.autoPlayArabic) {
      const [first] = wordForms(currentCard.arabic, perspectives, lead);
      if (first) void play(first, 'arabic');
    }
  }, [
    flipped,
    currentCard,
    perspectives,
    lead,
    settings.autoPlayHebrew,
    settings.autoPlayArabic,
    play,
  ]);

  // Desktop keyboard support: space turns the card over, enter and the left
  // arrow move on, the right arrow steps back — the arrows point the same way
  // the swipes do, so the two never disagree. Nothing here can grade, so there
  // is no destructive key and no key worth confirming.
  useEffect(() => {
    if (!session || session.completedAt) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === ' ') {
        event.preventDefault();
        flip();
      } else if (event.key === 'Enter' || event.key === 'ArrowLeft') {
        event.preventDefault();
        advance();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goBack();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, flip, advance, goBack]);

  if (deckId && !deck) {
    return (
      <div className="screen">
        <ScreenHeader title="Deck not found" back />
      </div>
    );
  }

  // One deck names itself and says which category it came from; the tab names
  // the mode and lists what she chose, so it is always clear which pile is
  // being dealt without leaving the screen to check.
  const title = deck ? deck.name : 'Memorise';
  const eyebrow = deck
    ? (category?.name ?? '') + ' · Memorise'
    : chosen.map((c) => c.name).join(' · ') || 'Nothing to memorise yet';
  // The tab is a root: there is nothing behind it to go back to.
  const back = Boolean(deckId);

  // `locked` is only ever true with a deck in hand; naming it here keeps that
  // obvious to the reader as well as to the type checker.
  if (locked && deck) {
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
        <ScreenHeader title={title} eyebrow={eyebrow} back={back} />
        <div className="empty">
          {deck ? (
            <>
              <p>This deck has no cards yet.</p>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/manage')}
              >
                Add cards
              </button>
            </>
          ) : (
            <>
              {/* The pile can be empty without anything being wrong: a brand
                  new install, or every deck of the chosen categories still
                  locked. Both are answered in Study, so that is where the
                  button goes. */}
              <p>
                Nothing to read here yet. Pick the categories you want to
                memorise in Study.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/categories')}
              >
                Choose categories
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (session?.completedAt) {
    const total = session.order.length;
    const seen = session.viewed.length;

    return (
      <div className="screen">
        <ScreenHeader title={title} eyebrow={eyebrow} back={back} />
        <div className="panel">
          <div className="headline">{deck ? 'Deck reviewed' : 'Pass finished'}</div>
          <p className="muted">
            {seen === total
              ? 'You’ve seen all ' + total + (total === 1 ? ' card.' : ' cards.')
              : 'You went through ' +
                (deck ? 'the deck' : 'the cards') +
                ' — ' +
                seen +
                ' of ' +
                total +
                ' cards turned over.'}
          </p>
          {/* Deliberately no score and no mastery claim: reading a deck is a
              first pass, not a pass mark. */}
          <p className="small muted">
            Nothing was marked right or wrong. When these start to feel
            familiar, try Normal practice.
          </p>

          <div className="stack">
            <button className="btn btn-block" onClick={again}>
              Review again
            </button>
            {deck ? (
              <>
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => navigate('/study/' + deck.id + '?mode=normal')}
                >
                  Start Normal practice
                </button>
                <button
                  className="btn btn-block"
                  onClick={() => navigate('/category/' + deck.categoryId)}
                >
                  Choose another deck
                </button>
              </>
            ) : (
              // A pile drawn from several categories has no single deck to be
              // tested on, so it offers the choosing screen instead of picking
              // a deck on the learner's behalf.
              <button
                className="btn btn-primary btn-block"
                onClick={() => navigate('/categories')}
              >
                Go to Study
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!session || !currentCard) {
    return (
      <div className="screen">
        <ScreenHeader title={title} eyebrow={eyebrow} back={back} />
        <p className="muted">Laying the cards out…</p>
      </div>
    );
  }

  return (
    <div className="screen study">
      <ScreenHeader title={title} eyebrow={eyebrow} back={back} />

      <div className="study-meta small">
        <span>
          Card {session.index + 1} of {session.order.length}
        </span>
        <span className="muted">{remainingToView(session) - 1} remaining</span>
        {/* A view count, not a score. Seeing a card does not master it. */}
        <span className="chip">
          {session.viewed.length} / {session.order.length} viewed
        </span>
        {/* Sits with the tallies rather than in Settings: which order a deck
            reads best in is a per-deck, per-pass decision. */}
        <button
          type="button"
          className={'chip chip-toggle' + (shuffle ? ' on' : '')}
          aria-pressed={shuffle}
          onClick={() => setShuffle((s) => !s)}
        >
          Shuffle {shuffle ? 'on' : 'off'}
        </button>
      </div>

      <MemoriseCard
        card={currentCard}
        flipped={session.flipped}
        perspectives={perspectives}
        lead={lead}
        showTransliteration={settings.showTransliteration}
        animationIntensity={settings.cardAnimationIntensity}
        reducedMotion={settings.reducedMotion}
        onFlip={flip}
        onNext={advance}
        onPrevious={goBack}
        canGoBack={session.index > 0}
      />

      <div className="row">
        {/* The button equivalent of the back swipe, for anyone on a keyboard or
            a screen reader. Held rather than hidden on the first card so the
            row does not reflow the moment the learner moves on. */}
        <button
          className="btn"
          onClick={goBack}
          disabled={session.index === 0}
          aria-label="Previous card"
        >
          Back
        </button>
        <button className="btn grow" onClick={flip}>
          {session.flipped ? 'Hide' : 'Flip'}
        </button>
        <button className="btn btn-primary grow" onClick={advance}>
          {remainingToView(session) === 1 ? 'Finish' : 'Next'}
        </button>
      </div>

      {/* The hint gives up its line once the card is open: four forms and two
          labels need the height more than a reminder does, and the Flip and
          Next buttons are right there saying the same thing. */}
      {!session.flipped && (
        <p className="small muted" style={{ textAlign: 'center' }}>
          Tap the card to flip. Swipe left for the next one
          {session.index > 0 ? ', right to go back' : ''}.
        </p>
      )}
    </div>
  );
}
