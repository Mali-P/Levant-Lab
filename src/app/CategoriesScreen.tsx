import { Link } from 'react-router-dom';
import type { Category } from '../types';
import { useData } from '../stores/dataStore';
import { gateDecks, type DeckGate } from '../features/review/unlock';
import ScreenHeader from '../components/controls/ScreenHeader';

export default function CategoriesScreen() {
  const categories = useData((s) => s.categories);
  const cards = useData((s) => s.cards);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);

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
          />
        ))}
      </div>
    </div>
  );
}

type RowProps = {
  category: Category;
  gates: DeckGate[];
  cardCount: number;
};

/**
 * One category as a single row leading to its own screen, where every deck is
 * laid out. The decks used to unfold in place here; a category can now hold ten
 * of them, and ten rows springing open buries every category below it.
 */
function CategoryRow({ category, gates, cardCount }: RowProps) {
  const mastered = gates.filter((g) => g.mastered).length;

  return (
    <Link className="list-item" to={'/category/' + category.id}>
      <span className="icon" aria-hidden="true">{category.icon}</span>
      <span className="grow">
        <strong>{category.name}</strong>
        <div className="small muted">
          {cardCount} cards · {mastered} of {gates.length}{' '}
          {gates.length === 1 ? 'deck' : 'decks'} mastered
        </div>
      </span>
      <span className="chevron" aria-hidden="true">›</span>
    </Link>
  );
}
