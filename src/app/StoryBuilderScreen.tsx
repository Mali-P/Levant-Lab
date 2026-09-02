import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSettings } from '../stores/settingsStore';
import {
  buildAnswered,
  buildById,
  buildComplete,
  chooseAnswer,
  joinedEnglish,
  joinedStory,
  recordBuild,
  startBuild,
} from '../features/tellme/tellme';
import type { BuildQuestion } from '../constants/tellme';
import ScriptSides from '../components/cards/ScriptSides';
import ScreenHeader from '../components/controls/ScreenHeader';
import { EngravedDivider, LevantMotif } from '../components/ornament/Ornament';

/**
 * The story builder: four small questions, then the answers read back as one.
 *
 * This is the spec's "build from questions" mode. Each question is answered by
 * choosing among honest options — there is no wrong pick and nothing is
 * scored — and the moment all four are answered, the same four answers appear
 * again in their joined shapes: whole clauses, each carrying the connector it
 * needs to follow the one before. The point of the screen is that single
 * transformation, separate answers becoming one piece of speech.
 *
 * Answers may be changed at any time and the joined version simply redraws,
 * because seeing how one different choice ripples through the whole story is
 * half the lesson. The first completion of a build is counted on the settings
 * row; recombining afterwards is play, not new progress.
 */
export default function StoryBuilderScreen() {
  const { buildId = '' } = useParams();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);

  const build = buildById(buildId);
  const [state, setState] = useState(() => (build ? startBuild(build) : []));
  const [counted, setCounted] = useState(false);

  const complete = buildComplete(state);

  // The first time this visit completes the build, it is counted. Once per
  // visit rather than once ever: putting a story together again another day is
  // the exercise done again, and the hub's "built n so far" should say so.
  useEffect(() => {
    if (!complete || counted) return;
    setCounted(true);
    void update(recordBuild(settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  if (!build) {
    return (
      <div className="screen">
        <ScreenHeader title="Story not found" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This story builder is not in this build of the app.</p>
          <Link className="btn btn-primary" to="/tellme">
            Back to Tell Me About It
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader title={build.name} eyebrow="Build it from your answers" back />

      <p className="small muted">
        Answer the questions one at a time — any answer is right. When all{' '}
        {build.questions.length} are answered, your answers come back joined
        into one piece of speech. Change any answer and watch the story change
        with it.
      </p>

      <div className="stack">
        {build.questions.map((question, index) => (
          <QuestionPanel
            key={index}
            question={question}
            index={index}
            chosen={state[index]}
            onPick={(option) => setState(chooseAnswer(state, index, option))}
          />
        ))}
      </div>

      {!complete && (
        <p className="small muted">
          {buildAnswered(state)} of {build.questions.length} answered.
        </p>
      )}

      {complete && (
        <>
          <EngravedDivider />
          <section className="panel story-join">
            <span className="eyebrow">Your answers, said as one</span>
            <p className="english">
              <strong>{joinedEnglish(build, state)}</strong>
            </p>
            <div className="stack">
              {joinedStory(build, state).map((fragment, index) => (
                <div key={index} className="story-join-line">
                  <div className="small muted">{fragment.english}</div>
                  <ScriptSides card={fragment} />
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">Now tell it again</span>
            <p className="small muted">
              Read the joined version out loud, top to bottom, without stopping
              between the lines — that run is the skill this level teaches.
              Then, if you want it graded, take the same story into a free
              conversation and tell it there in your own words.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setState(startBuild(build))}
              >
                Start over
              </button>
              <Link className="btn btn-primary grow" to="/freetalk">
                Tell it for real
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** One question: the line asked of her, and every answer she may pick. */
function QuestionPanel({
  question,
  index,
  chosen,
  onPick,
}: {
  question: BuildQuestion;
  index: number;
  chosen: number | undefined;
  onPick: (option: number) => void;
}) {
  return (
    <section className="panel">
      <div className="eyebrow">Question {index + 1}</div>
      <div className="small muted">{question.ask.english}</div>
      <ScriptSides card={question.ask} />

      <div className="stack" style={{ gap: 6, marginTop: 8 }}>
        {question.answers.map((option, optionIndex) => (
          <button
            key={optionIndex}
            type="button"
            className={'btn btn-block' + (chosen === optionIndex ? ' btn-primary' : '')}
            aria-pressed={chosen === optionIndex}
            onClick={() => onPick(optionIndex)}
          >
            {option.said.english}
          </button>
        ))}
      </div>

      {chosen !== undefined && question.answers[chosen] && (
        <div className="stack" style={{ gap: 4, marginTop: 8 }}>
          <ScriptSides card={question.answers[chosen].said} />
        </div>
      )}
    </section>
  );
}
