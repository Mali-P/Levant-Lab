import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { gateCategoryDecks } from '../features/review/languagePolicy';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

/**
 * A category's decks, on the Review side.
 *
 * Practice's version of this screen leads to a mode picker, because there the
 * next question is how the learner wants to be asked. Here there is no such
 * question: tapping a deck opens its cards. That is the whole difference
 * between the two screens, and it is why this one exists rather than a flag on
 * the other.
 *
 * The plus is the same standing choice it always was — which decks the tab
 * deals as one pile — but it now lives on this side of the app, where the
 * learner is already thinking about reading rather than about being tested. It
 * is a button inside the row rather than part of the row's link, so tapping it
 * never leads anywhere.
 */
export default function ReviewCategoryScreen() {
  const { categoryId = '' } = useParams();
  const navigate = useNavigate();

  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);
  const update = useSettings((s) => s.update);
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);

  const category = categories.find((c) => c.id === categoryId);
  const gates = gateCategoryDecks(
    category,
    decks.filter((d) => d.categoryId === categoryId),
    deckProgress,
    languages,
  );

  const picked = settings.memoriseDeckIds ?? [];

  function togglePile(deckId: string) {
    const next = picked.includes(deckId)
      ? picked.filter((id) => id !== deckId)
      : [...picked, deckId];
    void update({ memoriseDeckIds: next });
  }

  // Up a level, not back a step. A deck's own arrow lands here by navigating
  // rather than by popping history, so the entry behind this screen is usually
  // the deck itself — navigate(-1) would hand the learner straight back to the
  // card she just left. The arrow means "out to the categories", so it says so.
  const toBrowse = () => navigate('/memorise');

  if (!category) {
    return (
      <div className="screen">
        <ScreenHeader title="Category not found" back onBack={toBrowse} />
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader
        title={category.name}
        eyebrow="Review"
        back
        onBack={toBrowse}
      />

      {gates.length === 0 && (
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>No decks here yet.</p>
          <Link className="btn btn-primary" to="/manage">
            Add cards
          </Link>
        </div>
      )}

      <div className="list">
        {gates.map((gate) => {
          const deck = gate.deck;
          const count = cards.filter((c) => c.deckId === deck.id).length;
          const inPile = picked.includes(deck.id);

          // A locked deck is drawn but not opened. Review grades nothing, so
          // the ladder is not about scores here — it is the order the decks are
          // meant to be met in, and handing somebody deck seven before she has
          // opened deck one would undo it.
          if (!gate.unlocked) {
            return (
              <div className="list-item" key={deck.id} aria-disabled="true">
                <span className="icon" aria-hidden="true">
                  <Icon name="lock" />
                </span>
                <span className="grow">
                  <strong>{deck.name}</strong>
                  <div className="small muted">
                    Opens once {gate.blockedBy!.name} is mastered.
                  </div>
                </span>
              </div>
            );
          }

          return (
            <div className="category-row" key={deck.id}>
              <Link className="list-item grow" to={'/memorise/' + deck.id}>
                <span className="grow">
                  <strong>{deck.name}</strong>
                  <div className="small muted">
                    {count} {count === 1 ? 'card' : 'cards'}
                    {inPile && ' · in your selection'}
                  </div>
                </span>
                <Icon name="forward" className="chevron" />
              </Link>

              <button
                type="button"
                className={'memorise-add' + (inPile ? ' on' : '')}
                aria-pressed={inPile}
                aria-label={
                  (inPile ? 'Remove ' : 'Add ') +
                  deck.name +
                  (inPile
                    ? ' from your Review selection'
                    : ' to your Review selection')
                }
                title={inPile ? 'In your selection' : 'Add to your selection'}
                onClick={() => togglePile(deck.id)}
              >
                <Icon name={inPile ? 'check' : 'plus'} />
              </button>
            </div>
          );
        })}
      </div>

      {gates.length > 0 && (
        <p className="small muted">
          Tap a deck to read it. The plus adds it to the selection Review deals
          as one pile.
        </p>
      )}
    </div>
  );
}
