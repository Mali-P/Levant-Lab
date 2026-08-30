import type { FinishedSort } from '../../types';
import { FINISHED_SORTS, FINISHED_SORT_LABELS } from '../../features/review/languagePolicy';

/**
 * Where finished work sits in the list under it.
 *
 * A learner twenty lots in wants one of two things from what she has already
 * done: it in front of her to revise, or out of the way of what is next. The
 * third option is the order the course wrote, which is what she starts with —
 * a list that rearranged itself before she had finished anything would be
 * teaching her the wrong shape of the course.
 */
export default function FinishedSortControl({
  value,
  onChange,
  label,
}: {
  value: FinishedSort;
  onChange: (next: FinishedSort) => void;
  label: string;
}) {
  return (
    <div className="sort-control" role="group" aria-label={label}>
      <span className="eyebrow">{label}</span>
      <div className="segmented">
        {FINISHED_SORTS.map((mode) => (
          <button
            key={mode}
            type="button"
            className={'btn btn-compact' + (mode === value ? ' selected' : '')}
            aria-pressed={mode === value}
            onClick={() => onChange(mode)}
          >
            {FINISHED_SORT_LABELS[mode]}
          </button>
        ))}
      </div>
    </div>
  );
}
