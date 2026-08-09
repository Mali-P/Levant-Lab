import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { readTransliteration, type GlossLanguage } from '../../utils/glossary';

/**
 * How long a pointer has to rest on a word before its meaning appears.
 *
 * Long enough that reading straight across a phrase never sets off a trail of
 * tooltips, short enough that pausing on a word feels answered rather than
 * waited on. A keyboard or a tap gets no delay at all — both are deliberate in
 * a way that drifting across a line is not.
 */
const HOVER_DELAY_MS = 400;

/** The gap between a word and its gloss, and the margin kept off the screen edge. */
const GAP = 7;
const EDGE = 8;

/**
 * The gloss, placed against a word from outside the card.
 *
 * It is drawn into `document.body` rather than beside the word it belongs to
 * because the cards it sits on scroll and clip their own contents, and a
 * tooltip that can be cut in half by the card it explains is worse than none.
 * That means placing it by hand: under the word where there is room, above it
 * where there is not, and never past either side of the screen.
 */
function Gloss({
  id,
  text,
  anchor,
}: {
  id: string;
  text: string;
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
      className="translit-gloss"
      // Hidden for the one frame it takes to measure, so it is never seen in
      // the corner it was measured in.
      style={{ ...placed, visibility: placed ? undefined : 'hidden' }}
    >
      {text}
    </span>
  );
}

/** One transliterated word, with its meaning a pause away. */
function GlossedWord({ text, gloss }: { text: string; gloss: string }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const word = useRef<HTMLButtonElement>(null);
  const timer = useRef<number>();
  const id = useId();

  const open = anchor !== null;
  const show = () => setAnchor(word.current?.getBoundingClientRect() ?? null);
  const hide = () => setAnchor(null);

  // Anything that moves the word out from under its gloss closes it: the card
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

  // A card can be swiped away while a word is still counting down to its
  // tooltip, and the timer would otherwise fire into an unmounted component.
  useEffect(() => cancel, []);

  return (
    <button
      ref={word}
      type="button"
      className={'translit-word' + (open ? ' showing' : '')}
      // Describes rather than labels: the word itself is the button's name, and
      // the meaning is the extra a learner asked for.
      aria-describedby={open ? id : undefined}
      onPointerEnter={(event) => {
        // Touch reports an enter immediately before the tap it belongs to.
        // Waiting on that would show the meaning of whatever the finger landed
        // on, which on this screen is usually a word being swiped past.
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
        // The cards underneath answer a tap — Memorise flips, Study drags — so
        // a press on a word has to stop here and mean only "what is this".
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
      {text}
      {anchor &&
        createPortal(
          <Gloss id={id} text={gloss} anchor={anchor} />,
          document.body,
        )}
    </button>
  );
}

export type TransliterationProps = {
  text: string;
  language: GlossLanguage;
  /** Added beside the `translit` class, for surfaces that style their own. */
  className?: string;
  /** Rendered as a block rather than inline, matching the old `div`. */
  block?: boolean;
};

/**
 * A transliteration line whose words can each be asked what they mean.
 *
 * A learner reading "ṣabāḥ il-khēr" can see that the first word is the morning
 * and the second is the goodness, which is half the reason the romanisation is
 * on the card at all: it is the one line where the pieces of a phrase are
 * separable by eye. Words with nothing known about them stay plain text rather
 * than offering an empty tooltip.
 */
export default function Transliteration({
  text,
  language,
  className,
  block,
}: TransliterationProps) {
  const segments = readTransliteration(text, language);
  const Tag = block ? 'div' : 'span';

  return (
    <Tag className={'translit' + (className ? ' ' + className : '')}>
      {segments.map((segment, index) =>
        segment.word && segment.gloss ? (
          <GlossedWord key={index} text={segment.text} gloss={segment.gloss} />
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </Tag>
  );
}
