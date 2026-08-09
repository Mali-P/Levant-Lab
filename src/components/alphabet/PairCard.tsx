import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import type { AlphabetDisplay, ArabicLetter, HebrewLetter } from '../../types/alphabet';
import type { LetterPair } from '../../data/alphabets';
import { handwrittenOf, printFormOf } from '../../features/alphabet/forms';
import { useFitToBox } from '../../hooks/useFitToBox';
import LetterGlyph from './LetterGlyph';
import LetterSpeaker from './LetterSpeaker';

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
 * The front asks in the scripts themselves — ב beside ب, as large as the face
 * allows — and the back answers with the sound, the two names and where the
 * readings have drifted. That is the whole argument for the Both module: a
 * learner who meets ב and ب on separate screens learns two unrelated shapes,
 * and a learner who meets them side by side on one card learns that they are
 * the same letter wearing different clothes.
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

  return (
    <div className="card-stage">
      <div className="card-shadow deep" aria-hidden="true" />
      <div className="card-shadow" aria-hidden="true" />

      <motion.article
        ref={face}
        className={'card pair-card' + (revealed ? ' revealed' : '')}
        style={{ x, y, rotate }}
        drag={!reducedMotion}
        dragElastic={0.5}
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
        transition={{ type: 'spring', stiffness: 460, damping: 36 }}
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

        {/* The question, and it stays put: the shared sound, then both
            letterforms side by side and as large as the face will allow. The
            sound sits with the letters rather than at the top of the card, so
            it holds them together as one letter instead of floating away from
            them; the description and the two names wait inside. */}
        <div className="card-prompt pair-prompt-block">
          <div className="sound-hint">{pair.sound}</div>

          <div className="pair-prompt">
            {halves.map(({ script, letter }) => (
              <div className="pair-prompt-half" key={script}>
                <LetterGlyph
                  script={script}
                  print={printFormOf(letter)}
                  handwritten={handwrittenOf(letter)}
                  display={props.display}
                  size="lg"
                />
                <span className="eyebrow">
                  {script === 'hebrew' ? 'Hebrew' : 'Arabic'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {revealed ? (
          <div className="answer-block pair-answers">
            {/* The sound itself is already on the face, above the letters, so
                the back opens with what it is rather than repeating it. */}
            <div className="pair-sound">
              <span className="small muted">{pair.description}</span>
            </div>

            {halves.map(({ script, letter }) => (
              <div className="pair-half" key={script}>
                <div className={'lang-label ' + script + '-label'}>
                  <span>{script === 'hebrew' ? 'Hebrew' : 'Arabic'}</span>
                  {/* Inside a draggable card, so the press must not be read as
                      the start of a swipe. */}
                  <span onPointerDown={(event) => event.stopPropagation()}>
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

                <div className="pair-half-body">
                  <span className="grow">
                    <strong className="english">{letter.nameEnglish}</strong>
                    {props.showTransliteration && (
                      <span className="translit"> {letter.transliteration}</span>
                    )}
                    <div className="small muted">{letter.commonSound}</div>
                  </span>
                </div>
              </div>
            ))}

            {/* Where the two have drifted apart, or what an Arabic-only letter
                branched off. It belongs on the face of the card: a learner
                reading ט against ط needs to know now, not later, that only one
                of them is still emphatic. */}
            {pair.note && <p className="small muted pair-note">{pair.note}</p>}
          </div>
        ) : (
          <p className="memorise-hint small muted">
            {halves.length === 1
              ? 'Name the letter and its sound, then swipe up'
              : 'Name both letters and the sound they share, then swipe up'}
          </p>
        )}
      </motion.article>
    </div>
  );
}
