import type {
  Category,
  Deck,
  Flashcard,
  FreeTalkLangStats,
  Language,
  PersonGender,
  Settings,
} from '../../types';
import type { SayResponse } from '../../services/freetalk/protocol';
import {
  STRUGGLE_PHRASE_LIMIT,
  WANTED_CATEGORY_NAME,
  WANTED_DECK_NAME,
} from '../../constants/freetalk';
import { uid } from '../../utils/random';

/**
 * The pure half of Free Conversation: what a finished conversation does to the
 * level's record, and how a phrase taught mid-conversation becomes an ordinary
 * card. The conversation itself lives on the server; nothing here talks to it.
 */

export const EMPTY_FREETALK_STATS: FreeTalkLangStats = {
  conversations: 0,
  withoutHelp: 0,
  turns: 0,
  phrasesSaved: 0,
};

export function statsFor(
  settings: Pick<Settings, 'freeTalkStats'>,
  language: Language,
): FreeTalkLangStats {
  return settings.freeTalkStats?.[language] ?? EMPTY_FREETALK_STATS;
}

/** The patch a conversation carried to its close writes onto the settings row. */
export function recordConversation(
  settings: Pick<Settings, 'freeTalkStats'>,
  language: Language,
  outcome: { turns: number; helped: boolean },
): Pick<Settings, 'freeTalkStats'> {
  const current = statsFor(settings, language);
  return {
    freeTalkStats: {
      ...settings.freeTalkStats,
      [language]: {
        ...current,
        conversations: current.conversations + 1,
        withoutHelp: current.withoutHelp + (outcome.helped ? 0 : 1),
        turns: current.turns + outcome.turns,
      },
    },
  };
}

/** The patch one saved "I wanted to say" phrase writes. */
export function recordPhraseSaved(
  settings: Pick<Settings, 'freeTalkStats'>,
  language: Language,
): Pick<Settings, 'freeTalkStats'> {
  const current = statsFor(settings, language);
  return {
    freeTalkStats: {
      ...settings.freeTalkStats,
      [language]: { ...current, phrasesSaved: current.phrasesSaved + 1 },
    },
  };
}

// --- the personal collection -------------------------------------------------

/** Found by name, the way every area finds its categories. */
export function wantedCategory(categories: Category[]): Category | undefined {
  const name = WANTED_CATEGORY_NAME.toLowerCase();
  return categories.find((category) => category.name.toLowerCase() === name);
}

export function wantedDeck(
  decks: Deck[],
  categoryId: string | undefined,
): Deck | undefined {
  if (!categoryId) return undefined;
  const name = WANTED_DECK_NAME.toLowerCase();
  return decks.find(
    (deck) =>
      deck.categoryId === categoryId && deck.name.toLowerCase() === name,
  );
}

/** Whether this phrase is already in the collection, matched on its English. */
export function alreadySaved(
  cards: Flashcard[],
  deckId: string | undefined,
  english: string,
): boolean {
  if (!deckId) return false;
  const key = english.trim().toLowerCase();
  return cards.some(
    (card) => card.deckId === deckId && card.english.trim().toLowerCase() === key,
  );
}

/**
 * A taught phrase as an ordinary flashcard. Both languages always, because a
 * card is not learned until it is learned twice — the mode teaches whichever
 * was in play, and the card quietly holds the other half ready.
 */
export function wantedCard(
  phrase: SayResponse,
  category: Category,
  deck: Deck,
  order: number,
): Flashcard {
  const now = new Date().toISOString();
  return {
    id: uid('card'),
    categoryId: category.id,
    deckId: deck.id,
    english: phrase.english,
    order,
    hebrew: {
      script: phrase.hebrew.script,
      transliteration: phrase.hebrew.transliteration,
    },
    arabic: {
      script: phrase.arabic.script,
      transliteration: phrase.arabic.transliteration,
      dialect: 'Palestinian',
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * The structures she keeps reaching for: the most recent saved phrases, newest
 * first, handed to the server so future conversations can make room for them.
 */
export function strugglePhrases(
  cards: Flashcard[],
  deckId: string | undefined,
): string[] {
  if (!deckId) return [];
  return cards
    .filter((card) => card.deckId === deckId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, STRUGGLE_PHRASE_LIMIT)
    .map((card) => card.english);
}

// --- who she is talking to ---------------------------------------------------

/**
 * The partner persona's gender: drawn from the listeners she practises
 * speaking to, so a conversation never quietly puts her opposite someone her
 * settings say she is not addressing. `random` injected so a test can pin it.
 */
export function partnerGender(
  listenerGenders: PersonGender[],
  random: () => number = Math.random,
): PersonGender {
  if (listenerGenders.length === 0) return 'male';
  return listenerGenders[Math.floor(random() * listenerGenders.length)];
}
