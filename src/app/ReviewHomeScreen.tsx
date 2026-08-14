import { Link, Navigate } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import {
  memoriseDecks,
  memorisePool,
  resumeDeck,
} from '../features/memorise/selection';
import { letterReviewPool } from '../features/memorise/letters';
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
  const languages = useSettings((s) => s.languages);
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);

  const resume = resumeDeck({
    categories,
    decks,
    deckProgress,
    lastDeckId: settings.memoriseLastDeckId,
    languages,
  });

  // The pile as the tab would actually deal it rather than as it is stored: a
  // tick on a deck since deleted or closed is already dropped here, so the
  // count below never promises cards that will not arrive.
  const pile = memoriseDecks({
    categories,
    decks,
    deckProgress,
    selectedIds: settings.memoriseDeckIds,
    languages,
  });
  const picked = (settings.memoriseDeckIds ?? []).length > 0;
  const pileCards = memorisePool(pile, cards).length;

  // How many letters her languages actually put in front of her: 28 paired
  // cards for both, 22 or 28 for one alone.
  const letterCount = letterReviewPool(languages).length;

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

      {/* The letters sit above the categories rather than inside them: they are
          not a deck of words and they are not gated by one, so a learner can
          come back to ב and ب at any point without a category having opened
          first. Read like every other card here — the letterform on the front,
          the sound it makes on the back — and scored like every other card
          here, which is to say not at all. */}
      {letterCount > 0 && (
        <div className="list">
          <Link className="list-item" to="/memorise/alphabet">
            {/* The mark says which scripts are inside. `both` overlaps the two
                into one idea; one language alone is simply its own letter, at
                the size every other icon here is drawn. */}
            <span
              className={
                'icon script-icon' + (languages.length > 1 ? ' both' : '')
              }
              aria-hidden="true"
            >
              {languages.includes('hebrew') && 'א'}
              {languages.includes('arabic') &&
                (languages.length > 1 ? (
                  <span className="script-icon-join">ع</span>
                ) : (
                  'ع'
                ))}
            </span>
            <span className="grow">
              <strong>The alphabet</strong>
              <div className="small muted">
                {letterCount} letters · the shape on the front, the sound on the
                back
              </div>
            </span>
            <Icon name="forward" className="chevron" />
          </Link>
        </div>
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
            languages,
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
