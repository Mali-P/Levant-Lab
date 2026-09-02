import { Link, useNavigate } from 'react-router-dom';
import { LISTENING_LEVELS, NATIVE_REVIEW_PENDING } from '../constants/listening';
import {
  OUTCOME_LABELS,
  attemptTally,
  levelHeard,
  levelHeardAcross,
  openLevels,
  stageProgress,
} from '../features/listening/listening';
import { useSettings } from '../stores/settingsStore';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { EngravedDivider } from '../components/ornament/Ornament';

/**
 * The Native Listening area: the nine levels, and what her ears have actually
 * done so far.
 *
 * The one area in the app that opens in order, and the screen says so rather
 * than letting a learner discover it by finding a row that will not open. That
 * is not a change of philosophy — everywhere else the order is advice about what
 * to study next and the content is no harder met out of order. Here it is: the
 * audio in level 9 is not a harder version of level 1, it is a different thing
 * entirely, and meeting it on day one teaches nothing except that listening is
 * hopeless.
 *
 * The mastery panel is the part that matters and the part that would be easiest
 * to get wrong. It leads with first-listen comprehension because that is the
 * only number that is evidence of the skill — a learner who has "completed"
 * every exercise by reading the transcript has completed nothing, and a screen
 * showing her a full bar for it would be lying about the one thing this stage
 * exists to measure.
 */
export default function NativeListeningScreen() {
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);

  const open = openLevels(settings, languages);
  const stage = stageProgress(settings, languages);
  const tally = attemptTally(settings);
  const attempts = tally.reduce((sum, entry) => sum + entry.count, 0);
  const firsts = tally.find((entry) => entry.outcome === 'first')?.count ?? 0;

  return (
    <div className="screen">
      {/* Up to the Levels hub rather than back through history: the hub is this
          area's roof, whatever route brought the learner in. */}
      <ScreenHeader
        title="Native Listening"
        eyebrow="Understanding people who are not slowing down for you"
        back
        onBack={() => navigate('/levels')}
      />

      <p className="small muted">
        Everything up to here has been about getting words out. This level is
        about getting them in — hearing Hebrew and Palestinian Arabic as they are
        actually spoken, at speed, with the endings swallowed, the pronouns
        dropped and a kettle going somewhere behind them. You already know most of
        these words. The difficulty is hearing them.
      </p>

      <section className="panel">
        <span className="eyebrow">How it works</span>
        <strong>You hear it before you see it</strong>
        <p className="small muted">
          Nothing is written down until you ask for it. Press play, decide what
          you think you heard, then answer — and if you need help it comes one
          step at a time: play it again, again, slower, one word, the text, the
          meaning. Taking a hint is never a failure. It is just recorded honestly,
          because &ldquo;I understood it once I read it&rdquo; is a different
          skill from the one this level teaches.
        </p>
      </section>

      {NATIVE_REVIEW_PENDING && (
        <section className="panel">
          <span className="eyebrow">Worth knowing</span>
          <strong>The Arabic here has not had a native review</strong>
          <p className="small muted">
            The lines are written as Palestinian conversational Arabic and the
            romanisation matches what is spoken, but nobody who grew up speaking
            it has checked them yet — and the voices are your device&apos;s speech
            engine rather than recordings of people talking. Treat the wording as
            provisional until that pass has happened.
          </p>
        </section>
      )}

      <EngravedDivider />
      <div className="eyebrow">What your ears have done</div>

      <section className="panel">
        <strong>
          {firsts} {firsts === 1 ? 'thing' : 'things'} understood on the first
          listen
        </strong>
        <p className="small muted">
          {attempts === 0
            ? 'Nothing yet. Level 1 is one short sentence at a time, said carefully.'
            : 'Out of ' +
              attempts +
              (attempts === 1 ? ' attempt' : ' attempts') +
              ' so far. This is the number that counts — the rest is how you got there.'}
        </p>

        <div className="list">
          {tally.map((entry) => (
            <div className="list-item" key={entry.outcome}>
              <span className="grow">
                <strong>{OUTCOME_LABELS[entry.outcome]}</strong>
              </span>
              <span className="small">{entry.count}</span>
            </div>
          ))}
        </div>

        <p className="small muted">
          {stage.done} of {stage.total} exercises have been through at least once
          in {languages.length > 1 ? 'both languages' : 'your language'}.
        </p>
      </section>

      <EngravedDivider />
      <div className="eyebrow">The nine levels</div>
      <p className="small muted">
        These do open in order — the only place in the app that does. Each one
        changes exactly one thing about what you are hearing, and the next opens
        once you are two thirds of the way through the one before it, in every
        language you are studying.
      </p>

      <div className="list">
        {LISTENING_LEVELS.map((level) => {
          const unlocked = open.has(level.id);
          const progress = levelHeardAcross(level, settings, languages);
          const clear = progress.onFirstListen === progress.total;

          return (
            <Link
              className="list-item"
              key={level.id}
              to={'/listening/level/' + level.id}
            >
              <span className="icon" aria-hidden="true">
                <Icon name={unlocked ? 'beacon' : 'lock'} />
              </span>
              <span className="grow">
                <span className="eyebrow">Level {level.rank}</span>
                <strong>{level.name}</strong>
                <div className="small muted">{level.claim}</div>
                <div className="small muted">
                  {unlocked
                    ? progress.onFirstListen +
                      ' of ' +
                      progress.total +
                      ' caught first time'
                    : 'Opens once level ' + (level.rank - 1) + ' is mostly heard'}
                </div>
              </span>
              {unlocked && clear && <span className="chip chip-ok">Clear</span>}
              <Icon name="forward" className="chevron" />
            </Link>
          );
        })}
      </div>

      {languages.length > 1 && (
        <>
          <EngravedDivider />
          <div className="eyebrow">One ear at a time</div>
          <p className="small muted">
            Hebrew and Arabic exercises alternate rather than mixing — no sentence
            here is ever half one and half the other. Each language keeps its own
            record, because understanding spoken Hebrew tells you nothing about
            understanding spoken Arabic.
          </p>
          <div className="list">
            {languages.map((language) => {
              // Both figures are against the items this ear is actually
              // given, never against the whole ladder: on Both the two ears
              // split it between them, and counting one against all of it would
              // show a learner who caught everything put to her half a score.
              const heard = LISTENING_LEVELS.reduce(
                (sum, level) =>
                  sum +
                  levelHeard(level, settings, language, languages).onFirstListen,
                0,
              );
              const total = LISTENING_LEVELS.reduce(
                (sum, level) =>
                  sum + levelHeard(level, settings, language, languages).total,
                0,
              );
              return (
                <div className="list-item" key={language}>
                  <span className="grow">
                    <strong>
                      {language === 'hebrew' ? 'Hebrew' : 'Palestinian Arabic'}
                    </strong>
                    <div className="small muted">
                      {heard} of {total} understood on the first listen
                    </div>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <EngravedDivider />
      <section className="panel">
        <span className="eyebrow">What comes after this</span>
        <strong>Sounding like that yourself</strong>
        <p className="small muted">
          This level is about understanding how people actually sound. Saying it
          the same way — the rhythm, the contractions, the phrasing — is a
          different skill and belongs in a stage of its own. Until that exists,
          take what your ear has picked up into a free conversation and use it.
        </p>
        <Link className="btn btn-primary btn-block" to="/freetalk">
          Open Free Conversation
        </Link>
      </section>
    </div>
  );
}
