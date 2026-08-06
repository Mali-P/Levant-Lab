import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { usePronunciation } from '../hooks/usePronunciation';
import { wordForms } from '../utils/wordForms';
import { gateDecks } from '../features/review/unlock';
import {
  createMemoriseSession,
  currentMemoriseCardId,
  flipCard,
  nextCard,
  remainingToView,
  restartMemorise,
  type MemoriseSession,
} from '../features/memorise/session';
import MemoriseCard from '../components/cards/MemoriseCard';
import ScreenHeader from '../components/controls/ScreenHeader';

/**
 * Memorise mode: read the deck once, one card at a time.
 *
 * Nothing on this screen grades anything. There is no answer to give, no
 * correct / incorrect pair, no retry pile, and not a single write to
 * `cardProgress` or `deckProgress` — the Hebrew and Arabic accuracy figures
 * cannot move while the learner is still meeting the words. The only tally is
 * how many cards have been turned over, which is kept in memory and forgotten
 * when the screen closes.
 */
export default function MemoriseScreen() {
  const { deckId = '' } = useParams();
  const navigate = useNavigate();

  const settings = useSettings((s) => s.settings);
  const decks = useData((s) => s.decks);
  const categories = useData((s) => s.categories);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);

  const { play } = usePronunciation(settings);

  const [session, setSession] = useState<MemoriseSession | null>(null);

  const deck = decks.find((d) => d.id === deckId);
  const category = categories.find((c) => c.id === deck?.categoryId);

  // A bookmark can point straight at a deck the learner has not earned yet, so
  // the ladder is enforced here as well as in the UI that hides the button.
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

  useEffect(() => {
    if (locked || deckCards.length === 0) {
      setSession(null);
      return;
    }
    setSession(
      createMemoriseSession({
        deckId,
        cardIds: deckCards.map((c) => c.id),
        now: new Date().toISOString(),
        shuffleCards: settings.shuffleCards,
      }),
    );
    // Rebuilding on a settings tweak would throw away the learner's place, so
    // the shuffle preference is read once, when the pass starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, deckCards.length, locked]);

  const currentCard = session
    ? deckCards.find((c) => c.id === currentMemoriseCardId(session))
    : undefined;

  const flip = useCallback(() => {
    setSession((s) => (s ? flipCard(s, new Date().toISOString()) : s));
  }, []);

  const advance = useCallback(() => {
    setSession((s) => (s ? nextCard(s, new Date().toISOString()) : s));
  }, []);

  const again = useCallback(() => {
    setSession((s) =>
      s
        ? restartMemorise(s, {
            now: new Date().toISOString(),
            shuffleCards: settings.shuffleCards,
          })
        : s,
    );
  }, [settings.shuffleCards]);

  // Autoplay follows the same per-language settings as the study screen, and
  // speaks the leading — feminine — form of each word.
  const flipped = session?.flipped ?? false;
  useEffect(() => {
    if (!flipped || !currentCard) return;
    if (settings.autoPlayHebrew) {
      const [first] = wordForms(currentCard.hebrew);
      if (first) void play(first, 'hebrew');
    }
    if (settings.autoPlayArabic) {
      const [first] = wordForms(currentCard.arabic);
      if (first) void play(first, 'arabic');
    }
  }, [
    flipped,
    currentCard,
    settings.autoPlayHebrew,
    settings.autoPlayArabic,
    play,
  ]);

  // Desktop keyboard support: space turns the card over, enter and the right
  // arrow move on. Nothing here can grade, so there is no destructive key.
  useEffect(() => {
    if (!session || session.completedAt) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === ' ') {
        event.preventDefault();
        flip();
      } else if (event.key === 'Enter' || event.key === 'ArrowRight') {
        event.preventDefault();
        advance();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, flip, advance]);

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
    const total = session.order.length;
    const seen = session.viewed.length;

    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow={category?.name} back />
        <div className="panel">
          <div className="headline">Deck reviewed</div>
          <p className="muted">
            {seen === total
              ? 'You’ve seen all ' + total + (total === 1 ? ' card.' : ' cards.')
              : 'You went through the deck — ' +
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
          </div>
        </div>
      </div>
    );
  }

  if (!session || !currentCard) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow={category?.name} back />
        <p className="muted">Laying the cards out…</p>
      </div>
    );
  }

  return (
    <div className="screen study">
      <ScreenHeader
        title={deck.name}
        eyebrow={(category?.name ?? '') + ' · Memorise'}
        back
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
      </div>

      <MemoriseCard
        card={currentCard}
        flipped={session.flipped}
        showTransliteration={settings.showTransliteration}
        animationIntensity={settings.cardAnimationIntensity}
        reducedMotion={settings.reducedMotion}
        onFlip={flip}
        onNext={advance}
      />

      <div className="row">
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
          Tap the card to flip. Swipe left for the next one.
        </p>
      )}
    </div>
  );
}
