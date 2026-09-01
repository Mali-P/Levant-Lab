import { Link, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import {
  exchangeFinished,
  exchangeTurns,
  exchangesOf,
  isBranching,
  rungsMastered,
} from '../features/conversations/exchanges';
import { isConversationCategory } from '../features/review/languagePolicy';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

/**
 * One conversation group laid out as its exchanges.
 *
 * Every exchange is open — she picks whichever conversation she wants to be
 * able to hold next — and each row leads to the transcript, where the whole
 * exchange is read before any rung of it is practised. The row's preview is the
 * opening question, because that is what she is really choosing between: not a
 * title, but the thing somebody is about to say to her.
 */
export default function ConversationGroupScreen() {
  const { categoryId = '' } = useParams();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);
  const languages = useSettings((s) => s.languages);

  const category = categories.find((c) => c.id === categoryId);

  if (!category || !isConversationCategory(category)) {
    return (
      <div className="screen">
        <ScreenHeader title="Group not found" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This conversation group is not on this device.</p>
          <Link className="btn btn-primary" to="/conversations">
            Back to Conversation Flow
          </Link>
        </div>
      </div>
    );
  }

  const exchanges = exchangesOf(
    decks.filter((deck) => deck.categoryId === category.id),
  );
  const oneLanguage = languages.length === 1;

  return (
    <div className="screen">
      <ScreenHeader title={category.name} eyebrow="Exchanges" back />

      {oneLanguage && (
        <p className="small muted">
          Exchanges are practised in Hebrew, then Palestinian Arabic, then both
          together, whatever the language setting says — each rung is its own
          small deck.
        </p>
      )}

      <div className="list">
        {exchanges.map((exchange) => {
          const turns = exchangeTurns(exchange, cards);
          const opening = turns[0]?.cue?.english;
          const finished = exchangeFinished(exchange, deckProgress);
          const mastered = rungsMastered(exchange, deckProgress);
          const branching = isBranching(turns);
          const entry = exchange.hebrew ?? exchange.decks[0];

          if (!entry) return null;

          return (
            <Link
              className="list-item"
              key={exchange.key}
              to={'/conversations/exchange/' + entry.id}
            >
              <span className="grow">
                <strong>{exchange.name}</strong>
                {opening && <div className="small muted">“{opening}”</div>}
                <div className="small muted">
                  {/* A branching exchange is not a conversation of four turns.
                      It is one question with four ways out, and counting it in
                      turns would promise a longer exchange than it is. */}
                  {branching
                    ? turns.length + ' ways to answer'
                    : turns.length + (turns.length === 1 ? ' turn' : ' turns')}{' '}
                  · {mastered} of {exchange.decks.length} rungs mastered
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
