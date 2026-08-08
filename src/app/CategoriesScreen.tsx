import { Link } from 'react-router-dom';
import type { Category } from '../types';
import { useData } from '../stores/dataStore';
import { gateDecks, type DeckGate } from '../features/review/unlock';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { categoryIcon } from '../components/ornament/Ornament';

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
};

/**
 * One category as a single row leading to its own screen, where every deck is
 * laid out. The decks used to unfold in place here; a category can now hold ten
 * of them, and ten rows springing open buries every category below it.
 *
 * A Memorise tick used to sit beside the row. It now sits on each deck's own
 * screen: a whole category is more than a learner four decks in wants dealt
 * into one read-through.
 */
function CategoryRow({ category, gates, cardCount }: RowProps) {
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
    </div>
  );
}
