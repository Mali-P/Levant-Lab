import type { ThemeMode } from '../../types';
import { useSettings } from '../../stores/settingsStore';

/*
 * Cycling rather than a plain on/off switch, because "match the system" is a
 * real third state: a binary toggle can only strand the user on one scheme
 * once they have touched it, and they would have to go to Settings to hand
 * the choice back to the device.
 */
const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

const FACE: Record<ThemeMode, { icon: string; label: string }> = {
  system: { icon: '🌗', label: 'Theme: matching the system' },
  light: { icon: '☀️', label: 'Theme: light' },
  dark: { icon: '🌙', label: 'Theme: dark' },
};

export default function ThemeToggle() {
  const theme = useSettings((s) => s.settings.theme);
  const update = useSettings((s) => s.update);

  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  const face = FACE[theme];

  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      onClick={() => update({ theme: next })}
      // The current scheme is carried by the label, not by the icon alone, so
      // a screen reader announces the state and not just a picture of a moon.
      aria-label={face.label + '. Switch to ' + FACE[next].label.toLowerCase() + '.'}
      title={face.label}
    >
      <span aria-hidden="true">{face.icon}</span>
    </button>
  );
}
