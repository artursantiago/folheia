import { useSyncExternalStore } from 'react';
import type { ThemePreference } from '../../storage/preferences';

const QUERY = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia?.(QUERY);
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}

const systemDark = () => window.matchMedia?.(QUERY).matches ?? false;

/** Whether the dark scheme is in effect for a theme preference. */
export function useDarkScheme(theme: ThemePreference): boolean {
  const system = useSyncExternalStore(subscribe, systemDark, () => false);
  return theme === 'dark' || (theme === 'system' && system);
}
