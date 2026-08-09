import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { statusFor } from '../features/review/mastery';
import { gateDecks, isDeckMastered } from '../features/review/unlock';
import { isSequencedCategory } from '../features/ordering/sequenced';
import ScreenHeader from '../components/controls/ScreenHeader';
import PerfectRuns from '../components/progress/PerfectRuns';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

/**
 * The mode picker a deck opens on.
 *
 * The order is the intended progression — be asked about the words, then be
 * asked until nothing slips. Reading a deck through is no longer one of these
 * choices: it belongs to the Memorise tab, and this screen only says whether
 * this deck is among what that tab deals.
 */
const CHOICES = [
  {
    href: (deckId: string) => '/study/' + deckId + '?mode=normal',
    name: 'Normal',
    blurb: 'Three words, then five, then seven, then the deck.',
    icon: 'target' as const,
    lead: true,
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
  const update = useSettings((s) => s.update);
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

  // The tick shows the stored choice literally rather than what the tab happens
  // to be dealing: with nothing ticked at all the tab falls back to the first
  // deck the learner can open, and drawing that as ticked would offer her an
  // untick that changes nothing. The line under the list says so instead.
  const thisDeckId = deck.id;
  const inMemorise = settings.memoriseDeckIds?.includes(thisDeckId) ?? false;

  /*
   * The ordering drill, and only where there is an order to recall.
   *
   * Ten perfect runs establish that the learner knows what each word means; not
   * one of them ever asks what comes after what, and for a counting deck that
   * is most of the point. For a deck of greetings there is nothing there to
   * ask: its ten cards sit in the order somebody wrote them down, and marking
   * her wrong for putting one before another would be testing the file rather
   * than the language. So the numbers get this, the alphabets get their own,
   * and every other deck is left alone.
   *
   * The main run offers it too, part-way through the flawless rounds. This is
   * the same drill, on its own, for a learner who wants another go at it.
   */
  const sequenced = isSequencedCategory(category);
  const progress = deckProgress[deck.id];
  const finalTest = isDeckMastered(deck, progress);
  const orderPasses = (['hebrew', 'arabic'] as const).filter(
    (language) => progress?.orderRecallPassedAt?.[language],
  );

  function toggleMemorise() {
    const current = settings.memoriseDeckIds ?? [];
    const next = inMemorise
      ? current.filter((id) => id !== thisDeckId)
      : [...current, thisDeckId];
    void update({ memoriseDeckIds: next });
  }

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

            {/* The one mode that asks about the deck rather than about a word.
                It leads once the perfect runs are banked, because at that point
                it is the only question left. */}
            {sequenced && (
              <Link
                className={'mode-choice' + (finalTest ? ' lead' : '')}
                to={'/order/' + deck.id}
              >
                <span className="mode-choice-icon" aria-hidden="true">
                  <Icon name="columns" />
                </span>
                <span className="grow">
                  <span className="mode-choice-name">
                    {finalTest
                      ? 'Final test — Activity: Memory Consolidation'
                      : 'Activity: Memory Consolidation'}
                  </span>
                  <span className="small muted">
                    {orderPasses.length === 2
                      ? 'Passed in both languages. Take it again whenever you like.'
                      : orderPasses.length === 1
                        ? 'Passed in ' +
                          (orderPasses[0] === 'hebrew' ? 'Hebrew' : 'Arabic') +
                          '. The other language is still waiting.'
                        : 'Drag the numbers into the correct order.'}
                  </span>
                </span>
                {/* No tally beside the row. How many languages are in is
                    already said in words underneath it, and "1 / 2" beside a
                    sentence saying the same thing reads as a score. */}
                <span className="mode-choice-go" aria-hidden="true">
                  <Icon name="forward" />
                </span>
              </Link>
            )}

            {/* Not another way to study but a standing choice about the deck,
                so it ticks in place instead of leading anywhere. It sits with
                the modes because this screen is where a learner decides what
                she is doing with this deck. */}
            <button
              type="button"
              className={'mode-choice memorise-tick' + (inMemorise ? ' on' : '')}
              aria-pressed={inMemorise}
              onClick={toggleMemorise}
            >
              <span className="mode-choice-icon" aria-hidden="true">
                <Icon name="codex" />
              </span>
              <span className="grow">
                <span className="mode-choice-name">Memorise this deck</span>
                <span className="small muted">
                  {inMemorise
                    ? 'The Memorise tab reads this deck. Nothing is scored.'
                    : 'Add it to the Memorise tab’s read-through.'}
                </span>
              </span>
              <span className="tickbox" aria-hidden="true">
                {inMemorise && <Icon name="check" />}
              </span>
            </button>
          </div>

          <p className="small muted">
            With no deck ticked anywhere, Memorise reads the first deck you can
            open.
          </p>
        </>
      )}
    </div>
  );
}
