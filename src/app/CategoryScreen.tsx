import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Deck } from '../types';
import { CUSTOM_CATEGORY } from '../constants/seed';
import { uid } from '../utils/random';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { statusFor, STATUS_LABELS } from '../features/review/mastery';
import { gateDecks } from '../features/review/unlock';
import ScreenHeader from '../components/controls/ScreenHeader';
import PerfectRuns from '../components/progress/PerfectRuns';
import WordForms from '../components/cards/WordForms';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

export default function CategoryScreen() {
  const { categoryId = '' } = useParams();
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const cardProgress = useData((s) => s.cardProgress);
  const deckProgress = useData((s) => s.deckProgress);
  const saveCard = useData((s) => s.saveCard);

  const category = categories.find((c) => c.id === categoryId);
  const gates = gateDecks(
    decks.filter((d) => d.categoryId === categoryId),
    deckProgress,
  );
  const now = new Date().toISOString();

  // The learner's own category is the one place a card can be started from
  // outside the manage screen, so the sentences kept there can be added while
  // reading the deck they belong to.
  const own = category?.name === CUSTOM_CATEGORY;

  /**
   * Opens a blank card in the chosen deck. It is written before the editor
   * loads because the editor addresses a card by id; an empty row is harmless
   * and shows as "Untitled card" until it is filled in.
   */
  async function addSentence(deck: Deck) {
    const id = uid('card');
    const stamp = new Date().toISOString();
    await saveCard({
      id,
      deckId: deck.id,
      categoryId: deck.categoryId,
      english: '',
      hebrew: { script: '' },
      // The dialect the rest of this deck is written in; the editor can change it.
      arabic: { script: '', dialect: 'Palestinian' },
      createdAt: stamp,
      updatedAt: stamp,
    });
    navigate('/manage/card/' + id);
  }

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
          <LevantMotif name="amphora" />
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
                <span className="chip">
                  <Icon name="lock" /> Locked
                </span>
              )}
            </div>

            <PerfectRuns
              completed={gate.perfectRunsCompleted}
              required={gate.perfectRunsRequired}
            />

            {gate.unlocked ? (
              // One way in, so a deck always offers Memorise before it offers
              // a test. The modes themselves live on the picker.
              <Link className="btn btn-primary btn-block" to={'/deck/' + deck.id}>
                Study this deck
              </Link>
            ) : (
              <p className="small muted">
                Opens once <strong>{gate.blockedBy!.name}</strong> is mastered —{' '}
                {gate.perfectRunsRequired} flawless runs through it.
              </p>
            )}

            {own && (
              <button className="btn btn-block" onClick={() => addSentence(deck)}>
                Add a sentence
              </button>
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
