import { describe, expect, it } from 'vitest';
import {
  derivePerspectives,
  effectivePerspectives,
  identityFromLegacy,
  normaliseListeners,
} from './speechIdentity';

describe('derivePerspectives', () => {
  it('gives a woman practising with everyone the shipped default, male listener first', () => {
    expect(derivePerspectives('female', ['male', 'female'])).toEqual([
      'femaleToMale',
      'femaleToFemale',
    ]);
  });

  it('narrows to the one perspective when she names a single listener', () => {
    expect(derivePerspectives('female', ['female'])).toEqual(['femaleToFemale']);
    expect(derivePerspectives('male', ['male'])).toEqual(['maleToMale']);
  });

  it('rewrites the app around a male learner without leaving him a female form', () => {
    expect(derivePerspectives('male', ['female', 'male'])).toEqual([
      'maleToFemale',
      'maleToMale',
    ]);
  });

  it('orders canonically however the listeners were stored', () => {
    expect(derivePerspectives('female', ['female', 'male'])).toEqual([
      'femaleToMale',
      'femaleToFemale',
    ]);
  });

  it('never derives nothing, because a gendered card would have nothing to show', () => {
    expect(derivePerspectives('female', [])).toEqual([
      'femaleToMale',
      'femaleToFemale',
    ]);
    expect(derivePerspectives('female', undefined)).toHaveLength(2);
  });
});

describe('normaliseListeners', () => {
  it('drops what it does not recognise and keeps canonical order', () => {
    expect(normaliseListeners(['female', 'nobody' as never, 'male'])).toEqual([
      'male',
      'female',
    ]);
  });

  it('falls back to both rather than returning an empty set', () => {
    expect(normaliseListeners(['nobody' as never])).toEqual(['male', 'female']);
  });
});

describe('effectivePerspectives', () => {
  const her = {
    learnerGender: 'female' as const,
    listenerGenders: ['male' as const],
  };

  it('renders her as herself when nothing overrides it', () => {
    expect(effectivePerspectives(her)).toEqual(['femaleToMale']);
  });

  it('lets a deliberate override win', () => {
    expect(
      effectivePerspectives({ ...her, practicePerspectiveOverride: ['maleToMale'] }),
    ).toEqual(['maleToMale']);
  });

  it('reads an empty or unrecognisable override as no override at all', () => {
    expect(effectivePerspectives({ ...her, practicePerspectiveOverride: [] })).toEqual([
      'femaleToMale',
    ]);
    expect(
      effectivePerspectives({
        ...her,
        practicePerspectiveOverride: ['nonsense' as never],
      }),
    ).toEqual(['femaleToMale']);
  });

  it('returns her to herself the moment the override is cleared', () => {
    expect(
      effectivePerspectives({ ...her, practicePerspectiveOverride: undefined }),
    ).toEqual(['femaleToMale']);
  });
});

describe('identityFromLegacy', () => {
  it('reads an install with no setting as the unconfirmed default', () => {
    expect(identityFromLegacy(undefined)).toEqual({
      learnerGender: 'female',
      listenerGenders: ['male', 'female'],
      identityConfirmed: false,
    });
  });

  it('reads a single-speaker list as the identity it was derived from', () => {
    expect(identityFromLegacy(['femaleToMale', 'femaleToFemale'])).toEqual({
      learnerGender: 'female',
      listenerGenders: ['male', 'female'],
      identityConfirmed: true,
    });
    expect(identityFromLegacy(['maleToFemale'])).toEqual({
      learnerGender: 'male',
      listenerGenders: ['female'],
      identityConfirmed: true,
    });
  });

  it('leaves a derivable list un-overridden, so identity is not decorative', () => {
    expect(
      identityFromLegacy(['femaleToFemale']).practicePerspectiveOverride,
    ).toBeUndefined();
  });

  it('preserves a mixed-speaker list verbatim instead of guessing a speaker', () => {
    // The old code called this install female and silently dropped ♂→♂ — a
    // learner opening the app to find a perspective she was studying gone.
    const migrated = identityFromLegacy(['femaleToMale', 'maleToMale']);
    expect(migrated.practicePerspectiveOverride).toEqual([
      'femaleToMale',
      'maleToMale',
    ]);
    expect(migrated.identityConfirmed).toBe(false);
    expect(migrated.learnerGender).toBe('female');
  });

  it('renders a migrated mixed install exactly as it was studying', () => {
    const migrated = identityFromLegacy(['maleToMale', 'femaleToMale']);
    expect(effectivePerspectives(migrated)).toEqual([
      'femaleToMale',
      'maleToMale',
    ]);
  });

  it('round-trips every identity through the list a previous build would have stored', () => {
    for (const speaker of ['female', 'male'] as const) {
      for (const listeners of [['male'], ['female'], ['male', 'female']] as const) {
        const stored = derivePerspectives(speaker, listeners);
        const back = identityFromLegacy(stored);
        expect(back.learnerGender).toBe(speaker);
        expect(back.listenerGenders).toEqual(normaliseListeners(listeners));
        expect(back.practicePerspectiveOverride).toBeUndefined();
      }
    }
  });
});
