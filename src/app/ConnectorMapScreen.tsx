import { Link, useNavigate } from 'react-router-dom';
import { CONNECTOR_ROLES, CONNECTORS, type Connector } from '../constants/tellme';
import { useData } from '../stores/dataStore';
import { connectorCategory, connectorLesson } from '../features/tellme/tellme';
import ScriptSides from '../components/cards/ScriptSides';
import ScreenHeader from '../components/controls/ScreenHeader';
import { EngravedDivider } from '../components/ornament/Ornament';

/**
 * The connector map: every joining word, grouped by the job it does.
 *
 * The level's picture rather than another drill — the analogue of the tense
 * timeline one level down. Nothing here is scored and nothing is hidden: the
 * whole value is that "and", "but" and "because" sit under headings that say
 * what each one *does* to the two things around it, with one sentence apiece
 * doing exactly that job. The practise link at the foot hands over to the
 * lesson built out of this very list, so the map and the deck cannot drift.
 *
 * Read straight off `CONNECTORS` rather than off installed cards, for the same
 * reason the timeline reads `TENSE_TRIADS`: once installed, the words are just
 * cards in a deck, and nothing on a card row says which job its word does.
 */
export default function ConnectorMapScreen() {
  const navigate = useNavigate();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);

  const section = connectorCategory(categories);
  const lesson = section
    ? connectorLesson(decks.filter((deck) => deck.categoryId === section.id))
    : undefined;
  const way = lesson?.hebrew ?? lesson?.decks[0];

  return (
    <div className="screen">
      <ScreenHeader
        title="The joining words"
        eyebrow="What goes between two sentences"
        back
        onBack={() => navigate('/tellme')}
      />

      <p className="small muted">
        Every word here does one job: it tells the listener how the next thing
        relates to the last one. Read the heading, then the word, then the
        sentence it is working inside. Nothing here is scored.
      </p>

      {CONNECTOR_ROLES.map((role) => {
        const inRole = CONNECTORS.filter((connector) => connector.role === role.role);
        if (inRole.length === 0) return null;

        return (
          <div key={role.role}>
            <EngravedDivider />
            <div className="eyebrow">{role.heading}</div>
            <p className="small muted">{role.blurb}</p>
            <div className="stack">
              {inRole.map((connector) => (
                <ConnectorPanel key={connector.word.english} connector={connector} />
              ))}
            </div>
          </div>
        );
      })}

      {way && (
        <>
          <EngravedDivider />
          <section className="panel">
            <span className="eyebrow">Practise them</span>
            <strong>The same words as a lesson</strong>
            <p className="small muted">
              The deck this map is drawn from, dealt one language rung at a
              time.
            </p>
            <Link
              className="btn btn-primary btn-block"
              to={'/tellme/lesson/' + way.id}
            >
              Open the lesson
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

/** One joining word: what it does, both languages, and its sentence at work. */
function ConnectorPanel({ connector }: { connector: Connector }) {
  return (
    <section className="panel">
      <div className="spread" style={{ alignItems: 'baseline' }}>
        <strong>{connector.word.english}</strong>
        <span className="small muted">{connector.does}</span>
      </div>
      <ScriptSides card={connector.word} />
      <div className="stack" style={{ gap: 4, marginTop: 8 }}>
        <div className="small muted">“{connector.example.english}”</div>
        <ScriptSides card={connector.example} />
      </div>
    </section>
  );
}
