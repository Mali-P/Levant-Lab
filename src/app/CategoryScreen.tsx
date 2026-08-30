import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  CardProgress,
  Deck,
  FinishedSort,
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
  deckBaseName,
  deckStage,
  deckStudyLanguages,
  gateCategories,
  isStagedCategory,
  sortByFinished,
} from '../features/review/languagePolicy';
import ScreenHeader from '../components/controls/ScreenHeader';
import FinishedSortControl from '../components/controls/FinishedSortControl';
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
  const update = useSettings((s) => s.update);
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const cardProgress = useData((s) => s.cardProgress);
  const deckProgress = useData((s) => s.deckProgress);
  const saveCard = useData((s) => s.saveCard);

  // The whole course rather than this category alone, because the category
  // itself can be shut: outside Basics one unfinished category runs at a time,
  // and which one that is is a fact about the others.
  const categoryGate = gateCategories(categories, decks, deckProgress, languages, {
    deckIds: settings.openedDeckIds,
    categoryIds: settings.openedCategoryIds,
  }).find((entry) => entry.category.id === categoryId);
  const category = categoryGate?.category;
  const gates = categoryGate?.gates ?? [];
  const now = new Date().toISOString();
  const sort: FinishedSort = settings.finishedSort ?? 'course';

  const openedDecks = settings.openedDeckIds ?? [];

  function openLot(deckId: string) {
    if (openedDecks.includes(deckId)) return;
    void update({ openedDeckIds: [...openedDecks, deckId] });
  }

  /**
   * Hands the choice back. Every score stays exactly where it is — the lot
   * simply stops being the one in hand, so another may be opened instead.
   * Without it a mistaken tap would commit her to one lot for the rest of the
   * category.
   */
  function closeLot(lotDeckIds: string[]) {
    void update({
      openedDeckIds: openedDecks.filter((id) => !lotDeckIds.includes(id)),
    });
  }

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

  if (!category || !categoryGate) {
    return (
      <div className="screen">
        <ScreenHeader title="Category not found" back />
      </div>
    );
  }

  // The same gate the categories list draws, enforced again here so a bookmark
  // cannot walk past it.
  if (!categoryGate.unlocked) {
    return (
      <div className="screen">
        <ScreenHeader title={category.name} eyebrow="Category" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>
            This category is still closed. Finish{' '}
            <strong>{categoryGate.blockedBy?.name}</strong> in Hebrew and Arabic
            first, or set it aside from the categories list to choose this one
            instead.
          </p>
          <Link className="btn btn-primary" to="/categories">
            Back to categories
          </Link>
        </div>
      </div>
    );
  }

  const staged = isStagedCategory(gates.map((g) => g.deck));

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

      {staged && gates.length > 0 && (
        <FinishedSortControl
          value={sort}
          onChange={(next) => void update({ finishedSort: next })}
          label="Finished lots"
        />
      )}

      {staged ? (
        <StagedLots
          gates={gates}
          gated={categoryGate.gated}
          sort={sort}
          cards={cards}
          cardProgress={cardProgress}
          decayEnabled={settings.enableMasteryDecay}
          now={now}
          onOpen={openLot}
          onClose={closeLot}
        />
      ) : gates.map((gate) => {
        const deck = gate.deck;
        const studyLanguages = deckStudyLanguages(deck, languages);
        const deckCards = cards.filter((c) => c.deckId === deck.id);
        const statuses = deckCards.map((c) =>
          statusFor(cardProgress[c.id], now, settings.enableMasteryDecay, studyLanguages),
        );
        const mastered = statuses.filter((s) => s === 'mastered').length;
        const needsReview = statuses.filter(needsReviewStatus).length;
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

type LotGroup = {
  key: string;
  name: string;
  hebrew?: DeckGate;
  arabic?: DeckGate;
  both?: DeckGate;
  gates: DeckGate[];
  /** Every rung mastered — Hebrew, Arabic and the two together. */
  complete: boolean;
};

/**
 * A staged category, lot by lot.
 *
 * Every lot is three rungs over the same words — Hebrew, then Palestinian
 * Arabic, then both together — and is finished only when all three are. Basics
 * of Basics is open throughout and offers all three at once; every other
 * category runs one lot at a time and lets the learner say which, so a lot she
 * has not opened offers the choice rather than a rung.
 */
function StagedLots({
  gates,
  gated,
  sort,
  cards,
  cardProgress,
  decayEnabled,
  now,
  onOpen,
  onClose,
}: {
  gates: DeckGate[];
  gated: boolean;
  sort: FinishedSort;
  cards: Flashcard[];
  cardProgress: Record<string, CardProgress | undefined>;
  decayEnabled: boolean;
  now: string;
  onOpen: (deckId: string) => void;
  onClose: (deckIds: string[]) => void;
}) {
  const groups = lotGroups(gates);
  const ordered = sortByFinished(groups, (group) => group.complete, sort);

  return (
    <>
      {ordered.map((group, index) => {
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
        const opened = group.gates.some((gate) => gate.unlocked);
        const choosable = group.gates.some((gate) => gate.choosable);
        const deckCards = cards.filter((c) => c.deckId === primary.deck.id);
        const statusLanguages: readonly Language[] = active
          ? deckStudyLanguages(active.deck, ['hebrew', 'arabic'])
          : ['hebrew', 'arabic'];
        const statuses = deckCards.map((c) =>
          statusFor(cardProgress[c.id], now, decayEnabled, statusLanguages),
        );
        const mastered = statuses.filter((s) => s === 'mastered').length;
        const needsReview = statuses.filter(needsReviewStatus).length;

        return (
          <section
            className={'panel' + (!opened && !choosable ? ' locked' : '')}
            key={group.key}
          >
            <div className="spread">
              <div>
                <div className="eyebrow">
                  Lot {index + 1} of {ordered.length} · {group.name}
                </div>
                <div className="small muted">
                  {deckCards.length} cards · {mastered} mastered · {needsReview} need review
                </div>
              </div>
              <StageChip
                hebrew={group.hebrew}
                arabic={group.arabic}
                both={group.both}
              />
            </div>

            <StageProgressBar
              hebrew={group.hebrew}
              arabic={group.arabic}
              both={group.both}
            />

            {!gated ? (
              // Basics: every rung open, so all three are offered and she picks.
              <div className="stage-choices">
                {[group.hebrew, group.arabic, group.both].map(
                  (stage) =>
                    stage && (
                      <Link
                        className={
                          'btn btn-block' +
                          (stage === target ? ' btn-primary' : '') +
                          (stage.mastered ? ' btn-ghost' : '')
                        }
                        key={stage.deck.id}
                        to={'/deck/' + stage.deck.id}
                      >
                        {stage.mastered ? '✓ ' : ''}
                        Practise {stageLabel(stage.deck)}
                      </Link>
                    ),
                )}
              </div>
            ) : choosable ? (
              <>
                <p className="small muted">
                  Not started. Open this lot next, or pick any other in this
                  category — the order is yours.
                </p>
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => onOpen(primary.deck.id)}
                >
                  Open this lot
                </button>
              </>
            ) : !opened ? (
              <p className="small muted">
                Opens once <strong>{primary.blockedBy?.name}</strong> is
                finished — {primary.perfectRunsRequired} flawless runs through
                it.
              </p>
            ) : target && target.unlocked ? (
              <>
                <Link className="btn btn-primary btn-block" to={'/deck/' + target.deck.id}>
                  Practise {stageLabel(target.deck)}
                </Link>
                <button
                  className="btn btn-block btn-ghost"
                  onClick={() => onClose(group.gates.map((g) => g.deck.id))}
                >
                  Set this lot aside
                </button>
              </>
            ) : target?.blockedBy ? (
              <p className="small muted">
                Opens once <strong>{target.blockedBy.name}</strong> is mastered —{' '}
                {target.perfectRunsRequired} flawless runs through it.
              </p>
            ) : (
              <p className="small muted">
                This lot is complete in Hebrew and Arabic.
              </p>
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

function StageChip({
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

function StageProgressBar({
  hebrew,
  arabic,
  both,
}: {
  hebrew?: DeckGate;
  arabic?: DeckGate;
  both?: DeckGate;
}) {
  const mastered = Boolean(both?.mastered || (!both && arabic?.mastered));
  const displayed =
    mastered && both
      ? { stage: 'both' as const, gate: both }
      : hebrew && !hebrew.mastered
        ? { stage: 'hebrew' as const, gate: hebrew }
        : arabic && !arabic.mastered
          ? { stage: 'arabic' as const, gate: arabic }
          : both
            ? { stage: 'both' as const, gate: both }
            : arabic
              ? { stage: 'arabic' as const, gate: arabic }
              : hebrew
                ? { stage: 'hebrew' as const, gate: hebrew }
                : undefined;

  if (!displayed || displayed.gate.perfectRunsRequired === 0) return null;

  const completed = mastered
    ? displayed.gate.perfectRunsRequired
    : displayed.gate.perfectRunsCompleted;
  const required = displayed.gate.perfectRunsRequired;
  const segments = Array.from({ length: required }, (_unused, index) => ({
    key: displayed.stage + '-' + index,
    filled: index < completed,
  }));

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
                <span className="tip-line">Burnt orange: Palestinian Arabic</span>
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
        className={
          'runs basics-runs stage-' +
          displayed.stage +
          (mastered ? ' mastered' : '')
        }
        role="img"
        aria-label={
          completed +
          ' of ' +
          required +
          ' perfect runs complete. Blue is Hebrew, burnt orange is Palestinian Arabic, green is Hebrew and Arabic together.'
        }
      >
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={'seg' + (segment.filled ? ' filled' : '')}
          />
        ))}
      </div>
    </div>
  );
}

function stageLabel(deck: Deck): string {
  const stage = deckStage(deck);
  if (stage === 'arabic') return 'Arabic';
  if (stage === 'both') return 'Both';
  return 'Hebrew';
}

function needsReviewStatus(status: MasteryStatus): boolean {
  return status === 'rusty' || status === 'needs-review' || status === 'forgotten';
}

function lotGroups(gates: DeckGate[]): LotGroup[] {
  const byKey = new Map<string, LotGroup>();

  for (const gate of gates) {
    const name = deckBaseName(gate.deck);
    const key = gate.lotKey ?? name.toLowerCase();
    const group = byKey.get(key) ?? { key, name, gates: [], complete: true };
    const stage = deckStage(gate.deck);
    if (stage === 'hebrew') group.hebrew = gate;
    else if (stage === 'arabic') group.arabic = gate;
    else if (stage === 'both') group.both = gate;
    // A deck of this lot carrying no language stands in for the Hebrew rung,
    // but only where there is no real one. It used to be assigned outright, so
    // a deck left over from before the lot was split could take the Hebrew
    // rung's place in the panel and the learner would be shown that deck's
    // card count and offered that deck to practise.
    else group.hebrew ??= gate;
    group.gates.push(gate);
    group.complete = group.complete && gate.mastered;
    byKey.set(key, group);
  }

  return [...byKey.values()];
}
