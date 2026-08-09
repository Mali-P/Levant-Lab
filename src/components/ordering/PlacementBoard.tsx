import { useCallback, useRef, useState, type ReactNode } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import type { PlacementRound } from '../../features/ordering/placement';

/**
 * One word in an ordering drill.
 *
 * `lead` is the only thing shown while the word is still in the pile, and it is
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
  /** Shown only once the word is in its slot: the English, or the letter's name. */
  answer?: string;
  /** A speaker button, or nothing. Only ever in a filled slot, never in the pile. */
  aside?: ReactNode;
};

type Props = {
  round: PlacementRound;
  /** Every item in play, keyed by id. */
  items: Record<string, PlacementItem>;
  onPlace: (id: string, slot: number) => void;
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
 * A numbered column, and a pile of words to hang on it.
 *
 * The column is the answer: slots numbered one down to ten, empty until the
 * learner puts something in them. She drags a word out of the pile and drops it
 * where she thinks it goes. Right, and it settles into the slot for good;
 * wrong, and it springs back to exactly where she picked it up, because a word
 * left lying in the wrong place reads as an answer the board has accepted.
 *
 * That spring-back is the whole feedback mechanism, and it is why there is no
 * check button, no attempt counter and no verdict panel: the board answers the
 * only question the learner is asking — does this go here — at the moment she
 * asks it.
 *
 * Tapping does everything dragging does. Tap a word to pick it up, tap a slot
 * to put it down, and the drill is completable on a keyboard, with a screen
 * reader, or with reduced motion switched on. It is not the poor relation: it
 * is also simply easier when the pile has scrolled away from the slot.
 */
export default function PlacementBoard({
  round,
  items,
  onPlace,
  reducedMotion,
}: Props) {
  const slotRefs = useRef<(HTMLElement | null)[]>([]);
  /** The word picked up by tapping, waiting for a slot. */
  const [held, setHeld] = useState<string | null>(null);
  /** The slot a dragged word is currently over, so it can light up. */
  const [hot, setHot] = useState<number | null>(null);
  /**
   * When the last drag ended. A drag fires a click on the way up in most
   * browsers, and without this a word dropped on a slot would be picked up
   * again by the tap handler the moment it landed.
   */
  const draggedAt = useRef(0);

  const slotUnder = useCallback((point: { x: number; y: number }) => {
    return slotRefs.current.findIndex((element) => {
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
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      void info;
      const point = clientPoint(event);
      const slot = point ? slotUnder(point) : -1;
      setHot((current) => {
        const next = slot >= 0 && round.slots[slot] === null ? slot : null;
        return current === next ? current : next;
      });
    },
    [slotUnder, round.slots],
  );

  const onDragEnd = useCallback(
    (id: string) => (event: MouseEvent | TouchEvent | PointerEvent) => {
      draggedAt.current = Date.now();
      setHot(null);
      setHeld(null);

      const point = clientPoint(event);
      const slot = point ? slotUnder(point) : -1;
      // Dropped on nothing at all is not a wrong answer, just a word put down.
      // It springs home either way; only a real slot is ever judged.
      if (slot >= 0) onPlace(id, slot);
    },
    [slotUnder, onPlace],
  );

  const tapSlot = useCallback(
    (slot: number) => {
      if (Date.now() - draggedAt.current < 300) return;
      if (!held) return;
      onPlace(held, slot);
      setHeld(null);
    },
    [held, onPlace],
  );

  const tapChip = useCallback((id: string) => {
    if (Date.now() - draggedAt.current < 300) return;
    setHeld((current) => (current === id ? null : id));
  }, []);

  const settled = round.solved || round.revealed === true;

  return (
    <div className={'place-board' + (held ? ' holding' : '')}>
      <ol className="place-slots">
        {round.slots.map((id, slot) => {
          const item = id ? items[id] : undefined;
          const empty = !item;

          return (
            <li key={slot} className="place-row">
              <span className="place-number" aria-hidden="true">
                {slot + 1}
              </span>

              <div
                ref={(element) => {
                  slotRefs.current[slot] = element;
                }}
                className={
                  'place-slot' +
                  (empty ? ' empty' : ' filled') +
                  (round.revealed ? ' revealed' : '') +
                  (hot === slot ? ' hot' : '')
                }
              >
                {item ? (
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
                  <button
                    type="button"
                    className="place-drop"
                    onClick={() => tapSlot(slot)}
                    disabled={!held}
                    aria-label={
                      held
                        ? 'Put ' + (items[held]?.lead ?? 'it') + ' at ' + (slot + 1)
                        : 'Position ' + (slot + 1) + ', empty'
                    }
                  >
                    <span aria-hidden="true">
                      {held ? 'Put it here' : 'Drop a word here'}
                    </span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {!settled && (
        <div className="place-pool" role="group" aria-label="Words still to place">
          {round.pool.map((id) => {
            const item = items[id];
            if (!item) return null;

            return (
              <motion.button
                key={id}
                type="button"
                layout={!reducedMotion}
                drag={!reducedMotion}
                dragSnapToOrigin
                dragMomentum={false}
                dragElastic={1}
                whileDrag={{ scale: 1.06, zIndex: 30 }}
                onDrag={onDrag}
                onDragEnd={onDragEnd(id)}
                onClick={() => tapChip(id)}
                className={
                  'place-chip' +
                  (held === id ? ' held' : '') +
                  (round.rejected === id ? ' rejected' : '')
                }
                aria-pressed={held === id}
                aria-label={item.lead + (item.sub ? ', ' + item.sub : '')}
              >
                <span className={'place-lead ' + item.language} dir="rtl">
                  {item.lead}
                </span>
                {item.sub && <span className="translit">{item.sub}</span>}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
