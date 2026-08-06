type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  hint?: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
};

export default function Choice<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: Props<T>) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <span className="small muted">{hint}</span>}
    </label>
  );
}
