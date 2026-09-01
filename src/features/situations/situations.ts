import type { Category, Deck, DeckProgress } from '../../types';
import type { SeedCard } from '../../constants/seed';
import {
  SITUATIONS,
  type Situation,
  type SituationNode,
} from '../../constants/situations';
import { deckLots, isSituationCategory, type Lot } from '../review/languagePolicy';
import { isDeckMastered } from '../review/unlock';

/**
 * The pure half of the Real Situations screens: which installed categories are
 * scenarios, how far each has got, and how a rehearsal walks its script.
 *
 * The decks lean entirely on shapes that already exist — a scenario's parts
 * are lots, read exactly the way an exchange's rungs are. The one genuinely
 * new machine is the rehearsal walk: a cursor over the authored script whose
 * position only her chosen answers move.
 */

/** The scenario categories this install actually has, in course order. */
export function situationCategories(categories: Category[]): Category[] {
  return categories
    .filter((category) => isSituationCategory(category))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** The authored situation an installed category is, matched the area's way. */
export function situationFor(
  category: Pick<Category, 'name'> | undefined,
): Situation | undefined {
  if (!category) return undefined;
  const name = category.name.toLowerCase();
  return SITUATIONS.find((situation) => situation.name.toLowerCase() === name);
}

/** One scenario's parts: its decks folded back into lots, in course order. */
export function situationParts(scenarioDecks: Deck[]): Lot[] {
  return deckLots(scenarioDecks);
}

/** Whether every rung of every part is mastered — Hebrew and Arabic alike. */
export function situationFinished(
  parts: Lot[],
  deckProgress: Record<string, DeckProgress | undefined>,
): boolean {
  return (
    parts.length > 0 &&
    parts.every((lot) =>
      lot.decks.every((deck) => isDeckMastered(deck, deckProgress[deck.id])),
    )
  );
}

/** Rungs mastered across the scenario, for an "n of m" line. */
export function rungsMastered(
  parts: Lot[],
  deckProgress: Record<string, DeckProgress | undefined>,
): { mastered: number; total: number } {
  const decks = parts.flatMap((lot) => lot.decks);
  return {
    mastered: decks.filter((deck) => isDeckMastered(deck, deckProgress[deck.id]))
      .length,
    total: decks.length,
  };
}

export type SituationStatus = 'not-started' | 'in-progress' | 'complete';

/**
 * Where a scenario stands, said the way the learner reads it. "In progress"
 * means any work at all — one answered card is enough to claim the scenario as
 * hers, which is exactly how the course's own lots treat a start.
 */
export function situationStatus(
  parts: Lot[],
  deckProgress: Record<string, DeckProgress | undefined>,
): SituationStatus {
  if (situationFinished(parts, deckProgress)) return 'complete';
  const started = parts.some((lot) =>
    lot.decks.some((deck) => {
      const progress = deckProgress[deck.id];
      return (
        progress &&
        (progress.perfectRunsCompleted > 0 ||
          Boolean(progress.hardModePassedAt) ||
          Boolean(progress.lastStudiedAt))
      );
    }),
  );
  return started ? 'in-progress' : 'not-started';
}

// --- the rehearsal walk ------------------------------------------------------

/**
 * One step already taken: the line said to her, and the reply she chose.
 * Kept as the cards themselves so the screen can render and speak them.
 */
export type RehearsalStep = {
  them: SeedCard;
  said: SeedCard;
};

/**
 * A rehearsal in progress. Plain data, advanced only by `chooseReply`, so the
 * screen holds it in state and every transition is a pure function of it.
 */
export type RehearsalState = {
  /** The node whose line has just been said to her; undefined once done. */
  nodeId?: string;
  /** Everything said so far, in order. */
  steps: RehearsalStep[];
  /** Answers that did not fit where they were offered. */
  mistakes: number;
  done: boolean;
};

export function startRehearsal(situation: Situation): RehearsalState {
  return {
    nodeId: situation.script[0]?.id,
    steps: [],
    mistakes: 0,
    done: situation.script.length === 0,
  };
}

export function currentNode(
  situation: Situation,
  state: RehearsalState,
): SituationNode | undefined {
  if (state.done || !state.nodeId) return undefined;
  return situation.script.find((entry) => entry.id === state.nodeId);
}

/** The node the script falls through to when a choice names no `next`. */
function following(situation: Situation, nodeId: string): string | undefined {
  const index = situation.script.findIndex((entry) => entry.id === nodeId);
  if (index < 0 || index + 1 >= situation.script.length) return undefined;
  return situation.script[index + 1].id;
}

/**
 * The replies to lay in front of her at this node: every valid choice, made
 * up to `count` with wrong ones borrowed from elsewhere in the scenario — a
 * reply to a different line, which is exactly the kind of wrong the street
 * deals in. Order is shuffled with the caller's `random` so a test can pin it.
 */
export function rehearsalOptions(
  situation: Situation,
  node: SituationNode,
  random: () => number = Math.random,
  count = 4,
): SeedCard[] {
  const valid = node.choices.map((choice) => choice.card);

  const seen = new Set(valid.map((card) => card.english.toLowerCase()));
  const pool: SeedCard[] = [];
  for (const other of situation.script) {
    if (other.id === node.id) continue;
    for (const choice of other.choices) {
      const key = choice.card.english.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(choice.card);
    }
  }

  const options = [...valid];
  while (options.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    options.push(pool.splice(index, 1)[0]);
  }

  // Fisher–Yates, driven by the same source, so the right answer has no seat.
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

export type RehearsalOutcome = {
  state: RehearsalState;
  /** False when the chosen reply does not answer this line. */
  accepted: boolean;
};

/**
 * She answers. A valid reply is appended to the transcript and the script
 * moves where that reply leads; an invalid one counts a mistake and leaves the
 * conversation exactly where it stood, because a wrong turn in a real
 * conversation does not tear the conversation up — it just has not answered.
 */
export function chooseReply(
  situation: Situation,
  state: RehearsalState,
  english: string,
): RehearsalOutcome {
  const node = currentNode(situation, state);
  if (!node) return { state, accepted: false };

  const choice = node.choices.find(
    (entry) => entry.card.english.toLowerCase() === english.toLowerCase(),
  );
  if (!choice) {
    return { state: { ...state, mistakes: state.mistakes + 1 }, accepted: false };
  }

  const nextId = choice.next ?? following(situation, node.id);
  const steps = [...state.steps, { them: node.them, said: choice.card }];
  if (!nextId || nextId === 'end') {
    return {
      state: { ...state, steps, nodeId: undefined, done: true },
      accepted: true,
    };
  }
  return { state: { ...state, steps, nodeId: nextId }, accepted: true };
}
