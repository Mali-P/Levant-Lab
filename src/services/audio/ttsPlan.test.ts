import { describe, expect, it } from 'vitest';
import {
  palestinianPronunciation,
  pronunciationKey,
} from '../../constants/palestinianPronunciation';
import {
  isPronunciationKnown,
  resolveSpokenPlan,
  resolveTtsPlan,
} from './ttsPlan';

const arabic = { language: 'arabic' } as const;

describe('the pronunciation ladder', () => {
  it('prefers a recording to anything it could be asked to say', () => {
    const plan = resolveTtsPlan(
      { script: 'تنين', audioPath: 'assets/audio/ar/two.mp3' },
      arabic,
    );
    expect(plan.source).toBe('clip');
    expect(plan.audioPath).toBe('assets/audio/ar/two.mp3');
  });

  // Playback fails for reasons that have nothing to do with the word: a missing
  // asset, a decode error, an autoplay block. Falling all the way to the
  // spelling then would undo the whole point at the worst moment.
  it('keeps the next tier down ready in case the clip will not play', () => {
    const plan = resolveTtsPlan(
      { script: 'تنين', audioPath: 'assets/audio/ar/two.mp3' },
      arabic,
    );
    expect(plan.speech).toMatchObject({
      source: 'dictionary',
      text: 'تْنِين',
      target: 'tnēn',
    });
  });

  it('lets the card outrank the dictionary', () => {
    const plan = resolveSpokenPlan(
      {
        script: 'تنين',
        tts: { text: 'تْنِينْ', target: 'tnēn', source: 'curated', locked: true },
      },
      arabic,
    );
    expect(plan).toMatchObject({ source: 'card', text: 'تْنِينْ', locked: true });
  });

  it('reaches for the dictionary before the spelling', () => {
    expect(resolveSpokenPlan({ script: 'مرحبا' }, arabic)).toMatchObject({
      source: 'dictionary',
      text: 'مَرْحَبا',
      target: 'marḥaba',
      locked: true,
    });
  });

  it('reads the spelling only when nothing else knows the word', () => {
    const plan = resolveSpokenPlan(
      { script: 'قطة', transliteration: 'qaṭṭa' },
      arabic,
    );
    expect(plan).toMatchObject({ source: 'inferred', text: 'قطة', locked: false });
    // Still carries the target, so a provider that takes direction in prose can
    // be held to it even on the bottom rung.
    expect(plan.target).toBe('qaṭṭa');
    expect(isPronunciationKnown({ source: plan.source, speech: plan })).toBe(false);
  });
});

describe('what the cards actually teach', () => {
  // The two failures that prompted the rule, stated as the cards state them.
  it('says marḥaba, never the textbook marḥaban', () => {
    const entry = palestinianPronunciation('مرحبا');
    expect(entry?.pronunciation).toBe('marḥaba');
    expect(entry?.pronunciation).not.toBe('marḥaban');
    // Tanwīn has nowhere to go once the final alef is vocalised.
    expect(entry?.ttsText).toBe('مَرْحَبا');
  });

  it('says tnēn, never a reconstructed tintēn(a)', () => {
    const entry = palestinianPronunciation('تنين');
    expect(entry?.pronunciation).toBe('tnēn');
    expect(entry?.ttsText).toContain('تْ');
  });

  /*
   * Two words, two pronunciations, and the engine must say whichever one it was
   * handed. تنين is how you count; تنتين is how you say "two" of something
   * feminine, and only the agreement deck teaches it — but the dictionary still
   * owes it a locked pronunciation, or that deck would be left to the engine's
   * guess.
   */
  it('keeps the two forms of "two" apart', () => {
    const feminine = resolveSpokenPlan({ script: 'تنتين' }, arabic);
    const masculine = resolveSpokenPlan({ script: 'تنين' }, arabic);
    expect(feminine.target).toBe('tintēn');
    expect(masculine.target).toBe('tnēn');
    expect(feminine.text).not.toBe(masculine.text);
  });

  it('locks every counting target the course names', () => {
    const counting: [string, string][] = [
      ['واحد', 'wāḥad'],
      ['تنين', 'tnēn'],
      ['تلاتة', 'talāte'],
      ['أربعة', 'arbaʿa'],
      ['خمسة', 'khamse'],
      ['ستّة', 'sitte'],
      ['سبعة', 'sabʿa'],
      ['تمانية', 'tmānye'],
      ['تسعة', 'tisʿa'],
      ['عشرة', 'ʿashara'],
    ];

    for (const [script, expected] of counting) {
      const plan = resolveSpokenPlan({ script }, arabic);
      expect(plan.source, script).toBe('dictionary');
      expect(plan.target, script).toBe(expected);
      expect(plan.locked, script).toBe(true);
    }
  });
});

describe('whose pronunciation it is', () => {
  // The setting exists so a learner can silence her own respellings. Letting it
  // reach a locked form would hand her the Modern Standard reading of a word
  // the deck teaches in Palestinian, which is the opposite of what she asked.
  it('never lets the card-pronunciation setting unlock course content', () => {
    const locked = resolveSpokenPlan(
      { script: 'تنين', tts: { text: 'تْنِين', source: 'curated' } },
      { ...arabic, allowCardText: false },
    );
    expect(locked).toMatchObject({ source: 'card', text: 'تْنِين' });

    expect(
      resolveSpokenPlan({ script: 'مرحبا' }, { ...arabic, allowCardText: false }),
    ).toMatchObject({ source: 'dictionary', text: 'مَرْحَبا' });
  });

  it('does let it silence a correction the learner made herself', () => {
    const form = {
      script: 'قطة',
      tts: { text: 'قِطَّة', source: 'user' as const },
    };
    expect(resolveSpokenPlan(form, arabic).text).toBe('قِطَّة');
    expect(resolveSpokenPlan(form, { ...arabic, allowCardText: false }).text).toBe(
      'قطة',
    );
  });

  it('uses a correction the learner has stored, over the dictionary', () => {
    const plan = resolveSpokenPlan(
      { script: 'مرحبا', tts: { text: 'مَرْحَبَا', source: 'user' } },
      arabic,
    );
    expect(plan).toMatchObject({ source: 'card', text: 'مَرْحَبَا', locked: false });
  });

  // `pronunciationText` predates `tts` and has always been toggle-able. It does
  // not acquire a lock just because the lock now exists.
  it('reads a bare pronunciationText as the unlocked override it has always been', () => {
    const form = { script: 'قطة', pronunciationText: 'قِطَّة' };
    expect(resolveSpokenPlan(form, arabic).locked).toBe(false);
    expect(resolveSpokenPlan(form, { ...arabic, allowCardText: false }).source).toBe(
      'inferred',
    );
  });
});

describe('dictionary lookup', () => {
  it('finds a word whether or not the card wrote its marks', () => {
    expect(palestinianPronunciation('ستّة')?.pronunciation).toBe('sitte');
    expect(palestinianPronunciation('ستة')?.pronunciation).toBe('sitte');
    expect(palestinianPronunciation('سِتِّة')?.pronunciation).toBe('sitte');
  });

  it('strips only what can be absent without changing the word', () => {
    expect(pronunciationKey('مَرْحَبا')).toBe('مرحبا');
    // ta marbuta is a letter, not a mark: تلات and تلاتة are two words.
    expect(pronunciationKey('تلاتة')).not.toBe(pronunciationKey('تلات'));
  });

  it('knows nothing about a word it has no entry for', () => {
    expect(palestinianPronunciation('قطة')).toBeUndefined();
  });
});
