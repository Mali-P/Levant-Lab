import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSettings } from '../stores/settingsStore';
import {
  EMPTY_STAND,
  chosenPosition,
  giveReason,
  recordStand,
  standAnswer,
  standById,
  standComplete,
  standEnglish,
  takePosition,
  type StandState,
} from '../features/opinions/opinions';
import ScriptSides from '../components/cards/ScriptSides';
import ScreenHeader from '../components/controls/ScreenHeader';
import { EngravedDivider, LevantMotif } from '../components/ornament/Ornament';

/**
 * Taking a position on something, and saying why.
 *
 * The spec's "agree or disagree", "explain your choice" and "compare two
 * things" in one screen, because they are one exercise: something is put to
 * her, she lands somewhere, she gives a reason. Two picks and no marking.
 *
 * **Nothing here is graded, and the screen says so out loud.** Every position
 * offers reasons as good as every other position's, so there is no shape to the
 * page that hints at a preferred answer — no green, no tick, no "not quite".
 * The only thing that completes the exercise is having a view and supporting
 * it, which is exactly what the level claims to teach.
 *
 * Changing position clears the reason, because a reason belongs to the position
 * it was given for: the reasons for agreeing are not the reasons for
 * disagreeing, and silently carrying one across would attach her to a sentence
 * she never chose.
 */
export default function TakeAStandScreen() {
  const { standId = '' } = useParams();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);

  const stand = standById(standId);
  const [state, setState] = useState<StandState>(EMPTY_STAND);
  const [counted, setCounted] = useState(false);

  const complete = Boolean(stand && standComplete(stand, state));

  // Counted the first time this visit reaches a position with a reason behind
  // it — coming back another day and taking the other side is the exercise
  // done again, and arguably done better.
  useEffect(() => {
    if (!complete || counted) return;
    setCounted(true);
    void update(recordStand(settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  if (!stand) {
    return (
      <div className="screen">
        <ScreenHeader title="Not found" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This one is not in this build of the app.</p>
          <Link className="btn btn-primary" to="/opinions">
            Back to Opinions &amp; Reasons
          </Link>
        </div>
      </div>
    );
  }

  const position = chosenPosition(stand, state);

  return (
    <div className="screen">
      <ScreenHeader
        title={stand.name}
        eyebrow={stand.kind === 'choice' ? 'Choose, and say why' : 'Answer it'}
        back
      />

      <p className="small muted">
        {stand.kind === 'choice'
          ? 'Pick whichever you would actually pick, then say why. Neither one is the right answer — what is being practised is having a preference and being able to support it.'
          : 'Somebody has just said this to you. Agree, disagree, or land somewhere in between, then say why. None of the three is the right answer.'}
      </p>

      <section className="panel">
        <div className="eyebrow">
          {stand.kind === 'choice' ? 'The choice' : 'What was said to you'}
        </div>
        <div className="english">
          <strong>{stand.prompt.english}</strong>
        </div>
        <ScriptSides card={stand.prompt} />
      </section>

      <EngravedDivider />
      <div className="eyebrow">Where do you land?</div>
      <div className="stack" style={{ gap: 6 }}>
        {stand.positions.map((option, index) => (
          <button
            key={index}
            type="button"
            className={
              'btn btn-block' + (state.position === index ? ' btn-primary' : '')
            }
            aria-pressed={state.position === index}
            onClick={() => setState(takePosition(index))}
          >
            {option.said.english}
          </button>
        ))}
      </div>

      {position && (
        <>
          <section className="panel">
            <div className="eyebrow">Saying it</div>
            <ScriptSides card={position.said} />
          </section>

          <EngravedDivider />
          <div className="eyebrow">And why?</div>
          <p className="small muted">
            Any of these. They are all true of the position you took — pick the
            one you actually mean.
          </p>
          <div className="stack" style={{ gap: 6 }}>
            {position.reasons.map((reason, index) => (
              <button
                key={index}
                type="button"
                className={
                  'btn btn-block' + (state.reason === index ? ' btn-primary' : '')
                }
                aria-pressed={state.reason === index}
                onClick={() => setState(giveReason(state, index))}
              >
                {reason.english}
              </button>
            ))}
          </div>
        </>
      )}

      {complete && (
        <>
          <EngravedDivider />
          <section className="panel story-join">
            <span className="eyebrow">Your answer, whole</span>
            <p className="english">
              <strong>{standEnglish(stand, state)}</strong>
            </p>
            <div className="stack">
              {standAnswer(stand, state).map((fragment, index) => (
                <div key={index} className="story-join-line">
                  <div className="small muted">{fragment.english}</div>
                  <ScriptSides card={fragment} />
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">Then try the other side</span>
            <p className="small muted">
              Take the opposite position and find a reason for that one too.
              Being able to argue a view you do not hold is what makes the
              language stick — and it is the fastest way to notice that nothing
              here was ever a right answer.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setState(EMPTY_STAND)}
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
