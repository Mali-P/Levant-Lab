import type { GenderedForms, LanguageSide } from '../../types';
import { useSettings } from '../../stores/settingsStore';
import { wordForms } from '../../utils/wordForms';

type Props = {
  /** Either a whole card side, or a bare script plus its optional pair. */
  side: LanguageSide | { script: string; forms?: GenderedForms };
  language: 'hebrew' | 'arabic';
};

/**
 * A word as it should be read in a list or preview row.
 *
 * Where the phrase changes with who is speaking, the learner's own
 * perspectives are shown in female-first order and nobody else's. Otherwise
 * the grammatical pair reads with her own form first — feminine unless she has
 * said she is a man — with its ♀ / ♂ markers, and a word everyone says the same
 * way renders as one unmarked line.
 *
 * Every list surface uses this rather than reading `script`, which mirrors
 * only the leading form and would quietly teach half the card.
 */
export default function WordForms({ side, language }: Props) {
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const forms = wordForms(side as LanguageSide, perspectives, lead);

  return (
    <span className={'forms-inline ' + language}>
      {forms.map((form) => (
        <span className="form-line" key={form.key}>
          {form.marker && (
            <span className="form-marker" aria-label={form.label}>
              {form.marker}
            </span>
          )}
          <span className={language}>{form.script}</span>
        </span>
      ))}
    </span>
  );
}
