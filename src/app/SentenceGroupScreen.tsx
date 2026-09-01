import { Link, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import {
  chainFinished,
  chainsOf,
  chainSteps,
  rungsMastered,
} from '../features/sentences/chains';
import { isSentenceCategory } from '../features/review/languagePolicy';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

/**
 * One sentence group laid out as its chains.
 *
 * Every chain is open — the learner picks whichever sentence she wants to be
 * able to say next — and each row leads to the chain's build view, where the
 * sentence is read growing before any rung of it is practised. The row's
 * preview is the chain's first and last steps, which is the whole promise of
 * the thing: start here, end up able to say that.
 */
export default function SentenceGroupScreen() {
  const { categoryId = '' } = useParams();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);
  const languages = useSettings((s) => s.languages);

  const category = categories.find((c) => c.id === categoryId);

  if (!category || !isSentenceCategory(category)) {
    return (
      <div className="screen">
        <ScreenHeader title="Group not found" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This sentence group is not on this device.</p>
          <Link className="btn btn-primary" to="/sentences">
            Back to Sentence Building
          </Link>
        </div>
      </div>
    );
  }

  const chains = chainsOf(decks.filter((deck) => deck.categoryId === category.id));
  const oneLanguage = languages.length === 1;

  return (
    <div className="screen">
      <ScreenHeader title={category.name} eyebrow="Sentence chains" back />

      {oneLanguage && (
        <p className="small muted">
          Chains are practised in Hebrew, then Palestinian Arabic, then both
          together, whatever the language setting says — each rung is its own
          small deck.
        </p>
      )}

      <div className="list">
        {chains.map((chain) => {
          const steps = chainSteps(chain, cards);
          const first = steps[0]?.english;
          const last = steps[steps.length - 1]?.english;
          const finished = chainFinished(chain, deckProgress);
          const mastered = rungsMastered(chain, deckProgress);
          const entry = chain.hebrew ?? chain.decks[0];

          if (!entry) return null;

          return (
            <Link
              className="list-item"
              key={chain.key}
              to={'/sentences/chain/' + entry.id}
            >
              <span className="grow">
                <strong>{chain.name}</strong>
                <div className="small muted">
                  {first && last && first !== last
                    ? '“' + first + '” → “' + last + '”'
                    : steps.length + ' sentences'}
                </div>
                <div className="small muted">
                  {steps.length} steps · {mastered} of {chain.decks.length}{' '}
                  rungs mastered
                </div>
              </span>
              {finished && <span className="chip chip-ok">Complete</span>}
              <Icon name="forward" className="chevron" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
