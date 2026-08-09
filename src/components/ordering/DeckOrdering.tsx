import { useCallback, useMemo, useState } from 'react';
import type { Flashcard, Language, SpeechPerspective } from '../../types';
import { wordForms } from '../../utils/wordForms';
import {
  chunkForOrdering,
  createPlacementRound,
  isSettled,
  placeAt,
  placedCount,
  revealPlacement,
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
  /** Sounded on each placement, right or wrong. */
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
    // of the old language's pile. The key is the card list rather than the
    // array itself, so an unrelated re-render cannot reshuffle a pile the
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
        // Only ever rendered in a filled slot, so the speaker cannot be used to
        // hunt through the pile for the word that goes next.
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

  const place = useCallback(
    (id: string, slot: number) => {
      if (!round) return;
      const next = placeAt(round, id, slot);
      if (next === round) return;
      onFeedback(next.rejected === id ? 'reject' : 'accept');
      replace(next);
    },
    [round, replace, onFeedback],
  );

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

  const placed = placedCount(round);
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
        <span className={'chip' + (round.slips > 0 ? ' chip-bad' : '')}>
          {placed} / {round.slots.length}
        </span>
      </div>

      <PlacementBoard
        round={round}
        items={items}
        onPlace={place}
        reducedMotion={reducedMotion}
      />

      {settled ? (
        <div className={'panel verdict-panel ' + (round.solved ? 'pass' : 'fail')}>
          <strong>{round.solved ? 'That is the order' : 'This is how they run'}</strong>
          <div className="small muted">
            {round.solved
              ? round.slips === 0
                ? 'Straight through, nothing out of place.'
                : round.slips === 1
                  ? 'One word went back before it landed.'
                  : round.slips + ' words went back before they landed.'
              : 'Read it through — the order is the part worth taking away.'}
          </div>
          <button className="btn btn-primary btn-block" onClick={advance}>
            {index + 1 < rounds.length ? 'Next round' : doneLabel}
          </button>
        </div>
      ) : (
        <button
          className="btn btn-block"
          onClick={() => replace(revealPlacement(round))}
        >
          Show me the order
        </button>
      )}
    </>
  );
}
