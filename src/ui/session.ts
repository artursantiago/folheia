import { createStore } from '../lib/store';
import { openPdf, type PdfInput } from '../sources/pdf/PdfSource';
import { SourceError, type BookMetadata, type PageSource } from '../sources/types';

export type OpenRequest = { kind: 'file'; file: File } | { kind: 'url'; url: string };

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
    }
  | { status: 'error'; error: SourceError; name: string; request: OpenRequest };

export const session = createStore<Session>({ status: 'idle' });
export const passwordRequest = createStore<PasswordRequest | undefined>(undefined);

export function nameOf(request: OpenRequest): string {
  if (request.kind === 'file') return request.file.name;
  try {
    const path = new URL(request.url).pathname;
    return decodeURIComponent(path.split('/').filter(Boolean).pop() ?? request.url);
  } catch {
    return request.url;
  }
}

let openToken = 0;

export async function openBook(request: OpenRequest) {
  const token = ++openToken;
  const name = nameOf(request);
  await closeBook();
  session.set({ status: 'opening', name });
  const input: PdfInput = request.kind === 'file' ? { file: request.file } : { url: request.url };
  try {
    const source = await openPdf(input, {
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
    session.set({ status: 'open', source, metadata, name, request });
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
  (window as unknown as Record<string, unknown>).__folheia = { session, passwordRequest, openBook };
}
