import { useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import type { AlphabetDisplay, AlphabetScript } from '../../types/alphabet';
import type { LetterReviewEntry } from '../../features/memorise/letters';
import { handwrittenOf, printFormOf } from '../../features/alphabet/forms';
import { useFitToBox } from '../../hooks/useFitToBox';
import LetterGlyph from '../alphabet/LetterGlyph';
import LetterSpeaker from '../alphabet/LetterSpeaker';
import { EngravedDivider } from '../ornament/Ornament';

export type LetterReviewCardProps = {
  entry: LetterReviewEntry;
  /** Showing the back: the sound the letterforms make, spelled out. */
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
};

/**
 * The Memorise card's thresholds, because this is the Memorise card's gesture.
 * A swipe here only walks the pass — nothing on this card grades — so one that
 * has clearly been made should move the card rather than fall short and be
 * taken for a tap.
 */
const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 300;

const SCRIPT_LABEL: Record<AlphabetScript, string> = {
  hebrew: 'Hebrew',
  arabic: 'Arabic',
};

/**
 * One letter — or one letter written twice — read the way Review reads a word.
 *
 * The front is the letterform and nothing else: no romanisation, no name, no
 * sound. That is the whole exercise. A learner who can see "b" above ב is not
 * recognising ב, she is reading a caption, and the bare printed shape is
 * exactly what she has to be able to meet cold on a sign. So everything that
 * *answers* the shape — the sound, the description, the names, where the two
 * scripts have drifted — waits on the back.
 *
 * It is the reverse of the word card beside it in this tab, and deliberately:
 * a word is met in English and answered in script, a letter is met in script
 * and answered in English. Both are the direction the learner needs first.
 *
 * Not `PairCard`, which is the graded pair drill and puts the sound on the
 * front as its question. Nothing here is scored, so left and right are free to
 * mean only "next" and "back", as they do on every card that is read rather
 * than answered.
 */
export default function LetterReviewCard(props: LetterReviewCardProps) {
  const { entry, flipped, reducedMotion } = props;
  const x = useMotionValue(0);

  type Half = {
    script: AlphabetScript;
    letter: NonNullable<LetterReviewEntry['hebrew' | 'arabic']>;
  };

  const halves: Half[] = [];
  if (entry.hebrew) halves.push({ script: 'hebrew', letter: entry.hebrew });
  if (entry.arabic) halves.push({ script: 'arabic', letter: entry.arabic });

  /*
   * The same three bands as the word card beside it in this tab: Hebrew above
   * the meaning, Arabic below it. Stacked under one head the second script read
   * as an afterthought of the first, and here — where the two letterforms *are*
   * the question — that would say one of them is the real one. With the sound in
   * the middle each shape has the answer directly against it.
   *
   * An entry with only one script keeps its own side, Hebrew above and Arabic
   * below, rather than moving to the top because the other is absent.
   */
  const above = halves.filter(({ script }) => script === 'hebrew');
  const below = halves.filter(({ script }) => script !== 'hebrew');

  /*
   * `place` is spacing, not meaning: the block below the sound pads its upper
   * edge, the block above it pads its lower one, so the two letterforms stand
   * off the word by the same distance.
   */
  const renderHalf = ({ script, letter }: Half, place: 'above' | 'below') => {
    /* Inside a draggable card that flips on tap, so neither the press nor the
       click may reach it. */
    const speaker = (
      <span
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <LetterSpeaker
          script={script}
          entryKind="letter"
          entryId={letter.id}
          clipKind="name"
          fallbackText={letter.nameSpokenText}
          label={'Hear ' + letter.nameEnglish}
        />
      </span>
    );

    return (
    <div className={'answer-block ' + place} key={script}>
      {/* On the block's outer edge, as on the word card: over the head of the
          block above the sound, at the foot of the block below it, so the two
          buttons mirror each other around the middle of the card instead of one
          of them sitting in the gap that belongs to the meaning. */}
      {flipped && place === 'above' && (
        <div className="memorise-speakers">{speaker}</div>
      )}

      <div className={'lang-label ' + script + '-label'}>
        <span>{SCRIPT_LABEL[script]}</span>
      </div>

      <div className="letter-review-half">
        <LetterGlyph
          script={script}
          print={printFormOf(letter)}
          handwritten={handwrittenOf(letter)}
          display={props.display}
          size="lg"
        />

        {/* Everything that *answers* the shape waits on the back — the name,
            the reading, the note — so the front is the letterform and its
            language and nothing else. */}
        {flipped && (
          <>
            <div className="letter-review-name">
              <strong className="english">{letter.nameEnglish}</strong>
              {props.showTransliteration && (
                <span className="translit"> {letter.transliteration}</span>
              )}
            </div>

            <div className="small muted">{letter.commonSound}</div>

            {/* The Levantine reading, where the textbook one would mislead.
                Hebrew letters carry no such note. */}
            {'levantineNote' in letter && letter.levantineNote && (
              <div className="small muted">{letter.levantineNote}</div>
            )}

            {place === 'below' && speaker}
          </>
        )}
      </div>
    </div>
    );
  };

  /* Two letterforms, two names and a note always fit one face, because the face
     sets itself smaller until they do rather than running over its own edge. */
  const face = useFitToBox<HTMLElement>([entry.id, flipped, props.display]);

  /**
   * Whether the gesture in progress has turned into a drag, so the click the
   * browser fires at the end of a swipe does not turn the card over as well.
   * Cleared on the way down, so every new gesture starts life as a tap.
   */
  const dragged = useRef(false);

  const tilt = reducedMotion ? 0 : 9 * props.animationIntensity;
  const rotate = useTransform(x, [-220, 0, 220], [-tilt, 0, tilt]);
  // Left is forward, so the badges follow the hand, exactly as on the word card.
  const nextOpacity = useTransform(x, [-130, -40], [1, 0]);
  const backOpacity = useTransform(x, [40, 130], [0, 1]);

  useEffect(() => {
    x.set(0);
  }, [entry.id, x]);

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
        className={
          'card memorise-card letter-review-card' + (flipped ? ' flipped' : '')
        }
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
        // A tap turns the card over — a tap only, never the tail of a swipe.
        // The Flip button below is the same action for anyone on a keyboard or
        // a screen reader.
        onClick={(event) => {
          if (dragged.current) return;
          if ((event.target as HTMLElement).closest('button, a')) return;
          props.onFlip();
        }}
        aria-label={
          flipped
            ? 'Letter card: ' +
              halves.map(({ letter }) => letter.nameEnglish).join(' and ') +
              ', ' +
              entry.sound
            : 'Letter card, face down'
        }
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

        {/* Names the mode rather than the card, so it stays put on the flip. */}
        <div className="eyebrow memorise-eyebrow">Review</div>

        {/* The letterforms stay put when the card is turned over: the answer is
            about these shapes, so they must still be under the learner's eye
            while she reads it. What the flip adds is the sound between them,
            and each letter's name underneath its own shape. */}
        {above.map((half) => renderHalf(half, 'above'))}

        {/* A rule on each side of the middle band on both faces — they are what
            make the sound the centre of the card rather than its heading, and a
            rule that appeared on the flip would be the frame moving when only
            the answer should have. Each is drawn only where there is a block on
            its far side to divide from. */}
        {above.length > 0 && <EngravedDivider tone="card" />}

        {/*
          The middle band: the sound on the back, the instruction to say it on
          the front. The same slot either way, so the answer arrives where the
          learner was already looking rather than shunting the shapes apart.
        */}
        <div className="card-prompt">
          {flipped ? (
            <>
              {/* Where both scripts are on the card this is the reading they
                  share; where one is, it is that letter's own. */}
              <h2 className="word english">{entry.sound}</h2>
              <span className="small muted">{entry.description}</span>
            </>
          ) : (
            <p className="memorise-hint small muted">
              {halves.length === 1
                ? 'Say the sound it makes, then tap'
                : 'Say the sound they share, then tap'}
            </p>
          )}
        </div>

        {below.length > 0 && <EngravedDivider tone="card" />}
        {below.map((half) => renderHalf(half, 'below'))}

        {flipped && entry.note && (
          <p className="small muted pair-note">{entry.note}</p>
        )}
      </motion.article>
    </div>
  );
}
