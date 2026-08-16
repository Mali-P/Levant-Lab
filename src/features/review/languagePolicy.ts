import { LANGUAGES, type Category, type Deck, type DeckProgress, type Language } from '../../types';
import { gateDecks, isDeckMastered, sortDecks, type DeckGate } from './unlock';

export const BASICS_CATEGORY_NAME = 'Basics of Basics';

export function categoryGateLanguages(
  category: Pick<Category, 'name'> | undefined,
  settingsLanguages: readonly Language[],
): readonly Language[] | undefined {
  return category?.name === BASICS_CATEGORY_NAME ? undefined : settingsLanguages;
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

export function basicsBaseName(deck: Pick<Deck, 'name'>): string {
  return deck.name
    .replace(/\s+—\s+Hebrew$/, '')
    .replace(/\s+—\s+Palestinian Arabic$/, '')
    .replace(/\s+—\s+Both$/, '')
    .replace(/^Hebrew\s+/, '')
    .replace(/^Palestinian Arabic\s+/, '')
    .replace(/^Both\s+/, '');
}

function basicsGateKey(deck: Pick<Deck, 'name'>): string {
  return basicsBaseName(deck).toLowerCase();
}

export type BasicsStage = 'hebrew' | 'arabic' | 'both' | 'other';

export function basicsStage(
  deck: Pick<Deck, 'name' | 'studyLanguages'>,
): BasicsStage {
  if (/\s+—\s+Both$/.test(deck.name) || /^Both\s+/.test(deck.name)) return 'both';
  if (deck.studyLanguages?.length === 2) return 'both';
  if (deck.studyLanguages?.[0] === 'hebrew') return 'hebrew';
  if (deck.studyLanguages?.[0] === 'arabic') return 'arabic';
  return 'other';
}

/**
 * Basics is authored as Hebrew, Arabic, then integrated Both stages. The
 * learner sees those three as one "lot": Hebrew opens first, Arabic opens
 * after Hebrew, Both opens after Arabic, and the next lot waits for Both.
 */
export function gateCategoryDecks(
  category: Pick<Category, 'name'> | undefined,
  decks: Deck[],
  deckProgress: Record<string, DeckProgress | undefined>,
  settingsLanguages: readonly Language[],
): DeckGate[] {
  if (!isBasicsCategory(category)) {
    return gateDecks(
      decks,
      deckProgress,
      categoryGateLanguages(category, settingsLanguages),
    );
  }

  const ordered = sortDecks(decks);
  const groups = new Map<
    string,
    { hebrew?: Deck; arabic?: Deck; both?: Deck; fallback?: Deck }
  >();

  for (const deck of ordered) {
    const key = basicsGateKey(deck);
    const group = groups.get(key) ?? {};
    const stage = basicsStage(deck);
    if (stage === 'hebrew') group.hebrew = deck;
    else if (stage === 'arabic') group.arabic = deck;
    else if (stage === 'both') group.both = deck;
    else group.fallback = deck;
    groups.set(key, group);
  }

  const groupEntries = [...groups.values()];
  const openByDeck = new Map<string, { unlocked: boolean; blockedBy?: Deck }>();
  let previousComplete = true;
  let previousBlocker: Deck | undefined;

  for (const group of groupEntries) {
    const hebrew = group.hebrew ?? group.fallback;
    const arabic = group.arabic;
    const both = group.both;
    // A deck of this lot that is none of its three stages — one the learner
    // made here, or one left over from before the lot was split in three. It
    // stands where its lot stands. Left out of the reckoning it would fall
    // through to the default at the bottom of this function and sit open in
    // the middle of a ladder the learner has not climbed to yet, which is a
    // whole category of locks quietly not holding.
    const spare = group.hebrew ? group.fallback : undefined;
    const hebrewMastered = hebrew
      ? isDeckMastered(hebrew, deckProgress[hebrew.id])
      : true;
    const arabicMastered = arabic
      ? isDeckMastered(arabic, deckProgress[arabic.id])
      : true;
    const bothMastered = both
      ? isDeckMastered(both, deckProgress[both.id])
      : true;

    if (hebrew) {
      openByDeck.set(hebrew.id, {
        unlocked: previousComplete,
        blockedBy: previousComplete ? undefined : previousBlocker,
      });
    }
    if (spare) {
      openByDeck.set(spare.id, {
        unlocked: previousComplete,
        blockedBy: previousComplete ? undefined : previousBlocker,
      });
    }
    if (arabic) {
      openByDeck.set(arabic.id, {
        unlocked: previousComplete && hebrewMastered,
        blockedBy: !previousComplete
          ? previousBlocker
          : hebrewMastered
            ? undefined
            : hebrew,
      });
    }
    if (both) {
      openByDeck.set(both.id, {
        unlocked: previousComplete && hebrewMastered && arabicMastered,
        blockedBy: !previousComplete
          ? previousBlocker
          : !hebrewMastered && hebrew
            ? hebrew
            : arabicMastered
              ? undefined
              : arabic,
      });
    }

    previousComplete =
      previousComplete && hebrewMastered && arabicMastered && bothMastered;
    previousBlocker =
      !hebrewMastered && hebrew
        ? hebrew
        : !arabicMastered && arabic
          ? arabic
          : !bothMastered && both
            ? both
            : previousBlocker;
  }

  return ordered.map((deck, index) => {
    const progress = deckProgress[deck.id];
    const mastered = isDeckMastered(deck, progress);
    const open = openByDeck.get(deck.id) ?? { unlocked: true };
    return {
      deck,
      position: index + 1,
      unlocked: open.unlocked,
      mastered,
      perfectRunsCompleted: progress?.perfectRunsCompleted ?? 0,
      perfectRunsRequired: Math.max(1, deck.perfectRunsRequired),
      blockedBy: open.unlocked ? undefined : open.blockedBy,
    };
  });
}
