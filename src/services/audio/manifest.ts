import {
  isNotApplicable,
  isSameAs,
  SPEECH_PERSPECTIVES,
  type LanguageSide,
  type SpeechForms,
} from '../../types';
import {
  AUDIO_CLIPS,
  type AudioClipRecord,
} from '../../generated/audioManifest';
import { speechWordForms } from '../../utils/wordForms';
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
  // Speaker/listener variants are named for their perspectives rather than a
  // gender, so anything outside this list sorts after the three fixed names
  // and then alphabetically — which puts `f2m` ahead of `m2f`, the order the
  // cards themselves use.
  const formOrder: Record<string, number> = {
    feminine: 0,
    masculine: 1,
    neutral: 2,
  };
  const languageOrder = { hebrew: 0, arabic: 1 };
  return Object.entries(AUDIO_CLIPS)
    .map(([key, record]) => ({ key, ...record }))
    .sort(
      (a, b) =>
        a.english.localeCompare(b.english) ||
        languageOrder[a.language] - languageOrder[b.language] ||
        (formOrder[a.form] ?? 3) - (formOrder[b.form] ?? 3) ||
        a.form.localeCompare(b.form),
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
/**
 * Records the bundled clips against a side's speaker/listener variants.
 *
 * The generator names a clip after every perspective sharing one wording, so
 * the lookup key is the group `speechWordForms` produces across all four —
 * which is exactly how two perspectives that say the same thing end up sharing
 * a single recording instead of being handed a copy each.
 *
 * A `sameAs` pointer is deliberately left alone: it resolves to the entry that
 * just took the path, so writing one there too would duplicate the reference
 * the pointer exists to avoid.
 */
function withSpeechClipPaths<T extends LanguageSide>(
  side: T,
  audioId: string,
  language: AudioLanguage,
): T {
  const forms = side.speechForms;
  if (!forms) return side;

  const next: SpeechForms = { ...forms };
  let base: string | undefined;
  let changed = false;

  for (const group of speechWordForms(side, SPEECH_PERSPECTIVES)) {
    const record = clipRecord(audioId, language, group.key);
    if (!record) continue;

    for (const perspective of group.perspectives ?? []) {
      const variant = forms[perspective];
      // An unlisted perspective falls back to the side's own wording, so its
      // clip belongs on the side rather than on a variant that is not there.
      if (!variant) base = record.path;
      else if (!isSameAs(variant) && !isNotApplicable(variant)) {
        next[perspective] = { ...variant, audioPath: record.path };
        changed = true;
      }
    }
  }

  if (!changed && !base) return side;
  return {
    ...side,
    ...(base ? { audioPath: base } : {}),
    ...(changed ? { speechForms: next } : {}),
  };
}

export function withClipPaths<T extends LanguageSide>(
  side: T,
  audioId: string,
  language: AudioLanguage,
): T {
  // Speaker/listener variants win where a side has them, matching the order
  // `clipsForSide` records them in — otherwise the two would disagree about
  // which clips a card is meant to own.
  if (side.speechForms) return withSpeechClipPaths(side, audioId, language);

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
