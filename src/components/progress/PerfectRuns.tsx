type Props = { completed: number; required: number };

/** One filled segment per flawless full-deck run. */
export default function PerfectRuns({ completed, required }: Props) {
  const segments = Array.from({ length: required }, (_unused, i) => i < completed);

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="spread">
        <span className="eyebrow">Perfect runs</span>
        <span className="small">
          {completed} / {required}
        </span>
      </div>
      <div
        className="runs"
        role="img"
        aria-label={completed + ' of ' + required + ' perfect runs complete'}
      >
        {segments.map((filled, i) => (
          <span key={i} className={'seg' + (filled ? ' filled' : '')} />
        ))}
      </div>
    </div>
  );
}
