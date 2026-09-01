import { Link, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import type { SituationNode } from '../constants/situations';
import {
  situationFor,
  situationParts,
} from '../features/situations/situations';
import {
  deckStage,
  gateCategoryDecks,
  isSituationCategory,
  type Lot,
} from '../features/review/languagePolicy';
import type { DeckGate } from '../features/review/unlock';
import ScreenHeader from '../components/controls/ScreenHeader';
import ScriptSides from '../components/cards/ScriptSides';
import PerfectRuns from '../components/progress/PerfectRuns';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

/**
 * One scenario, read as the interaction it is, before any of it is practised.
 *
 * Three movements, in the order she should take them. First the read-through:
 * the whole conversation laid out, their lines against every honest reply, so
 * she can see the shape of the interaction and where it forks. Then the
 * practice: each part's language rungs, dealt by the ordinary study ladder.
 * Last the rehearsal, which is the point of the level — the same conversation
 * with the answers taken away, steered by her.
 */
export default function SituationScreen() {
  const { categoryId = '' } = useParams();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);
  const languages = useSettings((s) => s.languages);
  const rehearsals = useSettings((s) => s.settings.situationRehearsals) ?? {};

  const category = categories.find((c) => c.id === categoryId);
  const situation = situationFor(category);

  if (!category || !situation || !isSituationCategory(category)) {
    return (
      <div className="screen">
        <ScreenHeader title="Scenario not found" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This scenario is not on this device.</p>
          <Link className="btn btn-primary" to="/situations">
            Back to Real Situations
          </Link>
        </div>
      </div>
    );
  }

  const scenarioDecks = decks.filter((deck) => deck.categoryId === category.id);
  const parts = situationParts(scenarioDecks);
  const gates = gateCategoryDecks(category, scenarioDecks, deckProgress, languages);
  const rehearsedAt = rehearsals[category.name.toLowerCase()];

  return (
    <div className="screen">
      <ScreenHeader title={category.name} eyebrow="Real Situations" back />

      <section className="panel">
        <span className="eyebrow">The situation</span>
        <p className="small">{situation.scene}</p>
        <p className="small muted">
          <strong>Your goal:</strong> {situation.goal}
        </p>
      </section>

      <p className="small muted">
        Read it through first. The lines marked “they say” are said to you; the
        replies are yours, and where more than one is offered, every one of
        them honestly works — different answers simply take the conversation
        different ways.
      </p>

      <div className="stack">
        {situation.script.map((entry) => (
          <ScriptBeat key={entry.id} node={entry} />
        ))}
      </div>

      <section className="panel">
        <span className="eyebrow">Practise your lines</span>
        <p className="small muted">
          Each part grows one reply at a time — Hebrew, then Palestinian
          Arabic, then both — so more of the interaction falls to you as you
          go.
        </p>
        {parts.map((lot) => (
          <PartRows key={lot.key} lot={lot} gates={gates} />
        ))}
      </section>

      <section className="panel">
        <span className="eyebrow">Rehearse it</span>
        <p className="small muted">
          The same conversation with the answers taken away: they speak, you
          choose what to say, and your answer decides what comes next.
          {rehearsedAt && ' You have already got through this one.'}
        </p>
        <Link
          className="btn btn-primary btn-block"
          to={'/situations/rehearse/' + category.id}
        >
          {rehearsedAt ? 'Rehearse it again' : 'Start the rehearsal'}
        </Link>
      </section>
    </div>
  );
}

/** One beat of the conversation: their line, and every reply that works. */
function ScriptBeat({ node }: { node: SituationNode }) {
  const single = node.choices.length === 1;

  return (
    <>
      <section className="panel" style={{ marginInlineEnd: 28 }}>
        <div className="eyebrow">They say</div>
        <div className="english">
          <strong>{node.them.english}</strong>
        </div>
        <ScriptSides card={node.them} />
      </section>
      {node.choices.map((choice, index) => (
        <section
          className="panel"
          key={choice.card.english + index}
          style={{ marginInlineStart: 28 }}
        >
          <div className="eyebrow">{single ? 'You say' : 'You could say'}</div>
          <div className="english">
            <strong>{choice.card.english}</strong>
          </div>
          <ScriptSides card={choice.card} />
        </section>
      ))}
    </>
  );
}

/** One part's three rungs, with the same locks every staged lot follows. */
function PartRows({ lot, gates }: { lot: Lot; gates: DeckGate[] }) {
  const rungGates = lot.decks
    .map((deck) => gates.find((gate) => gate.deck.id === deck.id))
    .filter((gate): gate is DeckGate => Boolean(gate));

  return (
    <div className="stack" style={{ gap: 6 }}>
      <strong>{lot.name}</strong>
      {rungGates.map((gate) => (
        <RungRow key={gate.deck.id} gate={gate} />
      ))}
    </div>
  );
}

/** One rung: its state, its runs, and the way in. */
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
    <div className="spread">
      <span className="row" style={{ gap: 8 }}>
        <span>{label}</span>
        {gate.mastered && <span className="chip chip-ok">Mastered</span>}
        {!gate.mastered && gate.perfectRunsCompleted > 0 && (
          <PerfectRuns
            completed={gate.perfectRunsCompleted}
            required={gate.perfectRunsRequired}
          />
        )}
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
  );
}
