import type { GenderedForms, LanguageSide } from '../../types';
import { wordForms } from '../../utils/wordForms';

type Props = {
  /** Either a whole card side, or a bare script plus its optional pair. */
  side: LanguageSide | { script: string; forms?: GenderedForms };
  language: 'hebrew' | 'arabic';
};

/**
 * A word as it should be read in a list or preview row: the feminine form
 * first with its ♀ marker, then the masculine with ♂. A word that everyone
 * says the same way renders as one unmarked line.
 *
 * Every list surface uses this rather than reading `script`, which mirrors
 * only the masculine form and would quietly teach half the pair.
 */
export default function WordForms({ side, language }: Props) {
  const forms = wordForms(side as LanguageSide);

  return (
    <span className={'forms-inline ' + language}>
      {forms.map((form) => (
        <span className="form-line" key={form.gender ?? 'only'}>
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
