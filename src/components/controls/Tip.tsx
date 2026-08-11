import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * How long a pointer has to rest on a trigger before its tip appears.
 *
 * Long enough that reading straight across a phrase never sets off a trail of
 * tooltips, short enough that pausing feels answered rather than waited on. A
 * keyboard or a tap gets no delay at all — both are deliberate in a way that
 * drifting across a line is not.
 */
const HOVER_DELAY_MS = 400;

/** The gap between a trigger and its tip, and the margin kept off the screen edge. */
const GAP = 7;
const EDGE = 8;

/**
 * The tip itself, placed against its trigger from outside the card.
 *
 * It is drawn into `document.body` rather than beside the thing it belongs to
 * because the cards it sits on clip their own contents, and a tooltip that can
 * be cut in half by the card it explains is worse than none. That means placing
 * it by hand: under the trigger where there is room, above it where there is
 * not, and never past either side of the screen.
 */
function Bubble({
  id,
  children,
  anchor,
}: {
  id: string;
  children: ReactNode;
  anchor: DOMRect;
}) {
  const element = useRef<HTMLSpanElement>(null);
  const [placed, setPlaced] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const box = element.current?.getBoundingClientRect();
    if (!box) return;

    const below = anchor.bottom + GAP;
    const fits = below + box.height <= window.innerHeight - EDGE;

    setPlaced({
      left: Math.min(
        Math.max(anchor.left + anchor.width / 2, EDGE + box.width / 2),
        window.innerWidth - EDGE - box.width / 2,
      ),
      top: fits ? below : anchor.top - GAP - box.height,
    });
  }, [anchor]);

  return (
    <span
      ref={element}
      id={id}
      role="tooltip"
      className="tip-bubble"
      // Hidden for the one frame it takes to measure, so it is never seen in
      // the corner it was measured in.
      style={{ ...placed, visibility: placed ? undefined : 'hidden' }}
    >
      {children}
    </span>
  );
}

export type TipProps = {
  /** What the tip says. */
  content: ReactNode;
  /** The trigger's own face — a word, or a mark. */
  children: ReactNode;
  /** Added beside `tip-trigger`, for triggers that style themselves. */
  className?: string;
  /**
   * The trigger's accessible name, where its face is not one. A word is its own
   * name and needs none; an (i) mark has to be told what it is about.
   */
  label?: string;
};

/**
 * Something on a card with its explanation a pause — or a press — away.
 *
 * A button, because it answers a press as well as a hover: a phone has no hover
 * at all, and a button puts every trigger on the tab order for anyone reading by
 * keyboard. The press stops here rather than reaching the card underneath, which
 * would otherwise flip or reveal on what was only a question.
 */
export default function Tip({ content, children, className, label }: TipProps) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<number>();
  const id = useId();

  const open = anchor !== null;
  const show = () => setAnchor(trigger.current?.getBoundingClientRect() ?? null);
  const hide = () => setAnchor(null);

  // Anything that moves the trigger out from under its tip closes it: the page
  // scrolls, the deck advances, the window changes shape.
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [open]);

  const cancel = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  };

  // A card can be swiped away while a trigger is still counting down to its
  // tip, and the timer would otherwise fire into an unmounted component.
  useEffect(() => cancel, []);

  return (
    <button
      ref={trigger}
      type="button"
      className={
        'tip-trigger' + (className ? ' ' + className : '') + (open ? ' showing' : '')
      }
      aria-label={label}
      // Describes rather than labels: the trigger's own face is its name, and
      // the tip is the extra a learner asked for.
      aria-describedby={open ? id : undefined}
      onPointerEnter={(event) => {
        // Touch reports an enter immediately before the tap it belongs to.
        // Waiting on that would show the tip for whatever the finger landed on,
        // which on these screens is usually a card being swiped past.
        if (event.pointerType !== 'mouse') return;
        cancel();
        timer.current = window.setTimeout(show, HOVER_DELAY_MS);
      }}
      onPointerLeave={() => {
        cancel();
        hide();
      }}
      onFocus={show}
      onBlur={() => {
        cancel();
        hide();
      }}
      onClick={(event) => {
        // The cards underneath answer a tap — Review flips, Practice reveals —
        // so a press here has to stop and mean only "what is this".
        event.stopPropagation();
        cancel();
        if (open) hide();
        else show();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          hide();
        }
      }}
    >
      {children}
      {anchor &&
        createPortal(
          <Bubble id={id} anchor={anchor}>
            {content}
          </Bubble>,
          document.body,
        )}
    </button>
  );
}
