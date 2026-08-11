import { describe, expect, it } from 'vitest';
import { ARABIC_LETTERS, HEBREW_LETTERS, findLetterPair } from '../../data/alphabets';
import { letterReviewEntry, letterReviewPool } from './letters';

describe('letterReviewPool', () => {
  it('reads both alphabets against each other, every letter once', () => {
    const pool = letterReviewPool(['hebrew', 'arabic']);

    expect(pool.filter((e) => e.hebrew)).toHaveLength(HEBREW_LETTERS.length);
    expect(pool.filter((e) => e.arabic)).toHaveLength(ARABIC_LETTERS.length);
    expect(new Set(pool.map((e) => e.id)).size).toBe(pool.length);
  });

  it('drops the other script rather than hiding it on the card', () => {
    const pool = letterReviewPool(['hebrew']);

    expect(pool.every((e) => e.hebrew && !e.arabic)).toBe(true);
    expect(pool).toHaveLength(HEBREW_LETTERS.length);
  });

  it('keeps the Arabic-only letters for a learner reading Arabic', () => {
    const pool = letterReviewPool(['arabic']);

    expect(pool).toHaveLength(ARABIC_LETTERS.length);
    expect(pool.some((e) => e.id === 'ghain')).toBe(true);
  });

  it('answers with the shared sound only when both letters are shown', () => {
    const pair = findLetterPair('gimel-jim')!;

    const both = letterReviewEntry(pair, ['hebrew', 'arabic'])!;
    expect(both.sound).toBe(pair.sound);
    expect(both.description).toBe(pair.description);

    // "g / j" is an answer about ג and ج together. On a Hebrew-only card the
    // letter answers for itself, so the pass never teaches a reading Hebrew
    // does not have.
    const hebrewOnly = letterReviewEntry(pair, ['hebrew'])!;
    expect(hebrewOnly.sound).not.toBe(pair.sound);
    expect(hebrewOnly.sound).toBe(hebrewOnly.hebrew!.transliteration);
    expect(hebrewOnly.description).toBe(hebrewOnly.hebrew!.commonSound);
  });

  it('carries the comparison note only where there are two scripts to compare', () => {
    const pair = findLetterPair('bet-ba')!;

    expect(letterReviewEntry(pair, ['hebrew', 'arabic'])!.note).toBe(pair.note);
    expect(letterReviewEntry(pair, ['hebrew'])!.note).toBeUndefined();
    expect(letterReviewEntry(pair, ['arabic'])!.note).toBeUndefined();
  });

  it('leaves out a row with no half left to show', () => {
    // Arabic-only, so a Hebrew reader never meets it.
    expect(letterReviewEntry(findLetterPair('ghain')!, ['hebrew'])).toBeUndefined();
  });
});
