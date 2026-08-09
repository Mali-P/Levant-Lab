import { useCallback, useEffect, useRef } from 'react';

/**
 * The smallest the card is allowed to set itself.
 *
 * Everything inside the card is sized against `--fit`, so this is the floor on
 * the whole face at once, not on one line of it — and it is deliberately lower
 * than any script would survive on its own. The scripts do not go this far: the
 * two lines that carry them have absolute `max()` floors in the stylesheet, at
 * the size pointed Hebrew and Arabic are still read at rather than decoded. So
 * the last stretch of this range is spent on the things that can afford it —
 * the leading, the bands of air, the romanisation under the word — and the one
 * sentence in the deck long enough to need it gives up its spacing instead of
 * its legibility.
 */
const FLOOR = 0.56;

/** Coarse enough to settle in a handful of passes, fine enough not to overshoot
 *  a whole line's worth of height on the last one. */
const STEP = 0.04;

/**
 * The largest a face is allowed to set itself when it is asked to grow.
 *
 * A card carrying one script instead of two has half the lines and the same box,
 * and left at `--fit: 1` it set a word the size of a caption in the middle of a
 * tablet. This is the ceiling that stops the other extreme: one short word blown
 * up until the card reads as a poster rather than as one of a deck.
 */
const CEILING = 1.85;

/**
 * Sets `--fit` on an element until its content stops overflowing it.
 *
 * The study and memorise cards may never scroll. A card is a single face the
 * learner reads at a glance: a form she has to scroll to find is a form she
 * skips, and on a touch device the card's own drag gestures fight its scrolling
 * for the same finger. So the card stays a fixed box and the type inside it
 * gives way instead — which is what a typesetter would do with a plate that had
 * to hold one more line.
 *
 * The box itself is set by the stage, which takes the height the screen has
 * left over rather than the height its content wants, so shrinking the contents
 * never changes the box being measured and this cannot chase its own tail.
 *
 * @param deps Content changes that need a fresh measurement — the card's id, a
 *   reveal, a flip. Box changes are watched for separately.
 * @param grow Whether a face with room to spare should also be set *up* until
 *   it fills the box. Off by default, because most faces are the two-language
 *   ones the sizes in the stylesheet were chosen for and growing those would
 *   only undo that choice. A face carrying half of them — one script rather
 *   than two — has the room and is the case this exists for.
 */
export function useFitToBox<T extends HTMLElement>(
  deps: readonly unknown[],
  grow = false,
) {
  const ref = useRef<T>(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    // Always from the top: the card that just shrank to fit a long sentence is
    // the same element that has to come back up to full size for the short one
    // after it.
    let scale = 1;
    el.style.setProperty('--fit', '1');

    // A pixel of slack, so sub-pixel layout rounding does not read a face that
    // fits exactly as one that overflows and shrink it for nothing. Reading
    // scrollHeight forces the reflow each next measurement depends on.
    const overflows = () => el.scrollHeight - el.clientHeight > 1;

    if (!overflows() && grow) {
      /*
       * Up in the same steps it would have come down in, and one step back the
       * moment it overflows — so the size it settles on is the last one that
       * fitted, never the first one that did not. The box is fixed by the stage
       * above it, so growing the type cannot grow the thing being measured and
       * this ends where the card's edge is.
       */
      while (scale < CEILING) {
        const next = Math.min(CEILING, scale + STEP);
        el.style.setProperty('--fit', next.toFixed(3));
        if (overflows()) {
          el.style.setProperty('--fit', scale.toFixed(3));
          return;
        }
        scale = next;
      }
      return;
    }

    while (overflows() && scale > FLOOR) {
      scale = Math.max(FLOOR, scale - STEP);
      el.style.setProperty('--fit', scale.toFixed(3));
    }
  }, [grow]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    fit();
    // The card only, never its children: the children change size because this
    // hook changed them, and observing them would make every measurement the
    // trigger for the next one.
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, ...deps]);

  return ref;
}
