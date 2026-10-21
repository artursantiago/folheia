import { createStore } from '../lib/store';
import { openSource, type SourceInput } from '../sources/open';
import type { ExampleBook } from '../examples';
import { SourceError, type BookMetadata, type PageSource } from '../sources/types';
import { library } from '../storage/db';
import type { BookEntry } from '../storage/library';

export type OpenRequest =
  { kind: 'file'; file: File } | { kind: 'url'; url: string; example?: ExampleBook | undefined };

export interface PasswordRequest {
  name: string;
  reason: 'required' | 'incorrect';
  respond: (password: string | null) => void;
}

export type Session =
  | { status: 'idle' }
  | { status: 'opening'; name: string; progress?: number }
  | {
      status: 'open';
      source: PageSource;
      metadata: BookMetadata;
      name: string;
      request: OpenRequest;
      /** What the library remembers about this file, if anything. */
      memory: BookEntry | undefined;
    }
  | { status: 'error'; error: SourceError; name: string; request: OpenRequest };

export const session = createStore<Session>({ status: 'idle' });
export const passwordRequest = createStore<PasswordRequest | undefined>(undefined);

export function nameOf(request: OpenRequest): string {
  if (request.kind === 'file') return request.file.name;
  if (request.example) return request.example.title;
  try {
    const path = new URL(request.url).pathname;
    return decodeURIComponent(path.split('/').filter(Boolean).pop() ?? request.url);
  } catch {
    return request.url;
  }
}

let openToken = 0;

/** Storage must never keep a book from opening. */
const STORAGE_PATIENCE_MS = 3000;

function withPatience<T>(task: Promise<T>): Promise<T | undefined> {
  return Promise.race([
    task.catch((error: unknown) => {
      console.warn('Library storage failed', error);
      return undefined;
    }),
    new Promise<undefined>((resolve) => setTimeout(resolve, STORAGE_PATIENCE_MS)),
  ]);
}

/**
 * Finds what the library remembers about the file. A local file enters the
 * library on its own; URLs and examples are only remembered as numbers.
 */
async function remember(
  source: PageSource,
  metadata: BookMetadata,
  request: OpenRequest,
): Promise<BookEntry | undefined> {
  const entry = await library.recall(source.id, source.legacyIds);
  if (request.kind !== 'file') return entry;
  const record = await library.addToLibrary(source.id, {
    kind: source.kind,
    origin: { type: 'file', name: request.file.name, size: request.file.size },
    metadata,
    pageCount: source.pageCount,
  });
  return { record, loans: entry?.loans ?? [] };
}

export async function openBook(request: OpenRequest) {
  const token = ++openToken;
  const name = nameOf(request);
  await closeBook();
  session.set({ status: 'opening', name });
  const input: SourceInput =
    request.kind === 'file' ? { file: request.file } : { url: request.url };
  try {
    const source = await openSource(input, {
      onPassword: (reason) =>
        new Promise((resolve) =>
          passwordRequest.set({
            name,
            reason,
            respond: (password) => {
              passwordRequest.set(undefined);
              resolve(password);
            },
          }),
        ),
      onProgress: (loaded, total) => {
        // PDF.js keeps reporting while pages load later on; only the opening screen cares.
        if (token !== openToken || total <= 0 || session.get().status !== 'opening') return;
        session.set({ status: 'opening', name, progress: loaded / total });
      },
    });
    if (token !== openToken) {
      await source.destroy();
      return;
    }
    const metadata = await source.getMetadata();
    const memory = await withPatience(remember(source, metadata, request));
    if (token !== openToken) {
      await source.destroy();
      return;
    }
    session.set({ status: 'open', source, metadata, name, request, memory });
  } catch (error) {
    if (token !== openToken) return;
    passwordRequest.set(undefined);
    if (error instanceof SourceError && error.code === 'password-cancelled') {
      session.set({ status: 'idle' });
      return;
    }
    const sourceError =
      error instanceof SourceError ? error : new SourceError('invalid', String(error), error);
    session.set({ status: 'error', error: sourceError, name, request });
  }
}

export async function closeBook() {
  const current = session.get();
  session.set({ status: 'idle' });
  if (current.status === 'open') await current.source.destroy();
}

if (import.meta.env.DEV) {
  // Handy for debugging and end-to-end tests.
  (window as unknown as Record<string, unknown>).__folheia = {
    session,
    passwordRequest,
    openBook,
    library,
  };
}
