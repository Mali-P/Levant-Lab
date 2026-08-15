import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { usePronunciation } from '../hooks/usePronunciation';
import { wordForms } from '../utils/wordForms';
import { sortCards } from '../utils/cardOrder';
import { deckStudyLanguages, gateCategoryDecks } from '../features/review/languagePolicy';
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
import { memoriseDecks, memorisePool } from '../features/memorise/selection';
import MemoriseCard from '../components/cards/MemoriseCard';
import ScreenHeader from '../components/controls/ScreenHeader';

type Props = {
  /**
   * Read the ticked decks as one pile instead of a single deck.
   *
   * A route flag rather than "no deck id", because `/memorise` is now the
   * Review browse and this screen is never reached without one of the two
   * being meant.
   */
  pile?: boolean;
};

/**
 * Review: read the cards once, one at a time.
 *
 * Two ways in, one screen. `/memorise/:deckId` reads a single deck — the
 * ordinary way in, chosen from the Review browse two taps earlier.
 * `/memorise/selection` reads whichever decks the learner has ticked as one
 * run, and falls back to the first deck she can open until she ticks anything.
 *
 * Nothing on this screen grades anything. There is no answer to give, no
 * correct / incorrect pair, no retry pile, and not a single write to
 * `cardProgress` or `deckProgress` — the Hebrew and Arabic accuracy figures
 * cannot move while the learner is still meeting the words. The only tally is
 * how many cards have been turned over, which is kept in memory and forgotten
 * when the screen closes.
 *
 * The one thing it does persist is which deck it is on, so the tab reopens
 * here rather than at the top of the browse. That memory is written on arrival
 * and cleared by the acts that mean leaving — the back arrow, and the two
 * buttons on the finished panel that lead out of the deck.
 */
export default function MemoriseScreen({ pile }: Props) {
  const { deckId } = useParams();
  const navigate = useNavigate();

  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);
  const updateSettings = useSettings((s) => s.update);
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
  const studyLanguages = deckStudyLanguages(deck, languages);

  // The selection run: the decks ticked while browsing Review, and the first
  // unlocked deck until she ticks any. Deliberately not consulted in deck mode,
  // where the deck the learner opened is the pile and her selection has nothing
  // to say.
  const chosen = useMemo(
    () =>
      !pile || deckId
        ? []
        : memoriseDecks({
            categories,
            decks,
            deckProgress,
            selectedIds: settings.memoriseDeckIds,
            languages,
          }),
    [pile, deckId, categories, decks, deckProgress, settings.memoriseDeckIds, languages],
  );

  // A bookmark can point straight at a deck the learner has not earned yet, so
  // the ladder is enforced here as well as in the UI that hides the button. The
  // pile has no gate of its own — `memorisePool` simply leaves locked decks out.
  const gate = deck
    ? gateCategoryDecks(
        category,
        decks.filter((d) => d.categoryId === deck.categoryId),
        deckProgress,
        languages,
      ).find((g) => g.deck.id === deck.id)
    : undefined;
  const locked = Boolean(gate && !gate.unlocked);

  /*
   * The deck the tab reopens on.
   *
   * Written on arrival rather than on the tap that got here, so a deep link and
   * a browsed-to deck are remembered alike; guarded on the stored value so the
   * write happens once per deck and not once per render. A locked deck is never
   * remembered — reopening the tab onto a wall is worse than reopening it onto
   * the browse — and neither is the selection run, which is a pile rather than
   * a place.
   */
  const remembered = settings.memoriseLastDeckId;
  useEffect(() => {
    if (!deckId || locked) return;
    if (remembered === deckId) return;
    void updateSettings({ memoriseLastDeckId: deckId });
  }, [deckId, locked, remembered, updateSettings]);

  /**
   * Leaving the deck, which is the act that forgets it.
   *
   * Deliberately not an unmount cleanup: unmounting is also what happens when
   * the learner taps Practice or Settings, and the whole point of the memory is
   * that it survives that and brings her back here. Only the ways *out* clear
   * it.
   */
  const leave = useCallback(
    (to: string) => {
      if (remembered) void updateSettings({ memoriseLastDeckId: undefined });
      navigate(to);
    },
    [remembered, updateSettings, navigate],
  );

  // Sorted, not merely filtered: IndexedDB returns rows by id, so an unsorted
  // "shuffle off" pass would still deal a counting deck out of sequence.
  const deckCards = useMemo(
    () =>
      deckId
        ? sortCards(cards.filter((c) => c.deckId === deckId))
        : memorisePool(chosen, cards),
    [deckId, chosen, cards],
  );

  // What the pass is dealt from, as one string: a deck id, or the decks she has
  // ticked. Reticking a deck therefore deals a fresh pass, and a selection that
  // happens to hold the same number of cards is not mistaken for the one before
  // it.
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
    // Never a language she has switched off, whatever its auto-play toggle
    // says: that setting decides when a language is spoken, not whether it is
    // one of hers.
    if (settings.autoPlayHebrew && studyLanguages.includes('hebrew')) {
      const [first] = wordForms(currentCard.hebrew, perspectives, lead);
      if (first) void play(first, 'hebrew');
    }
    if (settings.autoPlayArabic && studyLanguages.includes('arabic')) {
      const [first] = wordForms(currentCard.arabic, perspectives, lead);
      if (first) void play(first, 'arabic');
    }
  }, [
    flipped,
    currentCard,
    perspectives,
    studyLanguages,
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

  // One deck names itself and says which category it came from; the selection
  // run lists what she chose, so it is always clear which pile is being dealt
  // without leaving the screen to check.
  const title = deck ? deck.name : 'Your selection';
  const eyebrow = deck
    ? (category?.name ?? '') + ' · Review'
    : chosen.map((c) => c.name).join(' · ') || 'Nothing to read here yet';

  // Where backing out lands: the category she picked the deck from, or the
  // Review browse for a run drawn from several. Both are inside Review — the
  // arrow narrows the choice rather than leaving the tab.
  const exitTo = deck ? '/memorise/category/' + deck.categoryId : '/memorise';

  // `locked` is only ever true with a deck in hand; naming it here keeps that
  // obvious to the reader as well as to the type checker.
  if (locked && deck) {
    return (
      <div className="screen">
        <ScreenHeader
          title={deck.name}
          eyebrow={category?.name}
          back
          onBack={() => leave('/memorise/category/' + deck.categoryId)}
        />
        <div className="empty">
          <p>
            This deck is still locked. Master{' '}
            <strong>{gate!.blockedBy!.name}</strong> first —{' '}
            {gate!.perfectRunsRequired} flawless runs through it.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => leave('/memorise/category/' + deck.categoryId)}
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
        <ScreenHeader
          title={title}
          eyebrow={eyebrow}
          back
          onBack={() => leave(exitTo)}
        />
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
              {/* The selection can be empty without anything being wrong: a
                  brand new install, or a ticked deck that has since been
                  emptied. Both are answered by browsing Review, so that is
                  where the button goes. */}
              <p>
                Nothing to read here yet. Pick a category and add a deck with
                the plus.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => leave('/memorise')}
              >
                Choose a deck
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
        <ScreenHeader
          title={title}
          eyebrow={eyebrow}
          back
          onBack={() => leave(exitTo)}
        />
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
                {/* Both of these leave the deck, so both forget it: coming
                    back to Review afterwards should land on the browse, not
                    reopen the deck she has just finished. */}
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => leave('/study/' + deck.id + '?mode=normal')}
                >
                  Start Normal practice
                </button>
                <button
                  className="btn btn-block"
                  onClick={() => leave('/memorise/category/' + deck.categoryId)}
                >
                  Choose another deck
                </button>
              </>
            ) : (
              // A run drawn from several ticked decks has no single deck to be
              // tested on, so it offers the choosing screen instead of picking
              // a deck on the learner's behalf.
              <button
                className="btn btn-primary btn-block"
                onClick={() => leave('/memorise')}
              >
                Choose a deck
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
        <ScreenHeader
          title={title}
          eyebrow={eyebrow}
          back
          onBack={() => leave(exitTo)}
        />
        <p className="muted">Laying the cards out…</p>
      </div>
    );
  }

  return (
    <div className="screen study">
      <ScreenHeader
        title={title}
        eyebrow={eyebrow}
        back
        onBack={() => leave(exitTo)}
      />

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
        languages={studyLanguages}
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

    </div>
  );
}
