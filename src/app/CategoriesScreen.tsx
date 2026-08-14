import { Link } from 'react-router-dom';
import type { Category } from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { useAlphabet } from '../stores/alphabetStore';
import { gateDecks, type DeckGate } from '../features/review/unlock';
import { categoryGateLanguages } from '../features/review/languagePolicy';
import { ALPHABET_SCRIPTS, lettersFor } from '../data/alphabets';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { categoryIcon } from '../components/ornament/Ornament';

export default function CategoriesScreen() {
  const categories = useData((s) => s.categories);
  const cards = useData((s) => s.cards);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);
  const alphabetProgress = useAlphabet((s) => s.progress);
  const languages = useSettings((s) => s.languages);

  // The letters counted the way a category is counted, so the row can say the
  // same kind of thing as the rows under it.
  const letterTotal = ALPHABET_SCRIPTS.reduce(
    (sum, script) => sum + lettersFor(script).length,
    0,
  );
  const lettersMastered = Object.values(alphabetProgress).filter(
    (row) => row.mastered,
  ).length;

  return (
    <div className="screen">
      <ScreenHeader title="Categories" eyebrow="Choose what to practise" />
      <div className="list">
        {/* The alphabet leads the list rather than trailing it under a heading
            of its own. It is still optional and still gates nothing, but a
            learner who cannot read the script yet should meet it first, and an
            entry set apart in its own section reads as an afterthought. */}
        <div className="category-row">
          <Link className="list-item grow" to="/alphabets">
            <span className="icon" aria-hidden="true">
              <Icon name="stele" />
            </span>
            <span className="grow">
              <strong>Alphabet</strong>
              <div className="small muted">
                {letterTotal} letters · {lettersMastered} mastered
              </div>
            </span>
            <Icon name="forward" className="chevron" />
          </Link>
        </div>

        {categories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            gates={gateDecks(
              decks.filter((d) => d.categoryId === category.id),
              deckProgress,
              categoryGateLanguages(category, languages),
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
 *
 * A Memorise tick used to sit beside the row. Choosing what to read through now
 * happens entirely in Review, which has its own browse: a whole category is more
 * than a learner four decks in wants dealt into one read-through, and the
 * decision does not belong on the screen she opens to be tested.
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
