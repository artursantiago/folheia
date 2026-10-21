import { storageName } from './channel';
import type { WriteMessage, WriteRequest } from './opfsWriter.worker';

export type FileStoreErrorCode =
  /** No room left on the device (or in the browser's share of it). */
  | 'quota'
  /** This browser or context has no file storage (private mode, old engine). */
  | 'unavailable'
  | 'failed';

export class FileStoreError extends Error {
  override readonly name = 'FileStoreError';
  constructor(
    readonly code: FileStoreErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * The app's own copies of book files, one per book id. On the web it is a
 * folder per channel in the OPFS. A native build may instead keep a
 * reference to a file elsewhere (the Android library folder): `open` hands
 * back a `File` either way.
 */
export interface FileStore {
  /** Stores the file under `id`; throws a FileStoreError. Replaces an older copy. */
  save(id: string, file: Blob, onProgress?: (written: number) => void): Promise<void>;
  open(id: string): Promise<File | undefined>;
  remove(id: string): Promise<void>;
  /** Space taken by the copies. */
  usage(): Promise<{ bytes: number; files: number }>;
}

/** Book ids hold ":" and other characters a file name shouldn't. */
export function fileNameOf(id: string) {
  return id.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function codeOf(name: string): FileStoreErrorCode {
  if (name === 'QuotaExceededError') return 'quota';
  if (name === 'SecurityError' || name === 'NotAllowedError' || name === 'UnknownError')
    return 'unavailable';
  return 'failed';
}

/** Asks once for storage that the browser won't evict. Never waited on: Firefox asks the user. */
let persistAsked = false;
function askToPersist() {
  if (persistAsked) return;
  persistAsked = true;
  void navigator.storage?.persist?.().catch(() => undefined);
}

export function opfsFileStore(dir = storageName): FileStore {
  async function folder(create: boolean) {
    if (!navigator.storage?.getDirectory)
      throw new FileStoreError('unavailable', 'No OPFS in this browser');
    try {
      const root = await navigator.storage.getDirectory();
      return await root.getDirectoryHandle(dir, { create });
    } catch (error) {
      if (!create && error instanceof DOMException && error.name === 'NotFoundError')
        return undefined;
      const name = error instanceof Error ? error.name : 'Error';
      throw new FileStoreError(codeOf(name), `Cannot open the file storage (${name})`, {
        cause: error,
      });
    }
  }

  async function remove(id: string) {
    const handle = await folder(false).catch(() => undefined);
    await handle?.removeEntry(fileNameOf(id)).catch(() => undefined);
  }

  return {
    async save(id, file, onProgress) {
      await folder(true);
      askToPersist();
      const request: WriteRequest = { dir, name: fileNameOf(id), blob: file };
      const result = await new Promise<WriteMessage & { type: 'done' | 'error' }>((resolve) => {
        const worker = new Worker(new URL('./opfsWriter.worker.ts', import.meta.url), {
          type: 'module',
        });
        worker.onmessage = ({ data }: MessageEvent<WriteMessage>) => {
          if (data.type === 'progress') {
            onProgress?.(data.written);
            return;
          }
          worker.terminate();
          resolve(data);
        };
        worker.onerror = (event) => {
          worker.terminate();
          resolve({ type: 'error', name: 'Error', message: event.message || 'Worker failed' });
        };
        worker.postMessage(request);
      });
      if (result.type === 'error') {
        await remove(id); // Never leave half a file behind.
        throw new FileStoreError(codeOf(result.name), result.message);
      }
    },
    async open(id) {
      const handle = await folder(false).catch(() => undefined);
      if (!handle) return undefined;
      try {
        return await (await handle.getFileHandle(fileNameOf(id))).getFile();
      } catch {
        return undefined;
      }
    },
    remove,
    async usage() {
      const handle = await folder(false).catch(() => undefined);
      let bytes = 0;
      let files = 0;
      if (!handle) return { bytes, files };
      for await (const entry of (
        handle as unknown as { values(): AsyncIterable<FileSystemHandle> }
      ).values()) {
        if (entry.kind !== 'file') continue;
        bytes += (await (entry as FileSystemFileHandle).getFile()).size;
        files++;
      }
      return { bytes, files };
    },
  };
}

/** In memory, for tests. `fail` makes every save throw with that code. */
export function memoryFileStore(options: { fail?: FileStoreErrorCode } = {}): FileStore {
  const files = new Map<string, File>();
  return {
    async save(id, file, onProgress) {
      if (options.fail) throw new FileStoreError(options.fail, 'Failing on purpose');
      files.set(id, new File([file], fileNameOf(id)));
      onProgress?.(file.size);
    },
    async open(id) {
      return files.get(id);
    },
    async remove(id) {
      files.delete(id);
    },
    async usage() {
      let bytes = 0;
      for (const file of files.values()) bytes += file.size;
      return { bytes, files: files.size };
    },
  };
}
