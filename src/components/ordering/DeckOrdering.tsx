import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Flashcard, Language, SpeechPerspective } from '../../types';
import { wordForms } from '../../utils/wordForms';
import {
  chunkForOrdering,
  createPlacementRound,
  dismissRefusal,
  isSettled,
  moveTo,
  placedCount,
  revealPlacement,
  submitPlacement,
  type PlacementRound,
} from '../../features/ordering/placement';
import PlacementBoard, { type PlacementItem } from './PlacementBoard';
import SpeakerButton from '../controls/SpeakerButton';

type Props = {
  /** The deck in its own order, which for a sequenced deck is the answer. */
  cards: Flashcard[];
  language: Language;
  perspectives?: readonly SpeechPerspective[];
  lead: 'feminine' | 'masculine';
  showTransliteration: boolean;
  reducedMotion: boolean;
  /** Sounded on each submission, right or wrong — and at no other moment. */
  onFeedback: (kind: 'accept' | 'reject') => void;
  /** Every round done. `solved` is false if any column had to be shown. */
  onDone: (summary: { solved: boolean; slips: number }) => void;
  /**
   * What the button at the end of the last round says.
   *
   * Left off when this column is one of a pair: there is nothing for it to move
   * on to on its own, so it reports itself finished the moment it settles and
   * the screen holding both columns owns the button that moves on.
   */
  doneLabel?: string;
  /**
   * Hands this column in whenever the number changes.
   *
   * A column of a pair has no Submit of its own — two buttons under two columns
   * asked the learner to hand in each half separately, when what she has in
   * front of her is one screen she has finished arranging. The screen owns the
   * one button and ticks this over; each column still grades the round it
   * happens to be on, which keeps the grading here, where the round lives.
   */
  submitSignal?: number;
};

/**
 * A deck, put back in the order it runs in — one language at a time.
 *
 * One language always, because counting in Hebrew and counting in Arabic are
 * two separate things to know: a mixed column would ask the learner to sort by
 * script before sorting by number, which is a test of neither.
 *
 * Ten slots to a round, so a deck longer than ten becomes two sittings rather
 * than one column nobody can hold in their head. The rounds run straight into
 * each other; the caller is told once, at the end.
 */
export default function DeckOrdering({
  cards,
  language,
  perspectives,
  lead,
  showTransliteration,
  reducedMotion,
  onFeedback,
  onDone,
  doneLabel,
  submitSignal,
}: Props) {
  const dealKey = cards.map((c) => c.id).join(',') + '|' + language;

  const [rounds, setRounds] = useState<PlacementRound[]>(() =>
    chunkForOrdering(cards.map((c) => c.id)).map((solution) =>
      createPlacementRound({ solution }),
    ),
  );
  const [dealt, setDealt] = useState(dealKey);
  const [index, setIndex] = useState(0);

  if (dealt !== dealKey) {
    // A different language, or a deck that has changed under us: deal again.
    // Done in render rather than in an effect so the board never paints a frame
    // of the old language's column. The key is the card list rather than the
    // array itself, so an unrelated re-render cannot rejumble a column the
    // learner is halfway through.
    setRounds(
      chunkForOrdering(cards.map((c) => c.id)).map((solution) =>
        createPlacementRound({ solution }),
      ),
    );
    setIndex(0);
    setDealt(dealKey);
  }

  const items = useMemo(() => {
    const map: Record<string, PlacementItem> = {};

    for (const card of cards) {
      const side = language === 'hebrew' ? card.hebrew : card.arabic;
      // The leading form only. A gendered pair would put two words on one chip
      // and ask the learner to sort past the difference rather than by it.
      const [form] = wordForms(side, perspectives, lead);
      if (!form) continue;

      map[card.id] = {
        id: card.id,
        lead: form.script,
        language,
        sub: showTransliteration ? form.transliteration : undefined,
        answer: card.english,
        // Only ever rendered on a locked row, so the speaker cannot be used to
        // hunt down the column for the word that goes next.
        aside: <SpeakerButton form={form} language={language} />,
      };
    }
    return map;
  }, [cards, language, perspectives, lead, showTransliteration]);

  const round = rounds[index];

  const replace = useCallback(
    (next: PlacementRound) => {
      setRounds((current) => current.map((r, i) => (i === index ? next : r)));
    },
    [index],
  );

  // Silent. Nothing is right or wrong until she says the column is finished, so
  // there is nothing here to sound.
  const move = useCallback(
    (from: number, to: number) => {
      if (!round) return;
      replace(moveTo(round, from, to));
    },
    [round, replace],
  );

  const submit = useCallback(() => {
    if (!round) return;
    const next = submitPlacement(round);
    if (next === round) return;
    onFeedback(next.solved ? 'accept' : 'reject');
    replace(next);
  }, [round, replace, onFeedback]);

  // Handed in from outside, by the one button under both columns. The first
  // value is only a starting point, never a submission: the ref is seeded with
  // it so mounting does not grade an untouched column.
  const lastSignal = useRef(submitSignal);
  useEffect(() => {
    if (submitSignal === undefined || submitSignal === lastSignal.current) return;
    lastSignal.current = submitSignal;
    submit();
  }, [submitSignal, submit]);

  const summary = useCallback(
    () => ({
      solved: rounds.every((r) => r.solved),
      slips: rounds.reduce((total, r) => total + r.slips, 0),
    }),
    [rounds],
  );

  const advance = useCallback(() => {
    if (index + 1 < rounds.length) {
      setIndex(index + 1);
      return;
    }
    onDone(summary());
  }, [index, rounds.length, onDone, summary]);

  /** Whether the last round of this column has been settled, one way or another. */
  const over =
    rounds.length > 0 && index + 1 >= rounds.length && isSettled(rounds[index]!);

  // A column of a pair has no button of its own, so it says it is finished as
  // soon as it is. Guarded by a ref rather than by the effect's dependencies: a
  // parent that rebuilds `onDone` each render would otherwise be told twice.
  const reported = useRef(false);
  useEffect(() => {
    if (doneLabel !== undefined || !over || reported.current) return;
    reported.current = true;
    onDone(summary());
  }, [doneLabel, over, onDone, summary]);

  if (!round) return null;

  const settled = isSettled(round);
  // One of two columns on a screen that carries the buttons for both.
  const paired = doneLabel === undefined;

  return (
    <>
      {/* Stacked rather than strung along a line, because two of these sit side
          by side and half a phone is not a line's worth of room. */}
      <div className="order-column-head">
        <strong>{language === 'hebrew' ? 'Hebrew' : 'Arabic'}</strong>
        <span className="small muted">
          lowest first
          {rounds.length > 1 && ' · round ' + (index + 1) + ' of ' + rounds.length}
        </span>
        {/* How many she has right is never up here — only how many times she has
            handed the column in, and only once that is more than once. */}
        {round.slips > 0 && !settled && <span className="chip">Try {round.slips + 1}</span>}
      </div>

      <PlacementBoard
        round={round}
        items={items}
        onMove={move}
        reducedMotion={reducedMotion}
      />

      {settled ? (
        <div className={'panel verdict-panel ' + (round.solved ? 'pass' : 'fail')}>
          <strong>{round.solved ? 'That is the order' : 'This is how they run'}</strong>
          <div className="small muted">
            {round.solved
              ? attemptNote(round.slips)
              : 'Read it through — the order is the part worth taking away.'}
          </div>
          {/* Nothing to move on to when this column is one of a pair: the other
              one may still be being worked on, and the screen carries the
              button that leaves them both. */}
          {(index + 1 < rounds.length || !paired) && (
            <button className="btn btn-primary btn-block" onClick={advance}>
              {index + 1 < rounds.length ? 'Next round' : doneLabel}
            </button>
          )}
        </div>
      ) : round.refused ? (
        <div className="panel verdict-panel fail">
          <strong>Not in order yet</strong>
          <div className="small muted">{scoreNote(round)}</div>
          <div className="stack">
            {/* Paired, there is nothing to dismiss with: the one Submit below
                both columns is the second look, and moving a word clears the
                score on its own. */}
            {!paired && (
              <button
                className="btn btn-primary btn-block"
                onClick={() => replace(dismissRefusal(round))}
              >
                Try again
              </button>
            )}
            <button
              className="btn btn-compact btn-block"
              onClick={() => replace(revealPlacement(round))}
            >
              Show me the order
            </button>
          </div>
        </div>
      ) : paired ? (
        // The column she is still arranging carries no button of its own. The
        // way out stays with the column rather than with the screen, though —
        // being stuck on the Arabic is no reason to be shown the Hebrew — and
        // it appears only once she has actually had a go at this one.
        round.slips > 0 && (
          <button
            className="btn btn-compact btn-block"
            onClick={() => replace(revealPlacement(round))}
          >
            Show me the order
          </button>
        )
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
    </>
  );
}

/**
 * How close she was, and nothing about where.
 *
 * The count is what keeps her going — three out of ten and ten out of ten are
 * different situations — while which three would hand her the rest.
 */
function scoreNote(round: PlacementRound): string {
  const right = placedCount(round);
  const total = round.slots.length;
  const share = Math.round((right / total) * 100);

  if (right === 0) {
    return 'Nothing is in the right place yet. Read it from the top and start with the one you are surest of.';
  }
  return (
    right +
    ' of ' +
    total +
    ' are in the right place — ' +
    share +
    '%. Read it through and move the ones that are not.'
  );
}

/** What it took, said plainly, because a fourth look is not a failure. */
function attemptNote(slips: number): string {
  if (slips === 0) return 'Right first time, straight through.';
  if (slips === 1) return 'Right on the second look.';
  return 'Right on look ' + (slips + 1) + '.';
}
