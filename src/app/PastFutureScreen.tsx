import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import {
  bandOf,
  contrastCategory,
  finalTestCategory,
  lessonFinished,
  lessonsOf,
  pastFutureSections,
} from '../features/pastfuture/pastfuture';
import { isDeckMastered } from '../features/review/unlock';
import ScreenHeader from '../components/controls/ScreenHeader';
import PerfectRuns from '../components/progress/PerfectRuns';
import Icon from '../components/ornament/Icon';
import { EngravedDivider } from '../components/ornament/Ornament';
import type { TimeBand } from '../constants/pastfuture';

/**
 * The Past & Future area: its sections, the timeline drill, and the final test.
 *
 * Laid out along the axis it teaches. Everything about the past comes first,
 * everything about the future second, and the contrast section sits at the end
 * where it belongs — it is the one that only makes sense once both halves are
 * familiar. The band headings are the level's whole shape said in three words,
 * and they cost nothing: they are read off the section name.
 *
 * Every section is open from the first day. There is no ladder of sections to
 * climb, because the level is optional and gates nothing.
 */
const BAND_HEADS: Record<TimeBand, { eyebrow: string; blurb: string }> = {
  past: {
    eyebrow: 'Before',
    blurb:
      'What already happened: what you did, how you were, what you were in the middle of, and what you used to do.',
  },
  future: {
    eyebrow: 'Later',
    blurb:
      'What has not happened yet: what you will do, what is already arranged, what you will not do, and fixing a time with somebody.',
  },
  contrast: {
    eyebrow: 'All three at once',
    blurb:
      'The same idea moved along the line, so the only thing that changes is the time.',
  },
};

const BAND_ORDER: TimeBand[] = ['past', 'future', 'contrast'];

export default function PastFutureScreen() {
  const navigate = useNavigate();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);

  const sections = pastFutureSections(categories);
  const contrast = contrastCategory(categories);
  const test = finalTestCategory(categories);
  const testDeck = test
    ? decks.find((deck) => deck.categoryId === test.id)
    : undefined;
  const testProgress = testDeck ? deckProgress[testDeck.id] : undefined;

  return (
    <div className="screen">
      {/* Up to the Levels hub rather than back through history: the hub is
          this area's roof, whatever route brought the learner in. */}
      <ScreenHeader
        title="Past & Future"
        eyebrow="Saying when it happened"
        back
        onBack={() => navigate('/levels')}
      />

      <p className="small muted">
        Everything so far has been said at the moment of speaking. This level
        moves the same sentences off it — I worked yesterday, I&apos;ll work
        tomorrow — using the verbs the course already taught. Take any section
        in any order: nothing here is required by the vocabulary decks, and
        nothing there waits on this.
      </p>

      {contrast && (
        <section className="panel">
          <span className="eyebrow">Start here if you like</span>
          <strong>Before, now and later</strong>
          <p className="small muted">
            Ten everyday verbs laid along a timeline, each in its three times.
            Nothing is scored — it is the picture the rest of the level fills
            in.
          </p>
          <Link className="btn btn-primary btn-block" to="/pastfuture/timeline">
            Open the timeline
          </Link>
        </section>
      )}

      {BAND_ORDER.map((band) => {
        const inBand = sections.filter((section) => bandOf(section) === band);
        if (inBand.length === 0) return null;

        return (
          <div key={band}>
            <EngravedDivider />
            <div className="eyebrow">{BAND_HEADS[band].eyebrow}</div>
            <p className="small muted">{BAND_HEADS[band].blurb}</p>

            <div className="list">
              {inBand.map((section) => {
                const lessons = lessonsOf(
                  decks.filter((deck) => deck.categoryId === section.id),
                );
                const finished = lessons.filter((entry) =>
                  lessonFinished(entry, deckProgress),
                ).length;

                return (
                  <Link
                    className="list-item"
                    key={section.id}
                    to={'/pastfuture/section/' + section.id}
                  >
                    <span className="icon" aria-hidden="true">
                      {section.icon}
                    </span>
                    <span className="grow">
                      <strong>{section.name}</strong>
                      <div className="small muted">
                        {lessons.length}{' '}
                        {lessons.length === 1 ? 'lesson' : 'lessons'} ·{' '}
                        {finished} finished
                      </div>
                    </span>
                    {finished === lessons.length && lessons.length > 0 && (
                      <span className="chip chip-ok">Complete</span>
                    )}
                    <Icon name="forward" className="chevron" />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {testDeck && (
        <section className="panel">
          <span className="eyebrow">Final test</span>
          <strong>Every time, ten at a time</strong>
          <p className="small muted">
            Ten lines drawn at random from everything above — past, future and
            the contrast between them — Hebrew and Arabic together, and a
            different ten every round. Ten flawless batches finishes it.
          </p>
          <PerfectRuns
            completed={
              isDeckMastered(testDeck, testProgress)
                ? Math.max(1, testDeck.perfectRunsRequired)
                : (testProgress?.perfectRunsCompleted ?? 0)
            }
            required={Math.max(1, testDeck.perfectRunsRequired)}
            label="Flawless batches"
          />
          <Link
            className="btn btn-primary btn-block"
            to={'/study/' + testDeck.id + '?mode=normal'}
          >
            Sit the test
          </Link>
        </section>
      )}
    </div>
  );
}
