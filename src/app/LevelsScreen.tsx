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
import { useSettings } from '../stores/settingsStore';
import { statsFor } from '../features/freetalk/freetalk';
import { levelProgress } from '../features/pastfuture/pastfuture';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon, { type IconName } from '../components/ornament/Icon';
import { EngravedDivider } from '../components/ornament/Ornament';

/**
 * The staircase above the vocabulary: the levels that take the words
 * somewhere, in the order they build on each other.
 *
 * Sentence Building turns words into whole thoughts; Conversation Flow turns
 * thoughts into exchanges; Real Situations walks the exchange out into the
 * street; Free Conversation takes the script away; Past & Future takes all of
 * it off the present moment. They once held a seat each in the tab bar, which
 * spent the bar's room on saying they were separate while hiding that they
 * were a progression. One seat and one flight of steps says both at once.
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
  /**
   * Absent on a level with no finish line: Free Conversation counts
   * conversations held rather than working through a fixed set.
   */
  total?: number;
  unit: string;
};

export default function LevelsScreen() {
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);
  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);

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

  const tenses = levelProgress(categories, decks, deckProgress);

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
    {
      to: '/freetalk',
      icon: 'compass',
      rank: 'Level 4',
      name: 'Free Conversation',
      claim: 'From using the moves to saying what you mean',
      // No finish line on purpose: a free conversation has no fixed set to
      // work through, so the count is conversations actually held.
      done: languages.reduce(
        (sum, language) => sum + statsFor(settings, language).conversations,
        0,
      ),
      unit: 'conversations',
    },
    {
      to: '/pastfuture',
      icon: 'wheel',
      rank: 'Level 5',
      name: 'Past & Future',
      claim: 'From saying what is to saying when it was',
      done: tenses.done,
      total: tenses.total,
      unit: 'lessons',
    },
  ];

  return (
    <div className="screen">
      <ScreenHeader title="Levels" eyebrow="Where the words go next" />

      <p className="small muted">
        Five levels, each built on the one before: say the sentence, hold the
        exchange it sits in, get through the real interaction, say what you
        actually mean with no script at all, then say all of it about yesterday
        and tomorrow. Climb them in order — or
        don&apos;t: every level is open from the first day, and none of them
        gates the vocabulary decks.
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
                {level.total === undefined
                  ? `${level.done} ${level.done === 1 ? level.unit.replace(/s$/, '') : level.unit} held`
                  : `${level.done} of ${level.total} ${level.unit} finished`}
              </div>
            </span>
            {level.total !== undefined && level.total > 0 && level.done === level.total && (
              <span className="chip chip-ok">Complete</span>
            )}
            <Icon name="forward" className="chevron" />
          </Link>
        ))}
      </div>
    </div>
  );
}
