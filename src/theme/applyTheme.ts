import type { ThemePreference } from '../storage/preferences';

const PAPER = { light: '#F3EDE1', dark: '#12161D' } as const;

/** Applies the theme preference to <html> and the browser chrome color. */
export function applyTheme(theme: ThemePreference, root: HTMLElement = document.documentElement) {
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;

  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((meta) => {
    const scheme = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = theme === 'system' ? PAPER[scheme] : PAPER[theme];
  });
}
