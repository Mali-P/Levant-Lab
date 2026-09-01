import { Link } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import {
  conversationGroups,
  exchangeFinished,
  exchangesOf,
  finalTestCategory,
} from '../features/conversations/exchanges';
import { isDeckMastered } from '../features/review/unlock';
import ScreenHeader from '../components/controls/ScreenHeader';
import PerfectRuns from '../components/progress/PerfectRuns';
import Icon from '../components/ornament/Icon';
import { EngravedDivider } from '../components/ornament/Ornament';

/**
 * The Conversation Flow area: its groups, and the final test at the end.
 *
 * The level after Sentence Building, and a sibling of it rather than a corner
 * of it. Sentence Building teaches her to build the sentence; this teaches the
 * exchange it sits inside — the question that comes first, the follow-up that
 * comes after, and what to say when she has not understood a word of it.
 *
 * Its own front door, so that no area's progress ever reads as another's. Every
 * group is open from the first day: there is no ladder of groups to climb,
 * because the whole level is optional and gates nothing.
 */
export default function ConversationsScreen() {
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);

  const groups = conversationGroups(categories);
  const test = finalTestCategory(categories);
  const testDeck = test
    ? decks.find((deck) => deck.categoryId === test.id)
    : undefined;
  const testProgress = testDeck ? deckProgress[testDeck.id] : undefined;

  return (
    <div className="screen">
      <ScreenHeader
        title="Conversation Flow"
        eyebrow="From whole thoughts to whole exchanges"
      />

      <p className="small muted">
        Sentence Building taught you to say it. This is everything around it —
        understanding the question, answering it, being asked a second one, and
        handing one back. Take any group in any order: nothing here is required
        by the words or the sentences, and nothing there waits on this.
      </p>

      <EngravedDivider />

      <div className="list">
        {groups.map((group) => {
          const exchanges = exchangesOf(
            decks.filter((deck) => deck.categoryId === group.id),
          );
          const finished = exchanges.filter((exchange) =>
            exchangeFinished(exchange, deckProgress),
          ).length;

          return (
            <Link
              className="list-item"
              key={group.id}
              to={'/conversations/group/' + group.id}
            >
              <span className="icon" aria-hidden="true">
                {group.icon}
              </span>
              <span className="grow">
                <strong>{group.name}</strong>
                <div className="small muted">
                  {exchanges.length}{' '}
                  {exchanges.length === 1 ? 'exchange' : 'exchanges'} ·{' '}
                  {finished} finished
                </div>
              </span>
              {finished === exchanges.length && exchanges.length > 0 && (
                <span className="chip chip-ok">Complete</span>
              )}
              <Icon name="forward" className="chevron" />
            </Link>
          );
        })}
      </div>

      {testDeck && (
        <section className="panel">
          <span className="eyebrow">Final test</span>
          <strong>Every exchange, ten at a time</strong>
          <p className="small muted">
            Ten turns drawn at random from everything above, each with the line
            it answers, Hebrew and Arabic together, and a different ten every
            round. Ten flawless batches finishes it.
          </p>
          <PerfectRuns
            completed={
              isDeckMastered(testDeck, testProgress)
                ? Math.max(1, testDeck.perfectRunsRequired)
                : (testProgress?.perfectRunsCompleted ?? 0)
            }
            required={Math.max(1, testDeck.perfectRunsRequired)}
            label="Flawless batches"
          />
          <Link
            className="btn btn-primary btn-block"
            to={'/study/' + testDeck.id + '?mode=normal'}
          >
            Sit the test
          </Link>
        </section>
      )}
    </div>
  );
}
