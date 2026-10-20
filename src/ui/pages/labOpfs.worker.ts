// Developer tool (#/lab): writes a file into the OPFS from a worker through
// createSyncAccessHandle, the path that works where createWritable doesn't.

interface SyncHandle {
  write(buffer: ArrayBufferView, options?: { at: number }): number;
  flush(): void;
  close(): void;
}

const CHUNK = 4 * 1024 * 1024;

self.onmessage = async (event: MessageEvent<{ blob: Blob; dir: string; name: string }>) => {
  const { blob, dir, name } = event.data;
  try {
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle(dir, { create: true });
    const handle = await folder.getFileHandle(name, { create: true });
    const create = (handle as unknown as { createSyncAccessHandle?: () => Promise<SyncHandle> })
      .createSyncAccessHandle;
    if (typeof create !== 'function') {
      self.postMessage({ ok: false, error: 'createSyncAccessHandle ausente no worker' });
      return;
    }
    const started = performance.now();
    const access = await create.call(handle);
    for (let at = 0; at < blob.size; at += CHUNK) {
      const bytes = new Uint8Array(await blob.slice(at, at + CHUNK).arrayBuffer());
      access.write(bytes, { at });
    }
    access.flush();
    access.close();
    self.postMessage({ ok: true, ms: Math.round(performance.now() - started) });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    });
  }
};
