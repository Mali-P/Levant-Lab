import type { Category, Deck, Language } from '../../types';

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
