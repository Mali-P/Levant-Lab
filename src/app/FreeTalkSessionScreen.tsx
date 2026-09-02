import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import {
  WANTED_CATEGORY_ICON,
  WANTED_CATEGORY_NAME,
  WANTED_DECK_NAME,
} from '../constants/freetalk';
import {
  alreadySaved,
  partnerGender,
  recordConversation,
  recordPhraseSaved,
  strugglePhrases,
  wantedCard,
  wantedCategory,
  wantedDeck,
} from '../features/freetalk/freetalk';
import { tensesUnlocked } from '../features/pastfuture/pastfuture';
import { narrativeUnlocked } from '../features/tellme/tellme';
import { opinionsUnlocked } from '../features/opinions/opinions';
import {
  askHowToSay,
  fetchReview,
  openConversation,
  sendTurn,
} from '../features/freetalk/api';
import type {
  ReviewResponse,
  SayResponse,
  TalkLanguage,
  TalkLength,
  TalkLevel,
  TalkLine,
  TalkMode,
  TalkOutcome,
  TalkSetting,
  TalkTurn,
} from '../services/freetalk/protocol';
import { speechService } from '../services/speech';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

/**
 * One free conversation, live.
 *
 * The shape on screen is the rehearsal screen's — their line offset one way,
 * hers the other — but nothing under it is authored: every partner line is
 * generated from what she actually said, and her line is whatever she types,
 * script or romanisation, with no expected answer behind it.
 *
 * Three rules from the design brief are enforced here rather than trusted to
 * the model: help never ends a conversation (a taught sentence lands in her
 * input box, ready to send); corrections ride alongside the flow instead of
 * gating it; and the record on the settings row counts conversations and
 * help, never an accuracy mark.
 */

type Bubble =
  | { kind: 'partner'; line: TalkLine; starters: string[] }
  | {
      kind: 'learner';
      text: string;
      outcome?: TalkOutcome;
      correction?: { natural: TalkLine; why: string };
      help?: { problem: string; starters: string[] };
      pending?: boolean;
    }
  | { kind: 'taught'; phrase: SayResponse; saved: boolean };

function history(bubbles: Bubble[]): TalkTurn[] {
  const turns: TalkTurn[] = [];
  for (const bubble of bubbles) {
    if (bubble.kind === 'partner') {
      turns.push({ speaker: 'partner', text: bubble.line.script });
    } else if (bubble.kind === 'learner' && !bubble.pending) {
      turns.push({ speaker: 'learner', text: bubble.text });
    }
  }
  return turns;
}

export default function FreeTalkSessionScreen() {
  const [params] = useSearchParams();
  const settings = useSettings((s) => s.settings);
  const updateSettings = useSettings((s) => s.update);
  const categories = useData((s) => s.categories);
  const createCategory = useData((s) => s.createCategory);
  const createDeck = useData((s) => s.createDeck);
  const createCards = useData((s) => s.createCards);

  const language = (params.get('language') ?? 'hebrew') as TalkLanguage;
  const mode = (params.get('mode') ?? 'guided') as TalkMode;

  // Fixed for the life of the conversation, exactly like a study session's
  // shape: the partner cannot change gender mid-talk, and the structures she
  // has struggled with are read once at the start.
  const [setting] = useState<TalkSetting>(() => {
    const category = wantedCategory(useData.getState().categories);
    const deck = wantedDeck(useData.getState().decks, category?.id);
    return {
      language,
      mode,
      topic: params.get('topic') ?? undefined,
      level: Math.min(5, Math.max(1, Number(params.get('level')) || 3)) as TalkLevel,
      length: (params.get('length') ?? 'normal') as TalkLength,
      learnerGender: useSettings.getState().settings.learnerGender,
      partnerGender: partnerGender(useSettings.getState().settings.listenerGenders),
      strugglePhrases: strugglePhrases(useData.getState().cards, deck?.id),
      // Read once at the start, like everything else here: a lesson finished
      // mid-conversation must not change what the partner is allowed to say
      // halfway through it.
      tensesUnlocked: tensesUnlocked(
        useData.getState().categories,
        useData.getState().decks,
        useData.getState().deckProgress,
      ),
      narrativeUnlocked: narrativeUnlocked(
        useData.getState().categories,
        useData.getState().decks,
        useData.getState().deckProgress,
      ),
      opinionsUnlocked: opinionsUnlocked(
        useData.getState().categories,
        useData.getState().decks,
        useData.getState().deckProgress,
      ),
    };
  });

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [closed, setClosed] = useState(false);
  const [review, setReview] = useState<ReviewResponse | undefined>(undefined);
  const [helpOpen, setHelpOpen] = useState<'say' | 'word' | undefined>(undefined);
  const [helpText, setHelpText] = useState('');
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  /** Whether any English help was used — the "without help" stat's question. */
  const helped = useRef(false);
  const stamped = useRef(false);
  const opened = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  const learnerTurns = bubbles.filter(
    (bubble) => bubble.kind === 'learner' && !bubble.pending,
  ).length;

  function open() {
    setError('');
    setBusy(true);
    openConversation(setting)
      .then((opening) =>
        setBubbles([
          { kind: 'partner', line: opening.reply, starters: opening.starters },
        ]),
      )
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      )
      .finally(() => setBusy(false));
  }

  // The partner speaks first.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [bubbles.length, review]);

  /** A finished conversation is stamped once, review or no review. */
  function stamp() {
    if (stamped.current || learnerTurns === 0) return;
    stamped.current = true;
    void updateSettings(
      recordConversation(settings, language, {
        turns: learnerTurns,
        helped: helped.current,
      }),
    );
  }

  async function send() {
    const message = input.trim();
    if (!message || busy || closed) return;
    setError('');
    setBusy(true);
    setInput('');
    const before = bubbles;
    setBubbles([...before, { kind: 'learner', text: message, pending: true }]);
    try {
      const turn = await sendTurn(setting, history(before), message);
      const mine: Bubble = {
        kind: 'learner',
        text: message,
        outcome: turn.outcome,
        correction: turn.correction ?? undefined,
        help: turn.help ?? undefined,
      };
      const next: Bubble[] = [...before, mine];
      if (turn.reply) {
        next.push({ kind: 'partner', line: turn.reply, starters: turn.starters });
      }
      setBubbles(next);
      if (turn.closed) {
        setClosed(true);
      }
    } catch (cause) {
      // The turn never happened: her words go back into the box to send again.
      setBubbles(before);
      setInput(message);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function teach(kind: 'say' | 'word') {
    const english = helpText.trim();
    if (!english || busy) return;
    setError('');
    setBusy(true);
    helped.current = true;
    try {
      const phrase = await askHowToSay(setting, history(bubbles), english, kind);
      setBubbles([...bubbles, { kind: 'taught', phrase, saved: false }]);
      // The taught sentence becomes her turn-in-waiting: repeating it is the
      // practice, and the conversation continues rather than resetting.
      setInput(phrase[language].script);
      setHelpOpen(undefined);
      setHelpText('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function savePhrase(index: number) {
    const bubble = bubbles[index];
    if (bubble.kind !== 'taught' || bubble.saved) return;
    let category = wantedCategory(categories);
    category ??= await createCategory(WANTED_CATEGORY_NAME, WANTED_CATEGORY_ICON);
    let deck = wantedDeck(useData.getState().decks, category.id);
    deck ??= await createDeck(
      category.id,
      WANTED_DECK_NAME,
      settings.defaultPerfectRunsRequired,
    );
    if (!alreadySaved(useData.getState().cards, deck.id, bubble.phrase.english)) {
      const count = useData
        .getState()
        .cards.filter((card) => card.deckId === deck.id).length;
      await createCards([wantedCard(bubble.phrase, category, deck, count)]);
      await updateSettings(recordPhraseSaved(settings, language));
    }
    setBubbles(
      bubbles.map((entry, at) =>
        at === index && entry.kind === 'taught' ? { ...entry, saved: true } : entry,
      ),
    );
  }

  async function endConversation() {
    if (busy) return;
    stamp();
    setClosed(true);
    setBusy(true);
    setError('');
    try {
      setReview(await fetchReview(setting, history(bubbles)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  // A closing the partner recognised stamps the record straight away, so
  // walking off without asking for the review still counts the conversation.
  useEffect(() => {
    if (closed) stamp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed]);

  function speak(line: TalkLine) {
    const service = speechService();
    if (!service.isAvailable()) return;
    void service.speak(line.script, {
      language,
      voiceId:
        language === 'hebrew' ? settings.hebrewVoiceUri : settings.arabicVoiceUri,
      rate: settings.speechRate,
    });
  }

  function reveal(index: number) {
    setRevealed((current) => new Set(current).add(index));
  }

  const showEnglish = setting.level <= 2;
  const modeTitle = setting.topic ?? 'Free Conversation';

  return (
    <div className="screen">
      <ScreenHeader title={modeTitle} eyebrow="Free Conversation" back />

      {/* The transcript. Their lines one side, hers the other. */}
      <div className="stack">
        {bubbles.map((bubble, index) => {
          if (bubble.kind === 'partner') {
            return (
              <section className="panel" key={index} style={{ marginInlineEnd: 28 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="eyebrow">They say</span>
                  <button
                    type="button"
                    className="btn btn-compact"
                    aria-label="Play the line"
                    onClick={() => speak(bubble.line)}
                  >
                    <Icon name="speaker" />
                  </button>
                </div>
                <div className={language}>{bubble.line.script}</div>
                {settings.showTransliteration && (
                  <div className="small muted">{bubble.line.transliteration}</div>
                )}
                {showEnglish || revealed.has(index) ? (
                  <div className="small muted">{bubble.line.english}</div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-compact"
                    onClick={() => reveal(index)}
                  >
                    What does that mean?
                  </button>
                )}
                {bubble.starters.length > 0 && (
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {bubble.starters.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        className="btn btn-compact"
                        onClick={() => setInput(starter)}
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          }
          if (bubble.kind === 'learner') {
            return (
              <section className="panel" key={index} style={{ marginInlineStart: 28 }}>
                <span className="eyebrow">You said</span>
                <div>{bubble.text}</div>
                {bubble.correction && (
                  <p className="small muted">
                    <strong>More natural:</strong>{' '}
                    <span className={language}>{bubble.correction.natural.script}</span>
                    {settings.showTransliteration &&
                      ' · ' + bubble.correction.natural.transliteration}
                    <br />
                    {bubble.correction.why}
                  </p>
                )}
                {bubble.help && (
                  <div className="small muted">
                    <p>{bubble.help.problem}</p>
                    {bubble.help.starters.length > 0 && (
                      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                        {bubble.help.starters.map((starter) => (
                          <button
                            key={starter}
                            type="button"
                            className="btn btn-compact"
                            onClick={() => setInput(starter)}
                          >
                            {starter}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          }
          const taughtLine = bubble.phrase[language];
          return (
            <section className="panel" key={index}>
              <span className="eyebrow">How to say it</span>
              <div className="small muted">{bubble.phrase.english}</div>
              <div className={language}>{taughtLine.script}</div>
              {settings.showTransliteration && (
                <div className="small muted">{taughtLine.transliteration}</div>
              )}
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-compact"
                  aria-label="Play the phrase"
                  onClick={() =>
                    speak({ ...taughtLine, english: bubble.phrase.english })
                  }
                >
                  <Icon name="speaker" />
                </button>
                <button
                  type="button"
                  className="btn btn-compact"
                  disabled={bubble.saved}
                  onClick={() => void savePhrase(index)}
                >
                  {bubble.saved ? 'Saved for review' : 'Save to Things I Wanted to Say'}
                </button>
              </div>
            </section>
          );
        })}
        <div ref={endRef} />
      </div>

      {busy && bubbles.length === 0 && (
        <div className="empty">
          <LevantMotif name="amphora" />
          <p className="small muted">Starting the conversation…</p>
        </div>
      )}

      {error && (
        <section className="panel">
          <p className="small muted">{error}</p>
          {bubbles.length === 0 && !busy && (
            <button type="button" className="btn btn-compact" onClick={open}>
              Try again
            </button>
          )}
        </section>
      )}

      {/* Her half: free text, and the help that never ends the conversation. */}
      {!closed && bubbles.length > 0 && (
        <section className="panel">
          <span className="eyebrow">You say</span>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder={
              language === 'hebrew'
                ? 'Answer in Hebrew — script or transliteration'
                : 'Answer in Arabic — script or transliteration'
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-compact"
              disabled={busy || input.trim() === ''}
              onClick={() => void send()}
            >
              {busy ? '…' : 'Send'}
            </button>
            <button
              type="button"
              className="btn btn-compact"
              onClick={() => setHelpOpen(helpOpen === 'say' ? undefined : 'say')}
            >
              I don&apos;t know how to say this
            </button>
            <button
              type="button"
              className="btn btn-compact"
              onClick={() => setHelpOpen(helpOpen === 'word' ? undefined : 'word')}
            >
              I need a word
            </button>
            {learnerTurns > 0 && (
              <button
                type="button"
                className="btn btn-compact"
                disabled={busy}
                onClick={() => void endConversation()}
              >
                End conversation
              </button>
            )}
          </div>

          {helpOpen && (
            <div className="stack" style={{ gap: 6 }}>
              <span className="small muted">
                {helpOpen === 'say'
                  ? 'What do you want to say? Write it in English:'
                  : 'Which word do you need? Write it in English:'}
              </span>
              <input
                type="text"
                value={helpText}
                onChange={(event) => setHelpText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void teach(helpOpen);
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-compact"
                disabled={busy || helpText.trim() === ''}
                onClick={() => void teach(helpOpen)}
              >
                Teach me
              </button>
            </div>
          )}
        </section>
      )}

      {closed && !review && (
        <section className="panel">
          <span className="eyebrow">The conversation closed</span>
          <p className="small muted">
            {learnerTurns} turn{learnerTurns === 1 ? '' : 's'} of yours
            {helped.current ? ', with a little help' : ', no English help'}.
          </p>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-compact"
              disabled={busy}
              onClick={() => void endConversation()}
            >
              {busy ? 'Looking back…' : 'See the review'}
            </button>
            <Link className="btn btn-compact" to="/freetalk">
              Back to Free Conversation
            </Link>
          </div>
        </section>
      )}

      {review && (
        <section className="panel">
          <span className="eyebrow">Conversation review</span>
          <p className="small">{review.communication}</p>
          {review.strong.length > 0 && (
            <>
              <span className="eyebrow">Strong sentences</span>
              {review.strong.map((sentence) => (
                <p className="small" key={sentence}>
                  {sentence}
                </p>
              ))}
            </>
          )}
          {review.corrections.length > 0 && (
            <>
              <span className="eyebrow">Useful corrections</span>
              {review.corrections.map((entry, at) => (
                <p className="small muted" key={at}>
                  You said: {entry.you}
                  <br />
                  More naturally:{' '}
                  <span className={language}>{entry.natural.script}</span>
                  {settings.showTransliteration &&
                    ' · ' + entry.natural.transliteration}
                  <br />
                  Why: {entry.why}
                </p>
              ))}
            </>
          )}
          {review.newLanguage.length > 0 && (
            <>
              <span className="eyebrow">New language</span>
              {review.newLanguage.map((line, at) => (
                <p className="small muted" key={at}>
                  <span className={language}>{line.script}</span>
                  {settings.showTransliteration && ' · ' + line.transliteration}
                  {' — ' + line.english}
                </p>
              ))}
            </>
          )}
          <Link className="btn btn-primary btn-block" to="/freetalk">
            Back to Free Conversation
          </Link>
        </section>
      )}
    </div>
  );
}
