import { useEffect } from 'react';
import type { Settings, ThemeMode } from '../types';

/**
 * Mirror of `settings.theme`, read by the boot script in index.html before the
 * database is open so the first paint is already in the right scheme.
 */
export const THEME_STORAGE_KEY = 'theme';

/** The `--bg` of each scheme, for the browser chrome that cannot read CSS. */
const CHROME_COLOUR: Record<'light' | 'dark', string> = {
  light: '#f2f0ec',
  dark: '#0e1116',
};

export function resolveTheme(theme: ThemeMode, prefersLight: boolean): 'light' | 'dark' {
  if (theme === 'system') return prefersLight ? 'light' : 'dark';
  return theme;
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
