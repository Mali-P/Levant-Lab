import { useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import {
  LANGUAGES,
  type Flashcard,
  type Language,
  type LanguageSide,
  type SpeechPerspective,
} from '../../types';
import { useFitToBox } from '../../hooks/useFitToBox';
import { LANGUAGE_LONG_LABEL } from '../../utils/languageSelection';
import { sentenceCase } from '../../utils/textCase';
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
   * switched off simply has no block — no forms, no speaker button. Absent
   * means both.
   */
  languages?: readonly Language[];
  /**
   * Which half of a grammatical pair to read first, from her identity. Display
   * only — it reorders the forms shown, it does not choose them.
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
 * One form's play button.
 *
 * One per form, so each variant can be heard as itself rather than only in the
 * headline wording. The card flips on tap, so the press must not reach it.
 */
function FormSpeaker({
  form,
  language,
}: {
  form: WordForm;
  language: 'hebrew' | 'arabic';
}) {
  return (
    <span onClick={(event) => event.stopPropagation()}>
      <SpeakerButton form={form} language={language} />
    </span>
  );
}

/** One form: the word on the card's own axis with its romanisation under it. */
function FormRow({
  form,
  language,
  showTransliteration,
  /** Whether this block carries its buttons itself, or above its own head. */
  speaker,
}: {
  form: WordForm;
  language: 'hebrew' | 'arabic';
  showTransliteration: boolean;
  speaker: boolean;
}) {
  return (
    <div className="memorise-form">
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

      {speaker && <FormSpeaker form={form} language={language} />}
    </div>
  );
}

export default function MemoriseCard(props: MemoriseCardProps) {
  const { card, flipped, perspectives, lead, reducedMotion } = props;
  const x = useMotionValue(0);

  const sides = (props.languages ?? LANGUAGES).map((language) => ({
    language,
    label: LANGUAGE_LONG_LABEL[language],
    side: language === 'hebrew' ? card.hebrew : (card.arabic as LanguageSide),
  }));

  /*
   * The English sits between the two scripts rather than above both of them.
   * Stacked under one head, the second language read as an afterthought of the
   * first; with the meaning in the middle, each script has the English directly
   * against it and neither is the one further away.
   *
   * A learner studying one language alone keeps her script on its own side —
   * Hebrew above, Arabic below — rather than having it move to the top because
   * the other is switched off. Nothing about the head changes either way.
   */
  const above = sides.filter(({ language }) => language === 'hebrew');
  const below = sides.filter(({ language }) => language !== 'hebrew');

  /*
   * `place` is spacing, not meaning. A block below the English opens with a
   * pad under the rule it follows; a block above it needs the same pad on the
   * other edge, or the Hebrew sits a few pixels closer to the word than the
   * Arabic does and the English stops reading as the middle of the card.
   */
  const renderSide = (
    { language, label, side }: (typeof sides)[number],
    place: 'above' | 'below',
  ) => {
    /* The forms she actually needs, female-speaker first — or, where the phrase
       has no speaker/listener variants, the grammatical pair feminine-first. A
       word with one form for everyone comes back as a single unmarked line. */
    const forms = wordForms(side, perspectives, lead);

    return (
    <div className={'answer-block ' + place} key={language}>
      {/*
        The buttons sit on the block's outer edge: over the head of the block
        above the English, at the foot of the block below it. Under both, the
        Hebrew's button fell into the gap between the Hebrew and the meaning it
        belongs to and read as the meaning's own control. On the outside the two
        rows mirror each other around the middle of the card, and each is
        unmistakably the row for the script it touches.
      */}
      {place === 'above' && (
        <div className="memorise-speakers">
          {forms.map((form) => (
            <FormSpeaker key={form.key} form={form} language={language} />
          ))}
        </div>
      )}

      <div
        className={
          'lang-label ' +
          (language === 'hebrew' ? 'hebrew-label' : 'arabic-label')
        }
      >
        <span>{label}</span>
      </div>

      <div className="memorise-forms">
        {forms.map((form) => (
          <FormRow
            key={form.key}
            form={form}
            language={language}
            showTransliteration={props.showTransliteration}
            speaker={place === 'below'}
          />
        ))}
      </div>
    </div>
    );
  };

  /*
   * Four forms and two labels turned over always fit one face, because the face
   * sets itself smaller until they do rather than scrolling to them.
   *
   * Shrink only. The face used to set itself *up* as well, to fill a card that
   * had room to spare — and that made turning the card over an event: the front
   * grew its one English word until it reached the card's edge, the back had
   * four forms to hold and could not, so the word and the rule under it changed
   * size and place under the learner's thumb at the exact moment she was
   * looking for the answer. The head of this card is the same head on both
   * sides now, and flipping it adds the scripts and nothing else.
   */
  const face = useFitToBox<HTMLElement>([
    card.id,
    flipped,
    perspectives,
    sides.length,
  ]);

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

        {flipped && above.length > 0 && (
          <>
            {above.map((side) => renderSide(side, 'above'))}
            <EngravedDivider tone="card" />
          </>
        )}

        <div className="card-prompt">
          {card.icon && (
            <span className="glyph" aria-hidden="true">
              {card.icon}
            </span>
          )}
          <h2 className="word english">{sentenceCase(card.english)}</h2>
        </div>

        {/* The same rule on both sides of the English, and never tight: the two
            bands are what make the meaning the middle of the card rather than
            its heading. A rule that closed up on the flip would be the head
            moving when only the scripts should have. Below it is drawn only
            when something follows it — a run with Arabic switched off ends at
            the English rather than on a hanging line. */}
        {(!flipped || below.length > 0) && <EngravedDivider tone="card" />}

        {flipped ? below.map((side) => renderSide(side, 'below')) : (
          <p className="memorise-hint small muted">Tap to flip</p>
        )}
      </motion.article>
    </div>
  );
}
