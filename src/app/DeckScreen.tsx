import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { statusFor } from '../features/review/mastery';
import { gateDecks } from '../features/review/unlock';
import ScreenHeader from '../components/controls/ScreenHeader';
import PerfectRuns from '../components/progress/PerfectRuns';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

/**
 * The mode picker a deck opens on.
 *
 * The order is the intended progression — meet the words, then be asked about
 * them, then be asked until nothing slips. Memorise leads because being tested
 * on vocabulary you have never read is not a test, it is a guess.
 */
const CHOICES = [
  {
    href: (deckId: string) => '/memorise/' + deckId,
    name: 'Memorise',
    blurb: 'Read the whole deck through. Nothing is scored.',
    icon: 'codex' as const,
    lead: true,
  },
  {
    href: (deckId: string) => '/study/' + deckId + '?mode=normal',
    name: 'Normal',
    blurb: 'Three words, then five, then seven, then the deck.',
    icon: 'target' as const,
  },
  {
    href: (deckId: string) => '/study/' + deckId + '?mode=hard',
    name: 'Hard',
    blurb: 'The same climb, but a slip ends the mastery round.',
    icon: 'flame' as const,
  },
  {
    href: (deckId: string) => '/study/' + deckId + '?mode=brutal',
    name: 'Brutal',
    blurb: 'Typed answers, no hints, and one slip wipes your rounds.',
    icon: 'chisel' as const,
  },
];

export default function DeckScreen() {
  const { deckId = '' } = useParams();
  const navigate = useNavigate();

  const settings = useSettings((s) => s.settings);
  const decks = useData((s) => s.decks);
  const categories = useData((s) => s.categories);
  const cards = useData((s) => s.cards);
  const cardProgress = useData((s) => s.cardProgress);
  const deckProgress = useData((s) => s.deckProgress);

  const deck = decks.find((d) => d.id === deckId);
  const category = categories.find((c) => c.id === deck?.categoryId);

  if (!deck) {
    return (
      <div className="screen">
        <ScreenHeader title="Deck not found" back />
      </div>
    );
  }

  const gate = gateDecks(
    decks.filter((d) => d.categoryId === deck.categoryId),
    deckProgress,
  ).find((g) => g.deck.id === deck.id);

  // The same ladder the category screen draws, enforced again here so a
  // bookmark cannot walk past it.
  if (gate && !gate.unlocked) {
    return (
      <div className="screen">
        <ScreenHeader title={deck.name} eyebrow={category?.name} back />
        <div className="empty">
          <p>
            This deck is still locked. Master{' '}
            <strong>{gate.blockedBy!.name}</strong> first —{' '}
            {gate.perfectRunsRequired} flawless runs through it.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/category/' + deck.categoryId)}
          >
            Back to {category?.name ?? 'the category'}
          </button>
        </div>
      </div>
    );
  }

  const deckCards = cards.filter((c) => c.deckId === deck.id);
  const now = new Date().toISOString();
  const mastered = deckCards.filter(
    (c) =>
      statusFor(cardProgress[c.id], now, settings.enableMasteryDecay) ===
      'mastered',
  ).length;

  return (
    <div className="screen">
      <ScreenHeader title={deck.name} eyebrow={category?.name} back />

      <section className="panel">
        <div className="small muted">
          {deckCards.length} cards · {mastered} mastered
        </div>
        {gate && (
          <PerfectRuns
            completed={gate.perfectRunsCompleted}
            required={gate.perfectRunsRequired}
          />
        )}
      </section>

      {deckCards.length === 0 ? (
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This deck has no cards yet.</p>
          <Link className="btn btn-primary" to="/manage">
            Add cards
          </Link>
        </div>
      ) : (
        <>
          <h2 className="section-title">How do you want to study?</h2>

          <div className="mode-choices">
            {CHOICES.map((choice) => (
              <Link
                className={'mode-choice' + (choice.lead ? ' lead' : '')}
                key={choice.name}
                to={choice.href(deck.id)}
              >
                <span className="mode-choice-icon" aria-hidden="true">
                  <Icon name={choice.icon} />
                </span>
                <span className="grow">
                  <span className="mode-choice-name">{choice.name}</span>
                  <span className="small muted">{choice.blurb}</span>
                </span>
                <span className="mode-choice-go" aria-hidden="true">
                  <Icon name="forward" />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
