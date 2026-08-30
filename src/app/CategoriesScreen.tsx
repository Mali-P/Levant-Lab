import { Link } from 'react-router-dom';
import type { FinishedSort } from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { useAlphabet } from '../stores/alphabetStore';
import type { CategoryGate } from '../features/review/languagePolicy';
import { gateCategories, sortByFinished } from '../features/review/languagePolicy';
import { ALPHABET_SCRIPTS, lettersFor } from '../data/alphabets';
import ScreenHeader from '../components/controls/ScreenHeader';
import FinishedSortControl from '../components/controls/FinishedSortControl';
import Icon from '../components/ornament/Icon';
import { categoryIcon } from '../components/ornament/Ornament';

export default function CategoriesScreen() {
  const categories = useData((s) => s.categories);
  const cards = useData((s) => s.cards);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);
  const alphabetProgress = useAlphabet((s) => s.progress);
  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);
  const update = useSettings((s) => s.update);

  // The letters counted the way a category is counted, so the row can say the
  // same kind of thing as the rows under it.
  const letterTotal = ALPHABET_SCRIPTS.reduce(
    (sum, script) => sum + lettersFor(script).length,
    0,
  );
  const lettersMastered = Object.values(alphabetProgress).filter(
    (row) => row.mastered,
  ).length;

  const gates = gateCategories(categories, decks, deckProgress, languages, {
    deckIds: settings.openedDeckIds,
    categoryIds: settings.openedCategoryIds,
  });
  const sort: FinishedSort = settings.finishedSort ?? 'course';
  const ordered = sortByFinished(gates, (gate) => gate.complete, sort);

  const opened = settings.openedCategoryIds ?? [];

  function openCategory(id: string) {
    if (opened.includes(id)) return;
    void update({ openedCategoryIds: [...opened, id] });
  }

  /**
   * Hands the choice back. Nothing scored is touched — the category simply
   * stops being the one in hand, so another may be opened instead. Without it
   * a mistaken tap would commit her to a category for the rest of the course.
   */
  function closeCategory(id: string) {
    void update({ openedCategoryIds: opened.filter((entry) => entry !== id) });
  }

  return (
    <div className="screen">
      <ScreenHeader title="Categories" eyebrow="Choose what to practise" />

      <FinishedSortControl
        value={sort}
        onChange={(next) => void update({ finishedSort: next })}
        label="Finished categories"
      />

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

        {ordered.map((gate) => (
          <CategoryRow
            key={gate.category.id}
            gate={gate}
            cardCount={
              cards.filter((c) => c.categoryId === gate.category.id).length
            }
            onOpen={() => openCategory(gate.category.id)}
            onClose={() => closeCategory(gate.category.id)}
          />
        ))}
      </div>
    </div>
  );
}

type RowProps = {
  gate: CategoryGate;
  cardCount: number;
  onOpen: () => void;
  onClose: () => void;
};

/**
 * One category as a single row leading to its own screen, where every lot is
 * laid out.
 *
 * Outside Basics the course runs one unfinished category at a time and lets the
 * learner say which, so a row is in one of three states: open, hers to open
 * now, or waiting on the category she is already in the middle of. Only the
 * first is a link — a locked row that still navigated would be a door with a
 * sign on it rather than a locked door.
 */
function CategoryRow({ gate, cardCount, onOpen, onClose }: RowProps) {
  const { category, gates } = gate;
  const mark = categoryIcon(category.name);
  const lots = new Set(gates.map((g) => g.lotKey ?? g.deck.id));
  const finishedLots = new Set(
    gates.filter((g) => g.lotComplete).map((g) => g.lotKey ?? g.deck.id),
  );

  const summary = (
    <div className="small muted">
      {cardCount} cards · {finishedLots.size} of {lots.size}{' '}
      {lots.size === 1 ? 'lot' : 'lots'} finished
    </div>
  );

  const icon = (
    <span className="icon" aria-hidden="true">
      {mark ? <Icon name={mark} /> : category.icon}
    </span>
  );

  if (!gate.unlocked) {
    return (
      <div className={'category-row' + (gate.choosable ? '' : ' locked')}>
        <div className="list-item grow">
          {icon}
          <span className="grow">
            <strong>{category.name}</strong>
            {summary}
            {gate.choosable ? (
              <div className="small muted">
                Open this next, or pick any other category.
              </div>
            ) : (
              <div className="small muted">
                Opens once <strong>{gate.blockedBy?.name}</strong> is finished
                in Hebrew and Arabic.
              </div>
            )}
          </span>
          {gate.choosable ? (
            <button className="btn btn-primary btn-compact" onClick={onOpen}>
              Open
            </button>
          ) : (
            <span className="chip">
              <Icon name="lock" /> Locked
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="category-row">
      <Link className="list-item grow" to={'/category/' + category.id}>
        {icon}
        <span className="grow">
          <strong>{category.name}</strong>
          {summary}
        </span>
        {gate.complete && <span className="chip chip-ok">Complete</span>}
        <Icon name="forward" className="chevron" />
      </Link>
      {gate.gated && gate.opened && !gate.complete && (
        <button className="btn btn-ghost btn-compact" onClick={onClose}>
          Set aside
        </button>
      )}
    </div>
  );
}
