import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSettings } from '../stores/settingsStore';
import { recordStory } from '../features/tellme/tellme';
import { SHORT_STORIES, type StoryQuestion } from '../constants/tellme';
import ScriptSides from '../components/cards/ScriptSides';
import ScreenHeader from '../components/controls/ScreenHeader';
import { EngravedDivider, LevantMotif } from '../components/ornament/Ornament';

/**
 * One short story, listened to as a run, then asked about.
 *
 * Narrative listening in miniature. The lines are shown in the languages being
 * learned with a speaker apiece — played top to bottom they are the story told
 * once — and the English stays hidden until asked for, because the exercise is
 * following the connectors with the ear, not reading a translation. The
 * questions underneath are deliberately plain: where was she, why did she
 * sleep early. Answering one wrong costs nothing; it stays open until the
 * right answer is found, and the first time every question is answered right
 * the story is counted on the settings row.
 */
export default function ShortStoryScreen() {
  const { storyId = '' } = useParams();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);

  const story = SHORT_STORIES.find((entry) => entry.id === storyId);
  const [showEnglish, setShowEnglish] = useState(false);
  const [answers, setAnswers] = useState<(number | undefined)[]>(() =>
    story ? story.questions.map(() => undefined) : [],
  );
  const [counted, setCounted] = useState(false);

  const allRight = Boolean(
    story &&
      answers.length === story.questions.length &&
      story.questions.every((question, index) => answers[index] === question.correct),
  );

  // Counted the first time this visit gets every question right — listening
  // through again another day is the exercise done again.
  useEffect(() => {
    if (!allRight || counted) return;
    setCounted(true);
    void update(recordStory(settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRight]);

  if (!story) {
    return (
      <div className="screen">
        <ScreenHeader title="Story not found" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This story is not in this build of the app.</p>
          <Link className="btn btn-primary" to="/tellme">
            Back to Tell Me About It
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader title={story.name} eyebrow="Listen, then answer" back />

      <p className="small muted">
        Play the lines top to bottom — that is the story, told once. Listen for
        the joining words: they are what carry you from one sentence to the
        next. Read the English only if your ears need rescuing.
      </p>

      <div className="stack">
        {story.lines.map((line, index) => (
          <section className="panel" key={index}>
            <div className="eyebrow">Line {index + 1}</div>
            {showEnglish && <div className="small muted">{line.english}</div>}
            <ScriptSides card={line} />
          </section>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-block"
        aria-pressed={showEnglish}
        onClick={() => setShowEnglish((shown) => !shown)}
      >
        {showEnglish ? 'Hide the English' : 'Show the English'}
      </button>

      <EngravedDivider />
      <div className="eyebrow">Did it land?</div>

      <div className="stack">
        {story.questions.map((question, index) => (
          <QuestionPanel
            key={index}
            question={question}
            chosen={answers[index]}
            onPick={(option) =>
              setAnswers(answers.map((kept, at) => (at === index ? option : kept)))
            }
          />
        ))}
      </div>

      {allRight && (
        <section className="panel">
          <span className="eyebrow">All of it</span>
          <p className="small muted">
            Every question right — the story landed. That is what the joining
            words are for.
          </p>
          <Link className="btn btn-primary btn-block" to="/tellme">
            Back to Tell Me About It
          </Link>
        </section>
      )}
    </div>
  );
}

/**
 * One comprehension question. A wrong pick is marked and stays pickable —
 * not understanding is a reason to listen again, never a failure.
 */
function QuestionPanel({
  question,
  chosen,
  onPick,
}: {
  question: StoryQuestion;
  chosen: number | undefined;
  onPick: (option: number) => void;
}) {
  const right = chosen === question.correct;

  return (
    <section className="panel">
      <strong>{question.ask}</strong>
      <div className="stack" style={{ gap: 6, marginTop: 8 }}>
        {question.options.map((option, index) => (
          <button
            key={index}
            type="button"
            className={
              'btn btn-block' +
              (chosen === index ? (right ? ' btn-primary' : ' btn-danger') : '')
            }
            aria-pressed={chosen === index}
            onClick={() => onPick(index)}
          >
            {option}
          </button>
        ))}
      </div>
      {chosen !== undefined && !right && (
        <p className="small muted" style={{ marginTop: 6 }}>
          Not quite — listen to the story again and have another go.
        </p>
      )}
    </section>
  );
}
