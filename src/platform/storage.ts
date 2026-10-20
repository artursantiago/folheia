/**
 * Key-value persistence. The web build uses localStorage; a native build
 * (Capacitor) can swap in its Preferences plugin behind the same interface.
 * Every access is guarded: private mode, blocked storage or a full quota
 * must never break reading.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const PREFIX = 'folheia:';

export const webStorage: KeyValueStore = {
  get(key) {
    try {
      return localStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch {
      // Storage unavailable or full: preferences just won't persist.
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      // Ignore, same as above.
    }
  },
};

export function memoryStorage(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };
}
