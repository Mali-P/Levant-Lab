import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import {
  FREETALK_LENGTHS,
  FREETALK_LEVELS,
  FREETALK_MODES,
  FREETALK_ROLEPLAYS,
  FREETALK_TOPICS,
  type FreeTalkMode,
} from '../constants/freetalk';
import { statsFor, wantedCategory, wantedDeck } from '../features/freetalk/freetalk';
import { talkAvailability, type TalkAvailability } from '../features/freetalk/api';
import type {
  TalkLanguage,
  TalkLength,
  TalkLevel,
} from '../services/freetalk/protocol';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { EngravedDivider } from '../components/ornament/Ornament';

/**
 * The door into Free Conversation: the first level where the app stops writing
 * her half. She chooses how much scaffolding to keep — a mode, a difficulty, a
 * length, a language — and everything after the opening line is hers.
 *
 * The level needs the Levantry server, because the other side of the
 * conversation is generated there; the screen says so plainly when it cannot
 * be reached rather than letting a session fail on its first line.
 */
export default function FreeTalkScreen() {
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);

  const [language, setLanguage] = useState<TalkLanguage>(languages[0]);
  const [level, setLevel] = useState<TalkLevel>(2);
  const [length, setLength] = useState<TalkLength>('normal');
  const [openMode, setOpenMode] = useState<string | undefined>(undefined);
  const [availability, setAvailability] = useState<TalkAvailability | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    void talkAvailability().then((state) => {
      if (!cancelled) setAvailability(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = availability === 'ready';

  function start(mode: FreeTalkMode, topic?: string) {
    const params = new URLSearchParams({
      mode: mode.id,
      language,
      level: String(level),
      length,
    });
    if (topic) params.set('topic', topic);
    navigate('/freetalk/session?' + params.toString());
  }

  const wantedCat = wantedCategory(categories);
  const wanted = wantedDeck(decks, wantedCat?.id);
  const wantedCount = wanted
    ? cards.filter((card) => card.deckId === wanted.id).length
    : 0;

  return (
    <div className="screen">
      <ScreenHeader
        title="Free Conversation"
        eyebrow="Level 4 — say what you actually want to say"
        back
      />

      <p className="small muted">
        No script and no expected answer. The app opens a conversation; you
        answer in your own words, in Hebrew or Palestinian Arabic, and it
        carries on from what you actually said.
      </p>

      {availability === 'unconfigured' && (
        <section className="panel">
          <span className="eyebrow">Needs the server</span>
          <p className="small muted">
            The other side of the conversation is generated on your Levantry
            server. Enter its address and token first.
          </p>
          <Link className="btn btn-compact" to="/sync">
            Set up the server connection
          </Link>
        </section>
      )}
      {availability === 'unreachable' && (
        <section className="panel">
          <span className="eyebrow">Server not reachable</span>
          <p className="small muted">
            Could not reach the Levantry server. Check it is running and that
            the address under Settings → Sync is right.
          </p>
        </section>
      )}
      {availability === 'no-key' && (
        <section className="panel">
          <span className="eyebrow">Not switched on</span>
          <p className="small muted">
            The server is up, but Free Conversation is not switched on there —
            it needs an ANTHROPIC_API_KEY in the server&apos;s environment.
          </p>
        </section>
      )}

      <EngravedDivider />

      {/* The levers. Language only when both are being studied: a conversation
          happens in one language, and in Both mode the advice is a round in
          each rather than a mid-conversation switch. */}
      {languages.length > 1 && (
        <section className="panel">
          <span className="eyebrow">Language for this conversation</span>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(['hebrew', 'arabic'] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                className={'btn btn-compact' + (language === choice ? ' btn-primary' : '')}
                onClick={() => setLanguage(choice)}
              >
                {choice === 'hebrew' ? 'Hebrew' : 'Palestinian Arabic'}
              </button>
            ))}
          </div>
          <p className="small muted">
            One conversation stays in one language. Do a round in each — the
            same things, said independently twice.
          </p>
        </section>
      )}

      <section className="panel">
        <span className="eyebrow">How much help</span>
        <div className="stack" style={{ gap: 6 }}>
          {FREETALK_LEVELS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={'btn btn-compact' + (level === entry.id ? ' btn-primary' : '')}
              style={{ textAlign: 'start' }}
              onClick={() => setLevel(entry.id)}
            >
              <strong>
                {entry.id} — {entry.name}
              </strong>
              <span className="small muted"> · {entry.claim}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">How long</span>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {FREETALK_LENGTHS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={'btn btn-compact' + (length === entry.id ? ' btn-primary' : '')}
              onClick={() => setLength(entry.id)}
              title={entry.claim}
            >
              {entry.name}
            </button>
          ))}
        </div>
      </section>

      <EngravedDivider />

      {/* The five ways in. Modes that want a topic unfold their list in place;
          the other two start at a tap. */}
      <div className="list">
        {FREETALK_MODES.map((mode) => {
          const open = openMode === mode.id;
          return (
            <div key={mode.id}>
              <button
                type="button"
                className="list-item"
                style={{ width: '100%', textAlign: 'start' }}
                disabled={!ready}
                onClick={() =>
                  mode.picks
                    ? setOpenMode(open ? undefined : mode.id)
                    : start(mode)
                }
              >
                <span className="grow">
                  <strong>{mode.name}</strong>
                  <div className="small muted">{mode.claim}</div>
                </span>
                <Icon name="forward" className="chevron" />
              </button>
              {open && mode.picks && (
                <div
                  className="row"
                  style={{ gap: 6, flexWrap: 'wrap', padding: '8px 4px' }}
                >
                  {(mode.picks === 'topic'
                    ? FREETALK_TOPICS
                    : FREETALK_ROLEPLAYS
                  ).map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      className="btn btn-compact"
                      disabled={!ready}
                      onClick={() => start(mode, topic)}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <EngravedDivider />

      {/* The record: conversations held, not marks out of ten. */}
      <section className="panel">
        <span className="eyebrow">So far</span>
        {languages.map((lang) => {
          const stats = statsFor(settings, lang);
          return (
            <p className="small muted" key={lang}>
              <strong>{lang === 'hebrew' ? 'Hebrew' : 'Palestinian Arabic'}:</strong>{' '}
              {stats.conversations === 0
                ? 'no conversations yet'
                : `${stats.conversations} conversation${stats.conversations === 1 ? '' : 's'}, ` +
                  `${stats.withoutHelp} without English help, ` +
                  `${stats.turns} turns of yours` +
                  (stats.phrasesSaved > 0
                    ? `, ${stats.phrasesSaved} phrases saved`
                    : '')}
            </p>
          );
        })}
        {wanted && wantedCount > 0 && (
          <Link className="btn btn-compact" to={'/deck/' + wanted.id}>
            Things I Wanted to Say — {wantedCount} phrase
            {wantedCount === 1 ? '' : 's'}
          </Link>
        )}
      </section>
    </div>
  );
}
