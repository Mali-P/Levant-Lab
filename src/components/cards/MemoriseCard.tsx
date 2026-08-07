import { useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import type { Flashcard } from '../../types';
import { wordForms } from '../../utils/wordForms';
import SpeakerButton from '../controls/SpeakerButton';
import { EngravedDivider } from '../ornament/Ornament';

export type MemoriseCardProps = {
  card: Flashcard;
  /** Showing the back, with every form spelled out. */
  flipped: boolean;
  showTransliteration: boolean;
  animationIntensity: number;
  reducedMotion: boolean;
  onFlip: () => void;
  onNext: () => void;
};

const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 480;

/**
 * One card in Memorise mode: English on the front, every Hebrew and Arabic
 * form on the back.
 *
 * Not `StudyCard`. That card exists to be answered — it carries typed fields,
 * a correct / retry swipe pair and the swipe hints that go with them. Here a
 * swipe only ever means "next", there is nothing to get wrong, and both sides
 * are read rather than recalled.
 */
export default function MemoriseCard(props: MemoriseCardProps) {
  const { card, flipped, reducedMotion } = props;
  const x = useMotionValue(0);

  const tilt = reducedMotion ? 0 : 9 * props.animationIntensity;
  const rotate = useTransform(x, [-220, 0, 220], [-tilt, 0, tilt]);
  const nextOpacity = useTransform(x, [-130, -40], [1, 0]);

  useEffect(() => {
    x.set(0);
  }, [card.id, x]);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) {
      props.onNext();
    }
    x.set(0);
  }

  const sides = [
    { language: 'hebrew' as const, label: 'Hebrew', side: card.hebrew },
    { language: 'arabic' as const, label: 'Levantine Arabic', side: card.arabic },
  ];

  return (
    <div className="card-stage">
      <div className="card-shadow deep" aria-hidden="true" />
      <div className="card-shadow" aria-hidden="true" />

      <motion.article
        className={'card memorise-card' + (flipped ? ' flipped' : '')}
        style={{ x, rotate }}
        drag={reducedMotion ? false : 'x'}
        dragElastic={0.5}
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
        transition={{ type: 'spring', stiffness: 460, damping: 36 }}
        // Tapping the card is the quick way to turn it over. The Flip button
        // below it is the same action for anyone on a keyboard or a screen
        // reader, so this stays a plain surface rather than a control.
        onClick={props.onFlip}
        aria-label={'Card: ' + card.english}
      >
        <motion.span
          className="swipe-hint left"
          style={{ opacity: nextOpacity }}
          aria-hidden="true"
        >
          Next
        </motion.span>

        {/* The catalogue label at the head of the tablet. It names the mode,
            not the card, so it stays put when the card is turned over. */}
        <div className="eyebrow memorise-eyebrow">Memorise</div>

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
                {/* Feminine first, then masculine — the order every other
                    surface reads a pair in. A word with one form for everyone
                    comes back as a single unmarked line. */}
                {wordForms(side).map((form) => (
                  <div className="memorise-form" key={form.gender ?? 'only'}>
                    <div className="grow">
                      <div className="form-line">
                        {form.marker && (
                          <span className="form-marker" aria-label={form.label}>
                            {form.marker}
                          </span>
                        )}
                        <span className={language}>{form.script}</span>
                      </div>

                      {props.showTransliteration && form.transliteration && (
                        <div className="translit">{form.transliteration}</div>
                      )}
                    </div>

                    {/* One button per form, so a gendered word can be heard
                        both ways rather than only in its headline form. The
                        card flips on tap, so the press must not reach it. */}
                    <span onClick={(event) => event.stopPropagation()}>
                      <SpeakerButton form={form} language={language} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="memorise-hint small muted">Tap to flip</p>
        )}
      </motion.article>
    </div>
  );
}
