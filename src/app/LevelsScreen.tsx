import { Link } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import {
  chainFinished,
  chainsOf,
  sentenceGroups,
} from '../features/sentences/chains';
import {
  conversationGroups,
  exchangeFinished,
  exchangesOf,
} from '../features/conversations/exchanges';
import {
  situationCategories,
  situationParts,
  situationStatus,
} from '../features/situations/situations';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon, { type IconName } from '../components/ornament/Icon';
import { EngravedDivider } from '../components/ornament/Ornament';

/**
 * The staircase above the vocabulary: the three levels that take the words
 * somewhere, in the order they build on each other.
 *
 * Sentence Building turns words into whole thoughts; Conversation Flow turns
 * thoughts into exchanges; Real Situations walks the exchange out into the
 * street. They once held three seats in the tab bar, which spent the bar's
 * room on saying they were separate while hiding that they were a progression.
 * One seat and one flight of steps says both things at once.
 *
 * The order is advice, not a gate. Every level stays open from the first day,
 * exactly as it was when each had its own tab — this screen ranks them, it
 * does not lock them.
 */

type LevelRow = {
  to: string;
  icon: IconName;
  rank: string;
  name: string;
  claim: string;
  done: number;
  total: number;
  unit: string;
};

export default function LevelsScreen() {
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);

  let chainsDone = 0;
  let chainsTotal = 0;
  for (const group of sentenceGroups(categories)) {
    const chains = chainsOf(
      decks.filter((deck) => deck.categoryId === group.id),
    );
    chainsTotal += chains.length;
    chainsDone += chains.filter((chain) =>
      chainFinished(chain, deckProgress),
    ).length;
  }

  let exchangesDone = 0;
  let exchangesTotal = 0;
  for (const group of conversationGroups(categories)) {
    const exchanges = exchangesOf(
      decks.filter((deck) => deck.categoryId === group.id),
    );
    exchangesTotal += exchanges.length;
    exchangesDone += exchanges.filter((exchange) =>
      exchangeFinished(exchange, deckProgress),
    ).length;
  }

  const scenarios = situationCategories(categories);
  const scenariosDone = scenarios.filter(
    (category) =>
      situationStatus(
        situationParts(decks.filter((deck) => deck.categoryId === category.id)),
        deckProgress,
      ) === 'complete',
  ).length;

  const levels: LevelRow[] = [
    {
      to: '/sentences',
      icon: 'stylus',
      rank: 'Level 1',
      name: 'Sentence Building',
      claim: 'From words to whole thoughts',
      done: chainsDone,
      total: chainsTotal,
      unit: 'chains',
    },
    {
      to: '/conversations',
      icon: 'ear',
      rank: 'Level 2',
      name: 'Conversation Flow',
      claim: 'From whole thoughts to whole exchanges',
      done: exchangesDone,
      total: exchangesTotal,
      unit: 'exchanges',
    },
    {
      to: '/situations',
      icon: 'gate',
      rank: 'Level 3',
      name: 'Real Situations',
      claim: 'From knowing the moves to using them',
      done: scenariosDone,
      total: scenarios.length,
      unit: 'scenarios',
    },
  ];

  return (
    <div className="screen">
      <ScreenHeader title="Levels" eyebrow="Where the words go next" />

      <p className="small muted">
        Three levels, each built on the one before: say the sentence, hold the
        exchange it sits in, then get through the real interaction. Climb them
        in order — or don&apos;t: every level is open from the first day, and
        none of them gates the vocabulary decks.
      </p>

      <EngravedDivider />

      <div className="list">
        {levels.map((level) => (
          <Link className="list-item" key={level.to} to={level.to}>
            <span className="icon" aria-hidden="true">
              <Icon name={level.icon} />
            </span>
            <span className="grow">
              <span className="eyebrow">{level.rank}</span>
              <strong>{level.name}</strong>
              <div className="small muted">{level.claim}</div>
              <div className="small muted">
                {level.done} of {level.total} {level.unit} finished
              </div>
            </span>
            {level.total > 0 && level.done === level.total && (
              <span className="chip chip-ok">Complete</span>
            )}
            <Icon name="forward" className="chevron" />
          </Link>
        ))}
      </div>
    </div>
  );
}
