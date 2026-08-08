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
 */
export function useFitToBox<T extends HTMLElement>(deps: readonly unknown[]) {
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
    while (el.scrollHeight - el.clientHeight > 1 && scale > FLOOR) {
      scale = Math.max(FLOOR, scale - STEP);
      el.style.setProperty('--fit', scale.toFixed(3));
    }
  }, []);

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
