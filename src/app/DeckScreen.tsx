import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { LANGUAGE_LABEL } from '../utils/languageSelection';
import { statusFor } from '../features/review/mastery';
import { isDeckMastered } from '../features/review/unlock';
import {
  deckStudyLanguages,
  gateCategoryDecks,
} from '../features/review/languagePolicy';
import { isSequencedDeck } from '../features/ordering/sequenced';
import ScreenHeader from '../components/controls/ScreenHeader';
import PerfectRuns from '../components/progress/PerfectRuns';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

/**
 * The mode picker a deck opens on.
 *
 * The order is the intended progression — be asked about the words, then be
 * asked until nothing slips. Reading a deck through is not one of these
 * choices: it belongs to the Review tab, which this screen only links to.
 */
const CHOICES = [
  {
    href: (deckId: string) => '/study/' + deckId + '?mode=normal',
    name: 'Normal',
    blurb: 'Two words, then one more at a time, up to the deck.',
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
  const languages = useSettings((s) => s.languages);
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

  const gate = gateCategoryDecks(
    category,
    decks.filter((d) => d.categoryId === deck.categoryId),
    deckProgress,
    languages,
  ).find((g) => g.deck.id === deck.id);
  const studyLanguages = deckStudyLanguages(deck, languages);

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
      statusFor(cardProgress[c.id], now, settings.enableMasteryDecay, studyLanguages) ===
      'mastered',
  ).length;

  /*
   * The ordering drill, and only where there is an order to recall.
   *
   * Ten perfect runs establish that the learner knows what each word means; not
   * one of them ever asks what comes after what, and for a counting deck that
   * is most of the point. For a deck of greetings there is nothing there to
   * ask: its ten cards sit in the order somebody wrote them down, and marking
   * her wrong for putting one before another would be testing the file rather
   * than the language. So the numbers and selected basics sequences get this,
   * the alphabets get their own, and every other deck is left alone.
   *
   * The main run offers it too, part-way through the flawless rounds. This is
   * the same drill, on its own, for a learner who wants another go at it.
   */
  const sequenced = isSequencedDeck(deck, categories);
  const progress = deckProgress[deck.id];
  const finalTest = isDeckMastered(deck, progress);
  // Only the languages she is studying. A Hebrew-only learner has finished
  // this activity when the Hebrew column is in, and must not be told that "the
  // other language is still waiting" for a column she will never be shown.
  const orderPasses = studyLanguages.filter(
    (language) => progress?.orderRecallPassedAt?.[language],
  );

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
          <h2 className="section-title">How do you want to practise?</h2>

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
                    {orderPasses.length === studyLanguages.length
                      ? (studyLanguages.length > 1
                          ? 'Passed in both languages. '
                          : 'Passed. ') +
                        'Take it again whenever you like.'
                      : orderPasses.length > 0
                        ? 'Passed in ' +
                          LANGUAGE_LABEL[orderPasses[0]] +
                          '. The other language is still waiting.'
                        : 'Drag the cards into the correct order.'}
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

            {/* Reading this deck through used to be ticked here. It is chosen
                in Review now, where the browse ends on the cards themselves —
                a standing tick on the mode picker was a second way to say the
                same thing, in the one place the learner has come to be
                tested. */}
          </div>

          <Link className="small muted" to={'/memorise/' + deck.id}>
            Read this deck instead, without being tested.
          </Link>
        </>
      )}
    </div>
  );
}
