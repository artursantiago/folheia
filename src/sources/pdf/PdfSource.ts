import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import {
  SourceError,
  type BookMetadata,
  type OutlineItem,
  type PageLink,
  type PageSize,
  type PageSource,
  type PasswordPrompt,
  type RenderTarget,
} from '../types';
import { pdfjs, pdfjsDataUrls } from './pdfjs';

export type PdfInput = { file: Blob } | { url: string };

export interface OpenPdfOptions {
  onPassword?: PasswordPrompt;
  /** Bytes downloaded / total, for URL sources. */
  onProgress?: (loaded: number, total: number) => void;
}

/** Ranged reads straight from a local File, so big PDFs are never loaded whole. */
class BlobRangeTransport extends pdfjs.PDFDataRangeTransport {
  constructor(private readonly blob: Blob) {
    super(blob.size, null);
  }

  override requestDataRange(begin: number, end: number) {
    this.blob
      .slice(begin, end)
      .arrayBuffer()
      .then((buffer) => this.onDataRange(begin, new Uint8Array(buffer)))
      .catch(() => this.abort());
  }
}

const RANGE_CHUNK = 256 * 1024;

export async function openPdf(input: PdfInput, options: OpenPdfOptions = {}): Promise<PdfSource> {
  const common = {
    ...pdfjsDataUrls(),
    rangeChunkSize: RANGE_CHUNK,
    disableAutoFetch: true,
    isEvalSupported: false,
    enableXfa: false,
  };
  const task =
    'file' in input
      ? pdfjs.getDocument({ ...common, range: new BlobRangeTransport(input.file) })
      : pdfjs.getDocument({ ...common, url: input.url });

  if (options.onProgress) {
    const report = options.onProgress;
    task.onProgress = ({ loaded, total }: { loaded: number; total: number }) =>
      report(loaded, total);
  }

  let cancelled = false;
  task.onPassword = (update: (password: string) => void, reason: number) => {
    const prompt = options.onPassword;
    const kind = reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD ? 'incorrect' : 'required';
    if (!prompt) {
      cancelled = true;
      void task.destroy();
      return;
    }
    void prompt(kind).then((password) => {
      if (password === null) {
        cancelled = true;
        void task.destroy();
      } else {
        update(password);
      }
    });
  };

  let doc: PDFDocumentProxy;
  try {
    doc = await task.promise;
  } catch (error) {
    if (cancelled) throw new SourceError('password-cancelled', 'Password prompt cancelled', error);
    throw toSourceError(error);
  }
  if (doc.numPages === 0) {
    await task.destroy();
    throw new SourceError('empty', 'The PDF has no pages');
  }
  const source = new PdfSource(doc, task);
  await source.loadInitialSizes();
  return source;
}

function toSourceError(error: unknown): SourceError {
  if (error instanceof pdfjs.InvalidPDFException) {
    return new SourceError('invalid', 'Not a valid PDF', error);
  }
  if (error instanceof pdfjs.ResponseException) {
    return new SourceError('http', 'The server refused the file', error);
  }
  // fetch() rejects with a bare TypeError for CORS and offline failures.
  if (
    error instanceof TypeError ||
    (error instanceof Error && /fetch|network/i.test(error.message))
  ) {
    return new SourceError('network', 'Could not download the file', error);
  }
  return new SourceError(
    'invalid',
    error instanceof Error ? error.message : 'Unknown PDF error',
    error,
  );
}

export class PdfSource implements PageSource {
  readonly kind = 'pdf' as const;
  readonly id: string;
  readonly pageCount: number;
  private sizes: (PageSize | undefined)[];
  private fallbackSize: PageSize = { width: 595, height: 842 };
  private sizeListeners = new Set<() => void>();

  constructor(
    private readonly doc: PDFDocumentProxy,
    private readonly task: PDFDocumentLoadingTask,
  ) {
    this.pageCount = doc.numPages;
    this.id = `pdf:${doc.fingerprints[0] ?? 'unknown'}`;
    this.sizes = new Array<PageSize | undefined>(doc.numPages).fill(undefined);
  }

  /** The first pages drive the book's proportions and spread detection. */
  async loadInitialSizes() {
    const count = Math.min(3, this.pageCount);
    for (let i = 0; i < count; i++) await this.loadSize(i);
    const first = this.sizes[0];
    if (first) this.fallbackSize = first;
  }

  private async loadSize(index: number): Promise<PageSize> {
    const known = this.sizes[index];
    if (known) return known;
    const page = await this.doc.getPage(index + 1);
    const viewport = page.getViewport({ scale: 1 });
    const size = { width: viewport.width, height: viewport.height };
    this.sizes[index] = size;
    for (const listener of this.sizeListeners) listener();
    return size;
  }

  getPageSize(index: number): PageSize {
    return this.sizes[index] ?? this.fallbackSize;
  }

  knownPageSize(index: number): PageSize | undefined {
    return this.sizes[index];
  }

  onSizesChanged(listener: () => void) {
    this.sizeListeners.add(listener);
    return () => this.sizeListeners.delete(listener);
  }

  async render(
    index: number,
    target: RenderTarget,
    signal: AbortSignal,
  ): Promise<HTMLCanvasElement> {
    if (signal.aborted) throw new SourceError('aborted', 'Render aborted');
    const page = await this.doc.getPage(index + 1);
    const base = page.getViewport({ scale: 1 });
    const scale = target.width / base.width;
    const region = target.region;
    const fullWidth = base.width * scale;
    const fullHeight = base.height * scale;
    const viewport = page.getViewport({
      scale,
      offsetX: region ? -region.x * fullWidth : 0,
      offsetY: region ? -region.y * fullHeight : 0,
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(region ? region.width * fullWidth : fullWidth));
    canvas.height = Math.max(1, Math.round(region ? region.height * fullHeight : fullHeight));

    const task = page.render({ canvas, viewport, background: '#ffffff' });
    const onAbort = () => task.cancel();
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      await task.promise;
    } catch (error) {
      releaseCanvas(canvas);
      if (signal.aborted) throw new SourceError('aborted', 'Render aborted', error);
      throw error;
    } finally {
      signal.removeEventListener('abort', onAbort);
      page.cleanup();
    }
    if (!this.sizes[index]) {
      this.sizes[index] = { width: base.width, height: base.height };
      for (const listener of this.sizeListeners) listener();
    }
    return canvas;
  }

  private textCache = new Map<number, Promise<unknown>>();

  async renderTextLayer(
    index: number,
    container: HTMLElement,
    cssWidth: number,
    signal: AbortSignal,
  ) {
    const page = await this.doc.getPage(index + 1);
    if (signal.aborted) return;
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: cssWidth / base.width });
    let text = this.textCache.get(index);
    if (!text) {
      text = page.getTextContent();
      this.textCache.set(index, text);
      // Keep only a few pages of text around.
      if (this.textCache.size > 8)
        this.textCache.delete(this.textCache.keys().next().value as number);
    }
    const content = (await text) as Awaited<ReturnType<typeof page.getTextContent>>;
    if (signal.aborted) return;
    container.style.setProperty('--total-scale-factor', String(viewport.scale));
    container.style.setProperty('--scale-round-x', '1px');
    container.style.setProperty('--scale-round-y', '1px');
    const layer = new pdfjs.TextLayer({ textContentSource: content, container, viewport });
    signal.addEventListener('abort', () => layer.cancel(), { once: true });
    await layer.render().catch(() => undefined);
  }

  async getLinks(index: number): Promise<PageLink[]> {
    const page = await this.doc.getPage(index + 1);
    const viewport = page.getViewport({ scale: 1 });
    const annotations = (await page.getAnnotations({ intent: 'display' }).catch(() => [])) as {
      subtype?: string;
      rect?: number[];
      url?: string;
      dest?: string | unknown[] | null;
    }[];
    const links: PageLink[] = [];
    for (const annotation of annotations) {
      if (annotation.subtype !== 'Link' || !annotation.rect) continue;
      const [ax, ay, bx, by] = annotation.rect as [number, number, number, number];
      const [x1, y1] = viewport.convertToViewportPoint(ax, ay) as [number, number];
      const [x2, y2] = viewport.convertToViewportPoint(bx, by) as [number, number];
      const rect = {
        x: Math.min(x1, x2) / viewport.width,
        y: Math.min(y1, y2) / viewport.height,
        width: Math.abs(x2 - x1) / viewport.width,
        height: Math.abs(y2 - y1) / viewport.height,
      };
      if (annotation.url && /^(https?:|mailto:)/i.test(annotation.url)) {
        links.push({ rect, url: annotation.url });
      } else if (annotation.dest) {
        const pageIndex = await this.resolveDest(annotation.dest);
        if (pageIndex !== null) links.push({ rect, pageIndex });
      }
    }
    return links;
  }

  private async resolveDest(dest: string | unknown[]): Promise<number | null> {
    try {
      const explicit = typeof dest === 'string' ? await this.doc.getDestination(dest) : dest;
      const ref = explicit?.[0];
      if (ref === undefined || ref === null) return null;
      if (typeof ref === 'number') return ref;
      return await this.doc.getPageIndex(ref as Parameters<PDFDocumentProxy['getPageIndex']>[0]);
    } catch {
      return null;
    }
  }

  async getMetadata(): Promise<BookMetadata> {
    const [{ info }, preferences] = await Promise.all([
      this.doc.getMetadata().catch(() => ({ info: {} })),
      this.doc.getViewerPreferences().catch(() => null),
    ]);
    const record = (info ?? {}) as Record<string, unknown>;
    const text = (key: string) => {
      const value = record[key];
      return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    };
    const direction = readDirection(preferences);
    const metadata: BookMetadata = {};
    const title = text('Title');
    const author = text('Author');
    const date = text('CreationDate');
    if (title) metadata.title = title;
    if (author) metadata.author = author;
    if (date) metadata.date = parsePdfYear(date);
    if (direction) metadata.direction = direction;
    return metadata;
  }

  async getOutline(): Promise<OutlineItem[]> {
    const outline = await this.doc.getOutline().catch(() => null);
    if (!outline) return [];
    type RawItem = { title: string; dest: string | unknown[] | null; items: RawItem[] };
    const resolve = (dest: RawItem['dest']) =>
      dest ? this.resolveDest(dest) : Promise.resolve(null);
    const walk = async (items: RawItem[]): Promise<OutlineItem[]> =>
      Promise.all(
        items.map(async (item) => ({
          title: item.title,
          pageIndex: await resolve(item.dest),
          children: await walk(item.items ?? []),
        })),
      );
    return walk(outline as RawItem[]);
  }

  async destroy() {
    this.sizeListeners.clear();
    this.textCache.clear();
    await this.task.destroy();
  }
}

function readDirection(preferences: unknown): 'ltr' | 'rtl' | undefined {
  if (!preferences) return undefined;
  const value =
    preferences instanceof Map
      ? preferences.get('Direction')
      : (preferences as Record<string, unknown>)['Direction'];
  if (value === 'R2L') return 'rtl';
  if (value === 'L2R') return 'ltr';
  return undefined;
}

/** "D:19200101000000Z" → "1920". */
export function parsePdfYear(raw: string): string {
  const match = raw.match(/^(?:D:)?(\d{4})/);
  return match?.[1] ?? raw;
}

/** Shrinks a canvas to nothing so WebKit frees its backing store right away. */
export function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}
