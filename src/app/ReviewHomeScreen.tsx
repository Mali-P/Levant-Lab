import { Link, Navigate } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import {
  memoriseDecks,
  memorisePool,
  resumeDeck,
} from '../features/memorise/selection';
import { gateDecks } from '../features/review/unlock';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { categoryIcon } from '../components/ornament/Ornament';

/**
 * Where the Review tab lands: the same categories Practice lists, leading to
 * the cards rather than to a mode picker.
 *
 * Review is the half of the app that asks nothing. A learner choosing here has
 * already decided she wants to meet the words rather than be tested on them, so
 * every route out of this screen ends on a card she can turn over — which mode
 * to be asked in is a Practice decision, and is not put to her again on the way.
 *
 * The tab reopens on whatever deck it was last reading, and that memory is the
 * one thing this screen may decline to draw at all: it redirects before
 * rendering, so coming back from Settings puts the learner on her deck rather
 * than at the top of a list she has already walked down. Backing out of the
 * deck clears the memory, and then this is what she sees.
 */
export default function ReviewHomeScreen() {
  const settings = useSettings((s) => s.settings);
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);

  const resume = resumeDeck({
    categories,
    decks,
    deckProgress,
    lastDeckId: settings.memoriseLastDeckId,
  });

  // The pile as the tab would actually deal it rather than as it is stored: a
  // tick on a deck since deleted or closed is already dropped here, so the
  // count below never promises cards that will not arrive.
  const pile = memoriseDecks({
    categories,
    decks,
    deckProgress,
    selectedIds: settings.memoriseDeckIds,
  });
  const picked = (settings.memoriseDeckIds ?? []).length > 0;
  const pileCards = memorisePool(pile, cards).length;

  // `replace` so the tab keeps no history of resuming: back from the deck
  // should leave Review, not walk through every time she reopened it.
  if (resume) return <Navigate to={'/memorise/' + resume.id} replace />;

  return (
    <div className="screen">
      <ScreenHeader title="Review" eyebrow="Read the cards — nothing is scored" />

      {/* Only once she has ticked something. With nothing ticked the pile is
          just the first deck she can open, and offering that as "your
          selection" would name a choice she has not made. */}
      {picked && pileCards > 0 && (
        <Link
          className="panel"
          to="/memorise/selection"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="eyebrow">Your selection</div>
          <div className="headline">
            {pile.length} {pile.length === 1 ? 'deck' : 'decks'}
          </div>
          <p className="small muted">
            {pileCards} {pileCards === 1 ? 'card' : 'cards'}, read one after
            another.
          </p>
        </Link>
      )}

      <h2 className="section-title">Choose a category</h2>

      {categories.length === 0 && (
        <div className="empty">
          <p>No categories yet.</p>
          <Link className="btn btn-primary" to="/manage">
            Add cards
          </Link>
        </div>
      )}

      <div className="list">
        {categories.map((category) => {
          const gates = gateDecks(
            decks.filter((d) => d.categoryId === category.id),
            deckProgress,
          );
          const open = gates.filter((g) => g.unlocked).length;
          const inPile = gates.filter((g) =>
            settings.memoriseDeckIds?.includes(g.deck.id),
          ).length;
          const mark = categoryIcon(category.name);

          return (
            <Link
              className="list-item"
              key={category.id}
              to={'/memorise/category/' + category.id}
            >
              <span className="icon" aria-hidden="true">
                {mark ? <Icon name={mark} /> : category.icon}
              </span>
              <span className="grow">
                <strong>{category.name}</strong>
                <div className="small muted">
                  {open} of {gates.length}{' '}
                  {gates.length === 1 ? 'deck' : 'decks'} open
                  {inPile > 0 && ' · ' + inPile + ' in your selection'}
                </div>
              </span>
              <Icon name="forward" className="chevron" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
