import { useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import type { Flashcard, SpeechPerspective } from '../../types';
import type { PromptPlan } from '../../features/study/prompts';
import { wordForms, type WordForm } from '../../utils/wordForms';
import SpeakerButton from '../controls/SpeakerButton';
import Transliteration from './Transliteration';
import Icon from '../ornament/Icon';

export type StudyCardProps = {
  card: Flashcard;
  plan: PromptPlan;
  revealed: boolean;
  typed: boolean;
  values: { hebrew: string; arabic: string };
  /**
   * Which speaker/listener perspectives to reveal, female-speaker first. The
   * card leads with the learner's own form and shows nothing at all for a
   * perspective she has not enabled.
   */
  perspectives: readonly SpeechPerspective[];
  /**
   * Which half of a grammatical pair to reveal first, from the learner's
   * identity rather than from the perspective being asked for. Display only:
   * both halves are revealed either way, and grading never sees it.
   */
  lead?: 'feminine' | 'masculine';
  showTransliteration: boolean;
  animationIntensity: number;
  reducedMotion: boolean;
  onChange: (scores: 'hebrew' | 'arabic', value: string) => void;
  onReveal: () => void;
  onSpeak: (language: 'hebrew' | 'arabic') => void;
  onSwipeRight: () => void;
  /**
   * Steps back to the previous card. Absent where there is nothing to go back
   * to — the first card of a run, or a hard or brutal mode where a graded
   * answer is final — and the card then has no left swipe at all rather than a
   * left swipe that quietly does nothing.
   */
  onSwipeBack?: () => void;
};

const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 480;

export default function StudyCard(props: StudyCardProps) {
  const { card, plan, revealed, typed, values, reducedMotion } = props;
  const firstField = useRef<HTMLInputElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const tilt = reducedMotion ? 0 : 9 * props.animationIntensity;
  const rotate = useTransform(x, [-220, 0, 220], [-tilt, 0, tilt]);
  const acceptOpacity = useTransform(x, [40, 130], [0, 1]);
  const backOpacity = useTransform(x, [-130, -40], [1, 0]);

  useEffect(() => {
    x.set(0);
    y.set(0);
    if (typed) firstField.current?.focus();
  }, [card.id, typed, x, y]);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    const { offset, velocity } = info;

    if (offset.y < -SWIPE_DISTANCE && Math.abs(offset.x) < SWIPE_DISTANCE) {
      props.onReveal();
    } else if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) {
      props.onSwipeRight();
    } else if (
      props.onSwipeBack &&
      (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY)
    ) {
      props.onSwipeBack();
    }

    x.set(0);
    y.set(0);
  }

  const promptClass =
    plan.promptLanguage === 'english' ? 'english' : plan.promptLanguage;

  return (
    <div className="card-stage">
      <div className="card-shadow deep" aria-hidden="true" />
      <div className="card-shadow" aria-hidden="true" />

      <motion.article
        className="card"
        style={{ x, y, rotate }}
        drag={reducedMotion ? false : true}
        dragElastic={0.5}
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
        transition={{ type: 'spring', stiffness: 460, damping: 36 }}
        aria-label={'Card: ' + card.english}
      >
        <motion.span
          className="swipe-hint right"
          style={{ opacity: acceptOpacity }}
          aria-hidden="true"
        >
          Correct
        </motion.span>
        {/* Neutral, not the old red: going back is not a verdict on the card.
            It appears only when there is a card behind to go back to, so the
            gesture never advertises itself where it does nothing. */}
        {props.onSwipeBack && (
          <motion.span
            className="swipe-hint left neutral"
            style={{ opacity: backOpacity }}
            aria-hidden="true"
          >
            Back
          </motion.span>
        )}

        <div className="card-prompt">
          {plan.audio ? (
            <button
              type="button"
              className="btn"
              onClick={() => props.onSpeak(plan.audio!)}
            >
              <Icon name="speaker" /> Play the {plan.audio} word
            </button>
          ) : (
            <>
              {card.icon && (
                <span className="glyph" aria-hidden="true">
                  {card.icon}
                </span>
              )}
              <h2
                className={
                  'word ' +
                  promptClass +
                  (plan.promptLanguage === 'english' ? '' : ' script-prompt')
                }
              >
                {plan.promptText}
              </h2>
            </>
          )}
        </div>

        {plan.fields.map((field) => {
          // The reveal shows the language being asked for; the transliteration
          // line stays tied to the scored language, so an English answer field
          // still hints at the word it is standing in for.
          const answerSide = field.input === 'hebrew' ? card.hebrew : card.arabic;
          const revealForms: WordForm[] =
            field.input === 'english'
              ? [{ script: card.english, key: 'only' }]
              : wordForms(answerSide, props.perspectives, props.lead);
          const translitForms = wordForms(
            field.scores === 'hebrew' ? card.hebrew : card.arabic,
            props.perspectives,
            props.lead,
          );

          return (
          <div className="answer-block" key={field.scores}>
            <div
              className={
                'lang-label ' +
                (field.scores === 'hebrew' ? 'hebrew-label' : 'arabic-label')
              }
            >
              <span>{field.label}</span>
              {field.input !== 'english' && (
                // One button per form, so a gendered word can be heard both
                // ways rather than only in its headline form.
                <span className="speaker-row">
                  {translitForms.map((form) => (
                    <SpeakerButton
                      key={form.key}
                      form={form}
                      language={field.scores}
                    />
                  ))}
                </span>
              )}
            </div>

            {typed ? (
              <input
                ref={field === plan.fields[0] ? firstField : undefined}
                className={
                  'answer-input ' +
                  (field.input === 'english' ? 'english' : field.input) +
                  (field.input === 'arabic' ? ' arabic-input' : '')
                }
                value={values[field.scores]}
                onChange={(e) => props.onChange(field.scores, e.target.value)}
                dir={field.input === 'english' ? 'ltr' : 'rtl'}
                lang={field.input === 'english' ? 'en' : field.input === 'hebrew' ? 'he' : 'ar'}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label={field.label + ' answer'}
              />
            ) : (
              <div
                className={
                  'answer-reveal ' +
                  (field.input === 'english' ? 'english' : field.input)
                }
                aria-live="polite"
              >
                {revealed
                  ? revealForms.map((form) => (
                      <div className="form-line" key={form.key}>
                        {form.marker && (
                          <span className="form-marker" aria-label={form.label}>
                            {form.marker}
                          </span>
                        )}
                        <span>{form.script}</span>
                      </div>
                    ))
                  : '• • •'}
              </div>
            )}

            {revealed && props.showTransliteration && (
              // One element per form rather than one joined string, so every
              // word stays its own thing to hover. They sit on one line while
              // they fit and wrap onto a second when they do not.
              <div className="translit-lines">
                {translitForms
                  .filter((form) => form.transliteration)
                  .map((form) => (
                    <span className="translit-line" key={form.key}>
                      {form.marker && (
                        <span className="form-marker" aria-label={form.label}>
                          {form.marker}
                        </span>
                      )}
                      <Transliteration
                        text={form.transliteration!}
                        language={field.scores}
                      />
                    </span>
                  ))}
              </div>
            )}
          </div>
          );
        })}
      </motion.article>
    </div>
  );
}
