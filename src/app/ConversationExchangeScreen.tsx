import { Link, useParams } from 'react-router-dom';
import type { Language, LanguageSide } from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import {
  exchangeTurns,
  exchangesOf,
  isBranching,
  transcript,
  type TranscriptLine,
} from '../features/conversations/exchanges';
import {
  deckStage,
  gateCategoryDecks,
  isConversationCategory,
} from '../features/review/languagePolicy';
import type { DeckGate } from '../features/review/unlock';
import { wordForms } from '../utils/wordForms';
import ScreenHeader from '../components/controls/ScreenHeader';
import SpeakerButton from '../components/controls/SpeakerButton';
import Transliteration from '../components/cards/Transliteration';
import PerfectRuns from '../components/progress/PerfectRuns';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

/**
 * One exchange read as the conversation it is, before any of it is practised.
 *
 * This screen is the pedagogy. The study ladder will deal these same turns in
 * this same order, growing what it asks for one turn at a time — but a learner
 * should first *see* the whole exchange run, the questions ranged against her
 * answers, so she can tell what she will be expected to produce and what will
 * merely be said to her. Nothing here is scored, and the questions never are:
 * they are hers to understand, not to reproduce.
 *
 * The two sides are set apart by indent rather than by colour alone, and each
 * carries a label saying whose line it is, so the alternation survives a
 * greyscale screen and a screen reader alike.
 */
export default function ConversationExchangeScreen() {
  const { deckId = '' } = useParams();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);
  const languages = useSettings((s) => s.languages);

  const entry = decks.find((deck) => deck.id === deckId);
  const category = categories.find((c) => c.id === entry?.categoryId);
  const groupDecks = category
    ? decks.filter((deck) => deck.categoryId === category.id)
    : [];
  const exchange = exchangesOf(groupDecks).find((lot) =>
    lot.decks.some((deck) => deck.id === deckId),
  );

  if (!entry || !category || !exchange || !isConversationCategory(category)) {
    return (
      <div className="screen">
        <ScreenHeader title="Exchange not found" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This exchange is not on this device.</p>
          <Link className="btn btn-primary" to="/conversations">
            Back to Conversation Flow
          </Link>
        </div>
      </div>
    );
  }

  const turns = exchangeTurns(exchange, cards);
  const lines = transcript(turns);
  const branching = isBranching(turns);

  // The rungs' locks, worked out by the same rule every staged lot follows:
  // Hebrew first, then Arabic, then both together.
  const gates = gateCategoryDecks(category, groupDecks, deckProgress, languages);
  const rungGates = exchange.decks
    .map((deck) => gates.find((gate) => gate.deck.id === deck.id))
    .filter((gate): gate is DeckGate => Boolean(gate));

  return (
    <div className="screen">
      <ScreenHeader title={exchange.name} eyebrow={category.name} back />

      <p className="small muted">
        {branching
          ? 'One question, and every answer that honestly works. You will be asked for each of them in turn — none of them is the right one.'
          : 'Read the exchange through first. The lines marked “they say” are said to you; the rest are yours, and those are the only ones you are ever asked for.'}
      </p>

      <div className="stack">
        {lines.map((line, index) =>
          line.who === 'theirs' ? (
            <TheirLine key={'them-' + index} line={line} />
          ) : (
            <HerLine key={line.card.id} line={line} numbered={!branching} />
          ),
        )}
      </div>

      <section className="panel">
        <span className="eyebrow">Practise this exchange</span>
        <p className="small muted">
          Each rung grows one turn at a time, so more of the conversation falls
          to you as you go.
        </p>
        {rungGates.map((gate) => (
          <RungRow key={gate.deck.id} gate={gate} />
        ))}
      </section>
    </div>
  );
}

/** A line said to the learner: set apart, and never something she is asked for. */
function TheirLine({ line }: { line: Extract<TranscriptLine, { who: 'theirs' }> }) {
  const showTransliteration = useSettings((s) => s.settings.showTransliteration);

  return (
    <section className="panel" style={{ marginInlineEnd: 28 }}>
      <div className="eyebrow">They say</div>
      <div className="english">
        <strong>{line.english}</strong>
      </div>
      <Side side={line.hebrew} language="hebrew" show={showTransliteration} />
      <Side side={line.arabic} language="arabic" show={showTransliteration} />
    </section>
  );
}

/** A line she gives back. This is the card, and the thing she is graded on. */
function HerLine({
  line,
  numbered,
}: {
  line: Extract<TranscriptLine, { who: 'hers' }>;
  numbered: boolean;
}) {
  const showTransliteration = useSettings((s) => s.settings.showTransliteration);

  return (
    <section className="panel" style={{ marginInlineStart: 28 }}>
      <div className="eyebrow">
        {numbered ? 'You say · turn ' + line.turn : 'You could say'}
      </div>
      <div className="english">
        <strong>{line.english}</strong>
      </div>
      <Side side={line.card.hebrew} language="hebrew" show={showTransliteration} />
      <Side side={line.card.arabic} language="arabic" show={showTransliteration} />
    </section>
  );
}

/**
 * One language of one line: every form the learner's own perspectives call for,
 * each with its script, its glossed romanisation, and its speaker.
 */
function Side({
  side,
  language,
  show,
}: {
  side: LanguageSide;
  language: Language;
  show: boolean;
}) {
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const languages = useSettings((s) => s.languages);

  if (!languages.includes(language)) return null;
  if (!side.script) return null;
  const forms = wordForms(side, perspectives, lead);

  return (
    <div className="stack" style={{ gap: 4 }}>
      {forms.map((form) => (
        <div
          className="row"
          key={form.key}
          style={{ alignItems: 'baseline', gap: 8 }}
        >
          {form.marker && (
            <span className="form-marker" aria-label={form.label}>
              {form.marker}
            </span>
          )}
          <span className="grow">
            <span className={language}>{form.script}</span>
            {show && form.transliteration && (
              <Transliteration
                block
                text={form.transliteration}
                language={language}
              />
            )}
          </span>
          <SpeakerButton form={form} language={language} />
        </div>
      ))}
    </div>
  );
}

/** One rung of the exchange: its state, its runs, and the way in. */
function RungRow({ gate }: { gate: DeckGate }) {
  const stage = deckStage(gate.deck);
  const label =
    stage === 'arabic'
      ? 'Palestinian Arabic'
      : stage === 'both'
        ? 'Both together'
        : 'Hebrew';
  const before =
    gate.blockedBy && deckStage(gate.blockedBy) === 'arabic' ? 'Arabic' : 'Hebrew';

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="spread">
        <span className="row" style={{ gap: 8 }}>
          <strong>{label}</strong>
          {gate.mastered && <span className="chip chip-ok">Mastered</span>}
        </span>
        {gate.unlocked ? (
          <Link
            className="btn btn-primary btn-compact"
            to={'/study/' + gate.deck.id + '?mode=normal'}
          >
            {gate.mastered ? 'Revise' : 'Practise'}
          </Link>
        ) : (
          <span className="chip">
            <Icon name="lock" /> After {before}
          </span>
        )}
      </div>
      {!gate.mastered && gate.perfectRunsCompleted > 0 && (
        <PerfectRuns
          completed={gate.perfectRunsCompleted}
          required={gate.perfectRunsRequired}
        />
      )}
    </div>
  );
}
