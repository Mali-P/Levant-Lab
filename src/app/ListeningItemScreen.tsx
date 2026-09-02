import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Language, ListeningOutcome } from '../types';
import type { HeardTurn, ListeningItem } from '../constants/listening';
import { AMBIENCE_LABELS } from '../services/audio/ambience';
import {
  HELP_LABELS,
  helpExhausted,
  helpReached,
  itemById,
  languageForItem,
  levelOfItem,
  nextHelp,
  nextItem,
  outcomeFor,
  outcomeOf,
  playsSlowly,
  recordListening,
  shuffledTiles,
  splitAtGap,
  tilesInOrder,
  tilesOf,
  type HelpStep,
} from '../features/listening/listening';
import { useHeardAudio } from '../hooks/useHeardAudio';
import { useSettings } from '../stores/settingsStore';
import { wordForms } from '../utils/wordForms';
import ScreenHeader from '../components/controls/ScreenHeader';
import Transliteration from '../components/cards/Transliteration';
import Icon from '../components/ornament/Icon';
import { EngravedDivider, LevantMotif } from '../components/ornament/Ornament';

/**
 * One thing heard, and one question about it.
 *
 * The screen is built around a single rule: nothing written appears until she
 * asks for it or has answered. There is no transcript on the page to be caught
 * out of the corner of an eye, no English under the play button and no
 * romanisation — the first thing on the screen is a play button and a question,
 * and that is the exercise.
 *
 * Help is a ladder rather than a reveal. One button offers exactly the next rung
 * — play it again, again, slowly, one word, the text, the meaning — and pressing
 * it is what costs. The first listen is free, because it *is* the exercise;
 * everything after it is a request for help and is recorded as one.
 *
 * A wrong answer reveals nothing at all. It says so and leaves the ladder
 * exactly where it was, which is the spec's instruction in as many words: she
 * gets another go at listening before she gets the text. What a wrong answer
 * does do is fix the outcome at `wrong` for this visit — coming back tomorrow
 * and catching it first time is what improves the record, and that is the
 * behaviour worth rewarding.
 */
export default function ListeningItemScreen() {
  const { itemId = '' } = useParams();
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const languages = useSettings((s) => s.languages);

  const item = itemById(itemId);
  const level = levelOfItem(itemId);
  const language: Language = level
    ? languageForItem(level, itemId, languages)
    : 'hebrew';

  const [help, setHelp] = useState<HelpStep>('none');
  const [heard, setHeard] = useState(false);
  const [missed, setMissed] = useState(false);
  const [done, setDone] = useState(false);
  /** Her latest pick, so a wrong one can be marked without being explained. */
  const [picked, setPicked] = useState<number>();
  /** The words laid down so far, for the phrase-boundary exercise. */
  const [laid, setLaid] = useState<string[]>([]);

  const audio = useHeardAudio({
    turns: item?.heard ?? [],
    language,
    pace: level?.pace ?? 'clear',
    ambience: level?.ambience,
  });

  if (!item || !level) {
    return (
      <div className="screen">
        <ScreenHeader title="Not in this build" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This listening exercise is not in this build of the app.</p>
          <Link className="btn btn-primary" to="/listening">
            Back to Native Listening
          </Link>
        </div>
      </div>
    );
  }

  const best = outcomeOf(settings, item.id, language);
  const after = nextItem(item.id);

  const listen = () => {
    setHeard(true);
    void audio.play(false);
  };

  /** One rung up, and play again where the new rung is something to hear. */
  const askForHelp = () => {
    const step = nextHelp(help);
    setHelp(step);
    if (step === 'replayed' || step === 'replayedTwice' || step === 'slow') {
      void audio.play(playsSlowly(step));
    }
  };

  const settle = (right: boolean) => {
    if (!right) {
      setMissed(true);
      return;
    }
    setDone(true);
    void update(recordListening(settings, item.id, language, outcomeFor(help, missed)));
  };

  return (
    <div className="screen">
      <ScreenHeader
        title={level.name}
        eyebrow={'Level ' + level.rank + ' of Native Listening'}
        back
        onBack={() => navigate('/listening/level/' + level.id)}
      />

      {/* The player, and nothing beside it. */}
      <section className="panel">
        <span className="eyebrow">
          {language === 'hebrew' ? 'Hebrew' : 'Palestinian Arabic'}
          {level.pace === 'natural' ? ' · ordinary speed' : ' · carefully'}
          {level.ambience ? ' · in ' + AMBIENCE_LABELS[level.ambience] : ''}
        </span>

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={heard ? askForHelp : listen}
          disabled={audio.playing || (heard && helpExhausted(help))}
        >
          <Icon name="speaker" />{' '}
          {audio.playing ? 'Playing…' : heard ? HELP_LABELS[help] : 'Listen'}
        </button>

        {!heard ? (
          <p className="small muted">
            Listen first. Nothing is written down until you ask for it.
          </p>
        ) : (
          !done && (
            <p className="small muted">
              {helpExhausted(help)
                ? 'That is every hint there is. Have a go — a wrong answer costs nothing but this round.'
                : 'Take the next hint only if you need it. Understanding it with no help at all is what this level counts.'}
            </p>
          )
        )}
      </section>

      {/* The rungs of the ladder she has actually climbed, in its order. */}
      {!done && helpReached(help, 'keyword') && item.keyword && (
        <section className="panel">
          <span className="eyebrow">One word out of it</span>
          <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
            <strong className={language}>
              {language === 'hebrew' ? item.keyword.hebrew : item.keyword.arabic}
            </strong>
            <span className="small muted">{item.keyword.english}</span>
          </div>
        </section>
      )}

      {!done && helpReached(help, 'transcript') && (
        <section className="panel">
          <span className="eyebrow">What was said</span>
          <HeardScript turns={item.heard} language={language} withTranslit={false} />
        </section>
      )}

      {!done && helpReached(help, 'meaning') && (
        <section className="panel">
          <span className="eyebrow">What it means</span>
          {item.heard.map((turn, at) => (
            <p className="small" key={at}>
              {turn.speaker ? 'Speaker ' + turn.speaker + ': ' : ''}
              {turn.line.english}
            </p>
          ))}
        </section>
      )}

      <EngravedDivider />

      {/* The question is on screen from the start. Knowing what to listen *for*
          is part of listening, and withholding it would only buy a second play
          of the clip for no reason. */}
      <div className="eyebrow">{questionEyebrow(item)}</div>
      <p>
        <strong>{item.ask}</strong>
      </p>

      {item.kind === 'missing' && item.gap ? (
        <MissingWord
          item={item}
          language={language}
          done={done}
          missed={missed}
          onPick={settle}
        />
      ) : item.kind === 'boundaries' ? (
        <PhraseBoundaries
          item={item}
          language={language}
          laid={laid}
          setLaid={setLaid}
          done={done}
          missed={missed}
          onCheck={settle}
        />
      ) : (
        <div className="option-grid">
          {item.options.map((option, at) => (
            <button
              key={at}
              type="button"
              className={
                'btn option' +
                (done && at === item.correct ? ' option-correct' : '') +
                (done && at !== item.correct ? ' option-dim' : '') +
                (!done && missed && picked === at ? ' option-wrong' : '')
              }
              disabled={done}
              onClick={() => {
                setPicked(at);
                settle(at === item.correct);
              }}
            >
              <span className="option-name">{option}</span>
            </button>
          ))}
        </div>
      )}

      {missed && !done && (
        <section className="panel">
          <span className="eyebrow">Not that one</span>
          <p className="small muted">
            Have another listen before you pick again. The text is still there to
            ask for, but it is worth one more go with your ears first.
          </p>
        </section>
      )}

      {done && (
        <Review
          item={item}
          language={language}
          best={best}
          playing={audio.playing}
          onListenAgain={() => void audio.play(false)}
          next={after?.id}
          levelId={level.id}
        />
      )}
    </div>
  );
}

/** What kind of listening this is, said in three words above the question. */
function questionEyebrow(item: ListeningItem): string {
  switch (item.kind) {
    case 'recognise':
      return 'What did you hear?';
    case 'reworded':
      return 'Said another way';
    case 'keyfact':
      return 'Catch the one thing';
    case 'missing':
      return 'The word that went missing';
    case 'boundaries':
      return 'Where the words divide';
    case 'exchange':
      return 'Two people';
    case 'reply':
      return 'What would you say back?';
  }
}

/**
 * The transcript, in the one language she heard.
 *
 * One language, because that is what was said. Putting the other beside it would
 * turn a listening review into a reading comparison and would show her a
 * sentence nobody uttered. The romanisation is hoverable exactly as it is on a
 * card, so a word she did not catch can be asked about on the spot.
 */
function HeardScript({
  turns,
  language,
  withTranslit,
}: {
  turns: HeardTurn[];
  language: Language;
  withTranslit: boolean;
}) {
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const showTransliteration = useSettings((s) => s.settings.showTransliteration);

  return (
    <div className="stack" style={{ gap: 8 }}>
      {turns.map((turn, at) => {
        const side = language === 'hebrew' ? turn.line.hebrew : turn.line.arabic;
        const form = wordForms(side, perspectives, lead)[0];
        if (!form) return null;

        return (
          <div key={at}>
            {turn.speaker && <span className="eyebrow">Speaker {turn.speaker}</span>}
            <div className={language}>{form.script}</div>
            {withTranslit && showTransliteration && form.transliteration && (
              <Transliteration block text={form.transliteration} language={language} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The transcript with one word cut out of it, and words to put back.
 *
 * The gapped line is on screen from the start, which looks like a contradiction
 * of the audio-first rule and is not: without it there is no exercise, only a
 * vocabulary question. What is withheld is the romanisation and the English,
 * which is where the answer would otherwise be legible without listening at all.
 */
function MissingWord({
  item,
  language,
  done,
  missed,
  onPick,
}: {
  item: ListeningItem;
  language: Language;
  done: boolean;
  missed: boolean;
  onPick: (right: boolean) => void;
}) {
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const [tried, setTried] = useState<string>();

  const gap = item.gap?.[language];
  const turn = item.heard[0];
  const side = language === 'hebrew' ? turn.line.hebrew : turn.line.arabic;
  const form = wordForms(side, perspectives, lead)[0];

  // Seeded off the words themselves, so the board does not rearrange itself
  // under her between renders and a second attempt meets the same one.
  const choices = useMemo(
    () => (gap ? shuffledTiles([gap.word, ...gap.others].join(' ')) : []),
    [gap],
  );

  if (!gap || !form) return null;
  const split = splitAtGap(form.script, gap.word);

  return (
    <div className="stack">
      <section className="panel">
        <div className={language + ' listen-gapped'}>
          {split ? (
            <>
              {split.before}
              <span className="listen-blank" aria-label="the missing word">
                &#8943;
              </span>
              {split.after}
            </>
          ) : (
            form.script
          )}
        </div>
      </section>

      <div className="listen-tiles">
        {choices.map((word) => (
          <button
            key={word}
            type="button"
            className={
              'btn btn-compact listen-tile ' +
              language +
              (done && word === gap.word ? ' option-correct' : '') +
              (!done && missed && tried === word ? ' option-wrong' : '')
            }
            disabled={done}
            onClick={() => {
              setTried(word);
              onPick(word === gap.word);
            }}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The words of the phrase, out of order, to be laid back down.
 *
 * Tapping a word lays it down; tapping a laid word picks it up again. No drag,
 * deliberately — the ordering modules elsewhere in the app drag because they are
 * about sequence in the abstract, and this one is about a sound she is trying to
 * hold in her head, which a long gesture is very good at knocking out of it.
 */
function PhraseBoundaries({
  item,
  language,
  laid,
  setLaid,
  done,
  missed,
  onCheck,
}: {
  item: ListeningItem;
  language: Language;
  laid: string[];
  setLaid: (words: string[]) => void;
  done: boolean;
  missed: boolean;
  onCheck: (right: boolean) => void;
}) {
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const turn = item.heard[0];
  const side = language === 'hebrew' ? turn.line.hebrew : turn.line.arabic;
  const form = wordForms(side, perspectives, lead)[0];

  const pool = useMemo(() => (form ? shuffledTiles(form.script) : []), [form]);

  if (!form) return null;

  // Spent by count rather than removed by value, so a phrase that says the same
  // word twice still offers it twice.
  const spent = new Map<string, number>();
  for (const word of laid) spent.set(word, (spent.get(word) ?? 0) + 1);

  const remaining: string[] = [];
  for (const word of pool) {
    const left = spent.get(word) ?? 0;
    if (left > 0) spent.set(word, left - 1);
    else remaining.push(word);
  }

  const full = laid.length === tilesOf(form.script).length;

  return (
    <div className="stack">
      <section className="panel">
        <span className="eyebrow">In the order you heard them</span>
        <div className={'listen-tiles ' + language}>
          {laid.length === 0 && (
            <span className="small muted">Tap the words below, first to last.</span>
          )}
          {laid.map((word, at) => (
            <button
              key={word + at}
              type="button"
              className={
                'btn btn-compact listen-tile ' +
                language +
                (done ? ' option-correct' : '')
              }
              disabled={done}
              onClick={() => setLaid(laid.filter((_kept, index) => index !== at))}
            >
              {word}
            </button>
          ))}
        </div>
      </section>

      {remaining.length > 0 && (
        <div className={'listen-tiles ' + language}>
          {remaining.map((word, at) => (
            <button
              key={word + at}
              type="button"
              className={'btn btn-compact listen-tile ' + language}
              disabled={done}
              onClick={() => setLaid([...laid, word])}
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {!done && (
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!full}
          onClick={() => onCheck(tilesInOrder(laid, form.script))}
        >
          {full ? 'That is the order' : 'Lay down every word first'}
        </button>
      )}

      {missed && !done && (
        <p className="small muted">
          Close. Move one and try again — or listen once more first.
        </p>
      )}
    </div>
  );
}

/**
 * The answer review: what was said, how it is written, what it meant, and the
 * clip once more with all three of those on the screen.
 *
 * That last replay is the part that teaches. She has already decided what she
 * thought she heard; playing it again against the written line is what attaches
 * the sounds she stumbled over to the words they turned out to be.
 */
function Review({
  item,
  language,
  best,
  playing,
  onListenAgain,
  next,
  levelId,
}: {
  item: ListeningItem;
  language: Language;
  best: ListeningOutcome | undefined;
  playing: boolean;
  onListenAgain: () => void;
  next: string | undefined;
  levelId: string;
}) {
  return (
    <>
      <EngravedDivider />

      <section className="panel">
        <span className="eyebrow">What you heard</span>
        <HeardScript turns={item.heard} language={language} withTranslit />
      </section>

      <section className="panel">
        <span className="eyebrow">What it means</span>
        {item.heard.map((turn, at) => (
          <p className="small" key={at}>
            {turn.speaker ? 'Speaker ' + turn.speaker + ': ' : ''}
            {turn.line.english}
          </p>
        ))}
        {item.because && <p className="small muted">{item.because}</p>}
      </section>

      <button
        type="button"
        className="btn btn-block"
        onClick={onListenAgain}
        disabled={playing}
      >
        <Icon name="speaker" />{' '}
        {playing ? 'Playing…' : 'Listen again, with the text in front of you'}
      </button>

      {item.variations && item.variations.length > 0 && (
        <section className="panel">
          <span className="eyebrow">Other ways people say it</span>
          {item.variations.map((variation, at) => (
            <div className="stack" key={at} style={{ gap: 4, marginTop: at ? 12 : 6 }}>
              <span className="small muted">{variation.what}</span>
              <HeardScript
                turns={[{ line: variation.line }]}
                language={language}
                withTranslit
              />
              <span className="small">{variation.line.english}</span>
              <span className="small muted">{variation.note}</span>
            </div>
          ))}
        </section>
      )}

      <section className="panel">
        <span className="eyebrow">Filed as</span>
        <strong>{best ? outcomeText(best) : 'Heard'}</strong>
        <p className="small muted">
          Your best on this one, in this language. Come back another day and catch
          it with no help and it moves up.
        </p>
      </section>

      {next ? (
        <Link className="btn btn-primary btn-block" to={'/listening/item/' + next}>
          Next one
        </Link>
      ) : (
        <Link className="btn btn-primary btn-block" to={'/listening/level/' + levelId}>
          That was the last of this level
        </Link>
      )}
    </>
  );
}

function outcomeText(outcome: ListeningOutcome): string {
  switch (outcome) {
    case 'first':
      return 'Understood on the first listen';
    case 'replay':
      return 'Understood after a replay';
    case 'slow':
      return 'Needed it slowed down';
    case 'transcript':
      return 'Needed to see it written';
    case 'wrong':
      return 'Not caught yet';
  }
}
