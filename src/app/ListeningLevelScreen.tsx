import { Link, useNavigate, useParams } from 'react-router-dom';
import { AMBIENCE_LABELS } from '../services/audio/ambience';
import {
  LEVEL_OPENS_AT,
  OUTCOME_LABELS,
  languageForItem,
  levelBelow,
  levelById,
  levelHeard,
  levelHeardAcross,
  openLevels,
  outcomeOf,
} from '../features/listening/listening';
import { useSettings } from '../stores/settingsStore';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { EngravedDivider, LevantMotif } from '../components/ornament/Ornament';

/**
 * One level of Native Listening: what is in it, and how each piece went.
 *
 * The list is deliberately not a score sheet. Each row says how she last managed
 * that item, in the language she will meet it in, and none of it is a percentage
 * of right answers — the point of coming back to an exercise here is hearing it
 * with less help, not getting it right a second time.
 *
 * Nothing on this screen shows a transcript, or even names an item by its
 * content. A learner who could read the lines off the level list would have the
 * answers before she pressed play, which would quietly undo the one rule the
 * whole level is built on.
 */
export default function ListeningLevelScreen() {
  const { levelId = '' } = useParams();
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);

  const level = levelById(levelId);

  if (!level) {
    return (
      <div className="screen">
        <ScreenHeader title="Not in this build" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This listening level is not in this build of the app.</p>
          <Link className="btn btn-primary" to="/listening">
            Back to Native Listening
          </Link>
        </div>
      </div>
    );
  }

  const unlocked = openLevels(settings, languages).has(level.id);
  const below = levelBelow(level);
  const progress = levelHeardAcross(level, settings, languages);

  // The first item she has not yet caught on a first listen — which is where
  // "carry on" should land, because an item understood only with a replay is
  // still an item with something left in it.
  const next = level.items.find(
    (item) =>
      outcomeOf(settings, item.id, languageForItem(level, item.id, languages)) !==
      'first',
  );

  return (
    <div className="screen">
      <ScreenHeader
        title={level.name}
        eyebrow={'Level ' + level.rank + ' of 9'}
        back
        onBack={() => navigate('/listening')}
      />

      <p className="small muted">{level.claim}.</p>

      <section className="panel">
        <span className="eyebrow">How this one sounds</span>
        <p className="small muted">
          {level.pace === 'clear'
            ? 'Spoken carefully, the way the rest of the app speaks.'
            : 'Spoken at ordinary speed. Slow replay is one hint away on every card, but it is never what you hear first.'}
          {level.ambience
            ? ' There is ' +
              AMBIENCE_LABELS[level.ambience] +
              ' behind it — quiet enough to hear over, present enough that you have to.'
            : ''}
        </p>
      </section>

      {!unlocked && below && (
        <section className="panel">
          <span className="eyebrow">Not open yet</span>
          <strong>Level {below.rank} comes first</strong>
          <p className="small muted">
            This is the one part of the app that opens in order, because the audio
            genuinely does get harder. Get about {Math.round(LEVEL_OPENS_AT * 100)}%
            of the way through {below.name.toLowerCase()} — in every language you
            are studying — and this level opens.
          </p>
          <Link
            className="btn btn-primary btn-block"
            to={'/listening/level/' + below.id}
          >
            Back to level {below.rank}
          </Link>
        </section>
      )}

      {unlocked && (
        <>
          <div className="stack" style={{ gap: 6 }}>
            <div className="spread">
              <span className="eyebrow">Heard so far</span>
              <span className="small">
                {progress.onFirstListen} of {progress.total} first time
              </span>
            </div>
            <div
              className="bar"
              role="img"
              aria-label={
                Math.round(progress.share * 100) + ' per cent of this level heard'
              }
            >
              <span style={{ width: Math.round(progress.share * 100) + '%' }} />
            </div>
          </div>

          <EngravedDivider />

          <div className="list">
            {level.items.map((item, at) => {
              const language = languageForItem(level, item.id, languages);
              const outcome = outcomeOf(settings, item.id, language);

              return (
                <Link
                  className="list-item"
                  key={item.id}
                  to={'/listening/item/' + item.id}
                >
                  <span className="icon" aria-hidden="true">
                    <Icon name="speaker" />
                  </span>
                  <span className="grow">
                    <span className="eyebrow">
                      {language === 'hebrew' ? 'Hebrew' : 'Palestinian Arabic'}
                    </span>
                    {/* Numbered rather than named. A name would say what is in it,
                        and what is in it is the thing she is meant to hear. */}
                    <strong>Number {at + 1}</strong>
                    <div className="small muted">
                      {outcome ? OUTCOME_LABELS[outcome] : 'Not heard yet'}
                    </div>
                  </span>
                  {outcome === 'first' && (
                    <span className="chip chip-ok">First listen</span>
                  )}
                  <Icon name="forward" className="chevron" />
                </Link>
              );
            })}
          </div>

          {next ? (
            <Link
              className="btn btn-primary btn-block"
              to={'/listening/item/' + next.id}
            >
              {progress.attempted === 0 ? 'Start listening' : 'Carry on'}
            </Link>
          ) : (
            <section className="panel">
              <span className="eyebrow">Every one of them, first time</span>
              <p className="small muted">
                Nothing left to improve on here. That is the claim this stage
                exists to make — not that you can read them, that you heard them.
              </p>
            </section>
          )}

          <EngravedDivider />
          <div className="eyebrow">Each language on its own</div>
          <p className="small muted">
            The two ears are trained separately. The next level opens when the
            weaker of them has got there, never when the average has.
          </p>
          <div className="list">
            {languages.map((language) => {
              const each = levelHeard(level, settings, language, languages);
              return (
                <div className="list-item" key={language}>
                  <span className="grow">
                    <strong>
                      {language === 'hebrew' ? 'Hebrew' : 'Palestinian Arabic'}
                    </strong>
                    <div className="small muted">
                      {each.onFirstListen} of {each.total} on the first listen ·{' '}
                      {each.attempted} tried
                    </div>
                  </span>
                  <span className="small">{Math.round(each.share * 100)}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
