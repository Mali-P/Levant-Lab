import { useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import type { Flashcard, SpeechPerspective } from '../../types';
import type { PromptPlan } from '../../features/study/prompts';
import { useFitToBox } from '../../hooks/useFitToBox';
import { sentenceCase } from '../../utils/textCase';
import { wordForms, type WordForm } from '../../utils/wordForms';
import SpeakerButton from '../controls/SpeakerButton';
import Transliteration from './Transliteration';
import Icon from '../ornament/Icon';
import { EngravedDivider } from '../ornament/Ornament';

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

  /**
   * Whether the gesture in progress has turned into a drag. The browser fires a
   * click at the end of a drag as well as at the end of a tap, so without this
   * every swipe would also turn the card over. Cleared on the way down, so each
   * new gesture starts life as a tap.
   */
  const dragged = useRef(false);

  /**
   * A tap turns the card over, the same as the swipe up does.
   *
   * The gesture was swipe-up alone, which is fine once you know it and invisible
   * until you do — and the reading cards have flipped on tap all along, so a
   * learner moving from Review to Practice found the thing they had been tapping
   * for a hundred cards had stopped answering. A card being typed into is left
   * out: there the tap belongs to the field, and the answer is submitted rather
   * than revealed.
   */
  const tapToReveal = !typed && !revealed;

  /**
   * The card never scrolls. A long sentence in two languages, each with two
   * forms and a transliteration under it, used to run over the card's bottom
   * edge — and what fell off was the last line of the last block, which is the
   * Arabic transliteration the learner most needs. So the face sets itself
   * smaller until it fits instead of hiding the end of itself.
   */
  /*
   * And the other way for a card asking after one language rather than two. It
   * has one answer block where the full card has two, so the sizes chosen for
   * the full card leave the script standing in the middle of a half-empty face.
   * Only once revealed: before that the block is a row of dots, and fitting the
   * face to those would set the prompt like a poster and then drop it the moment
   * the answer arrived.
   */
  const face = useFitToBox<HTMLElement>(
    [card.id, revealed, typed, plan.promptText, plan.fields.length],
    revealed && !typed && plan.fields.length === 1,
  );

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

  /*
   * A whole sentence set at the size of the word "one" takes three lines of a
   * card that has four to give, and every one of them comes out of the answer
   * it is asking for. The prompt is the part the learner already understands,
   * so it is the part that gives way: the longer it is, the smaller it is set.
   * The thresholds are lengths, not line counts, because the line count depends
   * on a width this component does not know.
   */
  const promptSize =
    plan.promptText.length > 34
      ? ' word-longer'
      : plan.promptText.length > 18
        ? ' word-long'
        : '';

  /*
   * The same axis as the reading cards: Hebrew above the English, Arabic below
   * it. An English prompt is the meaning, and the meaning is the middle of
   * every card in this app — stacked under one head, the second script read as
   * an afterthought of the first. A script or audio prompt stays at the head of
   * the card instead, because there the prompt is the question rather than the
   * meaning, and a question belongs before its answers.
   */
  const split = plan.promptLanguage === 'english' && !plan.audio;
  const aboveFields = split
    ? plan.fields.filter((field) => field.scores === 'hebrew')
    : [];
  const belowFields = split
    ? plan.fields.filter((field) => field.scores !== 'hebrew')
    : plan.fields;

  /* One language's block: label, answer — typed or revealed — romanisation,
     play. `place` is spacing, not meaning: the block above an English prompt
     closes with a rule at its foot rather than opening with one at its head,
     so the two scripts stand off the meaning by the same distance. */
  const renderField = (
    field: (typeof plan.fields)[number],
    place?: 'above',
  ) => {
    // The reveal shows the language being asked for; the transliteration
    // line stays tied to the scored language, so an English answer field
    // still hints at the word it is standing in for.
    const answerSide = field.input === 'hebrew' ? card.hebrew : card.arabic;
    const revealForms: WordForm[] =
      field.input === 'english'
        ? [{ script: sentenceCase(card.english), key: 'only' }]
        : wordForms(answerSide, props.perspectives, props.lead);
    const translitForms = wordForms(
      field.scores === 'hebrew' ? card.hebrew : card.arabic,
      props.perspectives,
      props.lead,
    );

    return (
      <div
        className={'answer-block' + (place === 'above' ? ' above' : '')}
        key={field.scores}
      >
        <div
          className={
            'lang-label ' +
            (field.scores === 'hebrew' ? 'hebrew-label' : 'arabic-label')
          }
        >
          <span>{field.label}</span>
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

        {/*
          The last line of the block, under the word and its romanisation
          rather than between the label and the answer. A control sitting
          above the thing it plays cut the block in two and pushed the
          script off the middle of the card; at the foot it closes the block
          instead, and the reading runs label, word, romanisation, play.

          One button per form, so a gendered word can be heard both ways
          rather than only in its headline form.
        */}
        {field.input !== 'english' && (
          <div className="speaker-row answer-speakers">
            {translitForms.map((form) => (
              <SpeakerButton
                key={form.key}
                form={form}
                language={field.scores}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card-stage">
      <div className="card-shadow deep" aria-hidden="true" />
      <div className="card-shadow" aria-hidden="true" />

      <motion.article
        ref={face}
        className={
          'card' +
          (tapToReveal ? ' tappable' : '') +
          // The three-band face: the engraved rules either side of the prompt
          // are the separation, so the blocks give up their own hairlines.
          (split ? ' banded' : '')
        }
        style={{ x, y, rotate }}
        /*
         * Both axes throughout. Dragging on both makes framer set
         * `touch-action: none`, which used to matter because it took the card's
         * own scrolling away — but the card has no scrolling to lose now, so
         * the swipe-up reveal stays available on a revealed card too rather
         * than the gesture changing under the learner's finger mid-card.
         */
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
        onClick={(event) => {
          if (dragged.current || !tapToReveal) return;
          // The card's own controls — the play button on a listening prompt, the
          // speaker beside a label — are pressed, not tapped through.
          if ((event.target as HTMLElement).closest('button, input, a')) return;
          props.onReveal();
        }}
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

        {aboveFields.length > 0 && (
          <>
            {aboveFields.map((field) => renderField(field, 'above'))}
            <EngravedDivider tone="card" />
          </>
        )}

        <div className="card-prompt">
          {plan.audio ? (
            <button
              type="button"
              className="btn btn-compact"
              onClick={() => props.onSpeak(plan.audio!)}
            >
              {/* The language is a proper noun, so it keeps its capital where
                  the rest of the sentence does not: "Play the Arabic word". */}
              <Icon name="speaker" /> Play the {sentenceCase(plan.audio)} word
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
                  (plan.promptLanguage === 'english' ? '' : ' script-prompt') +
                  promptSize
                }
              >
                {plan.promptLanguage === 'english'
                  ? sentenceCase(plan.promptText)
                  : plan.promptText}
              </h2>
            </>
          )}
        </div>

        {/* Each rule is drawn only where there is a block on its far side to
            divide from, so a run with one language switched off ends at the
            English rather than on a hanging line. */}
        {split && belowFields.length > 0 && <EngravedDivider tone="card" />}
        {belowFields.map((field) => renderField(field))}
      </motion.article>
    </div>
  );
}
