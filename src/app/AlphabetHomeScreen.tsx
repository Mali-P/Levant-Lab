import { Link, Navigate, useParams } from 'react-router-dom';
import type { AlphabetScript } from '../types/alphabet';
import { SCRIPT_LABEL, alphabetCounts, lettersFor } from '../data/alphabets';
import { needsReview, summarise } from '../features/alphabet/progress';
import { useAlphabet } from '../stores/alphabetStore';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon, { type IconName } from '../components/ornament/Icon';

const MODES: {
  key: string;
  icon: IconName;
  title: string;
  description: string;
  to: string;
}[] = [
  {
    key: 'learn',
    icon: 'codex',
    title: 'Learn',
    description: 'Meet every letter, its sound and its forms',
    to: 'letters',
  },
  {
    key: 'practise',
    icon: 'target',
    title: 'Practise',
    description: 'Recognition, matching and quizzes',
    to: 'practise',
  },
  {
    key: 'listen',
    icon: 'ear',
    title: 'Listen',
    description: 'Hear a letter and pick it out',
    to: 'practise?mode=listen',
  },
  {
    key: 'write',
    icon: 'stylus',
    title: 'Write',
    description: 'Tracing and free writing',
    to: 'practise?mode=write',
  },
  {
    key: 'order',
    icon: 'chisel',
    title: 'In order',
    description: 'Drag the letters you know into alphabet order',
    to: 'order',
  },
  {
    key: 'progress',
    icon: 'columns',
    title: 'Progress overview',
    description: 'What is introduced, what is mastered, what needs work',
    to: 'progress',
  },
] as const;

export default function AlphabetHomeScreen() {
  const { script } = useParams<{ script: string }>();
  const rows = useAlphabet((s) => s.progress);

  if (script !== 'hebrew' && script !== 'arabic') {
    return <Navigate to="/alphabets" replace />;
  }
  const alphabet = script as AlphabetScript;

  const letters = lettersFor(alphabet);
  const progress = Object.fromEntries(
    Object.values(rows)
      .filter((row) => row.script === alphabet)
      .map((row) => [row.letterId, row]),
  );
  const summary = summarise(letters, progress);
  const counts = alphabetCounts(alphabet);
  const mistakes = needsReview(letters, progress);

  // The one row drawn as the recommended move, the way the deck picker leads
  // with Normal. Before any letter has been met the only honest suggestion is
  // to meet them; after that it is to be asked about them.
  const lead = summary.introduced === 0 ? 'learn' : 'practise';

  return (
    <div className="screen">
      <ScreenHeader
        title={SCRIPT_LABEL[alphabet]}
        eyebrow={counts.letters + ' letters'}
        back
      />

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
      </div>

      <h2 className="section-title">How do you want to study?</h2>

      <div className="mode-choices">
        {MODES.map((mode) => (
          <Link
            key={mode.key}
            className={'mode-choice' + (mode.key === lead ? ' lead' : '')}
            to={'/alphabet/' + alphabet + '/' + mode.to}
          >
            <span className="mode-choice-icon" aria-hidden="true">
              <Icon name={mode.icon} />
            </span>
            <span className="grow">
              <span className="mode-choice-name">{mode.title}</span>
              <span className="small muted">{mode.description}</span>
            </span>
            <span className="mode-choice-go" aria-hidden="true">
              <Icon name="forward" />
            </span>
          </Link>
        ))}

        {/* Shown only once there is something in it. An empty "review your
            mistakes" is a promise of work that does not exist. */}
        {mistakes.length > 0 && (
          <Link
            className="mode-choice"
            to={'/alphabet/' + alphabet + '/practise/recognise/mistakes'}
          >
            <span className="mode-choice-icon" aria-hidden="true">
              <Icon name="flame" />
            </span>
            <span className="grow">
              <span className="mode-choice-name">Review mistakes</span>
              <span className="small muted">
                {mistakes.length} letters you have missed, worst first
              </span>
            </span>
            <span className="mode-choice-go" aria-hidden="true">
              <Icon name="forward" />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
