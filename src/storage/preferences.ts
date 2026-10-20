import { createStore, type Store } from '../lib/store';
import { webStorage, type KeyValueStore } from '../platform/storage';
import type { Locale } from '../i18n/messages';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Preferences {
  theme: ThemePreference;
  /** null = follow the browser language. */
  locale: Locale | null;
}

export const defaultPreferences: Preferences = { theme: 'system', locale: null };

const KEY = 'preferences';

function parse(raw: string | null): Preferences {
  if (!raw) return defaultPreferences;
  try {
    const data = JSON.parse(raw) as Partial<Preferences>;
    return {
      theme: data.theme === 'light' || data.theme === 'dark' ? data.theme : 'system',
      locale: data.locale === 'pt-BR' || data.locale === 'en' ? data.locale : null,
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
