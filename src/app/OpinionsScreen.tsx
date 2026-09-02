import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import {
  finalTestCategory,
  lessonFinished,
  lessonsOf,
  opinionSections,
  opinionStats,
  strandOf,
  strengthCategory,
} from '../features/opinions/opinions';
import { isDeckMastered } from '../features/review/unlock';
import {
  OPINION_BUILDS,
  OPINION_STANDS,
  type OpinionStrand,
} from '../constants/opinions';
import ScreenHeader from '../components/controls/ScreenHeader';
import PerfectRuns from '../components/progress/PerfectRuns';
import Icon from '../components/ornament/Icon';
import { EngravedDivider } from '../components/ornament/Ornament';

/**
 * The Opinions & Reasons area: its sections, its three own exercises, and the
 * final test.
 *
 * Laid out along the skill it teaches rather than alphabetically. Saying what
 * you think comes first because nothing else here works without a frame to put
 * an opinion in; then the reason that turns it into an argument; then choosing
 * between two things; then answering somebody else's view; then the judgements.
 * The strand headings are the level's whole shape said in five lines, and they
 * cost nothing: they are read off the section name.
 *
 * Every section is open from the first day. There is no ladder of sections to
 * climb, because the level is optional and gates nothing.
 */
const STRAND_HEADS: Record<OpinionStrand, { eyebrow: string; blurb: string }> = {
  thinking: {
    eyebrow: 'Saying what you think',
    blurb:
      'It seems to me, I think, I do not think, I like it, in my opinion. The frames you put an opinion inside, before there is one to put there.',
  },
  reasons: {
    eyebrow: 'And why',
    blurb:
      'Because. The one word that turns a preference into something somebody else can argue with — and how to keep answering when they ask why.',
  },
  comparing: {
    eyebrow: 'Choosing between two things',
    blurb:
      'I prefer this one, that one is better, they are almost the same. Comparing without turning it into a grammar lesson.',
  },
  answering: {
    eyebrow: "Answering somebody else's opinion",
    blurb:
      'Agreeing, disagreeing without being unpleasant, half agreeing, and admitting you are not sure — which is most of real conversation.',
  },
  judging: {
    eyebrow: 'Advice and judgements',
    blurb:
      'You should, it is worth it, I recommend it, that is a good idea. Opinions pointed at what somebody ought to do next.',
  },
};

const STRAND_ORDER: OpinionStrand[] = [
  'thinking',
  'reasons',
  'comparing',
  'answering',
  'judging',
];

export default function OpinionsScreen() {
  const navigate = useNavigate();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);
  const settings = useSettings((s) => s.settings);

  const sections = opinionSections(categories);
  const strengths = strengthCategory(categories);
  const test = finalTestCategory(categories);
  const testDeck = test
    ? decks.find((deck) => deck.categoryId === test.id)
    : undefined;
  const testProgress = testDeck ? deckProgress[testDeck.id] : undefined;
  const stats = opinionStats(settings);

  return (
    <div className="screen">
      {/* Up to the Levels hub rather than back through history: the hub is
          this area's roof, whatever route brought the learner in. */}
      <ScreenHeader
        title="Opinions & Reasons"
        eyebrow="What you think, and why"
        back
        onBack={() => navigate('/levels')}
      />

      <p className="small muted">
        Everything so far has been about saying what happened. This level is
        about saying what you make of it — I liked the café, but I think it was
        too expensive; I would not go again, because the food was not very
        good. Take any section in any order: nothing here is required by the
        vocabulary decks, and nothing there waits on this.
      </p>

      <section className="panel">
        <span className="eyebrow">Before anything else</span>
        <strong>No opinion here is ever wrong</strong>
        <p className="small muted">
          Coffee is better than tea and tea is better than coffee. The decks
          grade whether you can say the sentence; the exercises below do not
          grade at all. Say what you actually think — that is the whole skill.
        </p>
      </section>

      {strengths && (
        <section className="panel">
          <span className="eyebrow">Start here if you like</span>
          <strong>How sure are you?</strong>
          <p className="small muted">
            Maybe, probably, I think so, I am sure, definitely — one question
            answered five ways, so you can hear how much each one commits you
            to. Nothing is scored.
          </p>
          <Link className="btn btn-primary btn-block" to="/opinions/certainty">
            Open the scale
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
                    to={'/opinions/section/' + section.id}
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
      <div className="eyebrow">Build a whole opinion</div>
      <p className="small muted">
        Three small questions — do you like it, why, and is there anything you
        do not — then the three answers read back to you as one opinion.
        Nothing is scored and no answer is right; the point is watching three
        separate replies become something you could say out loud and mean.
        {stats.builds > 0 ? ' Built ' + stats.builds + ' so far.' : ''}
      </p>
      <div className="list">
        {OPINION_BUILDS.map((build) => (
          <Link
            className="list-item"
            key={build.id}
            to={'/opinions/build/' + build.id}
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
      <div className="eyebrow">Take a position</div>
      <p className="small muted">
        Somebody says something, or offers you a choice. Agree, disagree, or
        land somewhere in between — then say why. Every position comes with
        reasons as good as every other position&apos;s, because none of them is
        the answer.
        {stats.stands > 0 ? ' Answered ' + stats.stands + ' so far.' : ''}
      </p>
      <div className="list">
        {OPINION_STANDS.map((stand) => (
          <Link
            className="list-item"
            key={stand.id}
            to={'/opinions/stand/' + stand.id}
          >
            <span className="grow">
              <strong>{stand.name}</strong>
              <div className="small muted">
                {stand.kind === 'choice'
                  ? 'A choice to make, and justify'
                  : 'Something said to you, to answer'}{' '}
                · {stand.positions.length} ways to go
              </div>
            </span>
            <Icon name="forward" className="chevron" />
          </Link>
        ))}
      </div>

      <EngravedDivider />
      <section className="panel">
        <span className="eyebrow">
          And then, with nobody offering you the words
        </span>
        <strong>Say what you think for real</strong>
        <p className="small muted">
          The last step of this level is not another deck. Take an opinion into
          a free conversation and argue it in your own words — the partner
          there reads whatever you say and tells you how it landed. Once you
          are a third of the way through the lessons here, it starts asking
          what you think on its own, and offering opinions of its own for you
          to disagree with.
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
            Ten lines drawn at random from everything above — the opinion
            frames, the reasons, the comparisons, the ways of agreeing — Hebrew
            and Arabic together, and a different ten every round. Ten flawless
            batches finishes it.
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
