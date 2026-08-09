import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import {
  LANGUAGES,
  SPEECH_PERSPECTIVES,
  type Flashcard,
  type Language,
  type LanguageSide,
  type SpeechPerspective,
} from '../../types';
import { useFitToBox } from '../../hooks/useFitToBox';
import { LANGUAGE_LONG_LABEL } from '../../utils/languageSelection';
import { wordForms, type WordForm } from '../../utils/wordForms';
import SpeakerButton from '../controls/SpeakerButton';
import Transliteration from './Transliteration';
import { EngravedDivider } from '../ornament/Ornament';

export type MemoriseCardProps = {
  card: Flashcard;
  /** Showing the back, with every form spelled out. */
  flipped: boolean;
  /** The perspectives the learner is studying, female-speaker first. */
  perspectives: readonly SpeechPerspective[];
  /**
   * The languages she is studying. The back is one block per language, so one
   * switched off simply has no block — no forms, no speaker button, no "show
   * other forms". Absent means both.
   */
  languages?: readonly Language[];
  /**
   * Which half of a grammatical pair to read first, from her identity. Display
   * only, and `otherForms` is unaffected: a variant she is not studying is
   * found by wording rather than by position.
   */
  lead?: 'feminine' | 'masculine';
  showTransliteration: boolean;
  animationIntensity: number;
  reducedMotion: boolean;
  onFlip: () => void;
  onNext: () => void;
  onPrevious: () => void;
  /** False on the first card, where there is nothing behind to swipe back to. */
  canGoBack: boolean;
};

/**
 * Looser than the study card's thresholds on purpose. There a swipe grades an
 * answer, so it has to be meant; here it only walks the deck, and a swipe that
 * has clearly been made should move the card rather than fall short and be
 * mistaken for a tap.
 */
const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 300;

/**
 * One card in Memorise mode: English on the front, every Hebrew and Arabic
 * form on the back.
 *
 * Not `StudyCard`. That card exists to be answered — it carries typed fields,
 * a grading swipe and a reveal, and going back to it means unpicking a score.
 * Here a swipe only ever means "next" or "back", there is nothing to get wrong,
 * and both sides are read rather than recalled. That is why this card walks
 * freely in both directions in every mode: reading a deck is browsing, and
 * nothing behind the learner has been written down.
 */
/**
 * The forms this card has that the learner is *not* currently studying.
 *
 * Asked of every side rather than only the ones carrying speaker/listener
 * variants: a gendered pair that agrees with the speaker or the listener is
 * now narrowed to one form on screen too, and the half she is not being taught
 * is exactly what this control exists to show her on request.
 *
 * Compared by wording rather than by perspective, so a phrase whose ♂→♀ form
 * happens to be worded exactly like her ♀→♂ one contributes nothing to expand
 * — there would be no second thing to read. A word nothing narrows returns the
 * same list twice over and so offers nothing, which is the right answer for a
 * cat or a colour.
 */
function otherForms(
  side: LanguageSide,
  selected: readonly SpeechPerspective[],
): WordForm[] {
  const shown = new Set(wordForms(side, selected).map((f) => f.script));
  return wordForms(side, SPEECH_PERSPECTIVES).filter((f) => !shown.has(f.script));
}

/** One form and its speaker button. `muted` marks a variant she is not studying. */
function FormRow({
  form,
  language,
  showTransliteration,
  muted,
}: {
  form: WordForm;
  language: 'hebrew' | 'arabic';
  showTransliteration: boolean;
  muted?: boolean;
}) {
  return (
    <div className={'memorise-form' + (muted ? ' muted-form' : '')}>
      <div className="grow">
        <div className="form-line">
          {form.marker && (
            <span className="form-marker" aria-label={form.label}>
              {form.marker}
            </span>
          )}
          <span className={language}>{form.script}</span>
        </div>

        {showTransliteration && form.transliteration && (
          <Transliteration block text={form.transliteration} language={language} />
        )}
      </div>

      {/* One button per form, so each variant can be heard as itself rather
          than only in the headline wording. The card flips on tap, so the
          press must not reach it. */}
      <span onClick={(event) => event.stopPropagation()}>
        <SpeakerButton form={form} language={language} />
      </span>
    </div>
  );
}

export default function MemoriseCard(props: MemoriseCardProps) {
  const { card, flipped, perspectives, lead, reducedMotion } = props;
  const x = useMotionValue(0);

  // Collapsed again on every new card: the learner asked to see the other
  // forms of *that* phrase, not to change how the deck reads from here on.
  const [showOthers, setShowOthers] = useState(false);
  useEffect(() => setShowOthers(false), [card.id]);

  const sides = (props.languages ?? LANGUAGES).map((language) => ({
    language,
    label: LANGUAGE_LONG_LABEL[language],
    side: language === 'hebrew' ? card.hebrew : (card.arabic as LanguageSide),
  }));

  /*
   * Four forms and two labels turned over always fit one face, because the face
   * sets itself smaller until they do rather than scrolling to them.
   *
   * Every face also sets itself *up* until it reaches the card's edge. The
   * sizes in the stylesheet were chosen for the fullest back there is, so any
   * face carrying less than that — one language rather than two, or the front
   * with its single English word — was reading at a size chosen for lines it
   * does not have, marooned in the middle of a tablet with a band of empty card
   * under it. One measurement settles the whole face either way: `--fit` is the
   * only size on this card, and setting it up is the same act as setting it
   * down.
   */
  const face = useFitToBox<HTMLElement>(
    [card.id, flipped, showOthers, perspectives, sides.length],
    true,
  );

  /**
   * Whether the gesture in progress has turned into a drag.
   *
   * The browser fires a click at the end of a drag as well as at the end of a
   * tap, so without this the card would flip on every swipe — and a swipe that
   * fell short of the threshold would flip and nothing else, which is exactly
   * what "swiping only shows and hides the answer" was. Cleared on the way down
   * so each new gesture starts as a tap and one swallowed click cannot eat the
   * tap after it.
   */
  const dragged = useRef(false);

  const tilt = reducedMotion ? 0 : 9 * props.animationIntensity;
  const rotate = useTransform(x, [-220, 0, 220], [-tilt, 0, tilt]);
  // Left is forward, so the badges follow the hand: dragging left brings "Next"
  // in on the left edge, dragging right brings "Back" in on the right.
  const nextOpacity = useTransform(x, [-130, -40], [1, 0]);
  const backOpacity = useTransform(x, [40, 130], [0, 1]);

  useEffect(() => {
    x.set(0);
  }, [card.id, x]);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    const { offset, velocity } = info;

    if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) {
      props.onNext();
    } else if (
      props.canGoBack &&
      (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY)
    ) {
      props.onPrevious();
    }

    x.set(0);
  }

  return (
    <div className="card-stage">
      <div className="card-shadow deep" aria-hidden="true" />
      <div className="card-shadow" aria-hidden="true" />

      <motion.article
        ref={face}
        className={'card memorise-card' + (flipped ? ' flipped' : '')}
        style={{ x, rotate }}
        drag={reducedMotion ? false : 'x'}
        dragElastic={0.5}
        dragSnapToOrigin
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={handleDragEnd}
        transition={{ type: 'spring', stiffness: 460, damping: 36 }}
        onPointerDown={() => {
          dragged.current = false;
        }}
        // Tapping the card is the quick way to turn it over — a tap only, never
        // the tail of a swipe. The Flip button below it is the same action for
        // anyone on a keyboard or a screen reader, so this stays a plain
        // surface rather than a control.
        onClick={() => {
          if (dragged.current) return;
          props.onFlip();
        }}
        aria-label={'Card: ' + card.english}
      >
        {/* Both hints are neutral: neither direction grades anything, so
            neither should borrow the study card's green and red. */}
        <motion.span
          className="swipe-hint left neutral"
          style={{ opacity: nextOpacity }}
          aria-hidden="true"
        >
          Next
        </motion.span>

        {props.canGoBack && (
          <motion.span
            className="swipe-hint right neutral"
            style={{ opacity: backOpacity }}
            aria-hidden="true"
          >
            Back
          </motion.span>
        )}

        {/* The catalogue label at the head of the tablet. It names the mode,
            not the card, so it stays put when the card is turned over. */}
        <div className="eyebrow memorise-eyebrow">Review</div>

        <div className="card-prompt">
          {card.icon && (
            <span className="glyph" aria-hidden="true">
              {card.icon}
            </span>
          )}
          <h2 className="word english">{card.english}</h2>
        </div>

        <EngravedDivider tone="card" tight={flipped} />

        {flipped ? (
          sides.map(({ language, label, side }, i) => (
            <div className="answer-block" key={language}>
              {/* A band between the two languages, never above the first —
                  the divider under the prompt already opens the block. */}
              {i > 0 && <EngravedDivider tone="card" tight />}
              <div
                className={
                  'lang-label ' +
                  (language === 'hebrew' ? 'hebrew-label' : 'arabic-label')
                }
              >
                <span>{label}</span>
              </div>

              <div className="memorise-forms">
                {/* The forms she actually needs, female-speaker first — or,
                    where the phrase has no speaker/listener variants, the
                    grammatical pair feminine-first. A word with one form for
                    everyone comes back as a single unmarked line. */}
                {wordForms(side, perspectives, lead).map((form) => (
                  <FormRow
                    key={form.key}
                    form={form}
                    language={language}
                    showTransliteration={props.showTransliteration}
                  />
                ))}

                {/* The rest of the variants stay behind a press. Reading is a
                    first pass, and putting a form she will never say beside
                    the one she will is exactly the habit this replaces. */}
                {showOthers &&
                  otherForms(side, perspectives).map((form) => (
                    <FormRow
                      key={form.key}
                      form={form}
                      language={language}
                      showTransliteration={props.showTransliteration}
                      muted
                    />
                  ))}
              </div>

              {otherForms(side, perspectives).length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-compact"
                  aria-expanded={showOthers}
                  onClick={(event) => {
                    // The card flips on tap; this press must not reach it.
                    event.stopPropagation();
                    setShowOthers((s) => !s);
                  }}
                >
                  {showOthers ? 'Hide other forms' : 'Show other forms'}
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="memorise-hint small muted">Tap to flip</p>
        )}
      </motion.article>
    </div>
  );
}
