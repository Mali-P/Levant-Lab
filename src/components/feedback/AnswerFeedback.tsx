import type { Flashcard, LanguageSide } from '../../types';
import type { AnswerOutcome } from '../../features/study/engine';
import { wordForms } from '../../utils/wordForms';
import SpeakerButton from '../controls/SpeakerButton';

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
            <span className="translit">{form.transliteration}</span>
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
    case 'run-failed':
      return 'Run failed';
    case 'perfect-run':
      return 'Perfect run';
    case 'deck-mastered':
      return 'Deck mastered';
    case 'session-complete':
      return 'Deck complete';
    case 'retry-round':
      return 'Retry round';
    default:
      return outcome.fullyCorrect ? 'Perfect.' : 'Not yet.';
  }
}

function detailFor(outcome: AnswerOutcome): string | null {
  const s = outcome.session;
  switch (outcome.event) {
    case 'run-failed':
      return (
        'The deck has been reshuffled. Start again. Perfect run progress remains: ' +
        s.perfectRunsCompleted +
        ' / ' +
        s.perfectRunsRequired
      );
    case 'perfect-run':
      return (
        'Run ' + s.perfectRunsCompleted + ' of ' + s.perfectRunsRequired + ' complete.'
      );
    case 'deck-mastered':
      return (
        s.perfectRunsRequired +
        ' perfect runs. ' +
        s.answers.length +
        ' flawless answers.'
      );
    case 'session-complete':
      return 'Every card answered correctly in both languages.';
    case 'retry-round':
      return 'Starting the retry pile.';
    case 'retry-queued':
      return 'Added to the retry pile.';
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
