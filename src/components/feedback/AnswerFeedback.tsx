import type { Flashcard, LanguageSide } from '../../types';
import type { AnswerOutcome } from '../../features/study/engine';
import { wordForms } from '../../utils/wordForms';
import SpeakerButton from '../controls/SpeakerButton';
import Transliteration from '../cards/Transliteration';

type Props = {
  outcome: AnswerOutcome;
  card: Flashcard;
  onContinue: () => void;
};

/** The word the learner should have written, both forms when they differ. */
function Correction({
  title,
  side,
  language,
}: {
  title: string;
  side: LanguageSide;
  language: 'hebrew' | 'arabic';
}) {
  return (
    <div className="correction">
      <span className="eyebrow">{title}</span>
      {wordForms(side).map((form) => (
        <span className="form-line" key={form.gender ?? 'only'}>
          {form.marker && (
            <span className="form-marker" aria-label={form.label}>
              {form.marker}
            </span>
          )}
          <span className={language + ' script-lg'}>{form.script}</span>
          {form.transliteration && (
            <Transliteration text={form.transliteration} language={language} />
          )}
          <SpeakerButton form={form} language={language} />
        </span>
      ))}
    </div>
  );
}

/** Success and failure are stated in words and marks, never colour alone. */
function Verdict({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={'verdict ' + (ok ? 'pass' : 'fail')}>
      <span className="mark" aria-hidden="true">
        {ok ? '✓' : '✗'}
      </span>
      <span>
        {label} {ok ? 'correct' : 'incorrect'}
      </span>
    </div>
  );
}

function headlineFor(outcome: AnswerOutcome): string {
  switch (outcome.event) {
    case 'stage-complete':
      return 'Stage cleared';
    case 'full-deck-reached':
      return 'Full deck cleared';
    case 'round-reset':
      return 'Round failed';
    case 'round-ended':
      return 'Round over';
    case 'perfect-round':
      return 'Perfect round';
    case 'deck-mastered':
      return 'Deck mastered';
    case 'drill-complete':
      return 'Card cleared';
    default:
      return outcome.fullyCorrect ? 'Perfect.' : 'Not yet.';
  }
}

/**
 * The line under the verdict.
 *
 * It says where the ladder now stands, in words rather than as a fraction of
 * ten. A learner four cards into her first five has not scored 4/10, and a
 * sheet that told her so would be describing a test she is not sitting.
 */
function detailFor(outcome: AnswerOutcome): string | null {
  const s = outcome.session;
  const banked = s.perfectRounds + ' / ' + s.perfectRunsRequired;

  switch (outcome.event) {
    case 'stage-complete':
      return (
        'All ' +
        s.activeCardIds.length +
        ' recalled. Next: ' +
        (s.introduceCardIds.length === 1
          ? 'one more word'
          : s.introduceCardIds.length + ' more words') +
        ' to read.'
      );
    case 'full-deck-reached':
      return (
        'Every card in the deck recalled. Now ' +
        s.perfectRunsRequired +
        ' flawless rounds to master it.'
      );
    case 'round-reset':
      return (
        'The round ended there and has been dealt again. Perfect rounds: ' +
        banked
      );
    case 'round-missed':
      return (
        'This round can no longer be perfect, but your ' +
        banked +
        ' stand. That word will come back before the round ends.'
      );
    case 'round-ended':
      return (
        'Not a clean round, so it does not count — and nothing was taken away. Perfect rounds: ' +
        banked
      );
    case 'perfect-round':
      return 'Perfect rounds: ' + banked + '. Reshuffling.';
    case 'deck-mastered':
      return (
        s.perfectRunsRequired +
        ' perfect rounds over the whole deck. ' +
        s.answers.length +
        ' answers this session.'
      );
    case 'drill-complete':
      return 'Answered correctly in both Hebrew and Arabic.';
    case 'retry-queued':
      return 'It will come back, but not next.';
    default:
      return null;
  }
}

export default function AnswerFeedback({ outcome, card, onContinue }: Props) {
  const detail = detailFor(outcome);
  const showHebrewAnswer = !outcome.hebrewCorrect;
  const showArabicAnswer = !outcome.arabicCorrect;

  return (
    <div className="feedback" role="dialog" aria-modal="true" aria-label="Result">
      <div className="feedback-sheet">
        <div className="headline">{headlineFor(outcome)}</div>

        <Verdict label="Hebrew" ok={outcome.hebrewCorrect} />
        <Verdict label="Arabic" ok={outcome.arabicCorrect} />

        {showHebrewAnswer && (
          <Correction
            title="Correct Hebrew answer"
            side={card.hebrew}
            language="hebrew"
          />
        )}

        {showArabicAnswer && (
          <Correction
            title="Correct Arabic answer"
            side={card.arabic}
            language="arabic"
          />
        )}

        {detail && <p className="small muted">{detail}</p>}

        <button type="button" className="btn btn-primary btn-block" onClick={onContinue} autoFocus>
          Continue
        </button>
      </div>
    </div>
  );
}
