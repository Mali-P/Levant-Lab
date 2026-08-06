import { useEffect } from 'react';
import type { Settings } from '../types';

/**
 * Appearance settings are applied as data attributes on <html> so the CSS
 * owns every visual decision and nothing has to be themed in JavaScript.
 */
export function useAppearance(settings: Settings): void {
  useEffect(() => {
    const root = document.documentElement;

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const resolved =
        settings.theme === 'system'
          ? prefersDark.matches
            ? 'dark'
            : 'light'
          : settings.theme;
      root.dataset.theme = resolved;
    };

    applyTheme();
    prefersDark.addEventListener('change', applyTheme);

    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.motion = settings.reducedMotion ? 'reduced' : 'full';
    root.style.setProperty('--font-scale', String(settings.fontScale));

    return () => prefersDark.removeEventListener('change', applyTheme);
  }, [
    settings.theme,
    settings.highContrast,
    settings.reducedMotion,
    settings.fontScale,
  ]);
}
