import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import type { AlphabetDisplay, ArabicLetter, HebrewLetter } from '../../types/alphabet';
import type { LetterPair } from '../../data/alphabets';
import { handwrittenOf, printFormOf } from '../../features/alphabet/forms';
import { useFitToBox } from '../../hooks/useFitToBox';
import LetterGlyph from './LetterGlyph';
import LetterSpeaker from './LetterSpeaker';
import Tip from '../controls/Tip';
import Icon from '../ornament/Icon';
import { EngravedDivider } from '../ornament/Ornament';

type Props = {
  pair: LetterPair;
  hebrew?: HebrewLetter;
  arabic?: ArabicLetter;
  /** Showing the answer: both letterforms, their names and their sounds. */
  revealed: boolean;
  display: AlphabetDisplay;
  showTransliteration: boolean;
  animationIntensity: number;
  reducedMotion: boolean;
  onReveal: () => void;
  /** Swiped right: both halves known. */
  onSwipeRight: () => void;
};

/** The study card's thresholds, because this is the study card's gesture. */
const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 480;

/**
 * One sound, written twice — the study card, with letters where the words go.
 *
 * The front asks in the scripts themselves — ב above ب, one rule between them —
 * and the back answers with the two names, the prose about them a press away
 * behind an (i). That is the whole argument for the Both module: a learner who
 * meets ב and ب on separate screens learns two unrelated shapes, and a learner
 * who meets them on one card learns that they are the same letter wearing
 * different clothes.
 *
 * The letterforms stay on the face when the card is turned over, because the
 * answer is about them; only the words underneath change.
 *
 * It behaves exactly like a vocabulary card, deliberately. Swipe up to reveal,
 * swipe right for both correct, and the four-way grade underneath for anything
 * short of that. A learner should not have to work out what a card is before
 * they know what their thumb does.
 *
 * No left swipe: this run gates the next deck, and a run you can rewind is not
 * a run.
 */
export default function PairCard(props: Props) {
  const { pair, hebrew, arabic, revealed, reducedMotion } = props;
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  /* Two letterforms, two names and a note always fit one face, because the face
     sets itself smaller until they do rather than running over its own edge. */
  const face = useFitToBox<HTMLElement>([pair.id, revealed, props.display]);

  /**
   * Whether the gesture in progress has turned into a drag, so the click the
   * browser fires at the end of a swipe does not turn the card over as well.
   * Cleared on the way down, so every new gesture starts life as a tap.
   */
  const dragged = useRef(false);

  const tilt = reducedMotion ? 0 : 9 * props.animationIntensity;
  const rotate = useTransform(x, [-220, 0, 220], [-tilt, 0, tilt]);
  const acceptOpacity = useTransform(x, [40, 130], [0, 1]);

  useEffect(() => {
    x.set(0);
    y.set(0);
  }, [pair.id, x, y]);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    const { offset, velocity } = info;

    if (offset.y < -SWIPE_DISTANCE && Math.abs(offset.x) < SWIPE_DISTANCE) {
      props.onReveal();
    } else if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) {
      props.onSwipeRight();
    }

    x.set(0);
    y.set(0);
  }

  const halves: Array<{
    script: 'hebrew' | 'arabic';
    letter: HebrewLetter | ArabicLetter;
  }> = [];
  if (hebrew) halves.push({ script: 'hebrew', letter: hebrew });
  if (arabic) halves.push({ script: 'arabic', letter: arabic });

  /*
   * Hebrew above the rule, Arabic below it.
   *
   * The two letterforms used to sit side by side, on the argument that ב and ب
   * read as one fact when they share a line. On a phone they did not: two
   * columns of Semitic script left each shape half a card wide, so the letters
   * — the one thing this card exists to teach — were the smallest they are
   * anywhere in the app, and the answers underneath were stacked anyway, which
   * asked the learner to read across the question and down the answer. Stacked,
   * each shape has the width of the card to itself.
   *
   * A pair with only one script keeps its own side, Arabic below rather than
   * moved to the top because Hebrew is absent.
   */
  const above = halves.filter(({ script }) => script === 'hebrew');
  const below = halves.filter(({ script }) => script !== 'hebrew');

  /*
   * `place` is spacing, not meaning: the block below the rule pads its upper
   * edge, the block above it pads its lower one, so the two letterforms stand
   * off it by the same distance.
   */
  const renderHalf = (
    { script, letter }: (typeof halves)[number],
    place: 'above' | 'below',
  ) => {
    /* Inside a draggable card that reveals on tap, so neither the press nor the
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
        <div className={'lang-label ' + script + '-label'}>
          <span>{script === 'hebrew' ? 'Hebrew' : 'Arabic'}</span>
        </div>

        <div className="letter-half">
          {/* The button beside the letterform rather than at the block's outer
              edge. The two used to mirror each other around the sound in the
              middle of the card; with the sound gone there is nothing to mirror
              around, and a button on its own above the Hebrew label read as the
              card's control rather than that letter's. Here it is unmistakably
              the shape's own — press it and hear this letter. */}
          <div className={'letter-glyph-row' + (revealed ? ' with-speaker' : '')}>
            <LetterGlyph
              script={script}
              print={printFormOf(letter)}
              handwritten={handwrittenOf(letter)}
              display={props.display}
              size="lg"
            />

            {revealed && speaker}
          </div>

          {/* The name is the answer, so it arrives with the reveal; how the
              letter is sounded, and how the Levant actually says it, wait one
              step further behind the (i). */}
          {revealed && (
            <div className="letter-half-name">
              <strong className="english">{letter.nameEnglish}</strong>
              {props.showTransliteration && (
                <span className="translit"> {letter.transliteration}</span>
              )}{' '}
              <Tip
                className="info-tip"
                label={'About ' + letter.nameEnglish}
                content={
                  <>
                    <span className="tip-line">{letter.commonSound}</span>
                    {/* The Levantine reading, where the textbook one would
                        mislead. Hebrew letters carry no such note. */}
                    {'levantineNote' in letter && letter.levantineNote && (
                      <span className="tip-line">{letter.levantineNote}</span>
                    )}
                    {/* Where the two have drifted apart, or what an Arabic-only
                        letter branched off. It was behind the sound's own (i)
                        while there was a sound in the middle; with the middle
                        gone it belongs to both letters, so both marks carry it
                        and either one answers the question it settles. */}
                    {pair.note && <span className="tip-line">{pair.note}</span>}
                  </>
                }
              >
                <Icon name="info" />
              </Tip>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="card-stage">
      <div className="card-shadow deep" aria-hidden="true" />
      <div className="card-shadow" aria-hidden="true" />

      <motion.article
        ref={face}
        className={'card pair-card' + (revealed ? ' revealed' : ' tappable')}
        style={{ x, y, rotate }}
        drag={!reducedMotion}
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
        /* A tap turns the card over, as it does on every other letter card. The
           swipe up still does the same thing; this is the gesture a learner
           arrives with, and a card that only answered to a swipe they had not
           been told about read as a card with nothing on the back. */
        onClick={(event) => {
          if (dragged.current || revealed) return;
          if ((event.target as HTMLElement).closest('button, a')) return;
          props.onReveal();
        }}
        aria-label={
          'Letter pair card: ' +
          (revealed
            ? halves.map(({ letter }) => letter.nameEnglish).join(' and ')
            : 'letterforms, face down')
        }
      >
        <motion.span
          className="swipe-hint right"
          style={{ opacity: acceptOpacity }}
          aria-hidden="true"
        >
          Correct
        </motion.span>

        {/* The letterforms stay put when the card is turned over: the answer is
            about these shapes, so they have to be under the learner's eye while
            she reads it. What the reveal adds is each letter's name under its
            own shape, and the prose behind the marks. */}
        {above.map((half) => renderHalf(half, 'above'))}

        {/* One rule between the two scripts, and nothing on it.

            The sound they share used to be set here, between a pair of rules,
            as the middle band the word cards read on. On those cards the middle
            is the English — the one thing the two scripts have in common that
            neither of them says. Here it was neither: each letter's own reading
            is already under its own shape, so "w / o / u" in the middle was the
            two halves' answer stated a third time, and it cost the letterforms
            the height it took. What the rule has to do is separate them, which
            it does on its own. */}
        {above.length > 0 && below.length > 0 && <EngravedDivider tone="card" />}

        {below.map((half) => renderHalf(half, 'below'))}
      </motion.article>
    </div>
  );
}
