import type {
  AlphabetProgress,
  AlphabetScript,
  ArabicLetter,
  HebrewLetter,
} from '../../types/alphabet';
import { lettersFor, similarGroupsFor } from '../../data/alphabets';
import { needsReview } from './progress';

/**
 * Practice decks for one alphabet.
 *
 * A deck is only ever a selection of letters the learner already has in front
 * of them — nothing here is persisted, because a letter deck has no identity
 * beyond the rule that built it. That keeps the alphabet modules out of the
 * Dexie schema entirely: the only thing worth saving is the per-skill score,
 * which `alphabetProgress` already holds.
 *
 * Deliberately letters only. Vowel marks and the Arabic extra characters are
 * taught on the Learn screen but not scored, because `AlphabetProgress` and
 * `requiredSkills` describe a letter's skills and a niqqud mark has no
 * handwritten form or contextual shape to be judged on.
 */

export type LetterDeckKind = 'all' | 'range' | 'similar' | 'mistakes' | 'unmastered';

export type LetterDeck = {
  /** Stable within a script, and safe in a URL: `all`, `range:0`, `similar:bet-kaf`. */
  id: string;
  kind: LetterDeckKind;
  script: AlphabetScript;
  title: string;
  description: string;
  letterIds: string[];
};

/** How many letters a `range` deck holds. Ten is a sitting's worth. */
export const RANGE_SIZE = 10;

function lettersOf(script: AlphabetScript): Array<HebrewLetter | ArabicLetter> {
  return lettersFor(script) as Array<HebrewLetter | ArabicLetter>;
}

/**
 * Every deck on offer for a script, in the order the picker lists them.
 *
 * `progress` decides only whether the two review decks appear: a learner with
 * nothing wrong yet is not shown an empty "letters you have missed" pile.
 */
export function buildLetterDecks(
  script: AlphabetScript,
  progress: Record<string, AlphabetProgress | undefined>,
): LetterDeck[] {
  const letters = lettersOf(script);
  const decks: LetterDeck[] = [
    {
      id: 'all',
      kind: 'all',
      script,
      title: 'Every letter',
      description: letters.length + ' letters, shuffled',
      letterIds: letters.map((letter) => letter.id),
    },
  ];

  for (let start = 0; start < letters.length; start += RANGE_SIZE) {
    const slice = letters.slice(start, start + RANGE_SIZE);
    decks.push({
      id: 'range:' + start,
      kind: 'range',
      script,
      title: 'Letters ' + (start + 1) + '–' + (start + slice.length),
      description: slice.map((letter) => letter.nameEnglish).join(', '),
      letterIds: slice.map((letter) => letter.id),
    });
  }

  for (const group of similarGroupsFor(script)) {
    // A group can name a letter this build does not ship; drop the id rather
    // than let a question reference a letter that cannot be rendered.
    const ids = group.letterIds.filter((id) =>
      letters.some((letter) => letter.id === id),
    );
    if (ids.length < 2) continue;
    decks.push({
      id: 'similar:' + group.id,
      kind: 'similar',
      script,
      title: ids
        .map((id) => letters.find((letter) => letter.id === id)!.nameEnglish)
        .join(' / '),
      description: group.difference,
      letterIds: ids,
    });
  }

  const mistakes = needsReview(letters, progress).map((letter) => letter.id);
  if (mistakes.length > 0) {
    decks.push({
      id: 'mistakes',
      kind: 'mistakes',
      script,
      title: 'Review mistakes',
      description: mistakes.length + ' letters you have got wrong, worst first',
      letterIds: mistakes,
    });
  }

  const unmastered = letters
    .filter((letter) => !progress[letter.id]?.mastered)
    .map((letter) => letter.id);
  if (unmastered.length > 0 && unmastered.length < letters.length) {
    decks.push({
      id: 'unmastered',
      kind: 'unmastered',
      script,
      title: 'Not mastered yet',
      description: unmastered.length + ' letters still short of confident',
      letterIds: unmastered,
    });
  }

  return decks;
}

/**
 * One deck by id, rebuilt from the current progress.
 *
 * Rebuilt rather than looked up in a cache because "Review mistakes" changes
 * meaning between one session and the next, and a stale copy would keep
 * drilling letters the learner has since fixed.
 */
export function findLetterDeck(
  script: AlphabetScript,
  deckId: string,
  progress: Record<string, AlphabetProgress | undefined>,
): LetterDeck | undefined {
  if (deckId.startsWith('letter:')) {
    return singleLetterDeck(script, deckId.slice('letter:'.length));
  }
  return buildLetterDecks(script, progress).find((deck) => deck.id === deckId);
}

/**
 * The deck behind "practise this letter" on a letter's own page. Not listed in
 * the picker: it exists only because the learner arrived from one letter.
 */
export function singleLetterDeck(
  script: AlphabetScript,
  letterId: string,
): LetterDeck | undefined {
  const letter = lettersOf(script).find((entry) => entry.id === letterId);
  if (!letter) return undefined;
  return {
    id: 'letter:' + letter.id,
    kind: 'range',
    script,
    title: letter.nameEnglish,
    description: 'This letter on its own',
    letterIds: [letter.id],
  };
}

/** The letter records of a deck, in deck order, skipping ids that no longer exist. */
export function deckLetters(deck: LetterDeck): Array<HebrewLetter | ArabicLetter> {
  const letters = lettersOf(deck.script);
  return deck.letterIds
    .map((id) => letters.find((letter) => letter.id === id))
    .filter((letter): letter is HebrewLetter | ArabicLetter => Boolean(letter));
}
