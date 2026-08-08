import {
  palestinianPronunciation,
  type PronunciationEntry,
} from '../../constants/palestinianPronunciation';
import type { TtsPronunciation } from '../../types';
import type { AudioLanguage } from './paths';

/**
 * Where a pronunciation came from, worst last.
 *
 * `inferred` is the engine reading the spelling and guessing the vowels. It is
 * the only tier Levantry does not control, and on curated content it is a bug —
 * see `scripts/validatePronunciation.ts`, which fails on it.
 */
export type TtsSource = 'clip' | 'card' | 'dictionary' | 'inferred';

/** What to hand a speech engine, and how much authority stands behind it. */
export type SpokenPlan = {
  source: Exclude<TtsSource, 'clip'>;
  /** The exact engine input. */
  text: string;
  /** The romanisation the result has to match, where Levantry knows it. */
  target?: string;
  /** Set when the pronunciation is course data that must not be re-derived. */
  locked: boolean;
};

export type TtsPlan = {
  /** The winning tier. */
  source: TtsSource;
  /** The clip to play. Set only when `source` is `'clip'`. */
  audioPath?: string;
  /**
   * What to say if an engine is used at all — the winner of tiers 2 to 4.
   *
   * Present even when a clip won, because playback fails: a missing asset, a
   * decode error, an autoplay block. The fallback has to be the next tier down,
   * not a jump to the bottom of the ladder.
   */
  speech: SpokenPlan;
};

/**
 * The parts of a form that decide how it is said.
 *
 * Structural by design rather than a named card type, so `WordForm`,
 * `GenderedForm`, `LanguageForm`, `LanguageSide` and the generator's `ClipSpec`
 * all satisfy it and there is one implementation of the ladder rather than five.
 */
export type TtsCandidate = {
  script: string;
  transliteration?: string;
  pronunciationText?: string;
  tts?: TtsPronunciation;
  audioPath?: string;
};

export type TtsOptions = {
  language: AudioLanguage;
  /**
   * The learner's "use card pronunciation text" setting.
   *
   * Reaches *unlocked* overrides only. It exists so she can silence her own
   * respellings on her own cards, not so she can be handed a Modern Standard
   * reading of a word the deck teaches in Palestinian.
   */
  allowCardText?: boolean;
};

/*
 * There is deliberately no `curated` flag here.
 *
 * Whether a pronunciation is authoritative is a property of the pronunciation,
 * not of the caller: a `tts` entry says so with `source` and `locked`, and a
 * dictionary hit is Levantry's data by construction. A flag would have to be
 * threaded through every speaker button on every screen, and the first place it
 * was forgotten would be a card quietly reverting to whatever the engine felt
 * like saying. Where the curated/user distinction genuinely bites — which decks
 * must be fully covered — it is the *content validator* that draws it, over the
 * starter set it can see directly.
 */

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * The card's own override, if it has one that applies.
 *
 * `tts` is the full form and wins, and it says on its own face whether it is
 * binding: anything but a `user` correction locks unless told otherwise.
 *
 * A bare `pronunciationText` is the same idea written before `tts` existed. It
 * is read as unlocked, because that is what it has always been — content that
 * wants a lock says so, rather than acquiring one in a release.
 */
function cardOverride(
  form: TtsCandidate,
  options: TtsOptions,
): SpokenPlan | undefined {
  const explicit = form.tts;
  const explicitText = clean(explicit?.text);
  if (explicit && explicitText) {
    const locked = explicit.locked ?? explicit.source !== 'user';
    if (!locked && options.allowCardText === false) return undefined;
    return {
      source: 'card',
      text: explicitText,
      target: clean(explicit.target) ?? clean(form.transliteration),
      locked,
    };
  }

  const legacy = clean(form.pronunciationText);
  if (!legacy) return undefined;
  if (options.allowCardText === false) return undefined;

  return {
    source: 'card',
    text: legacy,
    target: clean(form.transliteration),
    locked: false,
  };
}

/**
 * The dictionary's reading of this word, if Levantry knows it.
 *
 * Arabic only. The dictionary is Palestinian, and Hebrew's mispronunciations
 * are fixed with niqqud on the card rather than by a second word list.
 *
 * A hit is locked whoever wrote the card. If the learner types مرحبا herself,
 * *marḥaba* is still the right answer and the engine's *marḥaban* is still the
 * wrong one — the dictionary is Levantry's knowledge about the word, not a
 * claim about the card. She is not stuck with it either: her own override is
 * the tier above and outranks it.
 */
function dictionaryEntry(
  form: TtsCandidate,
  options: TtsOptions,
): (SpokenPlan & { entry: PronunciationEntry }) | undefined {
  if (options.language !== 'arabic') return undefined;

  const entry = palestinianPronunciation(form.script);
  if (!entry) return undefined;

  return {
    source: 'dictionary',
    text: entry.ttsText,
    target: entry.pronunciation,
    locked: true,
    entry,
  };
}

/**
 * What to say, and on whose authority: the card's own override, then the
 * Palestinian dictionary, then — only if neither knows — the spelling itself.
 *
 * The last tier is the one this whole ladder exists to avoid. It hands the
 * engine undiacritized Levantine and lets it choose the vowels, which is how
 * `مرحبا` comes back as *marḥaban* and `تنين` as something with a syllable it
 * does not have. `target` still carries the taught romanisation where the card
 * has one, so a provider that takes direction in prose — Gemini does — can be
 * held to it even here.
 */
export function resolveSpokenPlan(
  form: TtsCandidate,
  options: TtsOptions,
): SpokenPlan {
  const override = cardOverride(form, options);
  if (override) return override;

  const dictionary = dictionaryEntry(form, options);
  if (dictionary) {
    const { entry: _entry, ...plan } = dictionary;
    return plan;
  }

  return {
    source: 'inferred',
    text: form.script.trim(),
    target: clean(form.transliteration),
    locked: false,
  };
}

/**
 * The full ladder for one form: curated recording, card override, dictionary,
 * spelling.
 *
 * A recording outranks everything because it *is* the pronunciation rather than
 * an instruction to produce it. The remaining three are resolved anyway and
 * carried on `speech`, so a clip that will not play falls to the next tier
 * instead of all the way to the bottom.
 */
export function resolveTtsPlan(form: TtsCandidate, options: TtsOptions): TtsPlan {
  const speech = resolveSpokenPlan(form, options);
  const clip = clean(form.audioPath);
  if (clip) return { source: 'clip', audioPath: clip, speech };
  return { source: speech.source, speech };
}

/**
 * True when this form's pronunciation is Levantry's rather than the engine's.
 *
 * The condition content validation enforces on curated Arabic: a recording, an
 * explicit override, or a dictionary entry. Anything else is the engine reading
 * the spelling, which on course content is a defect.
 */
export function isPronunciationKnown(plan: TtsPlan): boolean {
  return plan.source !== 'inferred';
}
