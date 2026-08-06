import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { AlphabetScript, ArabicLetter, HebrewLetter } from '../types/alphabet';
import { findLetter, lettersFor } from '../data/alphabets';
import { deckLetters, findLetterDeck } from '../features/alphabet/decks';
import {
  MODE_LABEL,
  buildQuestion,
  lettersForMode,
  type PracticeMode,
} from '../features/alphabet/questions';
import {
  answerPractice,
  createPracticeSession,
  currentLetterId,
  practiceProgress,
  skipCurrent,
  type PracticeSession,
} from '../features/alphabet/session';
import { useAlphabet } from '../stores/alphabetStore';
import { useSettings } from '../stores/settingsStore';
import { fireFeedback } from '../services/audio/feedback';
import { uid } from '../utils/random';
import ScreenHeader from '../components/controls/ScreenHeader';
import LetterGlyph from '../components/alphabet/LetterGlyph';
import LetterSpeaker from '../components/alphabet/LetterSpeaker';
import Confetti from '../components/feedback/Confetti';

const MODES: PracticeMode[] = [
  'recognise',
  'recall',
  'listen',
  'contextual',
  'handwritten',
];

/**
 * One run through a letter deck.
 *
 * The deck is built once, on entry, and then left alone: "Review mistakes"
 * would otherwise re-sort itself under the learner as they answered, and a
 * letter they had just fixed would vanish mid-session.
 */
export default function AlphabetSessionScreen() {
  const { script, mode: modeParam, deckId = '' } = useParams();
  const navigate = useNavigate();

  const recordAnswer = useAlphabet((s) => s.recordAnswer);
  const settings = useSettings((s) => s.settings);

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  /** Bumped on every answer so a repeated letter gets a fresh set of options. */
  const [round, setRound] = useState(0);

  const valid = script === 'hebrew' || script === 'arabic';
  const alphabet = (valid ? script : 'hebrew') as AlphabetScript;
  const mode = (MODES.includes(modeParam as PracticeMode)
    ? modeParam
    : 'recognise') as PracticeMode;

  // Read once, from the store's current value rather than a subscription, so
  // answering does not rebuild the deck underneath the session.
  const deck = useMemo(() => {
    const progress = Object.fromEntries(
      Object.values(useAlphabet.getState().progress)
        .filter((row) => row.script === alphabet)
        .map((row) => [row.letterId, row]),
    );
    return findLetterDeck(alphabet, deckId, progress);
  }, [alphabet, deckId]);

  const letters = useMemo(
    () => (deck ? lettersForMode(deckLetters(deck), mode) : []),
    [deck, mode],
  );

  useEffect(() => {
    if (letters.length === 0) return;
    setSession(
      createPracticeSession({
        id: uid('practice'),
        script: alphabet,
        deckId,
        mode,
        letterIds: letters.map((letter) => letter.id),
        now: new Date().toISOString(),
        // The review decks arrive worst-first; the rest are shuffled.
        shuffleLetters: deck?.kind !== 'mistakes',
      }),
    );
    setPicked(null);
    setRound(0);
  }, [letters, alphabet, deckId, mode, deck?.kind]);

  const letterId = session ? currentLetterId(session) : undefined;
  const letter = letterId ? findLetter(alphabet, letterId) : undefined;

  const question = useMemo(() => {
    if (!letter) return undefined;
    return buildQuestion(letter, alphabet, {
      mode,
      pool: lettersFor(alphabet) as Array<HebrewLetter | ArabicLetter>,
    });
    // `round` belongs in this list: a letter that comes round again should not
    // arrive with the same four buttons in the same order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter, alphabet, mode, round]);

  // A letter the mode turns out not to be able to ask is dropped, not scored.
  useEffect(() => {
    if (session && letter && !question) {
      setSession(skipCurrent(session, { now: new Date().toISOString() }));
    }
  }, [session, letter, question]);

  const choose = useCallback(
    async (index: number) => {
      if (!question || !letter || picked !== null) return;
      const correct = index === question.correctIndex;
      setPicked(index);
      fireFeedback(correct ? 'accept' : 'reject', settings);
      await recordAnswer(letter, alphabet, question.skill, correct);
    },
    [question, letter, picked, recordAnswer, alphabet, settings],
  );

  const next = useCallback(() => {
    if (!session || !question || picked === null) return;
    const correct = picked === question.correctIndex;
    const outcome = answerPractice(session, correct, {
      now: new Date().toISOString(),
    });
    if (outcome.event === 'session-complete') {
      fireFeedback('deck-mastered', settings);
    }
    setSession(outcome.session);
    setPicked(null);
    setRound((value) => value + 1);
  }, [session, question, picked, settings]);

  // Number keys pick an option, Enter moves on. Desktop only, harmless on touch.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (picked !== null) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          next();
        }
        return;
      }
      const index = Number(event.key) - 1;
      if (question && index >= 0 && index < question.options.length) {
        event.preventDefault();
        void choose(index);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, question, choose, next]);

  if (!valid) return <Navigate to="/alphabets" replace />;

  if (!deck || letters.length === 0) {
    return (
      <div className="screen">
        <ScreenHeader title="Nothing to practise" back />
        <div className="empty">
          <p>
            This set has no letters that can be practised this way. That is
            usually a mode waiting on assets rather than a mistake.
          </p>
          <Link className="btn btn-primary" to={'/alphabet/' + alphabet + '/practise'}>
            Choose another
          </Link>
        </div>
      </div>
    );
  }

  if (session?.completedAt) {
    const missed = session.missed
      .map((id) => findLetter(alphabet, id)?.nameEnglish)
      .filter(Boolean);

    return (
      <div className="screen">
        <ScreenHeader title={deck.title} eyebrow={MODE_LABEL[mode]} back />
        <Confetti active />
        <div className="panel">
          <div className="headline">Deck complete</div>
          <p className="muted">
            {session.correct} right out of {session.asked}.
          </p>
          {missed.length > 0 && (
            <p className="small muted">
              Went wrong at least once: {missed.join(', ')}. They are waiting in
              Review mistakes.
            </p>
          )}
          <button
            className="btn btn-primary btn-block"
            onClick={() => navigate('/alphabet/' + alphabet + '/practise')}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!session || !question || !letter) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.title} back />
        <p className="muted">Shuffling…</p>
      </div>
    );
  }

  const correct = picked !== null && picked === question.correctIndex;
  const answer = question.options[question.correctIndex];
  const outstanding =
    session.completed.length +
    session.retry.length +
    (session.queue.length - session.index);

  return (
    <div className="screen">
      <ScreenHeader title={deck.title} eyebrow={MODE_LABEL[mode]} back />

      <div className="bar" aria-hidden="true">
        <span style={{ width: Math.round(practiceProgress(session) * 100) + '%' }} />
      </div>
      <div className="study-meta small">
        <span>
          {session.completed.length} of {outstanding} learned
        </span>
        {session.retry.length > 0 && (
          <span className="chip">Retry pile: {session.retry.length}</span>
        )}
      </div>

      <div className="panel question">
        <p className="small muted">{question.question}</p>

        {question.prompt.kind === 'glyph' && (
          <>
            <span className={'glyph glyph-lg ' + alphabet} dir="rtl">
              {question.prompt.glyph}
            </span>
            {question.prompt.caption && (
              <div className="small muted english">{question.prompt.caption}</div>
            )}
          </>
        )}

        {question.prompt.kind === 'handwritten' && (
          <img
            className="glyph glyph-hand glyph-lg"
            src={question.prompt.asset.src}
            alt={question.prompt.asset.label}
          />
        )}

        {question.prompt.kind === 'name' && (
          <>
            <div className="headline">{question.prompt.name}</div>
            <div className="translit">{question.prompt.transliteration}</div>
            <div className="small muted">{question.prompt.sound}</div>
          </>
        )}

        {question.prompt.kind === 'audio' && (
          <div className="speaker-row">
            <LetterSpeaker
              script={alphabet}
              entryKind="letter"
              entryId={question.prompt.entryId}
              clipKind="name"
              fallbackText={question.prompt.fallbackText}
              label={question.prompt.label}
            />
            <span className="small muted">Tap to hear it again</span>
          </div>
        )}
      </div>

      <div className="option-grid">
        {question.options.map((option, index) => {
          const isAnswer = index === question.correctIndex;
          const state =
            picked === null
              ? ''
              : isAnswer
                ? ' option-correct'
                : index === picked
                  ? ' option-wrong'
                  : ' option-dim';

          return (
            <button
              key={option.letterId + ':' + index}
              className={'btn option' + state}
              onClick={() => void choose(index)}
              disabled={picked !== null}
            >
              {option.kind === 'glyph' ? (
                <LetterGlyph
                  script={option.script}
                  print={option.glyph}
                  display="print"
                  size="lg"
                />
              ) : (
                <span className="option-name">
                  <strong>{option.name}</strong>
                  {settings.showAlphabetTransliteration && (
                    <span className="translit">{option.transliteration}</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className={'panel verdict-panel ' + (correct ? 'pass' : 'fail')}>
          <strong>
            {correct
              ? 'Right'
              : 'Not quite — that is ' +
                (answer.kind === 'name' ? answer.name : letter.nameEnglish)}
          </strong>
          <div className="small muted">
            {letter.nameEnglish} · {letter.commonSound}
          </div>
          <div className="row">
            <Link
              className="btn btn-ghost"
              to={'/alphabet/' + alphabet + '/letter/' + letter.id}
            >
              See the letter
            </Link>
            <button className="btn btn-primary grow" onClick={next}>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
