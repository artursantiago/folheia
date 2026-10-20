import { memoryStorage } from '../platform/storage';
import { createPreferencesStore, defaultPreferences } from './preferences';

describe('preferences', () => {
  it('starts from defaults and persists changes', () => {
    const storage = memoryStorage();
    const prefs = createPreferencesStore(storage);
    expect(prefs.get()).toEqual(defaultPreferences);
    prefs.set({ ...defaultPreferences, theme: 'dark', locale: 'en', layout: 'single' });
    expect(createPreferencesStore(storage).get()).toEqual({
      ...defaultPreferences,
      theme: 'dark',
      locale: 'en',
      layout: 'single',
    });
  });

  it('ignores corrupt or unknown values', () => {
    const storage = memoryStorage();
    storage.set('preferences', '{"theme":"neon","locale":"fr","immersiveBar":"sideways"}');
    expect(createPreferencesStore(storage).get()).toEqual(defaultPreferences);
    storage.set('preferences', 'not json');
    expect(createPreferencesStore(storage).get()).toEqual(defaultPreferences);
  });
});
