import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSettings } from '../stores/settingsStore';
import {
  buildAnswered,
  buildById,
  buildComplete,
  chooseAnswer,
  joinedEnglish,
  joinedOpinion,
  recordOpinionBuild,
  startBuild,
} from '../features/opinions/opinions';
import type { BuildQuestion } from '../constants/opinions';
import ScriptSides from '../components/cards/ScriptSides';
import ScreenHeader from '../components/controls/ScreenHeader';
import { EngravedDivider, LevantMotif } from '../components/ornament/Ornament';

/**
 * The opinion builder: three small questions, then the answers read back as one.
 *
 * This is the spec's scaffolded "build an opinion". Each question is answered
 * by choosing among honest options — there is no wrong pick and nothing is
 * scored — and the moment all three are answered, the same three answers appear
 * again in their joined shapes: whole clauses, each carrying the connector it
 * needs to follow the one before. The point of the screen is that single
 * transformation, three separate replies becoming one thing you could say and
 * mean.
 *
 * The third question is what makes it an opinion rather than a verdict. "I like
 * it" is a reaction; "I like it because the coffee is good, but I think it is
 * expensive" is something somebody could argue with, which is the level's whole
 * subject.
 *
 * Answers may be changed at any time and the joined version simply redraws,
 * because seeing how one different choice ripples through the whole thing is
 * half the lesson. The first completion of a build is counted on the settings
 * row; recombining afterwards is play, not new progress.
 */
export default function OpinionBuilderScreen() {
  const { buildId = '' } = useParams();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);

  const build = buildById(buildId);
  const [state, setState] = useState(() => (build ? startBuild(build) : []));
  const [counted, setCounted] = useState(false);

  const complete = buildComplete(state);

  // The first time this visit completes the build, it is counted. Once per
  // visit rather than once ever: putting an opinion together again another day
  // is the exercise done again, and the hub's "built n so far" should say so.
  useEffect(() => {
    if (!complete || counted) return;
    setCounted(true);
    void update(recordOpinionBuild(settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  if (!build) {
    return (
      <div className="screen">
        <ScreenHeader title="Opinion not found" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This opinion builder is not in this build of the app.</p>
          <Link className="btn btn-primary" to="/opinions">
            Back to Opinions &amp; Reasons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader title={build.name} eyebrow="Build it from your answers" back />

      <p className="small muted">
        Answer the questions one at a time — every answer is right, because
        these are opinions. When all {build.questions.length} are answered,
        your answers come back joined into one whole opinion. Change any answer
        and watch the opinion change with it.
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
            <span className="eyebrow">Your answers, said as one opinion</span>
            <p className="english">
              <strong>{joinedEnglish(build, state)}</strong>
            </p>
            <div className="stack">
              {joinedOpinion(build, state).map((fragment, index) => (
                <div key={index} className="story-join-line">
                  <div className="small muted">{fragment.english}</div>
                  <ScriptSides card={fragment} />
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">Now say it as though you meant it</span>
            <p className="small muted">
              Read the joined version out loud, top to bottom, without stopping
              between the lines — that run is the skill this level teaches.
              Then, if you want somebody to answer back, take the same opinion
              into a free conversation and defend it there.
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
                Argue it for real
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
            className={
              'btn btn-block' + (chosen === optionIndex ? ' btn-primary' : '')
            }
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
