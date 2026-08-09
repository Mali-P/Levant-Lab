import { useSettings } from '../../stores/settingsStore';
import { resolveTheme, usePrefersLight } from '../../hooks/useAppearance';
import Icon from '../ornament/Icon';

/*
 * A plain day/night switch: one press, the other scheme, every time.
 *
 * It used to cycle system → light → dark, which meant a press did not always
 * change anything you could see. Sitting on `system` with a device already in
 * daylight, the first press set an explicit `light` — the same screen — and the
 * scheme only moved on the second. The fix is to steer by the scheme actually
 * being rendered rather than by the stored mode, so the button is never a
 * no-op.
 *
 * That costs the third state, and it is the right thing to lose here: "match
 * the system" is a preference you set once, not something you reach for from a
 * toolbar mid-session. It keeps its place in Settings → Appearance, which is
 * still the full three-way choice and the way back to the device.
 */
export default function ThemeToggle() {
  const theme = useSettings((s) => s.settings.theme);
  const update = useSettings((s) => s.update);

  const resolved = resolveTheme(theme, usePrefersLight());
  const next = resolved === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      onClick={() => update({ theme: next })}
      // The icon shows the scheme you are in; the name has to carry both that
      // and what the press will do, so a screen reader gets the state and the
      // consequence rather than just a picture of a moon.
      aria-label={`Theme: ${resolved}. Switch to ${next}.`}
      title={`Theme: ${resolved}`}
    >
      <Icon name={resolved === 'dark' ? 'moon' : 'sun'} />
    </button>
  );
}
