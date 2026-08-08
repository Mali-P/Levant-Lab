import { describe, expect, it, vi } from 'vitest';
import type { LanguageSide } from '../../types';

const AUDIO_ID = 'greetings__how-are-you__how-are-you';

function clip(form: string, spoken: string, hash: string) {
  return {
    path: 'assets/audio/ar/' + AUDIO_ID + '_' + form + '.mp3',
    language: 'arabic' as const,
    form,
    provider: 'azure' as const,
    voice: 'ar-JO-SanaNeural',
    english: 'how are you?',
    text: 'كيفك',
    spoken,
    sourceHash: hash,
    bytes: 1024,
    generatedAt: '2026-08-08T09:00:00.000Z',
  };
}

// A phrase where only the listener's gender matters: two wordings across four
// perspectives, so the generator writes `f2m+m2m` and `f2f+m2f` and no more.
vi.mock('../../generated/audioManifest', () => ({
  AUDIO_CLIPS: {
    ['ar/' + AUDIO_ID + '_f2m+m2m']: clip('f2m+m2m', 'كيفَك', 'a'.repeat(16)),
    ['ar/' + AUDIO_ID + '_f2f+m2f']: clip('f2f+m2f', 'كيفِك', 'b'.repeat(16)),
  },
}));

const { allClips, withClipPaths } = await import('./manifest');

/** كيفَك to a man, كيفِك to a woman — said the same by a woman or a man. */
const LISTENER_SIDE: LanguageSide = {
  script: 'كيفك',
  transliteration: 'kīfak',
  speechForms: {
    femaleToMale: { script: 'كيفك', transliteration: 'kīfak' },
    femaleToFemale: { script: 'كيفك', transliteration: 'kīfik' },
    maleToFemale: { sameAs: 'femaleToFemale' },
    maleToMale: { sameAs: 'femaleToMale' },
  },
};

describe('withClipPaths', () => {
  it('records a clip against each distinct speaker/listener wording', () => {
    const side = withClipPaths(LISTENER_SIDE, AUDIO_ID, 'arabic');

    expect(side.speechForms?.femaleToMale).toMatchObject({
      transliteration: 'kīfak',
      audioPath: 'assets/audio/ar/' + AUDIO_ID + '_f2m+m2m.mp3',
    });
    expect(side.speechForms?.femaleToFemale).toMatchObject({
      transliteration: 'kīfik',
      audioPath: 'assets/audio/ar/' + AUDIO_ID + '_f2f+m2f.mp3',
    });
  });

  it('leaves a sameAs pointer as a pointer rather than copying the path', () => {
    const side = withClipPaths(LISTENER_SIDE, AUDIO_ID, 'arabic');

    // The pointer resolves to the entry that already carries the clip, so a
    // path written here too would be the duplication `sameAs` exists to stop.
    expect(side.speechForms?.maleToMale).toEqual({ sameAs: 'femaleToMale' });
    expect(side.speechForms?.maleToFemale).toEqual({ sameAs: 'femaleToFemale' });
  });

  it('never advertises audio the build does not ship', () => {
    expect(withClipPaths(LISTENER_SIDE, 'no-such-word', 'arabic')).toBe(
      LISTENER_SIDE,
    );
  });

  it('does not reach for a speaker/listener clip on a word gender pair', () => {
    const paired: LanguageSide = {
      script: 'حلوة',
      forms: { feminine: { script: 'حلوة' }, masculine: { script: 'حلو' } },
    };
    expect(withClipPaths(paired, AUDIO_ID, 'arabic')).toBe(paired);
  });
});

describe('allClips', () => {
  it('lists perspective clips in a stable order rather than dropping them', () => {
    // Form names outside feminine/masculine/neutral used to index a three-key
    // map and sort on NaN, which left the review screen's order up to chance.
    expect(allClips().map((entry) => entry.form)).toEqual([
      'f2f+m2f',
      'f2m+m2m',
    ]);
  });
});
