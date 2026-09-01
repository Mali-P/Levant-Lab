import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import {
  rungsMastered,
  situationCategories,
  situationFor,
  situationParts,
  situationStatus,
} from '../features/situations/situations';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { EngravedDivider } from '../components/ornament/Ornament';

/**
 * The Real Situations area: every scenario, each with its own standing.
 *
 * The level after Conversation Flow, and the practical bridge out of the
 * course: Conversation Flow taught how an exchange works, this asks her to get
 * through an actual one — order the coffee, find the station, help the person.
 * Every scenario is open from the first day. There is no learning dependency
 * between a café and a bus, so nothing here queues behind anything.
 *
 * A scenario's standing is read straight off its decks — its own progress,
 * touching nothing in any other area — with the rehearsal stamp shown beside
 * it as the separate claim it is: the lines are one thing, steering the whole
 * interaction is the other.
 */
export default function SituationsScreen() {
  const navigate = useNavigate();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const deckProgress = useData((s) => s.deckProgress);
  const rehearsals = useSettings((s) => s.settings.situationRehearsals) ?? {};

  const scenarios = situationCategories(categories);

  return (
    <div className="screen">
      {/* Up to the Levels hub rather than back through history: the hub is
          this area's roof, whatever route brought the learner in. */}
      <ScreenHeader
        title="Real Situations"
        eyebrow="From knowing the moves to using them"
        back
        onBack={() => navigate('/levels')}
      />

      <p className="small muted">
        A scenario is a real interaction — ordering a coffee, finding the
        station — built almost entirely from words you already know. Read it,
        practise your lines, then rehearse the whole thing and steer it
        yourself. Take the scenarios in any order: nothing here waits on
        anything else.
      </p>

      <EngravedDivider />

      <div className="list">
        {scenarios.map((category) => {
          const situation = situationFor(category);
          const parts = situationParts(
            decks.filter((deck) => deck.categoryId === category.id),
          );
          const status = situationStatus(parts, deckProgress);
          const rungs = rungsMastered(parts, deckProgress);
          const rehearsed = Boolean(rehearsals[category.name.toLowerCase()]);

          return (
            <Link
              className="list-item"
              key={category.id}
              to={'/situations/scenario/' + category.id}
            >
              <span className="icon" aria-hidden="true">
                {category.icon}
              </span>
              <span className="grow">
                <strong>{category.name}</strong>
                {situation && <div className="small muted">{situation.goal}</div>}
                <div className="small muted">
                  {status === 'not-started'
                    ? 'Not started'
                    : rungs.mastered + ' of ' + rungs.total + ' rungs mastered'}
                  {rehearsed && ' · rehearsed'}
                </div>
              </span>
              {status === 'complete' && <span className="chip chip-ok">Complete</span>}
              {status === 'in-progress' && <span className="chip">In progress</span>}
              <Icon name="forward" className="chevron" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
