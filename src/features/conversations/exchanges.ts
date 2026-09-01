import type { Category, Deck, DeckProgress, Flashcard } from '../../types';
import { CONVERSATION_FINAL_TEST_CATEGORY } from '../../constants/conversations';
import { deckLots, isConversationCategory, type Lot } from '../review/languagePolicy';
import { isDeckMastered } from '../review/unlock';
import { sortCards } from '../../utils/cardOrder';

/**
 * The pure half of the Conversation Flow screens: which categories are the
 * groups, which decks make one exchange, how far an exchange has got, and how
 * its turns alternate — the readable facts the transcript view is drawn from.
 *
 * Exchanges lean entirely on shapes that already exist. An exchange is a lot —
 * three language rungs over the same turns, grouped by `deckLots` exactly as
 * the course groups its own — so nothing here re-derives staging; it only reads
 * it. The one genuinely new reading is `transcript`, and even that is a reading
 * of the cards rather than a structure of its own.
 */

/** The conversation groups, in course order, with the final test kept apart. */
export function conversationGroups(categories: Category[]): Category[] {
  return categories
    .filter(
      (category) =>
        isConversationCategory(category) &&
        category.name !== CONVERSATION_FINAL_TEST_CATEGORY,
    )
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** The final test's category, once the learner's install has one. */
export function finalTestCategory(categories: Category[]): Category | undefined {
  return categories.find(
    (category) => category.name === CONVERSATION_FINAL_TEST_CATEGORY,
  );
}

/** One group's exchanges: its decks folded back into lots, in course order. */
export function exchangesOf(groupDecks: Deck[]): Lot[] {
  return deckLots(groupDecks);
}

/** Whether every rung of the exchange is mastered — Hebrew and Arabic alike. */
export function exchangeFinished(
  exchange: Lot,
  deckProgress: Record<string, DeckProgress | undefined>,
): boolean {
  return exchange.decks.every((deck) => isDeckMastered(deck, deckProgress[deck.id]));
}

/** Rungs of the exchange already mastered, for a "2 of 3" line. */
export function rungsMastered(
  exchange: Lot,
  deckProgress: Record<string, DeckProgress | undefined>,
): number {
  return exchange.decks.filter((deck) =>
    isDeckMastered(deck, deckProgress[deck.id]),
  ).length;
}

/**
 * The exchange's turns in the order they are said, read off one rung.
 *
 * Any rung serves: all three deal the same turns in the same order, so the
 * first deck of the lot is as good as the Hebrew one and covers a lot that is
 * missing a rung.
 */
export function exchangeTurns(exchange: Lot, cards: Flashcard[]): Flashcard[] {
  const deck = exchange.hebrew ?? exchange.decks[0];
  if (!deck) return [];
  return sortCards(cards.filter((card) => card.deckId === deck.id));
}

/**
 * One line of a conversation, as the transcript reads it.
 *
 * `theirs` is a line somebody says to the learner and carries no card, because
 * there is nothing to be answered about it. `hers` is her reply and carries the
 * card it was read from, which is what the screen needs in order to speak it,
 * gloss it and number it.
 */
export type TranscriptLine =
  | {
      who: 'theirs';
      english: string;
      hebrew: Flashcard['hebrew'];
      arabic: Flashcard['arabic'];
    }
  | { who: 'hers'; english: string; card: Flashcard; turn: number };

/**
 * An exchange read as the conversation it is: their line, her line, their
 * line, her line.
 *
 * Derived rather than authored, because the cards already say it — each carries
 * her reply and the question that reply answers, so the alternation falls
 * straight out of reading them in order.
 *
 * A repeated question is said once. The branching exchange asks "do you want
 * coffee?" four times over to show four honest answers to it, and a transcript
 * printing the question above every one of them would read as somebody asking
 * four times rather than as one question with four ways out. Only a question
 * identical to the one immediately before it folds; the same question returning
 * later in a conversation is genuinely being asked again.
 *
 * A turn with no cue contributes only her line, so an exchange that opens with
 * her speaking still reads correctly.
 */
export function transcript(turns: Flashcard[]): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  let lastAsked: string | undefined;

  turns.forEach((card, index) => {
    const cue = card.cue;
    if (cue && cue.english !== lastAsked) {
      lines.push({
        who: 'theirs',
        english: cue.english,
        hebrew: cue.hebrew,
        arabic: cue.arabic,
      });
    }
    lastAsked = cue?.english;
    lines.push({ who: 'hers', english: card.english, card, turn: index + 1 });
  });

  return lines;
}

/**
 * Whether every reply in the exchange answers the very same question.
 *
 * True of the branching exchanges and of nothing else, and it changes what the
 * screen should say: not "here is a conversation" but "here is one question,
 * and here is every honest way to answer it". Read off the content rather than
 * tagged by hand, so an exchange that later grows a second question stops
 * claiming to be a list of alternatives.
 */
export function isBranching(turns: Flashcard[]): boolean {
  if (turns.length < 2) return false;
  const first = turns[0].cue?.english;
  if (!first) return false;
  return turns.every((card) => card.cue?.english === first);
}
