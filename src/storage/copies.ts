import { FileStoreError, type FileStore } from '../platform/files';
import type { FileCopy, Library, MissingReason } from './library';

/**
 * Copies stay off in the stable app until stage 2 brings the screen that
 * shows the space they take and turns them off (docs/spec-fundacoes.md §4).
 */
export const copiesEnabled = __APP_CHANNEL__ !== 'stable';

function reasonOf(error: unknown): MissingReason {
  if (!(error instanceof FileStoreError)) return 'failed';
  return error.code;
}

/**
 * Keeps the library's own copy of each local file it holds, so the book can
 * be opened again without the original. Copies run one at a time, in the
 * background, and never fail loudly: the reason is recorded instead.
 */
export class Copier {
  private queue: Promise<unknown> = Promise.resolve();
  private pending = new Set<string>();

  constructor(
    private readonly library: Library,
    private readonly files: FileStore,
    private readonly enabled = copiesEnabled,
  ) {}

  keep(id: string, file: File): Promise<FileCopy | undefined> {
    if (this.pending.has(id)) return Promise.resolve(undefined);
    this.pending.add(id);
    const run = this.queue.then(() => this.copy(id, file));
    this.queue = run.catch(() => undefined);
    return run.finally(() => this.pending.delete(id));
  }

  private async copy(id: string, file: File): Promise<FileCopy> {
    let copy: FileCopy;
    if (!this.enabled) copy = { status: 'missing', reason: 'disabled' };
    else {
      const record = await this.library.get(id);
      const stored = await this.files.open(id).catch(() => undefined);
      if (
        record?.origin?.type === 'file' &&
        record.origin.copy?.status === 'stored' &&
        stored?.size === file.size
      )
        return record.origin.copy;
      try {
        await this.files.save(id, file);
        copy = { status: 'stored', storedAt: Date.now() };
      } catch (error) {
        console.warn('Could not keep a copy of the file', error);
        copy = { status: 'missing', reason: reasonOf(error) };
      }
    }
    await this.library.setCopy(id, copy);
    return copy;
  }
}
