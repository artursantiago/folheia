import { createStore, type Store } from '../lib/store';
import { webStorage, type KeyValueStore } from '../platform/storage';
import type { Locale } from '../i18n/messages';

export type ThemePreference = 'system' | 'light' | 'dark';
export type LayoutPreference = 'auto' | 'single' | 'double';

export interface Preferences {
  theme: ThemePreference;
  /** null = follow the browser language. */
  locale: Locale | null;
  layout: LayoutPreference;
  coverAlone: boolean;
  hoverPeek: boolean;
}

export const defaultPreferences: Preferences = {
  theme: 'system',
  locale: null,
  layout: 'auto',
  coverAlone: true,
  hoverPeek: true,
};

const KEY = 'preferences';

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function parse(raw: string | null): Preferences {
  if (!raw) return defaultPreferences;
  try {
    const data = JSON.parse(raw) as Partial<Record<keyof Preferences, unknown>>;
    return {
      theme: oneOf(data.theme, ['system', 'light', 'dark'], 'system'),
      locale: data.locale === 'pt-BR' || data.locale === 'en' ? data.locale : null,
      layout: oneOf(data.layout, ['auto', 'single', 'double'], 'auto'),
      coverAlone: typeof data.coverAlone === 'boolean' ? data.coverAlone : true,
      hoverPeek: typeof data.hoverPeek === 'boolean' ? data.hoverPeek : true,
    };
  } catch {
    return defaultPreferences;
  }
}

export function createPreferencesStore(storage: KeyValueStore = webStorage): Store<Preferences> {
  const store = createStore(parse(storage.get(KEY)));
  store.subscribe(() => storage.set(KEY, JSON.stringify(store.get())));
  return store;
}

export const preferences = createPreferencesStore();
