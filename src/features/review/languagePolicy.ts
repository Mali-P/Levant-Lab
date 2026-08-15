import type { Category, Deck, DeckProgress, Language } from '../../types';
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

export function basicsBaseName(deck: Pick<Deck, 'name'>): string {
  return deck.name
    .replace(/\s+—\s+Hebrew$/, '')
    .replace(/\s+—\s+Palestinian Arabic$/, '')
    .replace(/^Hebrew\s+/, '')
    .replace(/^Palestinian Arabic\s+/, '');
}

function basicsGateKey(deck: Pick<Deck, 'name'>): string {
  return basicsBaseName(deck).toLowerCase();
}

/**
 * Basics is authored as paired Hebrew/Arabic stages, but the learner sees each
 * pair as one "lot". Make that rule explicit instead of relying on adjacent
 * deck rows: Hebrew for the next lot opens once the previous lot is complete
 * in both languages; Arabic opens once that lot's Hebrew is complete.
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
  const groups = new Map<string, { hebrew?: Deck; arabic?: Deck; fallback?: Deck }>();

  for (const deck of ordered) {
    const key = basicsGateKey(deck);
    const group = groups.get(key) ?? {};
    const language = deck.studyLanguages?.[0];
    if (language === 'hebrew') group.hebrew = deck;
    else if (language === 'arabic') group.arabic = deck;
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
    const hebrewMastered = hebrew
      ? isDeckMastered(hebrew, deckProgress[hebrew.id])
      : true;
    const arabicMastered = arabic
      ? isDeckMastered(arabic, deckProgress[arabic.id])
      : true;

    if (hebrew) {
      openByDeck.set(hebrew.id, {
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

    previousComplete = previousComplete && hebrewMastered && arabicMastered;
    previousBlocker =
      !hebrewMastered && hebrew ? hebrew : !arabicMastered && arabic ? arabic : previousBlocker;
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
