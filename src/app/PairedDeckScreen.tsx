import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { AlphabetScript } from '../types/alphabet';
import { pairLetters, pairSize } from '../data/alphabets';
import {
  deckPairs,
  findPairDeck,
  gatePairDecks,
  recordPairRun,
} from '../features/alphabet/pairDecks';
import { useAlphabet } from '../stores/alphabetStore';
import { useSettings } from '../stores/settingsStore';
import { fireFeedback } from '../services/audio/feedback';
import { shuffle } from '../utils/random';
import PairCard from '../components/alphabet/PairCard';
import ScreenHeader from '../components/controls/ScreenHeader';
import Confetti from '../components/feedback/Confetti';

/**
 * One deck of the Both alphabet, read as paired cards.
 *
 * A graded run, unlike the single-script card mode it otherwise resembles: the
 * deck opens the next one only if it comes out clean, so a card cannot be
 * returned to and re-marked, and every half of every pair has to be marked
 * before the run counts. Marking is still self-marking — there is nothing here
 * a learner can be caught out by that they could not also lie to themselves
 * about, and the ordering drill and the quizzes will find the lie soon enough.
 *
 * Each half scores the letter it belongs to, in the same `alphabetProgress` row
 * the single-script modes write. Two accounts of whether somebody knows ב would
 * be one account too many.
 */
export default function PairedDeckScreen() {
  const { deckId = '' } = useParams();
  const navigate = useNavigate();

  const recordAnswer = useAlphabet((s) => s.recordAnswer);
  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);
  const updateSettings = useSettings((s) => s.update);

  /*
   * Reference, not a graded run, for a learner studying one language.
   *
   * The Both course stays reachable by its address after it leaves the
   * Alphabets list, because hiding the other script's material is not the same
   * as taking it away. But a course about the pairing cannot be *scored* for
   * somebody studying one half of it: every letter here writes the same
   * `alphabetProgress` row the single-script modes write, so a Hebrew-only
   * learner marking herself on ج would be moving the mastery, the streak and
   * the review date of a letter in the alphabet she has switched off.
   *
   * So in this mode nothing is written at all — not even the letters of the
   * language she *is* studying. Half a paired run is not a paired run, and
   * crediting the half that happens to be hers would let a course she is not
   * taking quietly feed the progress of one she is. The cards still turn over,
   * which is the whole point of leaving the door open.
   */
  const reference = languages.length === 1;

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [finished, setFinished] = useState(false);

  // Memoised on the id, not merely called: the decks are rebuilt from the pair
  // table on every call, and a fresh object each render would reshuffle the
  // deck and reset the run under the learner on the first tap.
  const deck = useMemo(() => findPairDeck(deckId), [deckId]);

  /**
   * Read from the store's value rather than a subscription, so the gate is
   * settled once when the run starts. Passing the deck mid-run must not
   * re-render the screen out from under the summary.
   */
  const unlocked = useMemo(() => {
    if (!deck) return false;
    // In reference mode no run can ever be banked, so the ladder would hold
    // every deck but the first behind a gate that can never open.
    if (reference) return true;
    const runs = useSettings.getState().settings.pairedLetterRuns ?? {};
    return gatePairDecks(runs).some(
      (gate) => gate.deck.id === deck.id && gate.unlocked,
    );
  }, [deck, reference]);

  /*
   * Shuffled, like the single-script card decks. The pairs are in abjad order
   * on the ladder screen, where the order is worth seeing; inside a run it
   * would only let a learner work out which sound is coming next.
   */
  const pairs = useMemo(() => (deck ? shuffle(deckPairs(deck)) : []), [deck]);

  const totalHalves = useMemo(
    () => pairs.reduce((sum, pair) => sum + pairSize(pair), 0),
    [pairs],
  );

  useEffect(() => {
    setIndex(0);
    setRevealed(false);
    setAnswered(0);
    setWrong(0);
    setFinished(false);
  }, [pairs]);

  const pair = pairs[index];
  const letters = pair ? pairLetters(pair) : {};

  const reveal = useCallback(() => setRevealed(true), []);

  /**
   * The run is over. A clean run is banked; anything else is simply not, and
   * the settings row is left alone rather than written with an unchanged value.
   */
  const finish = useCallback(
    async (flawless: boolean) => {
      setFinished(true);
      // Reference mode banks nothing, so a clean read never opens a deck and
      // never stamps one passed.
      if (reference || !flawless || !deck) return;
      const runs = recordPairRun(
        useSettings.getState().settings.pairedLetterRuns ?? {},
        deck.id,
        true,
      );
      await updateSettings({ pairedLetterRuns: runs });
    },
    [deck, updateSettings],
  );

  /**
   * One card graded, both halves at once — the study card's verdict, on a pair
   * of letters. A half the pair does not have is not scored and does not count
   * against the run: the six Arabic-only letters would otherwise be impossible
   * to answer cleanly.
   */
  const grade = useCallback(
    async (verdict: { hebrew: boolean; arabic: boolean }) => {
      if (!pair || !revealed) return;

      const scored: Array<[AlphabetScript, boolean]> = [];
      if (letters.hebrew) scored.push(['hebrew', verdict.hebrew]);
      if (letters.arabic) scored.push(['arabic', verdict.arabic]);

      const missed = scored.filter(([, correct]) => !correct).length;
      fireFeedback(missed === 0 ? 'accept' : 'reject', settings);

      // The one write this screen makes to a letter's mastery, streak and
      // review date — and the one it must not make when the course is being
      // read rather than taken.
      if (!reference) {
        for (const [script, correct] of scored) {
          const letter = script === 'hebrew' ? letters.hebrew! : letters.arabic!;
          await recordAnswer(letter, script, 'typedRecognition', correct);
        }
      }

      const nextAnswered = answered + scored.length;
      const nextWrong = wrong + missed;
      setAnswered(nextAnswered);
      setWrong(nextWrong);

      if (index + 1 >= pairs.length) {
        await finish(nextWrong === 0 && nextAnswered === totalHalves);
        return;
      }
      setIndex(index + 1);
      setRevealed(false);
    },
    [
      answered,
      finish,
      index,
      letters.arabic,
      letters.hebrew,
      pair,
      pairs.length,
      recordAnswer,
      reference,
      revealed,
      settings,
      totalHalves,
      wrong,
    ],
  );

  // The keyboard equivalents of the gestures: space reveals, and enter takes
  // the card the swipe-right takes it.
  useEffect(() => {
    if (!pair || finished) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === ' ') {
        event.preventDefault();
        reveal();
      } else if (event.key === 'Enter' && revealed) {
        event.preventDefault();
        void grade({ hebrew: true, arabic: true });
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pair, finished, reveal, revealed, grade]);

  if (!deck) {
    return (
      <div className="screen">
        <ScreenHeader title="Deck not found" back />
        <div className="empty">
          <p>There is no such deck in the paired alphabet.</p>
          <Link className="btn btn-primary" to="/alphabet/both">
            Back to the decks
          </Link>
        </div>
      </div>
    );
  }

  // A locked deck reached by its URL rather than by its button. Sent back
  // rather than shown, because a lock the address bar can pick is not a lock.
  if (!unlocked) return <Navigate to="/alphabet/both" replace />;

  if (finished) {
    const right = answered - wrong;
    const flawless = wrong === 0 && answered === totalHalves;

    return (
      <div className="screen">
        <ScreenHeader title={deck.title} eyebrow="Both alphabets" back />
        {/* Confetti is for something earned. Nothing was. */}
        <Confetti active={flawless && !reference} />

        <div className="panel">
          <div className="headline">
            {reference ? 'Deck read' : flawless ? 'Clean run' : 'Deck read'}
          </div>
          <p className="muted">
            {reference
              ? 'You read through all ' + totalHalves + ' letters.'
              : 'You marked yourself right on ' +
                right +
                ' of ' +
                totalHalves +
                ' letters.'}
          </p>
          <p className="small muted">
            {reference
              ? 'Nothing was marked or counted. No letter’s progress moved, in either alphabet, and no deck was opened or passed.'
              : flawless
                ? 'The next deck is open.'
                : 'The next deck opens on a run with nothing missed. The letters you were unsure of are waiting in each alphabet’s own Review mistakes.'}
          </p>

          <div className="stack">
            <button
              className="btn btn-block"
              onClick={() => {
                setIndex(0);
                setRevealed(false);
                setAnswered(0);
                setWrong(0);
                setFinished(false);
              }}
            >
              Run it again
            </button>
            <button
              className="btn btn-primary btn-block"
              onClick={() => navigate('/alphabet/both')}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!pair) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.title} back />
        <p className="muted">Shuffling…</p>
      </div>
    );
  }

  return (
    <div className="screen study">
      <ScreenHeader
        title={deck.title}
        eyebrow={reference ? 'Reference · both alphabets' : 'Name both letters'}
        back
      />

      <div className="study-meta small">
        <span>
          Card {index + 1} of {pairs.length}
        </span>
        <span className="grow muted">{pairs.length - index - 1} to go</span>
        {/* "Clean so far" is a score. In reference mode there isn't one. */}
        <span
          className={'chip' + (!reference && wrong === 0 ? ' chip-ok' : '')}
        >
          {reference
            ? 'Nothing recorded'
            : wrong === 0
              ? 'Clean so far'
              : wrong + ' missed'}
        </span>
      </div>

      <PairCard
        pair={pair}
        hebrew={letters.hebrew}
        arabic={letters.arabic}
        revealed={revealed}
        display={settings.alphabetDisplay}
        showTransliteration={settings.showAlphabetTransliteration}
        animationIntensity={settings.cardAnimationIntensity}
        reducedMotion={settings.reducedMotion}
        onReveal={reveal}
        onSwipeRight={() => void grade({ hebrew: true, arabic: true })}
      />

      {/* Grading is only offered once the answer has been seen: marking a guess
          against an answer the learner has not read is guessing twice. The four
          verdicts are the study card's, because a learner should not have to
          work out what kind of card they are on to know how to answer it — and
          an Arabic-only letter has no Hebrew half to be right or wrong about,
          so it asks the one question it can. */}
      {revealed ? (
        <div className="grade-grid">
          {/* Nothing is being marked, so there is nothing to mark it as. One
              button that moves on, rather than four verdicts that all quietly
              do the same nothing. */}
          {reference ? (
            <button
              className="btn btn-primary btn-block"
              onClick={() => void grade({ hebrew: true, arabic: true })}
            >
              Next letter
            </button>
          ) : letters.hebrew && letters.arabic ? (
            <>
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
            </>
          ) : (
            <>
              <button
                className="btn btn-primary"
                onClick={() => void grade({ hebrew: true, arabic: true })}
              >
                ✓ Correct
              </button>
              <button
                className="btn btn-danger"
                onClick={() => void grade({ hebrew: false, arabic: false })}
              >
                ✗ Wrong
              </button>
            </>
          )}
        </div>
      ) : (
        <button className="btn btn-primary btn-block" onClick={reveal}>
          Reveal both letters
        </button>
      )}
    </div>
  );
}
