import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import {
  connectorCategory,
  finalTestCategory,
  lessonFinished,
  lessonsOf,
  strandOf,
  tellMeSections,
  tellMeStats,
} from '../features/tellme/tellme';
import { isDeckMastered } from '../features/review/unlock';
import { SHORT_STORIES, STORY_BUILDS, type Strand } from '../constants/tellme';
import ScreenHeader from '../components/controls/ScreenHeader';
import PerfectRuns from '../components/progress/PerfectRuns';
import Icon from '../components/ornament/Icon';
import { EngravedDivider } from '../components/ornament/Ornament';

/**
 * The Tell Me About It area: its sections, its three own exercises, and the
 * final test.
 *
 * Laid out along the skill it teaches rather than alphabetically. The joining
 * words come first because nothing else here works without them; then telling
 * what happened; then describing the people, places and things a story is made
 * of; then the sections that keep her talking when a word will not come. The
 * strand headings are the level's whole shape said in four lines, and they
 * cost nothing: they are read off the section name.
 *
 * Every section is open from the first day. There is no ladder of sections to
 * climb, because the level is optional and gates nothing.
 */
const STRAND_HEADS: Record<Strand, { eyebrow: string; blurb: string }> = {
  joining: {
    eyebrow: 'The words in between',
    blurb:
      'And, but, because, so, then, before, after. The handful of words that turn two sentences into one thought.',
  },
  telling: {
    eyebrow: 'Telling what happened',
    blurb:
      'Your day, what happened, what happened next, and how to add the one detail that makes it make sense.',
  },
  describing: {
    eyebrow: 'Describing',
    blurb:
      'A person, a place, a thing, and how something was — the raw material every story is built out of.',
  },
  'keeping-going': {
    eyebrow: 'Keeping going',
    blurb:
      'What to say when the word will not come, how to cut a long story short, and the small words that hold a story together.',
  },
};

const STRAND_ORDER: Strand[] = ['joining', 'telling', 'describing', 'keeping-going'];

export default function TellMeScreen() {
  const navigate = useNavigate();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);
  const settings = useSettings((s) => s.settings);

  const sections = tellMeSections(categories);
  const connectors = connectorCategory(categories);
  const test = finalTestCategory(categories);
  const testDeck = test
    ? decks.find((deck) => deck.categoryId === test.id)
    : undefined;
  const testProgress = testDeck ? deckProgress[testDeck.id] : undefined;
  const stats = tellMeStats(settings);

  return (
    <div className="screen">
      {/* Up to the Levels hub rather than back through history: the hub is
          this area's roof, whatever route brought the learner in. */}
      <ScreenHeader
        title="Tell Me About It"
        eyebrow="More than one sentence at a time"
        back
        onBack={() => navigate('/levels')}
      />

      <p className="small muted">
        Everything so far has ended at the full stop. This level is what goes
        between two sentences — and, but, because, so, then — and what to do
        with them: tell somebody about your day, say what happened, describe a
        place. Take any section in any order: nothing here is required by the
        vocabulary decks, and nothing there waits on this.
      </p>

      {connectors && (
        <section className="panel">
          <span className="eyebrow">Start here if you like</span>
          <strong>The joining words</strong>
          <p className="small muted">
            The whole set laid out by the job each one does, with a sentence
            apiece. Nothing is scored — it is the picture the rest of the level
            fills in.
          </p>
          <Link className="btn btn-primary btn-block" to="/tellme/connectors">
            Open the map
          </Link>
        </section>
      )}

      {STRAND_ORDER.map((strand) => {
        const inStrand = sections.filter((section) => strandOf(section) === strand);
        if (inStrand.length === 0) return null;

        return (
          <div key={strand}>
            <EngravedDivider />
            <div className="eyebrow">{STRAND_HEADS[strand].eyebrow}</div>
            <p className="small muted">{STRAND_HEADS[strand].blurb}</p>

            <div className="list">
              {inStrand.map((section) => {
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
                    to={'/tellme/section/' + section.id}
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

      <EngravedDivider />
      <div className="eyebrow">Build one out of your answers</div>
      <p className="small muted">
        Four small questions, answered one at a time — then the four answers
        read back to you as one piece of speech. Nothing is scored; the point
        is seeing separate answers become a single thing you could say out
        loud.
        {stats.builds > 0 ? ' Built ' + stats.builds + ' so far.' : ''}
      </p>
      <div className="list">
        {STORY_BUILDS.map((build) => (
          <Link
            className="list-item"
            key={build.id}
            to={'/tellme/build/' + build.id}
          >
            <span className="grow">
              <strong>{build.name}</strong>
              <div className="small muted">{build.prompt}</div>
            </span>
            <Icon name="forward" className="chevron" />
          </Link>
        ))}
      </div>

      <EngravedDivider />
      <div className="eyebrow">Listen to a short one</div>
      <p className="small muted">
        Three sentences told as one run, in language this level teaches, then a
        few plain questions about them. Hide the words and use your ears first
        — the connectors are what let you follow a story you only hear once.
        {stats.stories > 0 ? ' Listened through ' + stats.stories + ' so far.' : ''}
      </p>
      <div className="list">
        {SHORT_STORIES.map((story) => (
          <Link
            className="list-item"
            key={story.id}
            to={'/tellme/story/' + story.id}
          >
            <span className="grow">
              <strong>{story.name}</strong>
              <div className="small muted">
                {story.lines.length} sentences · {story.questions.length}{' '}
                questions
              </div>
            </span>
            <Icon name="forward" className="chevron" />
          </Link>
        ))}
      </div>

      <EngravedDivider />
      <section className="panel">
        <span className="eyebrow">And then, with nobody prompting you</span>
        <strong>Say it for real</strong>
        <p className="small muted">
          The last step of this level is not another deck. Take one of these
          questions into a free conversation and answer it in your own words —
          the partner there reads whatever you say and tells you how it landed.
          Once you are a third of the way through the lessons here, it starts
          asking the open questions on its own.
        </p>
        <Link className="btn btn-primary btn-block" to="/freetalk">
          Open Free Conversation
        </Link>
      </section>

      {testDeck && (
        <section className="panel">
          <span className="eyebrow">Final test</span>
          <strong>Ten lines at a time</strong>
          <p className="small muted">
            Ten lines drawn at random from everything above — the joining
            words, the descriptions, the stories — Hebrew and Arabic together,
            and a different ten every round. Ten flawless batches finishes it.
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
