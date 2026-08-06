type Props = {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

export default function Toggle({ label, hint, checked, onChange }: Props) {
  return (
    <label className="panel-row" style={{ cursor: 'pointer' }}>
      <span className="grow">
        {label}
        {hint && <div className="small muted">{hint}</div>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 26, height: 26, flexShrink: 0 }}
      />
    </label>
  );
}
