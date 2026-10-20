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

interface LaunchParams {
  files: { getFile(): Promise<File> }[];
}

/** "Open with Folheia" on desktop Chrome/Edge (file_handlers in the manifest). */
export function onLaunchFile(open: (file: File) => void) {
  const queue = (
    window as unknown as { launchQueue?: { setConsumer(cb: (p: LaunchParams) => void): void } }
  ).launchQueue;
  queue?.setConsumer((params) => {
    void params.files[0]?.getFile().then(open);
  });
}
