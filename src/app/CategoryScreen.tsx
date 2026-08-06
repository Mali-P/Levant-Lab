import { Link, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { statusFor, STATUS_LABELS } from '../features/review/mastery';
import { gateDecks } from '../features/review/unlock';
import ScreenHeader from '../components/controls/ScreenHeader';
import PerfectRuns from '../components/progress/PerfectRuns';
import WordForms from '../components/cards/WordForms';

export default function CategoryScreen() {
  const { categoryId = '' } = useParams();
  const settings = useSettings((s) => s.settings);
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const cardProgress = useData((s) => s.cardProgress);
  const deckProgress = useData((s) => s.deckProgress);

  const category = categories.find((c) => c.id === categoryId);
  const gates = gateDecks(
    decks.filter((d) => d.categoryId === categoryId),
    deckProgress,
  );
  const now = new Date().toISOString();

  if (!category) {
    return (
      <div className="screen">
        <ScreenHeader title="Category not found" back />
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader title={category.name} eyebrow="Category" back />

      {gates.length === 0 && (
        <div className="empty">
          <p>No decks here yet.</p>
          <Link className="btn btn-primary" to="/manage">Add cards</Link>
        </div>
      )}

      {gates.map((gate) => {
        const deck = gate.deck;
        const deckCards = cards.filter((c) => c.deckId === deck.id);
        const statuses = deckCards.map((c) =>
          statusFor(cardProgress[c.id], now, settings.enableMasteryDecay),
        );
        const mastered = statuses.filter((s) => s === 'mastered').length;
        const needsReview = statuses.filter(
          (s) => s === 'rusty' || s === 'needs-review' || s === 'forgotten',
        ).length;
        const progress = deckProgress[deck.id];

        return (
          <section
            className={'panel' + (gate.unlocked ? '' : ' locked')}
            key={deck.id}
          >
            <div className="spread">
              <div>
                <div className="eyebrow">
                  Deck {gate.position} of {gates.length} · {deck.name}
                </div>
                <div className="small muted">
                  {deckCards.length} cards · {mastered} mastered · {needsReview} need review
                </div>
              </div>
              {gate.unlocked ? (
                progress?.hardModePassedAt && <span className="chip chip-ok">Passed</span>
              ) : (
                <span className="chip">🔒 Locked</span>
              )}
            </div>

            <PerfectRuns
              completed={gate.perfectRunsCompleted}
              required={gate.perfectRunsRequired}
            />

            {gate.unlocked ? (
              <div className="row">
                <Link className="btn btn-primary grow" to={'/study/' + deck.id + '?mode=normal'}>
                  Normal
                </Link>
                <Link className="btn grow" to={'/study/' + deck.id + '?mode=hard'}>
                  Hard
                </Link>
                <Link className="btn grow" to={'/study/' + deck.id + '?mode=brutal'}>
                  Brutal
                </Link>
              </div>
            ) : (
              <p className="small muted">
                Opens once <strong>{gate.blockedBy!.name}</strong> is mastered —{' '}
                {gate.perfectRunsRequired} flawless runs through it.
              </p>
            )}

            {deckCards.length > 0 && gate.unlocked && (
              <details>
                <summary className="small muted">Card status</summary>
                <div className="list" style={{ marginTop: 10 }}>
                  {deckCards.map((card, i) => (
                    <Link className="list-item" key={card.id} to={'/manage/card/' + card.id}>
                      <span className="grow english">
                        <strong>{card.english}</strong>
                        <div className="small muted">{STATUS_LABELS[statuses[i]]}</div>
                      </span>
                      <WordForms side={card.hebrew} language="hebrew" />
                      <WordForms side={card.arabic} language="arabic" />
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}
