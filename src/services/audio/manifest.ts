import type { LanguageSide } from '../../types';
import {
  AUDIO_CLIPS,
  type AudioClipRecord,
} from '../../generated/audioManifest';
import { clipKey, type AudioLanguage, type FormName } from './paths';

export type { AudioClipRecord };

export type ManifestEntry = AudioClipRecord & { key: string };

/** What the generator recorded for one form of one word, if anything. */
export function clipRecord(
  audioId: string | undefined,
  language: AudioLanguage,
  form: FormName,
): AudioClipRecord | undefined {
  if (!audioId) return undefined;
  return AUDIO_CLIPS[clipKey(audioId, language, form)];
}

/**
 * Turns a manifest path into something an <audio> element can load. Paths are
 * stored relative because the PWA is built with `base: './'` and may be served
 * from a subdirectory.
 */
export function clipUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base + path : base + '/' + path;
}

/**
 * Every generated clip in the order a reviewer should hear them: Hebrew
 * feminine, Hebrew masculine, Arabic feminine, Arabic masculine — the same
 * order the cards themselves put the forms in.
 */
export function allClips(): ManifestEntry[] {
  const formOrder = { feminine: 0, masculine: 1, neutral: 2 };
  const languageOrder = { hebrew: 0, arabic: 1 };
  return Object.entries(AUDIO_CLIPS)
    .map(([key, record]) => ({ key, ...record }))
    .sort(
      (a, b) =>
        a.english.localeCompare(b.english) ||
        languageOrder[a.language] - languageOrder[b.language] ||
        formOrder[a.form] - formOrder[b.form],
    );
}

export function clipCount(): number {
  return Object.keys(AUDIO_CLIPS).length;
}

/**
 * Returns the side with the bundled clip recorded against each of its forms.
 *
 * A path is only written when the generator actually produced that clip, so a
 * card never advertises audio the build does not ship — the speaker button
 * falls back to device speech instead of failing on a 404.
 */
export function withClipPaths<T extends LanguageSide>(
  side: T,
  audioId: string,
  language: AudioLanguage,
): T {
  if (!side.forms) {
    const neutral = clipRecord(audioId, language, 'neutral');
    return neutral ? { ...side, audioPath: neutral.path } : side;
  }

  const feminine = clipRecord(audioId, language, 'feminine');
  const masculine = clipRecord(audioId, language, 'masculine');
  if (!feminine && !masculine) return side;

  return {
    ...side,
    forms: {
      feminine: feminine
        ? { ...side.forms.feminine, audioPath: feminine.path }
        : side.forms.feminine,
      masculine: masculine
        ? { ...side.forms.masculine, audioPath: masculine.path }
        : side.forms.masculine,
    },
  };
}
