import type { StudySession } from '../../types';
import { describeStage, rungProgress } from '../../features/study/engine';
import PerfectRuns from './PerfectRuns';

type Props = { session: StudySession };

/**
 * What the learner is being asked for, and how far into it she is.
 *
 * The whole point of this strip is to say that the small set is deliberate.
 * "Testing", with two or three pips under it, reads as a stage she is in the
 * middle of; "3 / 10" would read as a ten-card test she is failing — the same
 * information and the opposite message. The detail line adds which of the two
 * clean passes she is on, because a set cleared without growing is otherwise a
 * rule she has to infer.
 *
 * Once the deck itself is the active set, the pips give way to the banked
 * perfect rounds, because at that point the thing being counted has changed
 * from words held to rounds survived.
 */
export default function StageBanner({ session }: Props) {
  const { label, detail, phase } = describeStage(session);
  const { recalled, total, banked, passes } = rungProgress(session);

  // One row per pass the rung asks for: a banked pass stays filled, the pass in
  // hand fills as she recalls, and the rows below it wait. Nothing empties
  // behind her except on a miss, which is the one time it should.
  const rows = Array.from({ length: passes }, (_unused, pass) =>
    pass < banked ? total : pass === banked ? recalled : 0,
  );

  return (
    <section className="stage-banner">
      <div className="spread">
        <span className="stage-label">{label}</span>
        {phase === 'testing' && !session.drill && (
          <span className="small muted">
            {recalled} of {total} recalled
          </span>
        )}
      </div>

      {detail && <p className="small muted stage-detail">{detail}</p>}

      {phase === 'testing' && !session.drill && (
        <div
          className="stack stage-passes"
          role="img"
          aria-label={
            passes > 1
              ? banked +
                ' of ' +
                passes +
                ' clean passes banked, ' +
                recalled +
                ' of ' +
                total +
                ' recalled in the pass in hand'
              : recalled + ' of ' + total + ' recalled in this set'
          }
        >
          {rows.map((filled, pass) => (
            <div className="runs" key={pass} aria-hidden="true">
              {session.activeCardIds.map((id, index) => (
                <span
                  key={id}
                  className={'seg' + (index < filled ? ' filled' : '')}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {phase === 'fullDeckMastery' && (
        <PerfectRuns
          completed={session.perfectRounds}
          required={session.perfectRunsRequired}
        />
      )}
    </section>
  );
}
