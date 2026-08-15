import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  CardProgress,
  Deck,
  Flashcard,
  Language,
  MasteryStatus,
} from '../types';
import { CUSTOM_CATEGORY } from '../constants/seed';
import { uid } from '../utils/random';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { statusFor, STATUS_LABELS } from '../features/review/mastery';
import type { DeckGate } from '../features/review/unlock';
import {
  basicsBaseName,
  basicsStage,
  deckStudyLanguages,
  gateCategoryDecks,
  isBasicsCategory,
} from '../features/review/languagePolicy';
import ScreenHeader from '../components/controls/ScreenHeader';
import Tip from '../components/controls/Tip';
import PerfectRuns from '../components/progress/PerfectRuns';
import WordForms from '../components/cards/WordForms';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

export default function CategoryScreen() {
  const { categoryId = '' } = useParams();
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const cardProgress = useData((s) => s.cardProgress);
  const deckProgress = useData((s) => s.deckProgress);
  const saveCard = useData((s) => s.saveCard);

  const category = categories.find((c) => c.id === categoryId);
  const gates = gateCategoryDecks(
    category,
    decks.filter((d) => d.categoryId === categoryId),
    deckProgress,
    languages,
  );
  const now = new Date().toISOString();

  // The learner's own category is the one place a card can be started from
  // outside the manage screen, so the sentences kept there can be added while
  // reading the deck they belong to.
  const own = category?.name === CUSTOM_CATEGORY;

  /**
   * Opens a blank card in the chosen deck. It is written before the editor
   * loads because the editor addresses a card by id; an empty row is harmless
   * and shows as "Untitled card" until it is filled in.
   */
  async function addSentence(deck: Deck) {
    const id = uid('card');
    const stamp = new Date().toISOString();
    await saveCard({
      id,
      deckId: deck.id,
      categoryId: deck.categoryId,
      english: '',
      hebrew: { script: '' },
      // The dialect the rest of this deck is written in; the editor can change it.
      arabic: { script: '', dialect: 'Palestinian' },
      createdAt: stamp,
      updatedAt: stamp,
    });
    navigate('/manage/card/' + id);
  }

  if (!category) {
    return (
      <div className="screen">
        <ScreenHeader title="Category not found" back />
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader title={category.name} eyebrow="Category" back />

      {gates.length === 0 && (
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>No decks here yet.</p>
          <Link className="btn btn-primary" to="/manage">Add cards</Link>
        </div>
      )}

      {isBasicsCategory(category) ? (
        <BasicsGates
          gates={gates}
          cards={cards}
          cardProgress={cardProgress}
          decayEnabled={settings.enableMasteryDecay}
          now={now}
        />
      ) : gates.map((gate) => {
        const deck = gate.deck;
        const studyLanguages = deckStudyLanguages(deck, languages);
        const deckCards = cards.filter((c) => c.deckId === deck.id);
        const statuses = deckCards.map((c) =>
          statusFor(cardProgress[c.id], now, settings.enableMasteryDecay, studyLanguages),
        );
        const mastered = statuses.filter((s) => s === 'mastered').length;
        const needsReview = statuses.filter(
          (s) => s === 'rusty' || s === 'needs-review' || s === 'forgotten',
        ).length;
        const progress = deckProgress[deck.id];

        return (
          <section
            className={'panel' + (gate.unlocked ? '' : ' locked')}
            key={deck.id}
          >
            <div className="spread">
              <div>
                <div className="eyebrow">
                  Deck {gate.position} of {gates.length} · {deck.name}
                </div>
                <div className="small muted">
                  {deckCards.length} cards · {mastered} mastered · {needsReview} need review
                </div>
              </div>
              <div className="deck-marks">
                {gate.unlocked ? (
                  progress?.hardModePassedAt && <span className="chip chip-ok">Passed</span>
                ) : (
                  <span className="chip">
                    <Icon name="lock" /> Locked
                  </span>
                )}
              </div>
            </div>

            <PerfectRuns
              completed={gate.perfectRunsCompleted}
              required={gate.perfectRunsRequired}
            />

            {gate.unlocked ? (
              // One way in, and it leads to the modes. Reading the deck through
              // is the Review tab's job and is chosen there.
              <Link className="btn btn-primary btn-block" to={'/deck/' + deck.id}>
                Practise this deck
              </Link>
            ) : (
              <p className="small muted">
                Opens once <strong>{gate.blockedBy!.name}</strong> is mastered —{' '}
                {gate.perfectRunsRequired} flawless runs through it.
              </p>
            )}

            {own && (
              <button className="btn btn-block" onClick={() => addSentence(deck)}>
                Add a sentence
              </button>
            )}

            {deckCards.length > 0 && gate.unlocked && (
              <details>
                <summary className="small muted">Card status</summary>
                <div className="list" style={{ marginTop: 10 }}>
                  {deckCards.map((card, i) => (
                    <Link className="list-item" key={card.id} to={'/manage/card/' + card.id}>
                      <span className="grow english">
                        <strong>{card.english}</strong>
                        <div className="small muted">{STATUS_LABELS[statuses[i]]}</div>
                      </span>
                      {/* One column per language studied. The card keeps both
                          halves either way — this is what is shown, not what
                          is stored. */}
                      {studyLanguages.includes('hebrew') && (
                        <WordForms side={card.hebrew} language="hebrew" />
                      )}
                      {studyLanguages.includes('arabic') && (
                        <WordForms side={card.arabic} language="arabic" />
                      )}
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}

function BasicsGates({
  gates,
  cards,
  cardProgress,
  decayEnabled,
  now,
}: {
  gates: DeckGate[];
  cards: Flashcard[];
  cardProgress: Record<string, CardProgress | undefined>;
  decayEnabled: boolean;
  now: string;
}) {
  const groups = basicsGroups(gates);

  return (
    <>
      {groups.map((group, index) => {
        const primary = group.hebrew ?? group.arabic ?? group.both;
        if (!primary) return null;

        const target =
          group.hebrew && !group.hebrew.mastered
            ? group.hebrew
            : group.arabic && !group.arabic.mastered
              ? group.arabic
              : group.both && !group.both.mastered
                ? group.both
                : undefined;
        const active = target ?? group.both ?? group.arabic ?? group.hebrew;
        const locked = Boolean(target && !target.unlocked);
        const deckCards = cards.filter((c) => c.deckId === primary.deck.id);
        const statusLanguages: readonly Language[] = active
          ? deckStudyLanguages(active.deck, ['hebrew', 'arabic'])
          : ['hebrew', 'arabic'];
        const statuses = deckCards.map((c) =>
          statusFor(
            cardProgress[c.id],
            now,
            decayEnabled,
            statusLanguages,
          ),
        );
        const mastered = statuses.filter((s) => s === 'mastered').length;
        const needsReview = statuses.filter(needsReviewStatus).length;

        return (
          <section
            className={'panel' + (locked ? ' locked' : '')}
            key={group.key}
          >
            <div className="spread">
              <div>
                <div className="eyebrow">
                  Deck {index + 1} of {groups.length} · {group.name}
                </div>
                <div className="small muted">
                  {deckCards.length} cards · {mastered} mastered · {needsReview} need review
                </div>
              </div>
              <BasicsStageChip
                hebrew={group.hebrew}
                arabic={group.arabic}
                both={group.both}
              />
            </div>

            <BasicsProgressBar
              hebrew={group.hebrew}
              arabic={group.arabic}
              both={group.both}
            />

            {target && target.unlocked ? (
              <Link className="btn btn-primary btn-block" to={'/deck/' + target.deck.id}>
                Practise {basicsStageLabel(target.deck)}
              </Link>
            ) : target?.blockedBy ? (
              <p className="small muted">
                Opens once <strong>{target.blockedBy.name}</strong> is mastered —{' '}
                {target.perfectRunsRequired} flawless runs through it.
              </p>
            ) : (
              <p className="small muted">This Basics stage is complete.</p>
            )}

            {deckCards.length > 0 && active?.unlocked && (
              <details>
                <summary className="small muted">Card status</summary>
                <div className="list" style={{ marginTop: 10 }}>
                  {deckCards.map((card, i) => (
                    <Link className="list-item" key={card.id} to={'/manage/card/' + card.id}>
                      <span className="grow english">
                        <strong>{card.english}</strong>
                        <div className="small muted">{STATUS_LABELS[statuses[i]]}</div>
                      </span>
                      {statusLanguages.includes('hebrew') && (
                        <WordForms side={card.hebrew} language="hebrew" />
                      )}
                      {statusLanguages.includes('arabic') && (
                        <WordForms side={card.arabic} language="arabic" />
                      )}
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </section>
        );
      })}
    </>
  );
}

function BasicsStageChip({
  hebrew,
  arabic,
  both,
}: {
  hebrew?: DeckGate;
  arabic?: DeckGate;
  both?: DeckGate;
}) {
  if (both?.mastered || (!both && arabic?.mastered)) {
    return <span className="chip chip-ok">Complete</span>;
  }
  if (arabic?.mastered) return <span className="chip">Both next</span>;
  if (hebrew?.mastered) return <span className="chip">Arabic next</span>;
  return <span className="chip">Hebrew first</span>;
}

function BasicsProgressBar({
  hebrew,
  arabic,
  both,
}: {
  hebrew?: DeckGate;
  arabic?: DeckGate;
  both?: DeckGate;
}) {
  const stages = [
    { key: 'hebrew', gate: hebrew },
    { key: 'arabic', gate: arabic },
    { key: 'both', gate: both },
  ] as const;
  const segments = stages.flatMap(({ key, gate }) =>
    Array.from({ length: gate?.perfectRunsRequired ?? 0 }, (_unused, index) => ({
      key: key + '-' + index,
      stage: key,
      filled: index < (gate?.perfectRunsCompleted ?? 0),
    })),
  );
  const completed = stages.reduce(
    (sum, stage) => sum + (stage.gate?.perfectRunsCompleted ?? 0),
    0,
  );
  const required = stages.reduce(
    (sum, stage) => sum + (stage.gate?.perfectRunsRequired ?? 0),
    0,
  );
  const mastered = Boolean(both?.mastered || (!both && arabic?.mastered));

  if (required === 0) return null;

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="spread">
        <span className="eyebrow row basics-progress-label">
          Perfect runs
          <Tip
            className="info-tip"
            label="Perfect run colour code"
            content={
              <>
                <span className="tip-line">Blue: Hebrew</span>
                <span className="tip-line">Burnt orange: Arabic</span>
                <span className="tip-line">Green: Hebrew and Arabic together</span>
              </>
            }
          >
            <Icon name="info" />
          </Tip>
        </span>
        <span className="small">
          {completed} / {required}
        </span>
      </div>
      <div
        className={'runs basics-runs' + (mastered ? ' mastered' : '')}
        role="img"
        aria-label={
          completed +
          ' of ' +
          required +
          ' perfect runs complete. Blue is Hebrew, burnt orange is Arabic, green is Hebrew and Arabic together.'
        }
      >
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={
              'seg stage-' +
              segment.stage +
              (segment.filled ? ' filled' : '')
            }
          />
        ))}
      </div>
    </div>
  );
}

function basicsStageLabel(deck: Deck): string {
  const stage = basicsStage(deck);
  if (stage === 'arabic') return 'Arabic';
  if (stage === 'both') return 'Both';
  return 'Hebrew';
}

function needsReviewStatus(status: MasteryStatus): boolean {
  return status === 'rusty' || status === 'needs-review' || status === 'forgotten';
}

function basicsGroups(gates: DeckGate[]): {
  key: string;
  name: string;
  hebrew?: DeckGate;
  arabic?: DeckGate;
  both?: DeckGate;
}[] {
  const byName = new Map<
    string,
    { key: string; name: string; hebrew?: DeckGate; arabic?: DeckGate; both?: DeckGate }
  >();

  for (const gate of gates) {
    const stage = basicsStage(gate.deck);
    const name = basicsBaseName(gate.deck);
    const existing = byName.get(name) ?? { key: name.toLowerCase(), name };
    if (stage === 'hebrew') existing.hebrew = gate;
    else if (stage === 'arabic') existing.arabic = gate;
    else if (stage === 'both') existing.both = gate;
    else existing.hebrew = gate;
    byName.set(name, existing);
  }

  return [...byName.values()];
}
