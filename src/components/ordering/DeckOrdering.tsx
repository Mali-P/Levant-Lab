import { useCallback, useMemo, useState } from 'react';
import type { Flashcard, Language, SpeechPerspective } from '../../types';
import { wordForms } from '../../utils/wordForms';
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
  /** What the button at the end of the last round says. */
  doneLabel: string;
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
    onFeedback(next.solved ? 'accept' : 'reject');
    replace(next);
  }, [round, replace, onFeedback]);

  const advance = useCallback(() => {
    if (index + 1 < rounds.length) {
      setIndex(index + 1);
      return;
    }
    onDone({
      solved: rounds.every((r) => r.solved),
      slips: rounds.reduce((total, r) => total + r.slips, 0),
    });
  }, [index, rounds, onDone]);

  if (!round) return null;

  const settled = isSettled(round);

  return (
    <>
      <div className="study-meta small">
        {rounds.length > 1 && (
          <span>
            Round {index + 1} of {rounds.length}
          </span>
        )}
        <span className="grow muted">
          {language === 'hebrew' ? 'Hebrew, lowest first' : 'Arabic, lowest first'}
        </span>
        {/* How many she has right is never up here — only how many times she has
            handed the column in, and only once that is more than once. */}
        {round.slips > 0 && !settled && <span className="chip">Try {round.slips + 1}</span>}
      </div>

      <PlacementBoard
        round={round}
        items={items}
        onSwap={swap}
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
          <button className="btn btn-primary btn-block" onClick={advance}>
            {index + 1 < rounds.length ? 'Next round' : doneLabel}
          </button>
        </div>
      ) : round.refused ? (
        <div className="panel verdict-panel fail">
          <strong>Not in order yet</strong>
          <div className="small muted">{scoreNote(round)}</div>
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
