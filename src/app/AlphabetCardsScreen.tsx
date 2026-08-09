import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { AlphabetScript } from '../types/alphabet';
import { deckLetters, findLetterDeck } from '../features/alphabet/decks';
import { useAlphabet } from '../stores/alphabetStore';
import { useSettings } from '../stores/settingsStore';
import { fireFeedback } from '../services/audio/feedback';
import { shuffle } from '../utils/random';
import LetterCard from '../components/alphabet/LetterCard';
import ScreenHeader from '../components/controls/ScreenHeader';
import Confetti from '../components/feedback/Confetti';

/**
 * A letter deck, read as cards.
 *
 * The self-marked half of the alphabet module, and the one that works the way
 * every other card in the app works: the letter on the front, its name and
 * sound on the back, a tap to turn it over, a swipe left for the next and right
 * to go back. Nothing is multiple choice, so nothing can be got right by
 * elimination.
 *
 * The honesty is the exercise. "Knew it" scores the letter's recognition
 * exactly as a right answer on the quiz screen does, so the two modes feed one
 * progress row rather than two competing accounts of the same skill — and a
 * learner who marks themselves generously will find the ordering drill asking
 * for letters they cannot name, which is its own correction.
 *
 * A card can be walked back to and re-marked. The later mark simply scores
 * again; the pass is a reading of the deck, not a graded run, and there is no
 * retry pile to unpick.
 */
export default function AlphabetCardsScreen() {
  const { script, deckId = '' } = useParams();
  const navigate = useNavigate();

  const recordAnswer = useAlphabet((s) => s.recordAnswer);
  const settings = useSettings((s) => s.settings);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [marks, setMarks] = useState<Record<string, 'known' | 'unknown'>>({});
  const [finished, setFinished] = useState(false);

  const valid = script === 'hebrew' || script === 'arabic';
  const alphabet = (valid ? script : 'hebrew') as AlphabetScript;

  // Built once, from the store's value rather than a subscription: "Review
  // mistakes" would otherwise re-sort itself under the learner as they marked,
  // and a letter they had just put right would vanish mid-pass.
  const deck = useMemo(() => {
    const progress = Object.fromEntries(
      Object.values(useAlphabet.getState().progress)
        .filter((row) => row.script === alphabet)
        .map((row) => [row.letterId, row]),
    );
    return findLetterDeck(alphabet, deckId, progress);
  }, [alphabet, deckId]);

  /*
   * Shuffled, unlike the Memorise pass through a word deck. A counting deck has
   * an order that is part of what it teaches; the alphabet's order is taught by
   * the ordering drill, and here it would only let a learner recite their way
   * to the next letter instead of recognising it. The review decks arrive
   * worst-first and keep that order.
   */
  const letters = useMemo(() => {
    if (!deck) return [];
    const inDeck = deckLetters(deck);
    return deck.kind === 'mistakes' ? inDeck : shuffle(inDeck);
  }, [deck]);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
    setMarks({});
    setFinished(false);
  }, [letters]);

  const letter = letters[index];

  const flip = useCallback(() => setFlipped((f) => !f), []);

  const advance = useCallback(() => {
    setFlipped(false);
    setIndex((i) => {
      if (i + 1 >= letters.length) {
        setFinished(true);
        return i;
      }
      return i + 1;
    });
  }, [letters.length]);

  const goBack = useCallback(() => {
    setFlipped(false);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  /** The self-mark: score the letter's recognition, then move on. */
  const mark = useCallback(
    async (known: boolean) => {
      if (!letter) return;
      setMarks((current) => ({
        ...current,
        [letter.id]: known ? 'known' : 'unknown',
      }));
      fireFeedback(known ? 'accept' : 'reject', settings);
      await recordAnswer(letter, alphabet, 'typedRecognition', known);
      advance();
    },
    [letter, alphabet, recordAnswer, settings, advance],
  );

  // Space turns the card over, the arrows walk the deck the same way the swipes
  // do, and 1 / 2 mark it. Desktop only, harmless on touch.
  useEffect(() => {
    if (!letter || finished) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === ' ') {
        event.preventDefault();
        flip();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        advance();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goBack();
      } else if (event.key === '1') {
        event.preventDefault();
        void mark(true);
      } else if (event.key === '2') {
        event.preventDefault();
        void mark(false);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [letter, finished, flip, advance, goBack, mark]);

  if (!valid) return <Navigate to="/alphabets" replace />;

  if (!deck || letters.length === 0) {
    return (
      <div className="screen">
        <ScreenHeader title="Nothing to read" back />
        <div className="empty">
          <p>This set has no letters in it.</p>
          <Link className="btn btn-primary" to={'/alphabet/' + alphabet + '/practise'}>
            Choose another
          </Link>
        </div>
      </div>
    );
  }

  if (finished) {
    const known = Object.values(marks).filter((m) => m === 'known').length;
    const unsure = Object.values(marks).filter((m) => m === 'unknown').length;
    const unmarked = letters.length - known - unsure;

    return (
      <div className="screen">
        <ScreenHeader title={deck.title} eyebrow="Learn the letter" back />
        <Confetti active={unsure === 0 && known === letters.length} />

        <div className="panel">
          <div className="headline">Deck read</div>
          <p className="muted">
            You marked yourself right on {known} of {letters.length}.
          </p>
          {unsure > 0 && (
            <p className="small muted">
              {unsure} still to come — they are waiting in Review mistakes.
            </p>
          )}
          {unmarked > 0 && (
            <p className="small muted">
              {unmarked} went by unmarked, so nothing was scored for them.
            </p>
          )}

          <div className="stack">
            <button
              className="btn btn-block"
              onClick={() => {
                setIndex(0);
                setFlipped(false);
                setMarks({});
                setFinished(false);
              }}
            >
              Read again
            </button>
            <button
              className="btn btn-primary btn-block"
              onClick={() => navigate('/alphabet/' + alphabet + '/practise')}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.title} back />
        <p className="muted">Shuffling…</p>
      </div>
    );
  }

  const marked = Object.keys(marks).length;

  return (
    <div className="screen study">
      <ScreenHeader title={deck.title} eyebrow="Learn the letter" back />

      <div className="study-meta small">
        <span>
          Card {index + 1} of {letters.length}
        </span>
        <span className="grow muted">{letters.length - index - 1} to go</span>
        <span className="chip">
          {marked} / {letters.length} marked
        </span>
      </div>

      <LetterCard
        letter={letter}
        script={alphabet}
        flipped={flipped}
        display={settings.alphabetDisplay}
        showTransliteration={settings.showAlphabetTransliteration}
        animationIntensity={settings.cardAnimationIntensity}
        reducedMotion={settings.reducedMotion}
        onFlip={flip}
        onNext={advance}
        onPrevious={goBack}
        canGoBack={index > 0}
        marked={marks[letter.id]}
      />

      {/* Marking is only offered once the card has been turned over. Grading a
          guess against an answer the learner has not seen is not self-marking,
          it is guessing twice. */}
      {flipped ? (
        <div className="grade-grid">
          <button className="btn btn-danger" onClick={() => void mark(false)}>
            Not yet
          </button>
          <button className="btn btn-primary" onClick={() => void mark(true)}>
            Knew it
          </button>
        </div>
      ) : (
        <div className="row">
          <button
            className="btn"
            onClick={goBack}
            disabled={index === 0}
            aria-label="Previous letter"
          >
            Back
          </button>
          <button className="btn btn-primary grow" onClick={flip}>
            Flip
          </button>
          <button className="btn" onClick={advance}>
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
