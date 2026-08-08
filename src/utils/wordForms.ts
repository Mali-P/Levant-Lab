import {
  isNotApplicable,
  isSameAs,
  SPEECH_PERSPECTIVES,
  SPEECH_PERSPECTIVE_LABELS,
  SPEECH_PERSPECTIVE_MARKERS,
  type LanguageForm,
  type LanguageSide,
  type SpeechForms,
  type SpeechPerspective,
} from '../types';

export type WordForm = {
  script: string;
  transliteration?: string;
  /**
   * Stable React key and audio-file segment. `'only'` for a word with a single
   * form, `'feminine'` / `'masculine'` for a grammatical pair, and the joined
   * perspective keys — `'f2m'`, `'f2m+m2m'` — for a speaker/listener variant.
   */
  key: string;
  /** 'feminine' or 'masculine'. Absent when one form serves everyone. */
  gender?: 'feminine' | 'masculine';
  /** Every perspective this exact wording serves. Absent on a word-form pair. */
  perspectives?: SpeechPerspective[];
  /** Symbol to show beside the word. Absent when there is nothing to contrast. */
  marker?: string;
  /** Read by assistive technology in place of the symbol. */
  label?: string;
  /**
   * Bundled pronunciation clip for this exact form. Absent on cards the
   * learner added themselves, which fall back to device speech.
   */
  audioPath?: string;
  /** Pronunciation override for this form, when the visible text mis-speaks. */
  pronunciationText?: string;
  /** Anything worth saying about this form alone. */
  notes?: string;
};

/** Short, filename-safe key per perspective. */
export const PERSPECTIVE_KEYS: Record<SpeechPerspective, string> = {
  femaleToMale: 'f2m',
  femaleToFemale: 'f2f',
  maleToFemale: 'm2f',
  maleToMale: 'm2m',
};

/** The side's own wording, used when a perspective names no variant of its own. */
function baseForm(side: LanguageSide): LanguageForm {
  return {
    script: side.script,
    transliteration: side.transliteration,
    pronunciationText: side.pronunciationText,
    audioPath: side.audioPath,
  };
}

/**
 * The wording one perspective actually uses, following `sameAs` pointers.
 *
 * `null` means the phrase is not said in that perspective at all, which is not
 * the same as it being unlisted — an unlisted perspective falls back to the
 * side's own wording, because most phrases vary in only one direction and
 * should not have to spell out the three that do not change.
 */
function resolveVariant(
  side: LanguageSide,
  forms: SpeechForms,
  perspective: SpeechPerspective,
  seen: Set<SpeechPerspective> = new Set(),
): LanguageForm | null {
  const variant = forms[perspective];
  if (!variant) return baseForm(side);
  if (isNotApplicable(variant)) return null;
  if (isSameAs(variant)) {
    // A pointer at itself, or a ring of them, would otherwise recurse for ever.
    // Content this broken falls back to the side's own wording rather than
    // taking the screen down with it.
    if (seen.has(perspective)) return baseForm(side);
    seen.add(perspective);
    return resolveVariant(side, forms, variant.sameAs, seen);
  }
  return variant;
}

/**
 * The perspectives to read, in canonical order, filtered to those selected.
 *
 * Always canonical order rather than the order the learner happened to tick the
 * boxes in, so female-speaker forms lead however the setting was edited.
 */
function orderedPerspectives(
  selected: readonly SpeechPerspective[],
): SpeechPerspective[] {
  return SPEECH_PERSPECTIVES.filter((p) => selected.includes(p));
}

/**
 * The distinct wordings one side takes across the selected perspectives.
 *
 * Perspectives that come out word for word identical collapse into a single
 * entry carrying all of them, so a phrase where only the listener's gender
 * matters shows two lines rather than four, and one that does not vary at all
 * shows a single unmarked line. Nothing here invents a distinction the language
 * does not make.
 */
export function speechWordForms(
  side: LanguageSide,
  selected: readonly SpeechPerspective[],
): WordForm[] {
  const forms = side.speechForms;
  if (!forms) return [];

  const wanted = orderedPerspectives(selected);
  if (wanted.length === 0) return [];

  const groups: { form: LanguageForm; perspectives: SpeechPerspective[] }[] = [];

  for (const perspective of wanted) {
    const resolved = resolveVariant(side, forms, perspective);
    if (!resolved) continue;

    // Identity is the wording itself, not which perspective declared it: two
    // perspectives that arrive at the same words are the same form whether the
    // content said so with `sameAs` or simply repeated it.
    const existing = groups.find(
      (g) =>
        g.form.script === resolved.script &&
        g.form.transliteration === resolved.transliteration,
    );
    if (existing) existing.perspectives.push(perspective);
    else groups.push({ form: resolved, perspectives: [perspective] });
  }

  // One wording across every selected perspective is a phrase that does not
  // vary. It gets no marker, because a ♀→♂ label on a form that is equally
  // ♂→♂ would be telling the learner something untrue.
  const uniform = groups.length === 1;

  return groups.map(({ form, perspectives }) => ({
    script: form.script,
    transliteration: form.transliteration,
    key: uniform ? 'all' : perspectives.map((p) => PERSPECTIVE_KEYS[p]).join('+'),
    perspectives,
    marker: uniform
      ? undefined
      : perspectives.map((p) => SPEECH_PERSPECTIVE_MARKERS[p]).join(' '),
    label: uniform
      ? undefined
      : perspectives.map((p) => SPEECH_PERSPECTIVE_LABELS[p]).join(', '),
    audioPath: form.audioPath,
    pronunciationText: form.pronunciationText,
    notes: form.notes,
  }));
}

/**
 * The forms of one word, in the order they should be read.
 *
 * Speaker/listener variants win where a side has them, filtered to the
 * perspectives the learner is studying and ordered female-speaker first. Where
 * a side has none, this falls back to the grammatical pair — or to a single
 * unmarked form.
 *
 * `lead` orders that grammatical pair, and comes from the learner's *identity*
 * rather than from the perspective being rendered: which of her own forms she
 * should read first is a fact about her, and it must not flip mid-drill when a
 * prompt asks her to say something to a man. It is a display preference only —
 * both forms are returned either way, and grading never sees it.
 *
 * Honest for pairs the speaker controls, which is most of them and all the ones
 * the ordering is visibly wrong on today. A noun-controlled pair is ordered by
 * the same rule for want of a declared controller; `LanguageSide.agreement`
 * (Phase 1) is what makes it exact, and until a side declares one this ordering
 * never reaches grading or a flip step.
 *
 * Every surface goes through here rather than reading `script`, which mirrors
 * only the leading form and would quietly teach half the card.
 */
export function wordForms(
  side: LanguageSide,
  selected?: readonly SpeechPerspective[],
  lead: 'feminine' | 'masculine' = 'feminine',
): WordForm[] {
  if (side.speechForms && selected && selected.length > 0) {
    const speech = speechWordForms(side, selected);
    // An empty result means every selected perspective was marked not
    // applicable. The word still has to be shown, so the base form stands in.
    if (speech.length > 0) return speech;
  }

  if (!side.forms) {
    return [
      {
        script: side.script,
        transliteration: side.transliteration,
        key: 'only',
        audioPath: side.audioPath,
        pronunciationText: side.pronunciationText,
      },
    ];
  }

  const feminine: WordForm = {
    script: side.forms.feminine.script,
    transliteration: side.forms.feminine.transliteration,
    key: 'feminine',
    gender: 'feminine',
    marker: '♀',
    label: 'feminine',
    audioPath: side.forms.feminine.audioPath,
    pronunciationText: side.forms.feminine.pronunciationText,
  };
  const masculine: WordForm = {
    script: side.forms.masculine.script,
    transliteration: side.forms.masculine.transliteration,
    key: 'masculine',
    gender: 'masculine',
    marker: '♂',
    label: 'masculine',
    audioPath: side.forms.masculine.audioPath,
    pronunciationText: side.forms.masculine.pronunciationText,
  };

  return lead === 'masculine' ? [masculine, feminine] : [feminine, masculine];
}
