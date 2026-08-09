import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { AlphabetScript } from '../types/alphabet';
import { SCRIPT_LABEL, findLetter } from '../data/alphabets';
import { printFormOf } from '../features/alphabet/forms';
import {
  letterLevels,
  nextLevel,
  orderRecallLetterIds,
} from '../features/alphabet/levels';
import {
  chunkForOrdering,
  createPlacementRound,
  dismissRefusal,
  isSettled,
  placedCount,
  revealPlacement,
  submitPlacement,
  swapAt,
  type PlacementRound,
} from '../features/ordering/placement';
import { useAlphabet } from '../stores/alphabetStore';
import { useSettings } from '../stores/settingsStore';
import { fireFeedback } from '../services/audio/feedback';
import PlacementBoard, {
  type PlacementItem,
} from '../components/ordering/PlacementBoard';
import ScreenHeader from '../components/controls/ScreenHeader';
import Confetti from '../components/feedback/Confetti';

/**
 * Put the alphabet back in order.
 *
 * Knowing that ب is bāʾ and knowing that it comes second are two different
 * pieces of knowledge, and every other mode in the module only ever asks the
 * first. This one asks the second, and it is the only place in the app where
 * the alphabet's own sequence is tested.
 *
 * The pile grows with the learner. Each level of ten letters they can recognise
 * adds its letters to what they are asked to arrange, so the drill is never a
 * wall of twenty-eight unfamiliar shapes on day one and never stops short of
 * the whole alphabet at the end. Which levels count is `levels.ts`'s decision,
 * not this screen's.
 *
 * Nothing here is scored. A letter's recognition is earned on the cards and the
 * quiz; being able to sequence them is a separate skill the progress row has no
 * column for, and inventing one to write into would misreport both.
 */
export default function AlphabetOrderScreen() {
  const { script } = useParams<{ script: string }>();
  const settings = useSettings((s) => s.settings);
  const rows = useAlphabet((s) => s.progress);

  const [rounds, setRounds] = useState<PlacementRound[]>([]);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);

  const valid = script === 'hebrew' || script === 'arabic';
  const alphabet = (valid ? script : 'hebrew') as AlphabetScript;

  const progress = useMemo(
    () =>
      Object.fromEntries(
        Object.values(rows)
          .filter((row) => row.script === alphabet)
          .map((row) => [row.letterId, row]),
      ),
    [rows, alphabet],
  );

  const levels = useMemo(() => letterLevels(alphabet, progress), [alphabet, progress]);
  const pile = useMemo(
    () => orderRecallLetterIds(alphabet, progress),
    [alphabet, progress],
  );
  const earned = levels.filter((level) => level.earned).length;

  const pileKey = pile.join(',');

  const deal = useCallback(() => {
    setRounds(
      chunkForOrdering(pile).map((solution) => createPlacementRound({ solution })),
    );
    setIndex(0);
    setFinished(false);
  }, [pile]);

  useEffect(() => {
    if (!started) return;
    deal();
    // `pileKey` stands in for the pile itself, so a re-render cannot reshuffle a
    // round the learner is halfway through.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pileKey, started]);

  const round = rounds[index];

  const items = useMemo(() => {
    const map: Record<string, PlacementItem> = {};
    for (const id of pile) {
      const letter = findLetter(alphabet, id);
      if (!letter) continue;
      map[id] = {
        id,
        lead: printFormOf(letter),
        language: alphabet,
        sub: settings.showAlphabetTransliteration ? letter.transliteration : undefined,
        answer: letter.nameEnglish,
      };
    }
    return map;
  }, [pile, alphabet, settings.showAlphabetTransliteration]);

  const replace = useCallback(
    (next: PlacementRound) => {
      setRounds((current) => current.map((r, i) => (i === index ? next : r)));
    },
    [index],
  );

  // Silent while she arranges. Nothing is right or wrong until she hands the
  // column in, so there is nothing here to sound.
  const swap = useCallback(
    (a: number, b: number) => {
      if (!round) return;
      replace(swapAt(round, a, b));
    },
    [round, replace],
  );

  const submit = useCallback(() => {
    if (!round) return;
    const next = submitPlacement(round);
    if (next === round) return;
    fireFeedback(next.solved ? 'accept' : 'reject', settings);
    replace(next);
  }, [round, replace, settings]);

  const advance = useCallback(() => {
    if (index + 1 < rounds.length) {
      setIndex(index + 1);
      return;
    }
    setFinished(true);
  }, [index, rounds.length]);

  const passed = finished && rounds.length > 0 && rounds.every((r) => r.solved);

  useEffect(() => {
    if (passed) fireFeedback('deck-mastered', settings);
    // Sound on the way into a clean run, and nothing written: sequencing has no
    // column on the progress row, and it should not borrow one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passed]);

  if (!valid) return <Navigate to="/alphabets" replace />;

  /* ---- nothing earned yet ----------------------------------------------- */

  if (pile.length === 0) {
    const next = nextLevel(levels);

    return (
      <div className="screen">
        <ScreenHeader title={SCRIPT_LABEL[alphabet]} eyebrow="In order" back />
        <div className="empty">
          <p>
            Nothing to put in order yet. A level joins this drill once you can
            recognise every letter in it, so it only ever asks for letters you
            already know.
          </p>
          {next && (
            <p className="small">
              <strong>{next.title}</strong> — {next.recognised} of{' '}
              {next.letterIds.length} recognised.
            </p>
          )}
          <Link
            className="btn btn-primary"
            to={'/alphabet/' + alphabet + '/practise?mode=cards'}
          >
            Work on the letters
          </Link>
        </div>
      </div>
    );
  }

  /* ---- the start screen, and what is on the list ------------------------- */

  if (!started) {
    const next = nextLevel(levels);

    return (
      <div className="screen">
        <ScreenHeader title={SCRIPT_LABEL[alphabet]} eyebrow="In order" back />

        <div className="panel">
          <div className="headline">Put them in order</div>
          <p className="muted">
            {pile.length} letters, laid out in the wrong order. Swap them about
            until the column reads the way it is recited, then submit it. Take
            as many goes as you need — nothing here is marked until you hand it
            in.
          </p>
          <p className="small muted">
            {earned === levels.length
              ? 'Every level is on the list: this is the whole alphabet.'
              : earned + ' of ' + levels.length + ' levels are on the list so far.'}
          </p>
        </div>

        <h2 className="section-title">On the list</h2>
        <div className="list">
          {levels.map((level) => (
            <div
              key={level.deckId}
              className={'list-item' + (level.earned ? '' : ' locked-row')}
            >
              <span className="grow">
                <strong>{level.title}</strong>
                <div className="small muted">
                  {level.earned
                    ? 'On the list'
                    : level.recognised + ' of ' + level.letterIds.length + ' recognised'}
                </div>
              </span>
              {level.earned ? (
                <span className="chip chip-ok">In</span>
              ) : (
                <Link
                  className="btn btn-compact"
                  to={
                    '/alphabet/' + alphabet + '/cards/' + encodeURIComponent(level.deckId)
                  }
                >
                  Practise
                </Link>
              )}
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-block" onClick={() => setStarted(true)}>
          Start
        </button>
        {next && (
          <p className="small muted">
            Clear <strong>{next.title}</strong> and it joins the list.
          </p>
        )}
      </div>
    );
  }

  /* ---- the run ----------------------------------------------------------- */

  if (finished) {
    const solved = rounds.filter((r) => r.solved).length;

    return (
      <div className="screen">
        <ScreenHeader title={SCRIPT_LABEL[alphabet]} eyebrow="In order" back />
        <Confetti active={passed} />

        <div className="panel">
          <div className="headline">{passed ? 'In order' : 'Not yet'}</div>
          <p className="muted">
            {passed
              ? 'All ' + pile.length + ' letters, in the order they are recited.'
              : solved + ' of ' + rounds.length + ' rounds came out right.'}
          </p>
          <p className="small muted">
            {passed
              ? 'Clear another level and it joins the list next time.'
              : 'Nothing was marked against your letters — the order is its own skill.'}
          </p>

          <div className="stack">
            <button className="btn btn-block" onClick={deal}>
              Go again
            </button>
            <button
              className="btn btn-primary btn-block"
              onClick={() => setStarted(false)}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="screen">
        <ScreenHeader title={SCRIPT_LABEL[alphabet]} eyebrow="In order" back />
        <p className="muted">Jumbling them up…</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader title={SCRIPT_LABEL[alphabet]} eyebrow="In order" back />

      <div className="study-meta small">
        {rounds.length > 1 && (
          <span>
            Round {index + 1} of {rounds.length}
          </span>
        )}
        <span className="grow muted">Alphabet order</span>
        {/* How many she has right is never up here — only how many times she has
            handed the column in, and only once that is more than once. */}
        {round.slips > 0 && !isSettled(round) && (
          <span className="chip">Try {round.slips + 1}</span>
        )}
      </div>

      <PlacementBoard
        round={round}
        items={items}
        onSwap={swap}
        reducedMotion={settings.reducedMotion}
      />

      {isSettled(round) ? (
        <div className={'panel verdict-panel ' + (round.solved ? 'pass' : 'fail')}>
          <strong>
            {round.solved ? 'That is the order' : 'This is how they run'}
          </strong>
          <div className="small muted">
            {round.solved
              ? round.slips === 0
                ? 'Right first time, straight through.'
                : round.slips === 1
                  ? 'Right on the second look.'
                  : 'Right on look ' + (round.slips + 1) + '.'
              : 'Read it through — the order is the part worth taking away.'}
          </div>
          <button className="btn btn-primary btn-block" onClick={advance}>
            {index + 1 < rounds.length ? 'Next round' : 'Finish'}
          </button>
        </div>
      ) : round.refused ? (
        <div className="panel verdict-panel fail">
          <strong>Not in order yet</strong>
          {/* How close, never where: the count keeps her going, and naming the
              letters that are out would hand her the rest of the alphabet. */}
          <div className="small muted">
            {placedCount(round) === 0
              ? 'None of them are in the right place yet. Start from the letter you are surest of.'
              : placedCount(round) +
                ' of ' +
                round.slots.length +
                ' are in the right place — ' +
                Math.round((placedCount(round) / round.slots.length) * 100) +
                '%. Read it through and move the ones that are not.'}
          </div>
          <div className="stack">
            <button
              className="btn btn-primary btn-block"
              onClick={() => replace(dismissRefusal(round))}
            >
              Try again
            </button>
            <button
              className="btn btn-block"
              onClick={() => replace(revealPlacement(round))}
            >
              Show me the order
            </button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <button className="btn btn-primary btn-block" onClick={submit}>
            Submit
          </button>
          <button
            className="btn btn-block"
            onClick={() => replace(revealPlacement(round))}
          >
            Show me the order
          </button>
        </div>
      )}
    </div>
  );
}
