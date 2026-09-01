import { Link } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import {
  chainFinished,
  chainsOf,
  finalTestCategory,
  sentenceGroups,
} from '../features/sentences/chains';
import { isDeckMastered } from '../features/review/unlock';
import ScreenHeader from '../components/controls/ScreenHeader';
import PerfectRuns from '../components/progress/PerfectRuns';
import Icon from '../components/ornament/Icon';
import { EngravedDivider } from '../components/ornament/Ornament';

/**
 * The Sentence Building area: its groups, and the final test at the end.
 *
 * A sibling of Practice rather than a corner of it. The course teaches words;
 * this teaches putting them together, and it keeps its own front door so that
 * neither area's progress ever reads as the other's. Every group is open from
 * the first day — there is no ladder of groups to climb, because the whole
 * area is optional and gates nothing.
 */
export default function SentencesScreen() {
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);

  const groups = sentenceGroups(categories);
  const test = finalTestCategory(categories);
  const testDeck = test
    ? decks.find((deck) => deck.categoryId === test.id)
    : undefined;
  const testProgress = testDeck ? deckProgress[testDeck.id] : undefined;

  return (
    <div className="screen">
      <ScreenHeader
        title="Sentence Building"
        eyebrow="From words to whole thoughts"
      />

      <p className="small muted">
        Each chain grows one sentence a piece at a time — I can, I can go, I can
        go there — out of words the course has already taught. Take any group in
        any order: nothing here is required by the vocabulary decks, and nothing
        there waits on this.
      </p>

      <EngravedDivider />

      <div className="list">
        {groups.map((group) => {
          const chains = chainsOf(
            decks.filter((deck) => deck.categoryId === group.id),
          );
          const finished = chains.filter((chain) =>
            chainFinished(chain, deckProgress),
          ).length;

          return (
            <Link
              className="list-item"
              key={group.id}
              to={'/sentences/group/' + group.id}
            >
              <span className="icon" aria-hidden="true">
                {group.icon}
              </span>
              <span className="grow">
                <strong>{group.name}</strong>
                <div className="small muted">
                  {chains.length} {chains.length === 1 ? 'chain' : 'chains'} ·{' '}
                  {finished} finished
                </div>
              </span>
              {finished === chains.length && chains.length > 0 && (
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
          <strong>Every sentence, ten at a time</strong>
          <p className="small muted">
            Ten sentences drawn at random from everything above, Hebrew and
            Arabic together, and a different ten every round. Ten flawless
            batches finishes it.
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
