import type { StudySession } from '../../types';
import { describeStage, stageProgress } from '../../features/study/engine';
import PerfectRuns from './PerfectRuns';

type Props = { session: StudySession };

/**
 * What the learner is being asked for, and how far into it she is.
 *
 * The whole point of this strip is to say that the small set is deliberate.
 * "Testing 3 words", with three pips under it, reads as a stage she is in the
 * middle of; "3 / 10" would read as a ten-card test she is failing — the same
 * information and the opposite message.
 *
 * Once the deck itself is the active set, the pips give way to the banked
 * perfect rounds, because at that point the thing being counted has changed
 * from words held to rounds survived.
 */
export default function StageBanner({ session }: Props) {
  const { label, detail, phase } = describeStage(session);
  const { recalled, total } = stageProgress(session);

  return (
    <section className="stage-banner">
      <div className="spread">
        <span className="stage-label">{label}</span>
        {phase === 'testing' && !session.drill && (
          <span className="small muted">
            {recalled} / {total}
          </span>
        )}
      </div>

      {detail && <p className="small muted stage-detail">{detail}</p>}

      {phase === 'testing' && !session.drill && (
        <div
          className="runs"
          role="img"
          aria-label={recalled + ' of ' + total + ' recalled in this set'}
        >
          {session.activeCardIds.map((id) => (
            <span
              key={id}
              className={
                'seg' + (session.stageCorrect.includes(id) ? ' filled' : '')
              }
            />
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
