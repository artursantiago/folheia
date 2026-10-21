// Writes one file into the OPFS through createSyncAccessHandle: it exists in
// workers on every supported browser (Safari since 15.2), unlike
// createWritable on the page (docs/spec-fundacoes.md, question 2).

export interface WriteRequest {
  dir: string;
  name: string;
  blob: Blob;
}

export type WriteMessage =
  | { type: 'progress'; written: number }
  | { type: 'done' }
  | { type: 'error'; name: string; message: string };

interface SyncAccessHandle {
  truncate(size: number): void;
  write(buffer: ArrayBufferView, options?: { at: number }): number;
  flush(): void;
  close(): void;
}

const CHUNK = 4 * 1024 * 1024;

const post = (message: WriteMessage) => self.postMessage(message);

self.onmessage = async ({ data }: MessageEvent<WriteRequest>) => {
  let access: SyncAccessHandle | undefined;
  try {
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle(data.dir, { create: true });
    const handle = await folder.getFileHandle(data.name, { create: true });
    access = await (
      handle as unknown as { createSyncAccessHandle(): Promise<SyncAccessHandle> }
    ).createSyncAccessHandle();
    access.truncate(0);
    for (let at = 0; at < data.blob.size; at += CHUNK) {
      const bytes = new Uint8Array(await data.blob.slice(at, at + CHUNK).arrayBuffer());
      const written = access.write(bytes, { at });
      if (written !== bytes.length)
        throw new DOMException('The disk is full', 'QuotaExceededError');
      post({ type: 'progress', written: at + written });
    }
    access.flush();
    access.close();
    post({ type: 'done' });
  } catch (error) {
    access?.close();
    const name = error instanceof Error ? error.name : 'Error';
    post({ type: 'error', name, message: error instanceof Error ? error.message : String(error) });
  }
};
