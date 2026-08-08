import { describe, expect, it } from 'vitest';
import { derivePerspectives, listenersOf, speakerOf } from './speechIdentity';

describe('derivePerspectives', () => {
  it('gives a woman practising with everyone the shipped default, male listener first', () => {
    expect(derivePerspectives('female', 'both')).toEqual([
      'femaleToMale',
      'femaleToFemale',
    ]);
  });

  it('narrows to the one perspective when she names a single listener', () => {
    expect(derivePerspectives('female', 'female')).toEqual(['femaleToFemale']);
    expect(derivePerspectives('male', 'male')).toEqual(['maleToMale']);
  });

  it('rewrites the app around a male learner without leaving him a female form', () => {
    expect(derivePerspectives('male', 'both')).toEqual([
      'maleToFemale',
      'maleToMale',
    ]);
  });
});

describe('reading the pair back out', () => {
  it('round-trips every combination', () => {
    for (const speaker of ['female', 'male'] as const) {
      for (const listeners of ['male', 'female', 'both'] as const) {
        const derived = derivePerspectives(speaker, listeners);
        expect(speakerOf(derived)).toBe(speaker);
        expect(listenersOf(derived)).toBe(listeners);
      }
    }
  });

  it('reads a mixed-speaker list from an older build as the female half of it', () => {
    const mixed = ['femaleToMale', 'maleToMale'] as const;
    expect(speakerOf(mixed)).toBe('female');
    expect(listenersOf(mixed)).toBe('male');
  });
});
