type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
};

export default function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: Props) {
  return (
    <label className="field">
      <span className="spread">
        <span>{label}</span>
        <span className="small muted">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', minHeight: 44 }}
      />
    </label>
  );
}
