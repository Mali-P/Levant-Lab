import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import type {
  AlphabetDisplay,
  AlphabetScript,
  ArabicLetter,
  HebrewLetter,
} from '../../types/alphabet';
import { isHebrewLetter } from '../../data/alphabets';
import { handwrittenOf, printFormOf } from '../../features/alphabet/forms';
import { useFitToBox } from '../../hooks/useFitToBox';
import LetterGlyph from './LetterGlyph';
import LetterSpeaker from './LetterSpeaker';
import { EngravedDivider } from '../ornament/Ornament';

export type LetterCardProps = {
  letter: HebrewLetter | ArabicLetter;
  script: AlphabetScript;
  /** Showing the back: the name, the sound, and a word that uses it. */
  flipped: boolean;
  display: AlphabetDisplay;
  showTransliteration: boolean;
  animationIntensity: number;
  reducedMotion: boolean;
  onFlip: () => void;
  onNext: () => void;
  onPrevious: () => void;
  /** False on the first card, where there is nothing behind to swipe back to. */
  canGoBack: boolean;
  /** How the learner marked themselves on this letter, if they have. */
  marked?: 'known' | 'unknown';
};

/**
 * The same loose thresholds as the Memorise card. A swipe here only ever walks
 * the deck — the marking is done with the buttons underneath — so a gesture
 * that has clearly been made should move the card rather than fall short and be
 * taken for a tap.
 */
const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 300;

/**
 * One letter, as a card.
 *
 * Deliberately the Memorise card's shape rather than the practice screen's four
 * buttons. Four options let a learner arrive at ج by ruling out the other
 * three, which is not the same as knowing it; a card asks them to say it out
 * loud, turn it over, and be honest. That honesty is the whole mode, so the
 * marking is a pair of plain buttons and the swipe is left to mean only "next"
 * and "back" — exactly as it does everywhere else a card is read.
 *
 * The letterform and its name are both on the outside, large. This is the
 * memorising pass, not the test — Practise is where a learner finds out
 * whether it stuck.
 *
 * Left is forward and right is back, matching every other card in the app, so a
 * learner never has to remember which deck they are in to know which way their
 * thumb goes.
 */
export default function LetterCard(props: LetterCardProps) {
  const { letter, script, flipped, reducedMotion } = props;
  const x = useMotionValue(0);

  /* The name, the sound and an example word always fit one face, because the
     face sets itself smaller until they do rather than scrolling to them. */
  const face = useFitToBox<HTMLElement>([letter.id, flipped, props.display]);

  /**
   * Whether the gesture in progress has turned into a drag. Without it the
   * browser's end-of-drag click would flip the card on every swipe. Cleared on
   * the way down so each new gesture starts life as a tap.
   */
  const dragged = useRef(false);

  const tilt = reducedMotion ? 0 : 9 * props.animationIntensity;
  const rotate = useTransform(x, [-220, 0, 220], [-tilt, 0, tilt]);
  const nextOpacity = useTransform(x, [-130, -40], [1, 0]);
  const backOpacity = useTransform(x, [40, 130], [0, 1]);

  useEffect(() => {
    x.set(0);
  }, [letter.id, x]);

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

  const hebrew = isHebrewLetter(letter);
  const example = letter.exampleWord;

  return (
    <div className="card-stage">
      <div className="card-shadow deep" aria-hidden="true" />
      <div className="card-shadow" aria-hidden="true" />

      <motion.article
        ref={face}
        className={'card letter-card' + (flipped ? ' flipped' : '')}
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
        // A tap is the quick way to turn the card over — a tap only, never the
        // tail of a swipe. The Flip button below does the same for anyone on a
        // keyboard or a screen reader.
        onClick={() => {
          if (dragged.current) return;
          props.onFlip();
        }}
        aria-label={'Letter card: ' + letter.nameEnglish}
      >
        {/* Neither direction grades anything, so neither borrows the study
            card's green and red. */}
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

        <div className="eyebrow memorise-eyebrow">
          {props.marked === 'known'
            ? 'Marked known'
            : props.marked === 'unknown'
              ? 'Marked not yet'
              : 'Sound it out'}
        </div>

        {/* Shape and name as one mark, on the outside where they can be stared
            at: a learner who memorises ל and then reads "lamed" off the back
            has learned two things separately. Everything that explains the name
            — how it is written in Latin letters, what it sounds like, a word
            that uses it — waits inside. */}
        <div className="card-prompt">
          {props.showTransliteration && (
            <div className="sound-hint">{letter.transliteration}</div>
          )}
          <LetterGlyph
            script={script}
            print={printFormOf(letter)}
            handwritten={handwrittenOf(letter)}
            display={props.display}
            size="lg"
          />
          <h2 className="word english letter-card-name">{letter.nameEnglish}</h2>
        </div>

        <EngravedDivider tone="card" tight={flipped} />

        {flipped ? (
          <div className="answer-block">
            {/* The romanisation is on the face now, above the letter, so the
                back explains the sound rather than restating it. */}
            <div className="small muted">{letter.commonSound}</div>

            {/* The Levantine reading, where the textbook one would mislead. It
                belongs on the face of the card, not in a note underneath it. */}
            {!hebrew && letter.levantineNote && (
              <div className="small muted">{letter.levantineNote}</div>
            )}

            {example && (
              <div className="letter-card-example">
                <span className={script} dir="rtl">
                  {example.script}
                </span>
                <span className="small muted english">{example.english}</span>
              </div>
            )}

            {/* The card flips on tap, so this press must not reach it. */}
            <span onClick={(event) => event.stopPropagation()}>
              <LetterSpeaker
                script={script}
                entryKind="letter"
                entryId={letter.id}
                clipKind="name"
                fallbackText={letter.nameSpokenText}
                label={'Hear ' + letter.nameEnglish}
              />
            </span>
          </div>
        ) : (
          <p className="memorise-hint small muted">Say it aloud, then tap for the detail</p>
        )}
      </motion.article>
    </div>
  );
}
