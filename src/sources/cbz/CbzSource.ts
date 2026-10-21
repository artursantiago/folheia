import { unzipRaw, BlobReader, type Reader, type ZipEntry } from 'unzipit';
import { contentDigest } from '../digest';
import { HttpRangeReader } from '../http';
import {
  SourceError,
  type BookMetadata,
  type OutlineItem,
  type OriginalImage,
  type PageSize,
  type PageSource,
  type RenderTarget,
} from '../types';
import { parseComicInfo, type ComicInfo } from './comicInfo';
import { imageSize } from './imageSize';

const IMAGE = /\.(jpe?g|png|gif|webp|avif|jxl|bmp)$/i;
const JUNK = /(^|\/)(__MACOSX\/|\._|\.DS_Store$|Thumbs\.db$|desktop\.ini$)/i;
const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  jxl: 'image/jxl',
  bmp: 'image/bmp',
};
/** Formats shown as is (no GIF: it would animate; JXL and BMP aren't everywhere). */
const DISPLAYABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const HEADER_BYTES = 64 * 1024;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export type CbzInput = { file: File | Blob; name?: string } | { url: string; length: number };

/** The page images of an archive, in reading order, without junk files. */
export function pageEntries<T extends { name: string; isDirectory: boolean }>(entries: T[]): T[] {
  return entries
    .filter((entry) => !entry.isDirectory && IMAGE.test(entry.name) && !JUNK.test(entry.name))
    .sort((a, b) => collator.compare(a.name, b.name));
}

/**
 * Keeps the last bytes `reader` reads until stopped. While unzipit opens an
 * archive its last read is the central directory, which identifies the book
 * (see openCbz). Only `read` is wrapped, so the reader keeps its faster paths.
 */
function recordReads(reader: Reader) {
  const read = reader.read.bind(reader);
  const recorder = {
    last: undefined as Uint8Array<ArrayBuffer> | undefined,
    stop: () => void (reader.read = read),
  };
  reader.read = async (offset, size) => (recorder.last = await read(offset, size));
  return recorder;
}

/** Ids the same archive had before the central directory hash (progress memory). */
function legacyIds(input: CbzInput): string[] {
  if (!('file' in input)) return [`cbz:${input.url}`];
  const file = input.file as Partial<File> & Blob;
  return [`cbz:${input.name ?? file.name ?? ''}:${input.file.size}:${file.lastModified ?? 0}`];
}

export async function openCbz(input: CbzInput): Promise<CbzSource> {
  const reader: Reader =
    'file' in input ? new BlobReader(input.file) : new HttpRangeReader(input.url, input.length);
  const recorder = recordReads(reader);
  let entries: ZipEntry[];
  try {
    ({ entries } = await unzipRaw(reader));
    recorder.stop();
  } catch (error) {
    if (error instanceof SourceError) throw error;
    throw new SourceError('invalid', 'Not a valid ZIP archive', error);
  }
  if (entries.some((entry) => entry.encrypted)) {
    throw new SourceError(
      'unsupported-format',
      'Password-protected archives are not supported',
      'encrypted-zip',
    );
  }
  const infoEntry = entries.find((entry) => /(^|\/)comicinfo\.xml$/i.test(entry.name));
  const info = infoEntry ? parseComicInfo(await infoEntry.text().catch(() => '')) : undefined;
  let pages = pageEntries(entries);
  // ComicInfo page indices follow the image order; trust them only when the counts agree.
  const infoMatches = info && (!info.pageCount || info.pageCount === pages.length);
  const deleted = infoMatches ? info.deletedPages : new Set<number>();
  const doubles = infoMatches ? info.doublePages : new Set<number>();
  const kept = pages.map((entry, i) => ({
    entry,
    double: doubles.has(i),
    deleted: deleted.has(i),
  }));
  const visible = kept.filter((page) => !page.deleted);
  pages = visible.map((page) => page.entry);
  if (pages.length === 0) throw new SourceError('empty', 'No page images in the archive');

  // The book's identity is a hash of the ZIP's central directory (every
  // entry's name, size and CRC): cheap, and the same whatever the file name,
  // date or where it came from.
  const id = `cbz:${await contentDigest(recorder.last ?? new Uint8Array())}`;
  const source = new CbzSource(
    id,
    legacyIds(input),
    pages,
    new Set(visible.flatMap((page, i) => (page.double ? [i] : []))),
    info,
  );
  await source.measure(0, Math.min(3, pages.length));
  // Local files are cheap to read: measure the rest in the background.
  if ('file' in input) void source.measure(3, pages.length);
  return source;
}

export class CbzSource implements PageSource {
  readonly kind = 'cbz' as const;
  readonly pageCount: number;
  private sizes: (PageSize | undefined)[];
  private listeners = new Set<() => void>();
  private destroyed = false;

  constructor(
    readonly id: string,
    readonly legacyIds: readonly string[],
    private readonly entries: ZipEntry[],
    private readonly doubles: Set<number>,
    private readonly info: ComicInfo | undefined,
  ) {
    this.pageCount = entries.length;
    this.sizes = new Array<PageSize | undefined>(entries.length).fill(undefined);
  }

  private mime(index: number) {
    const ext = this.entries[index]?.name.split('.').pop()?.toLowerCase() ?? '';
    return MIME[ext] ?? 'application/octet-stream';
  }

  /** Reads image headers to learn page sizes without decoding pixels. */
  async measure(from: number, to: number) {
    let changed = false;
    for (let i = from; i < to && !this.destroyed; i++) {
      if (this.sizes[i]) continue;
      const entry = this.entries[i];
      if (!entry) continue;
      try {
        const blob = await entry.blob();
        const head = new Uint8Array(await blob.slice(0, HEADER_BYTES).arrayBuffer());
        const size = imageSize(head);
        if (size && size.width > 0 && size.height > 0) {
          this.sizes[i] = size;
          changed = true;
        }
      } catch {
        // Unreadable entry: it will fail visibly when rendered.
      }
      if (changed && (i - from) % 16 === 15) {
        this.emit();
        changed = false;
      }
    }
    if (changed) this.emit();
  }

  getPageSize(index: number): PageSize {
    return this.sizes[index] ?? this.sizes[0] ?? { width: 1000, height: 1500 };
  }

  knownPageSize(index: number): PageSize | undefined {
    return this.sizes[index];
  }

  /** Two-page images: from ComicInfo, or wider than tall. */
  isWidePage(index: number): boolean {
    if (this.doubles.has(index)) return true;
    const size = this.sizes[index];
    return size ? size.width > size.height * 1.1 : false;
  }

  onSizesChanged(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  async original(index: number, signal: AbortSignal): Promise<OriginalImage | undefined> {
    const entry = this.entries[index];
    const type = this.mime(index);
    if (!entry || !DISPLAYABLE.has(type)) return undefined;
    // Stored (uncompressed) entries come back as a slice of the file: no copy.
    const blob = await entry.blob(type);
    if (signal.aborted) throw new SourceError('aborted', 'Render aborted');
    let size = this.sizes[index];
    if (!size) {
      // A header we can't read means a page we can't trust to decode: render it instead.
      size = imageSize(new Uint8Array(await blob.slice(0, HEADER_BYTES).arrayBuffer()));
      if (!size || size.width <= 0 || size.height <= 0) return undefined;
      this.sizes[index] = size;
      this.emit();
    }
    return { blob, ...size };
  }

  async render(
    index: number,
    target: RenderTarget,
    signal: AbortSignal,
  ): Promise<HTMLCanvasElement> {
    const entry = this.entries[index];
    if (!entry) throw new SourceError('invalid', `No page ${index}`);
    if (signal.aborted) throw new SourceError('aborted', 'Render aborted');
    // Stored (uncompressed) entries come back as a slice of the file: no copy.
    const blob = await entry.blob(this.mime(index));
    if (signal.aborted) throw new SourceError('aborted', 'Render aborted');
    const bitmap = await createImageBitmap(blob);
    try {
      if (!this.sizes[index]) {
        this.sizes[index] = { width: bitmap.width, height: bitmap.height };
        this.emit();
      }
      const region = target.region ?? { x: 0, y: 0, width: 1, height: 1 };
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(target.width * region.width));
      canvas.height = Math.max(1, Math.round(target.height * region.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2D context');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        bitmap,
        region.x * bitmap.width,
        region.y * bitmap.height,
        region.width * bitmap.width,
        region.height * bitmap.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      return canvas;
    } finally {
      bitmap.close();
    }
  }

  async getMetadata(): Promise<BookMetadata> {
    return this.info?.metadata ?? {};
  }

  async getOutline(): Promise<OutlineItem[]> {
    return [];
  }

  async destroy() {
    this.destroyed = true;
    this.listeners.clear();
  }
}
