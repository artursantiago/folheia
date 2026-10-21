import { createStore } from '../lib/store';

/** True when a new version of the app is waiting; call `applyUpdate` to reload into it. */
export const updateAvailable = createStore(false);
let update: ((reload?: boolean) => Promise<void>) | undefined;

export async function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const { registerSW } = await import('virtual:pwa-register');
  update = registerSW({
    onNeedRefresh: () => updateAvailable.set(true),
  });
}

export function applyUpdate() {
  void update?.(true);
}
