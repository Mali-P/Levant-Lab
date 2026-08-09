import { useEffect, useSyncExternalStore } from 'react';
import type { Settings, ThemeMode } from '../types';

/**
 * Mirror of `settings.theme`, read by the boot script in index.html before the
 * database is open so the first paint is already in the right scheme.
 */
export const THEME_STORAGE_KEY = 'theme';

/**
 * The `--bg` of each scheme, for the browser chrome that cannot read CSS.
 * These are `--stone-bg` written out twice over, so they have to be kept in
 * step with the palette in `global.css` and with the boot script in
 * `index.html`, which paints the same two values before this ever runs.
 */
const CHROME_COLOUR: Record<'light' | 'dark', string> = {
  light: '#d3c8b3',
  dark: '#191510',
};

export function resolveTheme(theme: ThemeMode, prefersLight: boolean): 'light' | 'dark' {
  if (theme === 'system') return prefersLight ? 'light' : 'dark';
  return theme;
}

const PREFERS_LIGHT = '(prefers-color-scheme: light)';

/**
 * Whether the device is currently asking for the light scheme. A control that
 * offers to flip the scheme has to know which one is actually on screen, and
 * under `theme: 'system'` the setting alone does not say — so this is read from
 * the device and subscribed to, not derived from `settings`.
 */
export function usePrefersLight(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(PREFERS_LIGHT);
      query.addEventListener('change', notify);
      return () => query.removeEventListener('change', notify);
    },
    () => window.matchMedia(PREFERS_LIGHT).matches,
    // No device to ask on the server; the app's default scheme is night stone.
    () => false,
  );
}

/**
 * Appearance settings are applied as data attributes on <html> so the CSS
 * owns every visual decision and nothing has to be themed in JavaScript.
 */
export function useAppearance(settings: Settings): void {
  useEffect(() => {
    const root = document.documentElement;

    const prefersLight = window.matchMedia('(prefers-color-scheme: light)');
    const applyTheme = () => {
      const resolved = resolveTheme(settings.theme, prefersLight.matches);
      root.dataset.theme = resolved;

      // The address bar and the PWA splash are painted by the browser, not by
      // our stylesheet, so the resolved background has to be handed over.
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta) meta.content = CHROME_COLOUR[resolved];
    };

    applyTheme();
    prefersLight.addEventListener('change', applyTheme);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, settings.theme);
    } catch {
      // Private browsing can refuse writes. Only the boot flash is lost.
    }

    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.motion = settings.reducedMotion ? 'reduced' : 'full';
    root.style.setProperty('--font-scale', String(settings.fontScale));

    return () => prefersLight.removeEventListener('change', applyTheme);
  }, [
    settings.theme,
    settings.highContrast,
    settings.reducedMotion,
    settings.fontScale,
  ]);
}
