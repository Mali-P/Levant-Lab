import { Link, useParams } from 'react-router-dom';
import type { Flashcard, Language, LanguageSide } from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { addedPiece, chainsOf, chainSteps } from '../features/sentences/chains';
import {
  deckStage,
  gateCategoryDecks,
  isSentenceCategory,
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
 * One chain read as it grows: the stem, then each step with the piece it adds
 * set apart, in both scripts, with the words of every transliteration
 * hoverable for what they mean on their own.
 *
 * This screen is the pedagogy. The study ladder will deal these same cards in
 * this same order, but a learner should first *see* the sentence being built
 * out of words she already owns — which is why every step is on one page, the
 * new piece is marked, and nothing here is scored. The practise buttons at the
 * foot hand over to the ordinary study screen, one language rung at a time.
 */
export default function SentenceChainScreen() {
  const { deckId = '' } = useParams();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);
  const languages = useSettings((s) => s.languages);
  const showTransliteration = useSettings((s) => s.settings.showTransliteration);

  const entry = decks.find((deck) => deck.id === deckId);
  const category = categories.find((c) => c.id === entry?.categoryId);
  const groupDecks = category
    ? decks.filter((deck) => deck.categoryId === category.id)
    : [];
  const chain = chainsOf(groupDecks).find((lot) =>
    lot.decks.some((deck) => deck.id === deckId),
  );

  if (!entry || !category || !chain || !isSentenceCategory(category)) {
    return (
      <div className="screen">
        <ScreenHeader title="Chain not found" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This sentence chain is not on this device.</p>
          <Link className="btn btn-primary" to="/sentences">
            Back to Sentence Building
          </Link>
        </div>
      </div>
    );
  }

  const steps = chainSteps(chain, cards);
  // The rungs' locks, worked out by the same rule every staged lot follows:
  // Hebrew first, then Arabic, then both together.
  const gates = gateCategoryDecks(category, groupDecks, deckProgress, languages);
  const rungGates = chain.decks
    .map((deck) => gates.find((gate) => gate.deck.id === deck.id))
    .filter((gate): gate is DeckGate => Boolean(gate));

  return (
    <div className="screen">
      <ScreenHeader title={chain.name} eyebrow={category.name} back />

      <p className="small muted">
        Read the sentence growing first — the marked words are what each step
        adds. A step with nothing marked swaps a piece instead, which is how the
        same frame carries different words.
      </p>

      <div className="stack">
        {steps.map((card, index) => (
          <ChainStep
            key={card.id}
            card={card}
            index={index}
            previous={steps[index - 1]?.english}
            showTransliteration={showTransliteration}
          />
        ))}
      </div>

      <section className="panel">
        <span className="eyebrow">Practise this chain</span>
        {rungGates.map((gate) => (
          <RungRow key={gate.deck.id} gate={gate} />
        ))}
      </section>
    </div>
  );
}

function ChainStep({
  card,
  index,
  previous,
  showTransliteration,
}: {
  card: Flashcard;
  index: number;
  previous?: string;
  showTransliteration: boolean;
}) {
  const added = addedPiece(previous, card.english);
  const base = added
    ? card.english.slice(0, card.english.length - added.length).trimEnd()
    : card.english;

  return (
    <section className="panel">
      <div className="eyebrow">Step {index + 1}</div>
      <div className="english">
        <strong>
          {added ? (
            <>
              <span className="muted">{base}</span>{' '}
              <u>{added}</u>
            </>
          ) : (
            card.english
          )}
        </strong>
      </div>
      <StepSide card={card} language="hebrew" show={showTransliteration} />
      <StepSide card={card} language="arabic" show={showTransliteration} />
    </section>
  );
}

/**
 * One language of one step: every form the learner's own perspectives call
 * for, each with its script, its glossed romanisation, and its speaker.
 */
function StepSide({
  card,
  language,
  show,
}: {
  card: Flashcard;
  language: Language;
  show: boolean;
}) {
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const languages = useSettings((s) => s.languages);

  if (!languages.includes(language)) return null;

  const side: LanguageSide = card[language];
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

/** One rung of the chain: its state, its runs, and the way in. */
function RungRow({ gate }: { gate: DeckGate }) {
  const stage = deckStage(gate.deck);
  const label =
    stage === 'arabic'
      ? 'Palestinian Arabic'
      : stage === 'both'
        ? 'Both together'
        : 'Hebrew';
  const before =
    gate.blockedBy && deckStage(gate.blockedBy) === 'arabic'
      ? 'Arabic'
      : 'Hebrew';

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
