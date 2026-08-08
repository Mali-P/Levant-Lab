import { AUDIO_CLIPS } from '../../src/generated/audioManifest';
import type { AudioLanguage } from '../../src/services/audio/paths';
import type { TtsSource } from '../../src/services/audio/ttsPlan';
import { buildJobs, type ClipJob } from './jobs';

/**
 * One curated form and how its pronunciation was decided.
 *
 * `clip` is not a tier `buildJobs` can report, because at generation time the
 * clip is the output rather than an input. It is added here by asking the
 * manifest whether that recording actually shipped.
 */
export type AuditedForm = {
  key: string;
  english: string;
  categoryName: string;
  deckName: string;
  language: AudioLanguage;
  form: string;
  /** The Arabic or Hebrew the learner reads. */
  text: string;
  /** What a speech engine would be given. */
  spoken: string;
  /** The romanisation the audio has to match, where Levantry knows one. */
  target?: string;
  source: TtsSource;
};

export type PronunciationAudit = {
  forms: AuditedForm[];
  /**
   * Curated Arabic whose pronunciation nothing in Levantry decides — no
   * recording, no override, no dictionary entry. The engine is reading
   * undiacritized spelling and choosing the vowels, which is the failure this
   * whole check exists to catch.
   */
  inferred: AuditedForm[];
  bySource: Record<TtsSource, number>;
};

function audited(job: ClipJob): AuditedForm {
  // A shipped recording outranks everything, exactly as it does at play time.
  // Asking the manifest rather than trusting the job is the point: a form whose
  // clip was planned but never generated is not covered by one.
  const recorded = Boolean(AUDIO_CLIPS[job.key]);

  return {
    key: job.key,
    english: job.english,
    categoryName: job.categoryName,
    deckName: job.deckName,
    language: job.language,
    form: job.form,
    text: job.text,
    spoken: job.spoken,
    target: job.transliteration,
    source: recorded ? 'clip' : job.ttsSource,
  };
}

/**
 * Every curated form, and which of them Levantry cannot say on its own terms.
 *
 * Arabic only in `inferred`, and that asymmetry is deliberate rather than an
 * oversight: the rule being enforced is about Arabic orthography leaving the
 * vowels open, and there is no Hebrew pronunciation dictionary to check a
 * Hebrew form against. Hebrew is still audited — it appears in `forms` and in
 * the tally — but a Hebrew form falling through to the engine is not a failure.
 *
 * Only starter content is in scope. Cards the learner writes herself are hers
 * to have guessed at and hers to correct; `buildJobs` never sees them.
 */
export function auditPronunciations(language?: AudioLanguage): PronunciationAudit {
  const { jobs } = buildJobs(language);

  const forms = jobs.filter((job) => job.spoken.trim().length > 0).map(audited);

  const bySource: Record<TtsSource, number> = {
    clip: 0,
    card: 0,
    dictionary: 0,
    inferred: 0,
  };
  for (const form of forms) bySource[form.source]++;

  return {
    forms,
    inferred: forms.filter(
      (form) => form.language === 'arabic' && form.source === 'inferred',
    ),
    bySource,
  };
}
