import type {
  AlphabetProgress,
  AlphabetScript,
  ArabicLetter,
  HebrewLetter,
} from '../../types/alphabet';
import { lettersFor } from '../../data/alphabets';
import { MASTERY_THRESHOLD, skillScore } from './progress';
import { RANGE_SIZE } from './decks';

/**
 * The alphabet cut into levels of ten, and which of them the learner has
 * earned.
 *
 * This exists for one exercise: putting the letters back into alphabet order.
 * That drill grows rather than being handed over whole — a learner who has just
 * met the first ten letters is asked to order those ten, and each level they
 * master adds its letters to the pile they are asked for.
 *
 * The levels are the same ten-letter slices the practice picker already offers
 * as `range:` decks, so "Letters 1–10" means one thing everywhere in the app.
 *
 * ## Why recognition, and not `mastered`
 *
 * A letter is `mastered` only once every skill it can honestly be scored on is
 * up, and that includes `writingAccuracy`. Ordering the alphabet does not ask
 * the learner to write anything — it asks whether they know which letter is
 * which and where it falls — so gating it on handwriting would hold the drill
 * shut behind an unrelated skill, in some cases for ever. A level therefore
 * opens on the skill the drill actually rests on: recognising every letter in
 * it. Nothing here writes a score or claims a letter is mastered; it only
 * decides what to put in front of the learner.
 */

/** Letters per level. The same slice the `range:` practice decks are cut in. */
export const LEVEL_SIZE = RANGE_SIZE;

export type LetterLevel = {
  /** 0-based, so level 1 on screen is index 0. */
  index: number;
  /** Matches the practice deck id for the same slice, e.g. `range:10`. */
  deckId: string;
  /** "Letters 1–10". */
  title: string;
  letterIds: string[];
  /** Every letter in the level is recognised. See the note above. */
  earned: boolean;
  /** How many of the level's letters are recognised, for "6 of 10". */
  recognised: number;
};

function lettersOf(script: AlphabetScript): Array<HebrewLetter | ArabicLetter> {
  return lettersFor(script) as Array<HebrewLetter | ArabicLetter>;
}

/** True once this letter's shape is reliably known, whatever else is not. */
export function isRecognised(row: AlphabetProgress | undefined): boolean {
  return Boolean(row) && skillScore(row!, 'typedRecognition') >= MASTERY_THRESHOLD;
}

/**
 * Every level of one script, in alphabet order, each marked earned or not.
 *
 * `progress` is keyed by bare letter id, as `alphabetStore.forScript` returns
 * it. A level short of ten letters at the end of the alphabet is still a level:
 * the last few Arabic letters are a real slice of the alphabet, not a remainder
 * to be hidden.
 */
export function letterLevels(
  script: AlphabetScript,
  progress: Record<string, AlphabetProgress | undefined>,
): LetterLevel[] {
  const letters = lettersOf(script);
  const levels: LetterLevel[] = [];

  for (let start = 0; start < letters.length; start += LEVEL_SIZE) {
    const slice = letters.slice(start, start + LEVEL_SIZE);
    const recognised = slice.filter((letter) => isRecognised(progress[letter.id])).length;

    levels.push({
      index: levels.length,
      deckId: 'range:' + start,
      title: 'Letters ' + (start + 1) + '–' + (start + slice.length),
      letterIds: slice.map((letter) => letter.id),
      earned: recognised === slice.length,
      recognised,
    });
  }

  return levels;
}

/**
 * The reorder pile: every earned level's letters, in alphabet order.
 *
 * Ordered by the alphabet rather than by the order the levels were earned, so a
 * learner who somehow clears level three before level two is still asked for
 * the alphabet as it is actually recited. The gaps are simply not asked about —
 * the pile is what they know, and the drill is the order of what they know.
 */
export function orderRecallLetterIds(
  script: AlphabetScript,
  progress: Record<string, AlphabetProgress | undefined>,
): string[] {
  return letterLevels(script, progress)
    .filter((level) => level.earned)
    .flatMap((level) => level.letterIds);
}

/** The level a learner is working towards, if any are still unearned. */
export function nextLevel(levels: LetterLevel[]): LetterLevel | undefined {
  return levels.find((level) => !level.earned);
}
