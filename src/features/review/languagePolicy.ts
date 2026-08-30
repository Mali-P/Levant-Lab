import {
  LANGUAGES,
  type Category,
  type Deck,
  type DeckProgress,
  type FinishedSort,
  type Language,
} from '../../types';
import { gateDecks, isDeckMastered, sortDecks, type DeckGate } from './unlock';

export const BASICS_CATEGORY_NAME = 'Basics of Basics';

/**
 * The suffix a deck carries once the course has split it into language stages.
 * Authored in `constants/seed`; matched here because the gate has to recognise
 * a stage on a row that came off disk, where nothing but the name says so.
 */
const STAGE_SUFFIX = /\s+—\s+(Hebrew|Palestinian Arabic|Both)$/;

export function isStagedDeck(deck: Pick<Deck, 'name'>): boolean {
  return STAGE_SUFFIX.test(deck.name);
}

/**
 * Whether this category is a language ladder rather than a plain list.
 *
 * Decided by the decks and not by the category's name, so the learner's own
 * category — and anything she renames — answers no and keeps the simple
 * behaviour, while every category the starter set stages answers yes without
 * a list to keep in step.
 */
export function isStagedCategory(decks: readonly Pick<Deck, 'name'>[]): boolean {
  return decks.some(isStagedDeck);
}

/**
 * Which languages to filter a category's decks by, or `undefined` for none.
 *
 * A staged category is never filtered. Its rungs *are* the languages, and
 * hiding the Arabic ones from a learner who has narrowed her preference to
 * Hebrew would not narrow the ladder — it would delete two thirds of it and
 * leave her unable to finish a single lot.
 */
export function categoryGateLanguages(
  decks: readonly Pick<Deck, 'name'>[],
  settingsLanguages: readonly Language[],
): readonly Language[] | undefined {
  return isStagedCategory(decks) ? undefined : settingsLanguages;
}

export function deckStudyLanguages(
  deck: Pick<Deck, 'studyLanguages'> | undefined,
  settingsLanguages: readonly Language[],
): readonly Language[] {
  return deck?.studyLanguages?.length ? deck.studyLanguages : settingsLanguages;
}

export function isBasicsCategory(category: Pick<Category, 'name'> | undefined): boolean {
  return category?.name === BASICS_CATEGORY_NAME;
}

export function sameStudyLanguages(
  left: readonly Language[] | undefined,
  right: readonly Language[],
): boolean {
  return (left ?? LANGUAGES).join('|') === right.join('|');
}

/**
 * The lot a staged deck belongs to: its name with the stage stripped off.
 *
 * The leading forms are the shapes an older build wrote, kept so a device that
 * has one of those on disk still groups it with its siblings rather than
 * standing it up as a lot of its own.
 */
export function deckBaseName(deck: Pick<Deck, 'name'>): string {
  return deck.name
    .replace(/\s+—\s+Hebrew$/, '')
    .replace(/\s+—\s+Palestinian Arabic$/, '')
    .replace(/\s+—\s+Both$/, '')
    .replace(/^Hebrew\s+/, '')
    .replace(/^Palestinian Arabic\s+/, '')
    .replace(/^Both\s+/, '');
}

/** Retained name for `deckBaseName`, from when only Basics was staged. */
export const basicsBaseName = deckBaseName;

export type DeckStage = 'hebrew' | 'arabic' | 'both' | 'other';

export function deckStage(deck: Pick<Deck, 'name' | 'studyLanguages'>): DeckStage {
  if (/\s+—\s+Both$/.test(deck.name) || /^Both\s+/.test(deck.name)) return 'both';
  if (deck.studyLanguages?.length === 2) return 'both';
  if (deck.studyLanguages?.[0] === 'hebrew') return 'hebrew';
  if (deck.studyLanguages?.[0] === 'arabic') return 'arabic';
  return 'other';
}

/** Retained name for `deckStage`, from when only Basics was staged. */
export const basicsStage = deckStage;
/** Retained name for `DeckStage`. */
export type BasicsStage = DeckStage;

/**
 * One deck as the learner meets it: three rungs over the same words.
 *
 * `spare` is a deck of this lot that is none of the three stages — one she made
 * here, or one left over from before the lot was split. It stands where its lot
 * stands rather than being left to fall through to a default and sit open in
 * the middle of a ladder nobody has climbed to.
 */
export type Lot = {
  key: string;
  name: string;
  hebrew?: Deck;
  arabic?: Deck;
  both?: Deck;
  spare?: Deck;
  /** Every deck of the lot, in course order. */
  decks: Deck[];
};

export function deckLots(decks: Deck[]): Lot[] {
  const byKey = new Map<string, Lot>();

  for (const deck of sortDecks(decks)) {
    const name = deckBaseName(deck);
    const key = name.toLowerCase();
    const lot = byKey.get(key) ?? { key, name, decks: [] };
    const stage = deckStage(deck);

    if (stage === 'hebrew' && !lot.hebrew) lot.hebrew = deck;
    else if (stage === 'arabic' && !lot.arabic) lot.arabic = deck;
    else if (stage === 'both' && !lot.both) lot.both = deck;
    else lot.spare ??= deck;

    lot.decks.push(deck);
    byKey.set(key, lot);
  }

  // A lot whose only unstaged deck is standing in for the Hebrew rung: it is
  // the deck she has actually been working, so it takes that rung rather than
  // trailing the lot as an extra.
  for (const lot of byKey.values()) {
    if (!lot.hebrew && lot.spare) {
      lot.hebrew = lot.spare;
      lot.spare = undefined;
    }
  }

  return [...byKey.values()];
}

/** Whether the learner has actually put any work into this deck. */
function deckStarted(progress: DeckProgress | undefined): boolean {
  if (!progress) return false;
  return (
    progress.perfectRunsCompleted > 0 ||
    Boolean(progress.hardModePassedAt) ||
    Boolean(progress.lastStudiedAt)
  );
}

/**
 * What the learner has chosen to have open.
 *
 * A choice rather than a derivation: she picks the lot — and the category — she
 * wants next, and that pick has to survive her closing the app before she has
 * answered a single card. Decks and categories she has already worked count as
 * open too, so an install made before this existed is never locked out of the
 * work it was in the middle of.
 */
export type OpenedChoices = {
  deckIds?: readonly string[];
  categoryIds?: readonly string[];
};

type LotState = {
  lot: Lot;
  /** Every stage of the lot mastered — Hebrew and Arabic alike. */
  complete: boolean;
  opened: boolean;
  unlocked: boolean;
  /** Not opened, but she may choose to open it now. */
  choosable: boolean;
};

function lotStates(
  lots: Lot[],
  deckProgress: Record<string, DeckProgress | undefined>,
  opened: ReadonlySet<string>,
  gated: boolean,
): LotState[] {
  const base = lots.map((lot) => {
    const complete = lot.decks.every((deck) =>
      isDeckMastered(deck, deckProgress[deck.id]),
    );
    const isOpen = lot.decks.some(
      (deck) => opened.has(deck.id) || deckStarted(deckProgress[deck.id]),
    );
    return { lot, complete, opened: isOpen };
  });

  // Only one unfinished lot at a time, and the learner says which. Everything
  // finished stays open for revision; everything else waits until the one in
  // hand is done in both languages.
  const busy = gated && base.some((state) => state.opened && !state.complete);

  return base.map((state) => ({
    ...state,
    unlocked: !gated || state.complete || state.opened,
    choosable: gated && !state.complete && !state.opened && !busy,
  }));
}

/** The deck a locked lot is waiting on: the first unfinished rung in hand. */
function blockingDeck(
  states: LotState[],
  deckProgress: Record<string, DeckProgress | undefined>,
): Deck | undefined {
  const busy = states.find((state) => state.opened && !state.complete);
  if (!busy) return undefined;
  return (
    busy.lot.decks.find((deck) => !isDeckMastered(deck, deckProgress[deck.id])) ??
    busy.lot.decks[0]
  );
}

/**
 * Which of a category's decks are open, and which may be chosen next.
 *
 * Every category the course ships is a language ladder: each lot is met in
 * Hebrew, then in Palestinian Arabic, then in both at once, and a lot is only
 * finished when all three are. Where the categories differ is in what decides
 * the order:
 *
 *   Basics of Basics is open throughout. It is the ground floor and the learner
 *     dips into it as she needs — no lot there waits on another, and neither
 *     does a stage.
 *   Every other category runs one lot at a time, but she picks which: nothing
 *     opens until she opens something, and the moment a lot is complete the
 *     whole rest of the category is hers to choose from again.
 *
 * A category that is not staged at all — her own sentences, anything she has
 * written — keeps the plain ladder it always had.
 */
export function gateCategoryDecks(
  category: Pick<Category, 'name'> | undefined,
  decks: Deck[],
  deckProgress: Record<string, DeckProgress | undefined>,
  settingsLanguages: readonly Language[],
  opened: OpenedChoices = {},
): DeckGate[] {
  if (!isStagedCategory(decks)) {
    return gateDecks(
      decks,
      deckProgress,
      categoryGateLanguages(decks, settingsLanguages),
    );
  }

  const ordered = sortDecks(decks);
  const gated = !isBasicsCategory(category);
  const chosen = new Set(opened.deckIds ?? []);
  const states = lotStates(deckLots(decks), deckProgress, chosen, gated);
  const blocker = blockingDeck(states, deckProgress);

  type Open = { unlocked: boolean; choosable: boolean; blockedBy?: Deck };
  const openByDeck = new Map<string, Open>();
  const lotByDeck = new Map<string, LotState>();

  for (const state of states) {
    for (const deck of state.lot.decks) lotByDeck.set(deck.id, state);

    const { hebrew, arabic, both, spare } = state.lot;
    const hebrewMastered = hebrew
      ? isDeckMastered(hebrew, deckProgress[hebrew.id])
      : true;
    const arabicMastered = arabic
      ? isDeckMastered(arabic, deckProgress[arabic.id])
      : true;

    if (!state.unlocked) {
      // The lot as a whole is shut. Its first rung is what she would open, so
      // that is the deck the choice is offered on.
      const first = hebrew ?? arabic ?? both ?? spare;
      for (const deck of state.lot.decks) {
        openByDeck.set(deck.id, {
          unlocked: false,
          choosable: state.choosable && deck.id === first?.id,
          blockedBy: state.choosable ? undefined : blocker,
        });
      }
      continue;
    }

    // Inside an open lot the order is fixed: Hebrew, then Palestinian Arabic,
    // then the two together. Basics excepted — it is open throughout, stages
    // included, so a stage there is never held back.
    const free = !gated;
    for (const deck of [hebrew, spare]) {
      if (deck) openByDeck.set(deck.id, { unlocked: true, choosable: false });
    }
    if (arabic) {
      const ready = free || hebrewMastered;
      openByDeck.set(arabic.id, {
        unlocked: ready,
        choosable: false,
        blockedBy: ready ? undefined : hebrew,
      });
    }
    if (both) {
      const ready = free || (hebrewMastered && arabicMastered);
      openByDeck.set(both.id, {
        unlocked: ready,
        choosable: false,
        blockedBy: ready ? undefined : hebrewMastered ? arabic : hebrew,
      });
    }
  }

  return ordered.map((deck, index) => {
    const progress = deckProgress[deck.id];
    const open = openByDeck.get(deck.id) ?? { unlocked: true, choosable: false };
    const state = lotByDeck.get(deck.id);
    return {
      deck,
      position: index + 1,
      unlocked: open.unlocked,
      choosable: open.choosable,
      lotKey: state?.lot.key,
      lotComplete: state?.complete ?? false,
      mastered: isDeckMastered(deck, progress),
      perfectRunsCompleted: progress?.perfectRunsCompleted ?? 0,
      perfectRunsRequired: Math.max(1, deck.perfectRunsRequired),
      blockedBy: open.unlocked ? undefined : open.blockedBy,
    };
  });
}

/**
 * A category and the state of the ladder inside it.
 *
 * `gated` marks the categories the course holds back: everything staged bar
 * Basics of Basics, which stays open, and bar anything the learner wrote
 * herself, which was never gated to begin with.
 */
export type CategoryGate = {
  category: Category;
  gates: DeckGate[];
  gated: boolean;
  /** Every deck in it mastered, in Hebrew and in Arabic. */
  complete: boolean;
  opened: boolean;
  unlocked: boolean;
  /** Not opened, but she may choose to open it now. */
  choosable: boolean;
  /** The category standing in the way. Set only while locked. */
  blockedBy?: Category;
};

/**
 * The same rule the lots inside a category follow, applied to the categories
 * themselves: one unfinished category at a time, and the learner says which.
 *
 * She is never marched down the list. Anything finished stays open, anything
 * unfinished waits, and the moment the category in hand is complete in both
 * languages the rest of the course is hers to choose from.
 */
export function gateCategories(
  categories: Category[],
  decks: Deck[],
  deckProgress: Record<string, DeckProgress | undefined>,
  settingsLanguages: readonly Language[],
  opened: OpenedChoices = {},
): CategoryGate[] {
  const chosenDecks = new Set(opened.deckIds ?? []);
  const chosenCategories = new Set(opened.categoryIds ?? []);
  const decksByCategory = new Map<string, Deck[]>();
  for (const deck of decks) {
    const list = decksByCategory.get(deck.categoryId);
    if (list) list.push(deck);
    else decksByCategory.set(deck.categoryId, [deck]);
  }

  const base = categories.map((category) => {
    const own = decksByCategory.get(category.id) ?? [];
    const gated = own.length > 0 && isStagedCategory(own) && !isBasicsCategory(category);
    const complete =
      own.length > 0 &&
      own.every((deck) => isDeckMastered(deck, deckProgress[deck.id]));
    const isOpen =
      chosenCategories.has(category.id) ||
      own.some(
        (deck) => chosenDecks.has(deck.id) || deckStarted(deckProgress[deck.id]),
      );
    return { category, decks: own, gated, complete, opened: isOpen };
  });

  const busy = base.find((entry) => entry.gated && entry.opened && !entry.complete);

  return base.map((entry) => {
    const unlocked = !entry.gated || entry.complete || entry.opened;
    const choosable =
      entry.gated && !entry.complete && !entry.opened && busy === undefined;

    return {
      category: entry.category,
      gated: entry.gated,
      complete: entry.complete,
      opened: entry.opened,
      unlocked,
      choosable,
      blockedBy: unlocked ? undefined : busy?.category,
      gates: unlocked
        ? gateCategoryDecks(
            entry.category,
            entry.decks,
            deckProgress,
            settingsLanguages,
            opened,
          )
        : lockedGates(entry.decks, deckProgress),
    };
  });
}

/**
 * Every deck shut, because the category around them is.
 *
 * The lots are still worked out. A shut category is still described to the
 * learner — "nine lots, none finished" — and counting its decks instead would
 * report a category three times the size of the one she will meet.
 */
function lockedGates(
  decks: Deck[],
  deckProgress: Record<string, DeckProgress | undefined>,
): DeckGate[] {
  const lotByDeck = new Map<string, Lot>();
  for (const lot of deckLots(decks)) {
    for (const deck of lot.decks) lotByDeck.set(deck.id, lot);
  }

  return sortDecks(decks).map((deck, index) => {
    const progress = deckProgress[deck.id];
    const lot = lotByDeck.get(deck.id);
    return {
      deck,
      position: index + 1,
      unlocked: false,
      choosable: false,
      lotKey: lot?.key,
      lotComplete: Boolean(
        lot?.decks.every((entry) => isDeckMastered(entry, deckProgress[entry.id])),
      ),
      mastered: isDeckMastered(deck, progress),
      perfectRunsCompleted: progress?.perfectRunsCompleted ?? 0,
      perfectRunsRequired: Math.max(1, deck.perfectRunsRequired),
    };
  });
}

export type { FinishedSort };

export const FINISHED_SORTS: readonly FinishedSort[] = ['course', 'first', 'last'];

export const FINISHED_SORT_LABELS: Record<FinishedSort, string> = {
  course: 'Course order',
  first: 'Finished first',
  last: 'Finished last',
};

/** A stable partition: nothing is reordered except across the finished line. */
export function sortByFinished<T>(
  items: readonly T[],
  finished: (item: T) => boolean,
  mode: FinishedSort,
): T[] {
  if (mode === 'course') return [...items];
  const done = items.filter(finished);
  const rest = items.filter((item) => !finished(item));
  return mode === 'first' ? [...done, ...rest] : [...rest, ...done];
}
