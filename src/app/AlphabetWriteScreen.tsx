import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { AlphabetScript } from '../types/alphabet';
import { findLetter } from '../data/alphabets';
import { deckLetters, findLetterDeck } from '../features/alphabet/decks';
import { printFormOf, strokeSequenceOf } from '../features/alphabet/forms';
import {
  answerPractice,
  createPracticeSession,
  currentLetterId,
  practiceProgress,
  type PracticeSession,
} from '../features/alphabet/session';
import { useAlphabet } from '../stores/alphabetStore';
import { useSettings } from '../stores/settingsStore';
import { fireFeedback } from '../services/audio/feedback';
import { uid } from '../utils/random';
import ScreenHeader from '../components/controls/ScreenHeader';
import LetterSpeaker from '../components/alphabet/LetterSpeaker';
import TracingCanvas, {
  StrokeGuide,
  type TracingResult,
} from '../components/alphabet/TracingCanvas';
import Confetti from '../components/feedback/Confetti';

/**
 * Writing practice: trace the shape, then write it from memory.
 *
 * Both halves score the same skill, `writingAccuracy`, because both are the
 * learner putting the shape down themselves. What differs is the crutch: in
 * trace the target is on the page, in free writing it is withheld until the
 * attempt is judged.
 *
 * Where a letter ships a stroke sequence the attempt is measured against it.
 * Where none has been drawn yet — which is every letter today — the learner
 * traces the glyph and marks their own work, and the screen says so.
 */

type WriteMode = 'trace' | 'free';

export default function AlphabetWriteScreen() {
  const { script, deckId = '' } = useParams();
  const navigate = useNavigate();

  const recordAnswer = useAlphabet((s) => s.recordAnswer);
  const settings = useSettings((s) => s.settings);

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [writeMode, setWriteMode] = useState<WriteMode>('trace');
  const [result, setResult] = useState<TracingResult | null>(null);

  const valid = script === 'hebrew' || script === 'arabic';
  const alphabet = (valid ? script : 'hebrew') as AlphabetScript;

  const deck = useMemo(() => {
    const progress = Object.fromEntries(
      Object.values(useAlphabet.getState().progress)
        .filter((row) => row.script === alphabet)
        .map((row) => [row.letterId, row]),
    );
    return findLetterDeck(alphabet, deckId, progress);
  }, [alphabet, deckId]);

  const letters = useMemo(() => (deck ? deckLetters(deck) : []), [deck]);

  useEffect(() => {
    if (letters.length === 0) return;
    setSession(
      createPracticeSession({
        id: uid('write'),
        script: alphabet,
        deckId,
        mode: 'write',
        letterIds: letters.map((letter) => letter.id),
        now: new Date().toISOString(),
        shuffleLetters: deck?.kind !== 'mistakes',
      }),
    );
    setResult(null);
  }, [letters, alphabet, deckId, deck?.kind]);

  const letterId = session ? currentLetterId(session) : undefined;
  const letter = letterId ? findLetter(alphabet, letterId) : undefined;
  // The handwritten sequence is the one worth practising where it exists; the
  // printed one is what a learner can follow until then.
  const sequence = letter
    ? (strokeSequenceOf(letter, 'handwritten') ?? strokeSequenceOf(letter, 'print'))
    : undefined;

  const onResult = useCallback(
    async (attempt: TracingResult) => {
      if (!letter) return;
      setResult(attempt);
      fireFeedback(attempt.passed ? 'accept' : 'reject', settings);
      await recordAnswer(letter, alphabet, 'writingAccuracy', attempt.passed);
    },
    [letter, alphabet, recordAnswer, settings],
  );

  const next = useCallback(() => {
    if (!session || !result) return;
    const outcome = answerPractice(session, result.passed, {
      now: new Date().toISOString(),
    });
    if (outcome.event === 'session-complete') {
      fireFeedback('deck-mastered', settings);
    }
    setSession(outcome.session);
    setResult(null);
  }, [session, result, settings]);

  if (!valid) return <Navigate to="/alphabets" replace />;

  if (!deck || letters.length === 0) {
    return (
      <div className="screen">
        <ScreenHeader title="Nothing to write" back />
        <div className="empty">
          <p>This set has no letters in it.</p>
          <Link className="btn btn-primary" to={'/alphabet/' + alphabet + '/practise'}>
            Choose another
          </Link>
        </div>
      </div>
    );
  }

  if (session?.completedAt) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.title} eyebrow="Write" back />
        <Confetti active />
        <div className="panel">
          <div className="headline">Written through</div>
          <p className="muted">
            {session.correct} of {session.asked} attempts came out right.
          </p>
          <button
            className="btn btn-primary btn-block"
            onClick={() => navigate('/alphabet/' + alphabet + '/practise?mode=write')}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!session || !letter) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.title} back />
        <p className="muted">Sharpening the pencil…</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader title={deck.title} eyebrow="Write" back />

      <div className="bar" aria-hidden="true">
        <span style={{ width: Math.round(practiceProgress(session) * 100) + '%' }} />
      </div>

      <div className="panel panel-row">
        <span className="grow">
          <strong>{letter.nameEnglish}</strong>
          <div className="small muted">{letter.commonSound}</div>
        </span>
        <div className="segmented" role="group" aria-label="Writing mode">
          {(['trace', 'free'] as WriteMode[]).map((entry) => (
            <button
              key={entry}
              type="button"
              className={'btn btn-ghost' + (entry === writeMode ? ' selected' : '')}
              aria-pressed={entry === writeMode}
              onClick={() => {
                setWriteMode(entry);
                setResult(null);
              }}
            >
              {entry === 'trace' ? 'Trace' : 'From memory'}
            </button>
          ))}
        </div>
        <LetterSpeaker
          script={alphabet}
          entryKind="letter"
          entryId={letter.id}
          clipKind="name"
          fallbackText={letter.nameSpokenText}
          label={'Play the name of ' + letter.nameEnglish}
        />
      </div>

      {sequence && writeMode === 'trace' && (
        <div className="panel">
          <strong className="small">The order of the strokes</strong>
          <StrokeGuide sequence={sequence} />
        </div>
      )}

      <TracingCanvas
        script={alphabet}
        glyph={printFormOf(letter)}
        sequence={sequence}
        mode={writeMode}
        resetKey={letter.id + ':' + session.asked}
        onResult={(attempt) => void onResult(attempt)}
      />

      {result && (
        <div className="row">
          <Link
            className="btn btn-ghost"
            to={'/alphabet/' + alphabet + '/letter/' + letter.id}
          >
            See the letter
          </Link>
          <button className="btn btn-primary grow" onClick={next}>
            {result.passed ? 'Next letter' : 'Try the next one'}
          </button>
        </div>
      )}
    </div>
  );
}
