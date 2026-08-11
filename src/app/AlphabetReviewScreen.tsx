import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../stores/settingsStore';
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
import { letterReviewPool } from '../features/memorise/letters';
import LetterReviewCard from '../components/cards/LetterReviewCard';
import ScreenHeader from '../components/controls/ScreenHeader';

/**
 * Review, reading the alphabet.
 *
 * The letters belong in this tab as much as the words do. Review is the half of
 * the app that asks nothing — meet the thing, turn it over, move on — and a
 * learner who wants to sit with ב and ب without being scored on them had, until
 * now, only the drills under Alphabets, every one of which marks her.
 *
 * So this reuses `MemoriseSession` rather than any of the alphabet engines. The
 * session is only an order, an index and a tally of what has been turned over,
 * and it writes nothing anywhere; borrowing an alphabet engine instead would
 * record a recognition score for every letter she merely looked at, which is
 * precisely what this screen exists not to do.
 *
 * Which scripts appear follows the languages she is studying, and follows them
 * in the pool rather than on the card — see `letterReviewPool`.
 */
export default function AlphabetReviewScreen() {
  const navigate = useNavigate();

  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);

  const [session, setSession] = useState<MemoriseSession | null>(null);
  /*
   * The alphabet's own order to begin with, as a word deck reads in the deck's
   * own order. Abjad order is a real fact about both scripts and the thing the
   * ordering drill later asks for, so a first read should follow it — and a
   * learner who has started reciting her way to the next letter rather than
   * recognising it turns this on.
   */
  const [shuffle, setShuffle] = useState(false);

  const entries = useMemo(() => letterReviewPool(languages), [languages]);

  // Keyed on the languages themselves rather than on the array identity: a
  // fresh pass should be dealt when she changes what she is studying, not
  // whenever the store hands back a newly built list.
  const sourceKey = languages.join(',');

  useEffect(() => {
    if (entries.length === 0) {
      setSession(null);
      return;
    }
    setSession(
      createMemoriseSession({
        deckId: 'alphabet',
        cardIds: entries.map((entry) => entry.id),
        now: new Date().toISOString(),
        shuffleCards: shuffle,
      }),
    );
    // Flipping the toggle deliberately deals the letters again from the top:
    // re-ordering them under a half-finished pass would leave the learner with
    // a "card 4 of 28" that means nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, entries.length, shuffle]);

  const currentEntry = session
    ? entries.find((entry) => entry.id === currentMemoriseCardId(session))
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

  // The same keys as the word read-through, so the two never disagree under the
  // same thumb: space turns the card over, enter and left move on, right steps
  // back. Nothing here can grade, so no key is worth confirming.
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

  const eyebrow =
    languages.length > 1
      ? 'Hebrew and Arabic · Review'
      : languages[0] === 'arabic'
        ? 'Arabic · Review'
        : 'Hebrew · Review';

  const header = (
    <ScreenHeader
      title="Alphabet"
      eyebrow={eyebrow}
      back
      onBack={() => navigate('/memorise')}
    />
  );

  if (entries.length === 0) {
    return (
      <div className="screen">
        {header}
        <div className="empty">
          <p>No letters to read — check which languages you are studying.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/settings')}
          >
            Open Settings
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
        {header}
        <div className="panel">
          <div className="headline">Alphabet reviewed</div>
          <p className="muted">
            {seen === total
              ? 'You’ve seen all ' + total + ' letters.'
              : 'You went through the letters — ' +
                seen +
                ' of ' +
                total +
                ' turned over.'}
          </p>
          {/* No score and no mastery claim: reading the letters is a first
              pass, not a pass mark. The modes that do score are one tap away,
              and named as such. */}
          <p className="small muted">
            Nothing was marked right or wrong. When the shapes start to come
            without thinking, the Alphabets tab will test you on them.
          </p>

          <div className="stack">
            <button className="btn btn-block" onClick={again}>
              Review again
            </button>
            <button
              className="btn btn-primary btn-block"
              onClick={() => navigate('/alphabets')}
            >
              Practise the letters
            </button>
            <button
              className="btn btn-block"
              onClick={() => navigate('/memorise')}
            >
              Back to Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !currentEntry) {
    return (
      <div className="screen">
        {header}
        <p className="muted">Laying the letters out…</p>
      </div>
    );
  }

  return (
    <div className="screen study">
      {header}

      <div className="study-meta small">
        <span>
          Card {session.index + 1} of {session.order.length}
        </span>
        <span className="muted">{remainingToView(session) - 1} remaining</span>
        {/* A view count, not a score. Seeing a letter does not master it. */}
        <span className="chip">
          {session.viewed.length} / {session.order.length} viewed
        </span>
        <button
          type="button"
          className={'chip chip-toggle' + (shuffle ? ' on' : '')}
          aria-pressed={shuffle}
          onClick={() => setShuffle((s) => !s)}
        >
          Shuffle {shuffle ? 'on' : 'off'}
        </button>
      </div>

      <LetterReviewCard
        entry={currentEntry}
        flipped={session.flipped}
        display={settings.alphabetDisplay}
        showTransliteration={settings.showAlphabetTransliteration}
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
          aria-label="Previous letter"
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
