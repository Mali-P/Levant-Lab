import { Link, useNavigate } from 'react-router-dom';
import {
  OPINION_STRENGTHS,
  STRENGTH_QUESTION,
  STRENGTH_STEPS,
  type OpinionStrength,
} from '../constants/opinions';
import { useData } from '../stores/dataStore';
import { strengthCategory, strengthLesson } from '../features/opinions/opinions';
import ScriptSides from '../components/cards/ScriptSides';
import ScreenHeader from '../components/controls/ScreenHeader';
import { EngravedDivider } from '../components/ornament/Ornament';

/**
 * The certainty scale: one question answered five ways, weakest first.
 *
 * The level's picture rather than another drill — the analogue of the connector
 * map one level down and the tense timeline two below that. Nothing here is
 * scored and nothing is hidden: the whole value is that "maybe", "probably" and
 * "definitely" sit in an order, under one unchanging question, so what each one
 * costs you is visible rather than described. Answer the same question five
 * ways and the difference between them is the only thing left to notice.
 *
 * Read straight off `OPINION_STRENGTHS` rather than off installed cards, for
 * the same reason the map and the timeline read their own sources: once
 * installed, these are five cards in a deck, and nothing on a card row says
 * which of them commits you to more.
 */
export default function CertaintyScaleScreen() {
  const navigate = useNavigate();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);

  const section = strengthCategory(categories);
  const lesson = section
    ? strengthLesson(decks.filter((deck) => deck.categoryId === section.id))
    : undefined;
  const way = lesson?.hebrew ?? lesson?.decks[0];

  return (
    <div className="screen">
      <ScreenHeader
        title="How sure are you?"
        eyebrow="From a guess to a promise"
        back
        onBack={() => navigate('/opinions')}
      />

      <p className="small muted">
        Every word here answers the same question, and they are in order: the
        first barely commits you to anything, the last leaves you no way back.
        Choosing the wrong rung is how people accidentally promise things.
        Nothing here is scored.
      </p>

      <section className="panel">
        <div className="eyebrow">The question, every time</div>
        <div className="english">
          <strong>{STRENGTH_QUESTION.english}</strong>
        </div>
        <ScriptSides card={STRENGTH_QUESTION} />
      </section>

      {STRENGTH_STEPS.map((step) => {
        const atLevel = OPINION_STRENGTHS.filter(
          (strength) => strength.level === step.level,
        );
        if (atLevel.length === 0) return null;

        return (
          <div key={step.level}>
            <EngravedDivider />
            <div className="eyebrow">
              {step.level} of {STRENGTH_STEPS.length} · {step.heading}
            </div>
            <div className="stack">
              {atLevel.map((strength) => (
                <StrengthPanel key={strength.word.english} strength={strength} />
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
            <strong>The same five as a lesson</strong>
            <p className="small muted">
              The deck this scale is drawn from, dealt one language rung at a
              time.
            </p>
            <Link
              className="btn btn-primary btn-block"
              to={'/opinions/lesson/' + way.id}
            >
              Open the lesson
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

/** One rung: the word, what it commits you to, and the question answered with it. */
function StrengthPanel({ strength }: { strength: OpinionStrength }) {
  return (
    <section className="panel">
      <strong>{strength.word.english}</strong>
      <ScriptSides card={strength.word} />
      <p className="small muted" style={{ marginTop: 8 }}>
        {strength.means}
      </p>
      <div className="stack" style={{ gap: 4, marginTop: 8 }}>
        <div className="small muted">“{strength.example.english}”</div>
        <ScriptSides card={strength.example} />
      </div>
    </section>
  );
}
