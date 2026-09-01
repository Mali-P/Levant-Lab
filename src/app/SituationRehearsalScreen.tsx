import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import type { SeedCard } from '../constants/seed';
import { REPAIR_MOVES } from '../constants/situations';
import {
  chooseReply,
  currentNode,
  rehearsalOptions,
  situationFor,
  startRehearsal,
} from '../features/situations/situations';
import { isSituationCategory } from '../features/review/languagePolicy';
import { wordForms } from '../utils/wordForms';
import ScreenHeader from '../components/controls/ScreenHeader';
import ScriptSides from '../components/cards/ScriptSides';
import { LevantMotif } from '../components/ornament/Ornament';

/**
 * The rehearsal: the scenario played through, steered by the learner.
 *
 * This is the screen the whole level exists for. The other person's line
 * arrives in the language being learned — read it, hear it — and the English
 * is deliberately not shown, because on the street there is none. What is
 * always shown instead is the repair move: "What does that mean?" reveals the
 * meaning and costs nothing, exactly as it costs nothing in a real
 * conversation. Not understanding is a move, never a failure.
 *
 * Her possible replies are laid out with wrong ones among them — replies to
 * different lines of the same scenario. Picking a wrong one does not end
 * anything: the conversation stays where it stood and she chooses again. A
 * valid reply moves the script wherever *that answer* leads, so asking for tea
 * is never treated as a failed attempt to ask for coffee.
 *
 * Getting to the end is the goal, and is stamped per scenario on the settings
 * row — reaching it once means she has genuinely got through the interaction.
 */
export default function SituationRehearsalScreen() {
  const { categoryId = '' } = useParams();
  const categories = useData((s) => s.categories);
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);

  const category = categories.find((c) => c.id === categoryId);
  const situation = situationFor(category);

  const [state, setState] = useState(() =>
    situation ? startRehearsal(situation) : undefined,
  );
  const [revealed, setRevealed] = useState(false);
  const [wrong, setWrong] = useState<string | undefined>(undefined);

  const node = situation && state ? currentNode(situation, state) : undefined;

  // A fresh set of options per beat, held so re-renders cannot reshuffle the
  // buttons under her finger. Wrong picks deliberately do not redraw them.
  const options = useMemo(
    () => (situation && node ? rehearsalOptions(situation, node) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [situation, node?.id],
  );

  // The first time she reaches the end, the scenario is stamped rehearsed.
  // First time only, so the stamp keeps the date she first got through it.
  const done = state?.done ?? false;
  useEffect(() => {
    if (!done || !category) return;
    const key = category.name.toLowerCase();
    const existing = settings.situationRehearsals ?? {};
    if (existing[key]) return;
    void update({
      situationRehearsals: { ...existing, [key]: new Date().toISOString() },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, category?.id]);

  if (!category || !situation || !state || !isSituationCategory(category)) {
    return (
      <div className="screen">
        <ScreenHeader title="Scenario not found" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This scenario is not on this device.</p>
          <Link className="btn btn-primary" to="/situations">
            Back to Real Situations
          </Link>
        </div>
      </div>
    );
  }

  function pick(english: string) {
    if (!situation || !state) return;
    const outcome = chooseReply(situation, state, english);
    setState(outcome.state);
    if (outcome.accepted) {
      setRevealed(false);
      setWrong(undefined);
    } else {
      setWrong(english);
    }
  }

  return (
    <div className="screen">
      <ScreenHeader title={category.name} eyebrow="Rehearsal" back />

      {state.steps.length === 0 && !state.done && (
        <section className="panel">
          <span className="eyebrow">The situation</span>
          <p className="small">{situation.scene}</p>
          <p className="small muted">
            <strong>Your goal:</strong> {situation.goal}
          </p>
        </section>
      )}

      {/* What has been said so far, so the conversation reads as one. */}
      <div className="stack">
        {state.steps.map((step, index) => (
          <div key={index} className="stack" style={{ gap: 8 }}>
            <section className="panel" style={{ marginInlineEnd: 28 }}>
              <div className="eyebrow">They said</div>
              <div className="small muted">{step.them.english}</div>
              <ScriptSides card={step.them} />
            </section>
            <section className="panel" style={{ marginInlineStart: 28 }}>
              <div className="eyebrow">You said</div>
              <div className="small muted">{step.said.english}</div>
              <ScriptSides card={step.said} />
            </section>
          </div>
        ))}
      </div>

      {node && (
        <>
          <section className="panel" style={{ marginInlineEnd: 28 }}>
            <div className="eyebrow">They say</div>
            <ScriptSides card={node.them} />
            {revealed ? (
              <p className="small muted">
                “{REPAIR_MOVES.meaning.english}” — it means:{' '}
                <strong>{node.them.english}</strong>
              </p>
            ) : (
              <button
                type="button"
                className="btn btn-compact"
                onClick={() => setRevealed(true)}
              >
                What does that mean?
              </button>
            )}
          </section>

          <section className="panel">
            <span className="eyebrow">You say</span>
            {wrong && (
              <p className="small muted">
                “{wrong}” answers something else here. The conversation is
                still yours — try again.
              </p>
            )}
            <div className="stack" style={{ gap: 8 }}>
              {options.map((option) => (
                <ChoiceButton
                  key={option.english}
                  card={option}
                  onPick={() => pick(option.english)}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {state.done && (
        <section className="panel">
          <span className="eyebrow">You got through it</span>
          <p className="small">
            <strong>{situation.goal}</strong>
          </p>
          <p className="small muted">
            {state.mistakes === 0
              ? 'Not a single wrong turn. That was the whole interaction, in their language, steered by you.'
              : state.mistakes +
                (state.mistakes === 1 ? ' wrong turn' : ' wrong turns') +
                ' along the way — and the conversation survived every one of them, which is how real ones work.'}
          </p>
          <div className="stack" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                setState(startRehearsal(situation));
                setRevealed(false);
                setWrong(undefined);
              }}
            >
              Rehearse it again
            </button>
            <Link className="btn btn-block" to="/situations">
              Back to Real Situations
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

/** One possible reply: the English she is choosing, with her lines under it. */
function ChoiceButton({ card, onPick }: { card: SeedCard; onPick: () => void }) {
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const languages = useSettings((s) => s.languages);

  return (
    <button
      type="button"
      className="btn btn-block"
      style={{ textAlign: 'start' }}
      onClick={onPick}
    >
      <span className="stack" style={{ gap: 2 }}>
        <strong>{card.english}</strong>
        {languages.map((language) => {
          const side = language === 'hebrew' ? card.hebrew : card.arabic;
          const form = wordForms(side, perspectives, lead)[0];
          if (!form) return null;
          return (
            <span key={language} className={'small ' + language}>
              {form.script}
            </span>
          );
        })}
      </span>
    </button>
  );
}
