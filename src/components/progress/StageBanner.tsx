import { LANGUAGES, type Language, type StudySession } from '../../types';
import { describeStage, stageProgress } from '../../features/study/engine';
import PerfectRuns from './PerfectRuns';

type Props = {
  session: StudySession;
  languages?: readonly Language[];
};

/**
 * What the learner is being asked for, and how far into it she is.
 *
 * The whole point of this strip is to say that the small set is deliberate.
 * "Testing", with two or three pips under it, reads as a stage she is in the
 * middle of; "3 / 10" would read as a ten-card test she is failing — the same
 * information and the opposite message.
 *
 * One line each, and each fact once. The count is the header's own line and the
 * pips beneath it; the pass she is on is the detail line, which is the only
 * thing here that says the set has to be cleared twice. A second row of pips
 * for the banked pass, and the count repeated in the detail line, said the same
 * two things twice over on the one strip that has to stay glanceable.
 *
 * Once the deck itself is the active set, the pips give way to the banked
 * perfect rounds, because at that point the thing being counted has changed
 * from words held to rounds survived.
 */
export default function StageBanner({ session, languages = LANGUAGES }: Props) {
  const { label, detail, phase } = describeStage(session, languages);
  const { recalled, total } = stageProgress(session);

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
          className="runs"
          role="img"
          aria-label={recalled + ' of ' + total + ' recalled in this set'}
        >
          {session.activeCardIds.map((id, index) => (
            <span
              key={id}
              className={'seg' + (index < recalled ? ' filled' : '')}
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
