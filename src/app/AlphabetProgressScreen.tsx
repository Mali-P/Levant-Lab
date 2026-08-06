import { Link, Navigate, useParams } from 'react-router-dom';
import type { AlphabetScript, AlphabetSkill } from '../types/alphabet';
import { SCRIPT_LABEL, isHebrewLetter, lettersFor } from '../data/alphabets';
import {
  needsReview,
  requiredSkills,
  skillScore,
  summarise,
} from '../features/alphabet/progress';
import { useAlphabet } from '../stores/alphabetStore';
import ScreenHeader from '../components/controls/ScreenHeader';

const SKILL_LABEL: Record<AlphabetSkill, string> = {
  typedRecognition: 'Typed recognition',
  handwrittenRecognition: 'Handwritten recognition',
  listeningRecognition: 'Listening',
  writingAccuracy: 'Writing',
  contextualFormRecognition: 'Connected forms',
};

const SKILL_ORDER: AlphabetSkill[] = [
  'typedRecognition',
  'handwrittenRecognition',
  'listeningRecognition',
  'writingAccuracy',
  'contextualFormRecognition',
];

const percent = (value: number) => Math.round(value * 100) + '%';

/**
 * Progress per skill rather than per letter.
 *
 * Splitting the bars is the whole point: a learner who has only ever seen
 * printed letters should see listening and writing sitting at zero, instead of
 * one blended number that tells them they know the alphabet.
 */
export default function AlphabetProgressScreen() {
  const { script } = useParams<{ script: string }>();
  const rows = useAlphabet((s) => s.progress);

  if (script !== 'hebrew' && script !== 'arabic') {
    return <Navigate to="/alphabets" replace />;
  }
  const alphabet: AlphabetScript = script;
  const letters = lettersFor(alphabet);
  const progress = Object.fromEntries(
    Object.values(rows)
      .filter((row) => row.script === alphabet)
      .map((row) => [row.letterId, row]),
  );

  const summary = summarise(letters, progress);
  const review = needsReview(letters, progress);

  // Averaged only over the letters that actually offer the skill, so an absent
  // handwriting asset cannot drag a bar down.
  const perSkill = SKILL_ORDER.map((skill) => {
    const applicable = letters.filter((letter) =>
      requiredSkills(letter).includes(skill),
    );
    if (applicable.length === 0) return { skill, value: 0, applicable: 0 };
    const total = applicable.reduce((sum, letter) => {
      const row = progress[letter.id];
      return sum + (row ? skillScore(row, skill) : 0);
    }, 0);
    return { skill, value: total / applicable.length, applicable: applicable.length };
  }).filter((entry) => entry.applicable > 0);

  return (
    <div className="screen">
      <ScreenHeader title="Progress" eyebrow={SCRIPT_LABEL[alphabet]} back />

      <div className="panel">
        <div className="panel-row">
          <span>Letters introduced</span>
          <strong>
            {summary.introduced} / {summary.total}
          </strong>
        </div>
        <div className="panel-row">
          <span>Letters mastered</span>
          <strong>
            {summary.mastered} / {summary.total}
          </strong>
        </div>
        <div className="panel-row">
          <span>Overall confidence</span>
          <strong>{percent(summary.averageConfidence)}</strong>
        </div>
        <div className="panel-row">
          <span>Answers missed</span>
          <strong>{summary.incorrectTotal}</strong>
        </div>
      </div>

      <section>
        <h2 className="section-title">By skill</h2>
        <div className="panel">
          {perSkill.map((entry) => (
            <div key={entry.skill} className="skill-row">
              <div className="panel-row">
                <span>{SKILL_LABEL[entry.skill]}</span>
                <strong>{percent(entry.value)}</strong>
              </div>
              <div
                className="bar"
                role="progressbar"
                aria-valuenow={Math.round(entry.value * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={SKILL_LABEL[entry.skill]}
              >
                <span style={{ width: percent(entry.value) }} />
              </div>
            </div>
          ))}
        </div>
        {perSkill.every((entry) => entry.skill !== 'handwrittenRecognition') && (
          <p className="small muted">
            Handwritten recognition is not scored yet: no handwritten
            letterforms have been added for this alphabet.
          </p>
        )}
      </section>

      <section>
        <h2 className="section-title">Needs review</h2>
        {review.length === 0 ? (
          <p className="small muted">
            Nothing to review. Letters you get wrong will collect here.
          </p>
        ) : (
          <div className="list">
            {review.slice(0, 12).map((letter) => (
              <Link
                key={letter.id}
                className="list-item"
                to={'/alphabet/' + alphabet + '/letter/' + letter.id}
              >
                <span className={'glyph ' + alphabet} dir="rtl">
                  {isHebrewLetter(letter) ? letter.printForm : letter.forms.isolated}
                </span>
                <span className="grow">
                  <strong>{letter.nameEnglish}</strong>
                  <div className="small muted">
                    missed {progress[letter.id]?.incorrectCount ?? 0} time(s)
                  </div>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
