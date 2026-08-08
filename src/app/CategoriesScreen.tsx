import { Link } from 'react-router-dom';
import type { Category } from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { gateDecks, type DeckGate } from '../features/review/unlock';
import { memoriseCategories } from '../features/memorise/selection';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { categoryIcon } from '../components/ornament/Ornament';

export default function CategoriesScreen() {
  const categories = useData((s) => s.categories);
  const cards = useData((s) => s.cards);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);

  // What the Memorise tab is reading from right now — the stored choice, or the
  // first category where there is no choice yet. Drawn from the same function
  // the tab itself uses, so the ticks here can never disagree with it.
  const chosen = memoriseCategories(categories, settings.memoriseCategoryIds);
  const chosenIds = new Set(chosen.map((c) => c.id));

  /**
   * Adds or removes a category from the Memorise tab.
   *
   * Unticking the last one is allowed and is not an error: an empty list reads
   * as "the first category" wherever it is used, so the tab still opens on
   * something. Nothing here touches progress — which cards Memorise deals is a
   * choice about reading, not a score.
   */
  function toggleMemorise(categoryId: string) {
    const next = chosenIds.has(categoryId)
      ? chosen.filter((c) => c.id !== categoryId).map((c) => c.id)
      : [...chosen.map((c) => c.id), categoryId];
    void update({ memoriseCategoryIds: next });
  }

  return (
    <div className="screen">
      <ScreenHeader title="Categories" eyebrow="Choose what to study" />
      <div className="list">
        {categories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            gates={gateDecks(
              decks.filter((d) => d.categoryId === category.id),
              deckProgress,
            )}
            cardCount={cards.filter((c) => c.categoryId === category.id).length}
            inMemorise={chosenIds.has(category.id)}
            onToggleMemorise={() => toggleMemorise(category.id)}
          />
        ))}
      </div>

      <p className="small muted">
        Tick a category to add it to the Memorise tab. With none ticked, Memorise
        reads the first one.
      </p>

      {/* The letters used to have their own tab. They sit here instead, at the
          end of the choosing: still optional, still gating nothing, but no
          longer holding a permanent seat that the daily flip-through wants. */}
      <h2 className="section-title">Reading</h2>
      <div className="list">
        <Link className="list-item" to="/alphabets">
          <span className="icon" aria-hidden="true">
            <Icon name="stele" />
          </span>
          <span className="grow">
            <strong>Letters</strong>
            <div className="small muted">
              The Hebrew and Arabic alphabets — optional, and never in the way of
              the decks.
            </div>
          </span>
          <Icon name="forward" className="chevron" />
        </Link>
      </div>
    </div>
  );
}

type RowProps = {
  category: Category;
  gates: DeckGate[];
  cardCount: number;
  inMemorise: boolean;
  onToggleMemorise: () => void;
};

/**
 * One category as a single row leading to its own screen, where every deck is
 * laid out. The decks used to unfold in place here; a category can now hold ten
 * of them, and ten rows springing open buries every category below it.
 *
 * The Memorise tick sits beside the row rather than inside it: a link cannot
 * hold a button, and a tick that navigated on a mis-tap would be worse than no
 * tick at all.
 */
function CategoryRow({
  category,
  gates,
  cardCount,
  inMemorise,
  onToggleMemorise,
}: RowProps) {
  const mastered = gates.filter((g) => g.mastered).length;
  const mark = categoryIcon(category.name);

  return (
    <div className="category-row">
      <Link className="list-item grow" to={'/category/' + category.id}>
        {/* The engraved mark where the category is one of the starter set; a
            category the learner made or renamed keeps whatever icon is stored
            on the record. */}
        <span className="icon" aria-hidden="true">
          {mark ? <Icon name={mark} /> : category.icon}
        </span>
        <span className="grow">
          <strong>{category.name}</strong>
          <div className="small muted">
            {cardCount} cards · {mastered} of {gates.length}{' '}
            {gates.length === 1 ? 'deck' : 'decks'} mastered
          </div>
        </span>
        <Icon name="forward" className="chevron" />
      </Link>

      <button
        type="button"
        className={'chip chip-toggle' + (inMemorise ? ' on' : '')}
        aria-pressed={inMemorise}
        aria-label={'Memorise ' + category.name}
        onClick={onToggleMemorise}
      >
        Memorise
      </button>
    </div>
  );
}
