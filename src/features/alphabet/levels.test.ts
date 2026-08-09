import { describe, expect, it } from 'vitest';
import type { AlphabetProgress, AlphabetScript } from '../../types/alphabet';
import { lettersFor } from '../../data/alphabets';
import { MASTERY_THRESHOLD, emptyAlphabetProgress } from './progress';
import {
  LEVEL_SIZE,
  isRecognised,
  letterLevels,
  nextLevel,
  orderRecallLetterIds,
} from './levels';

/** Progress rows marking exactly the named letters as recognised. */
function recognising(
  script: AlphabetScript,
  letterIds: string[],
): Record<string, AlphabetProgress> {
  return Object.fromEntries(
    letterIds.map((id) => [
      id,
      { ...emptyAlphabetProgress(id, script), typedRecognition: MASTERY_THRESHOLD },
    ]),
  );
}

/** The ids of one level's worth of letters, counting from `level` (0-based). */
function levelIds(script: AlphabetScript, level: number): string[] {
  return (lettersFor(script) as Array<{ id: string }>)
    .slice(level * LEVEL_SIZE, (level + 1) * LEVEL_SIZE)
    .map((letter) => letter.id);
}

describe('letterLevels', () => {
  it('cuts the whole alphabet into levels, keeping the short last one', () => {
    for (const script of ['hebrew', 'arabic'] as const) {
      const total = lettersFor(script).length;
      const levels = letterLevels(script, {});
      expect(levels).toHaveLength(Math.ceil(total / LEVEL_SIZE));
      expect(levels.flatMap((l) => l.letterIds)).toHaveLength(total);
    }
  });

  it('lists the letters in alphabet order, unbroken across levels', () => {
    const expected = (lettersFor('arabic') as Array<{ id: string }>).map((l) => l.id);
    expect(letterLevels('arabic', {}).flatMap((l) => l.letterIds)).toEqual(expected);
  });

  it('earns nothing on a fresh install', () => {
    const levels = letterLevels('hebrew', {});
    expect(levels.every((level) => !level.earned)).toBe(true);
    expect(levels[0].recognised).toBe(0);
  });

  it('earns a level only once every letter in it is recognised', () => {
    const ids = levelIds('hebrew', 0);
    const short = letterLevels('hebrew', recognising('hebrew', ids.slice(0, -1)));
    expect(short[0].earned).toBe(false);
    expect(short[0].recognised).toBe(ids.length - 1);

    const full = letterLevels('hebrew', recognising('hebrew', ids));
    expect(full[0].earned).toBe(true);
    expect(full[0].recognised).toBe(ids.length);
  });

  it('names the same slice the practice deck picker does', () => {
    const levels = letterLevels('hebrew', {});
    expect(levels[0].deckId).toBe('range:0');
    expect(levels[0].title).toBe('Letters 1–10');
    expect(levels[1].deckId).toBe('range:10');
  });
});

describe('isRecognised', () => {
  it('is false for a letter never answered', () => {
    expect(isRecognised(undefined)).toBe(false);
    expect(isRecognised(emptyAlphabetProgress('alef', 'hebrew'))).toBe(false);
  });

  it('does not wait on handwriting the learner cannot be taught yet', () => {
    // The whole point of the recognition gate: this letter is nowhere near
    // `mastered`, and ordering the alphabet still has every right to ask for it.
    const row: AlphabetProgress = {
      ...emptyAlphabetProgress('alef', 'hebrew'),
      typedRecognition: 1,
      writingAccuracy: 0,
      mastered: false,
    };
    expect(isRecognised(row)).toBe(true);
  });
});

describe('orderRecallLetterIds', () => {
  it('is empty until a level is earned', () => {
    const partial = recognising('arabic', levelIds('arabic', 0).slice(0, 3));
    expect(orderRecallLetterIds('arabic', partial)).toEqual([]);
  });

  it('grows by a level each time one is earned', () => {
    const first = levelIds('arabic', 0);
    const second = levelIds('arabic', 1);

    expect(orderRecallLetterIds('arabic', recognising('arabic', first))).toEqual(first);
    expect(
      orderRecallLetterIds('arabic', recognising('arabic', [...first, ...second])),
    ).toEqual([...first, ...second]);
  });

  it('keeps alphabet order when a later level is earned first', () => {
    const second = levelIds('arabic', 1);
    expect(orderRecallLetterIds('arabic', recognising('arabic', second))).toEqual(second);
  });
});

describe('nextLevel', () => {
  it('points at the first level still unearned', () => {
    const levels = letterLevels('hebrew', recognising('hebrew', levelIds('hebrew', 0)));
    expect(nextLevel(levels)?.index).toBe(1);
  });

  it('is undefined once every level is earned', () => {
    const all = (lettersFor('hebrew') as Array<{ id: string }>).map((l) => l.id);
    expect(nextLevel(letterLevels('hebrew', recognising('hebrew', all)))).toBeUndefined();
  });
});
