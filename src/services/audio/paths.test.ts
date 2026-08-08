import { describe, expect, it } from 'vitest';
import type { LanguageSide } from '../../types';
import {
  audioIdFor,
  clipKey,
  clipPath,
  clipsForSide,
  slugify,
  textToSpeak,
} from './paths';

describe('slugify', () => {
  it('reduces a label to lowercase ASCII words', () => {
    expect(slugify('Counting and numbers')).toBe('counting-and-numbers');
  });

  it('folds accents rather than dropping the letter', () => {
    expect(slugify('Café')).toBe('cafe');
  });

  it('collapses punctuation and trims the edges', () => {
    expect(slugify('  To eat / to drink!  ')).toBe('to-eat-to-drink');
  });
});

describe('audioIdFor', () => {
  it('identifies a word by category, deck and English prompt', () => {
    expect(audioIdFor('Animals', 'Pets', 'cat')).toBe('animals__pets__cat');
  });

  it('ignores the Hebrew and Arabic spelling entirely', () => {
    // Respelling a word for pronunciation must not orphan its recordings.
    expect(audioIdFor('Animals', 'Pets', 'cat')).toBe(
      audioIdFor('animals', 'pets', 'CAT'),
    );
  });
});

describe('clipPath', () => {
  it('files clips by language directory and form', () => {
    expect(clipPath('animals__pets__cat', 'hebrew', 'feminine')).toBe(
      'assets/audio/he/animals__pets__cat_feminine.mp3',
    );
    expect(clipPath('animals__pets__cat', 'arabic', 'masculine')).toBe(
      'assets/audio/ar/animals__pets__cat_masculine.mp3',
    );
  });

  it('keys the manifest without the extension', () => {
    expect(clipKey('animals__pets__cat', 'arabic', 'neutral')).toBe(
      'ar/animals__pets__cat_neutral',
    );
  });
});

describe('textToSpeak', () => {
  it('falls back to the displayed text for a word nothing knows', () => {
    expect(textToSpeak({ script: 'قطة' }, 'arabic')).toBe('قطة');
  });

  it('prefers the pronunciation override when one is set', () => {
    expect(
      textToSpeak({ script: 'قطة', pronunciationText: 'قِطَّة' }, 'arabic'),
    ).toBe('قِطَّة');
  });

  // The point of the whole ladder: undiacritized تنين is what the engine gets
  // wrong, so it must never be what the engine is handed.
  it('vocalises a word the Palestinian dictionary knows', () => {
    expect(textToSpeak({ script: 'تنين', transliteration: 'tnēn' }, 'arabic')).toBe(
      'تْنِين',
    );
  });

  it('leaves Hebrew to its own niqqud rather than an Arabic dictionary', () => {
    expect(textToSpeak({ script: 'תנין' }, 'hebrew')).toBe('תנין');
  });
});

const paired: LanguageSide = {
  script: 'm',
  forms: {
    feminine: { script: 'f', transliteration: 'fem' },
    masculine: { script: 'm', transliteration: 'masc' },
  },
};

const single: LanguageSide = { script: 'one', transliteration: 'wahad' };

describe('clipsForSide', () => {
  it('puts the feminine clip first, matching how forms are shown', () => {
    const clips = clipsForSide('w', 'hebrew', paired);
    expect(clips.map((c) => c.form)).toEqual(['feminine', 'masculine']);
    expect(clips[0].path).toBe('assets/audio/he/w_feminine.mp3');
  });

  it('gives a word with one form a single neutral clip', () => {
    const clips = clipsForSide('w', 'arabic', single);
    expect(clips).toHaveLength(1);
    expect(clips[0].form).toBe('neutral');
    expect(clips[0].path).toBe('assets/audio/ar/w_neutral.mp3');
  });

  it('carries the per-form override into the spoken text', () => {
    const clips = clipsForSide('w', 'arabic', {
      script: 'm',
      forms: {
        feminine: { script: 'f', pronunciationText: 'f-fixed' },
        masculine: { script: 'm' },
      },
    });
    expect(clips[0].spoken).toBe('f-fixed');
    expect(clips[0].text).toBe('f');
    expect(clips[1].spoken).toBe('m');
  });
});
