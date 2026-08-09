import { useCallback, useRef, useState, type ReactNode } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { isSettled, type PlacementRound } from '../../features/ordering/placement';

/**
 * One word in an ordering drill.
 *
 * `lead` is the only thing shown while the word is still loose, and it is
 * deliberately the script — the Hebrew or Arabic word, or the letter itself.
 * Showing the English beside it would turn "put the numbers in order" into
 * "sort the words one, two, three", which the learner can already do.
 */
export type PlacementItem = {
  id: string;
  lead: string;
  language: 'hebrew' | 'arabic';
  /** The romanisation, where the learner has asked to be shown one. */
  sub?: string;
  /** Shown only once the round is over: the English, or the letter's name. */
  answer?: string;
  /** A speaker button, or nothing. Only ever on a finished column. */
  aside?: ReactNode;
};

type Props = {
  round: PlacementRound;
  /** Every item in play, keyed by id. */
  items: Record<string, PlacementItem>;
  /** Lift the word at `from` out of the column and put it back in at `to`. */
  onMove: (from: number, to: number) => void;
  /** Dragging is off under reduced motion; tapping does everything it does. */
  reducedMotion: boolean;
};

/** The pointer's position, whichever kind of event ended the drag. */
function clientPoint(
  event: MouseEvent | TouchEvent | PointerEvent,
): { x: number; y: number } | null {
  if ('clientX' in event) return { x: event.clientX, y: event.clientY };
  const touch = event.changedTouches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

/**
 * A numbered column with every row already filled, in the wrong order.
 *
 * The learner works the column itself rather than a pile beside it: she carries
 * a word to the row she thinks it belongs in and the column opens up to take
 * it, everything between shuffling along by one. The board says nothing back.
 * Not a green row, not a tick, not a count — she reads the column, decides it
 * is right, and hands it in with the button underneath.
 *
 * A board that marked each row as it landed would do the drill for her: the
 * jumble drops a few words near their places on its own, and lighting those up
 * says which parts of the order she can stop thinking about. Silence is what
 * makes the reviewing step real.
 *
 * The English and the speaker are the answer, so they arrive only once the
 * round is over — solved or shown. A jumbled column with the English down the
 * side of it is not a drill, it is a reading exercise.
 *
 * The board is only as wide as its longest word. Two of these sit side by side
 * on a phone, which is the whole reason for it: a learner who has just put ten
 * numbers in order in Hebrew should be able to see them while she does the same
 * in Arabic, rather than being handed the second column a screen later.
 *
 * Tapping does everything dragging does. Tap a row to pick it up, tap the row
 * to move it to, and the drill is completable on a keyboard, with a screen
 * reader, or with reduced motion switched on. It is not the poor relation: it
 * is also simply easier when the two rows are a phone-height apart.
 */
export default function PlacementBoard({
  round,
  items,
  onMove,
  reducedMotion,
}: Props) {
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  /** The row picked up by tapping, waiting for its partner. */
  const [held, setHeld] = useState<number | null>(null);
  /** The row a dragged word is currently over, so it can light up. */
  const [hot, setHot] = useState<number | null>(null);
  /**
   * When the last drag ended. A drag fires a click on the way up in most
   * browsers, and without this a row dropped on another would be picked up
   * again by the tap handler the moment it landed.
   */
  const draggedAt = useRef(0);

  const rowUnder = useCallback((point: { x: number; y: number }) => {
    return rowRefs.current.findIndex((element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return (
        point.x >= rect.left &&
        point.x <= rect.right &&
        point.y >= rect.top &&
        point.y <= rect.bottom
      );
    });
  }, []);

  const onDrag = useCallback(
    (from: number) =>
      (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        void info;
        const point = clientPoint(event);
        const over = point ? rowUnder(point) : -1;
        setHot((current) => {
          const next = over >= 0 && over !== from ? over : null;
          return current === next ? current : next;
        });
      },
    [rowUnder],
  );

  const onDragEnd = useCallback(
    (from: number) => (event: MouseEvent | TouchEvent | PointerEvent) => {
      draggedAt.current = Date.now();
      setHot(null);
      setHeld(null);

      const point = clientPoint(event);
      const over = point ? rowUnder(point) : -1;
      // Dropped on nothing at all is not a wrong answer, just a word put back
      // down. Nothing moves and nothing is judged.
      if (over >= 0) onMove(from, over);
    },
    [rowUnder, onMove],
  );

  const tapRow = useCallback(
    (slot: number) => {
      if (Date.now() - draggedAt.current < 300) return;
      if (held === null) {
        setHeld(slot);
        return;
      }
      if (held === slot) {
        setHeld(null);
        return;
      }
      onMove(held, slot);
      setHeld(null);
    },
    [held, onMove],
  );

  // Over, one way or the other: the column stops being something to arrange and
  // becomes something to read.
  const settled = isSettled(round);

  return (
    <div className={'place-board' + (held !== null ? ' holding' : '')}>
      <ol className="place-slots">
        {round.slots.map((id, slot) => {
          const item = items[id];
          if (!item) return null;

          return (
            // Keyed by the word rather than the row, so an insertion moves
            // every node it displaced and framer can animate them all shuffling
            // along. Keyed by row, the same nodes would silently change text.
            <li key={id} className="place-row">
              <span className="place-number" aria-hidden="true">
                {slot + 1}
              </span>

              <div
                ref={(element) => {
                  rowRefs.current[slot] = element;
                }}
                className={
                  'place-slot' +
                  (settled ? ' filled' : ' loose') +
                  (round.revealed ? ' revealed' : '') +
                  (hot === slot && !settled ? ' hot' : '')
                }
              >
                {settled ? (
                  <>
                    <span className="place-word">
                      <span className={'place-lead ' + item.language} dir="rtl">
                        {item.lead}
                      </span>
                      {item.sub && <span className="translit">{item.sub}</span>}
                      {item.answer && (
                        <span className="small muted english">{item.answer}</span>
                      )}
                    </span>
                    {item.aside}
                  </>
                ) : (
                  <motion.button
                    type="button"
                    layout={!reducedMotion}
                    drag={!reducedMotion}
                    dragSnapToOrigin
                    dragMomentum={false}
                    dragElastic={1}
                    whileDrag={{ scale: 1.04, zIndex: 30 }}
                    onDrag={onDrag(slot)}
                    onDragEnd={onDragEnd(slot)}
                    onClick={() => tapRow(slot)}
                    className={'place-chip' + (held === slot ? ' held' : '')}
                    aria-pressed={held === slot}
                    aria-label={
                      held === null || held === slot
                        ? item.lead +
                          (item.sub ? ', ' + item.sub : '') +
                          ', at ' +
                          (slot + 1)
                        : 'Move ' +
                          (items[round.slots[held]]?.lead ?? 'it') +
                          ' to ' +
                          (slot + 1) +
                          ', where ' +
                          item.lead +
                          ' is'
                    }
                  >
                    <span className={'place-lead ' + item.language} dir="rtl">
                      {item.lead}
                    </span>
                    {item.sub && <span className="translit">{item.sub}</span>}
                  </motion.button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
