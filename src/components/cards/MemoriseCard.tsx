import { useEffect, useState } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import {
  SPEECH_PERSPECTIVES,
  type Flashcard,
  type LanguageSide,
  type SpeechPerspective,
} from '../../types';
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
/**
 * The variants this card has that the learner is *not* currently studying.
 *
 * Compared by wording rather than by perspective, so a phrase whose ♂→♀ form
 * happens to be worded exactly like her ♀→♂ one contributes nothing to expand
 * — there would be no second thing to read.
 */
function otherForms(
  side: LanguageSide,
  selected: readonly SpeechPerspective[],
): WordForm[] {
  if (!side.speechForms) return [];
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
  const { card, flipped, perspectives, reducedMotion } = props;
  const x = useMotionValue(0);

  // Collapsed again on every new card: the learner asked to see the other
  // forms of *that* phrase, not to change how the deck reads from here on.
  const [showOthers, setShowOthers] = useState(false);
  useEffect(() => setShowOthers(false), [card.id]);

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
                {/* The forms she actually needs, female-speaker first — or,
                    where the phrase has no speaker/listener variants, the
                    grammatical pair feminine-first. A word with one form for
                    everyone comes back as a single unmarked line. */}
                {wordForms(side, perspectives).map((form) => (
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
                  className="btn btn-ghost small"
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
