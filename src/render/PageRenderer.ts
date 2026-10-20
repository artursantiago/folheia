import type { PageRegion, PageSize, PageSource } from '../sources/types';
import { previewSize, sharpSize, type PixelSize, type RenderBudget } from './budget';
import { encodeCanvas } from './encode';
import { PageCache, type CachedImage } from './PageCache';
import { RenderQueue } from './RenderQueue';

/** A physical page, or one half of it when the PDF stores two pages per sheet. */
export interface PageRef {
  page: number;
  half?: 'left' | 'right' | undefined;
}

export type Tier = 'preview' | 'sharp';

export interface PageImage extends CachedImage {
  tier: Tier;
}

export interface FocusPlan {
  /** On screen now: highest priority, never evicted. */
  visible: PageRef[];
  /** Where the reader is heading (next spread): rendered sharp right after. */
  ahead: PageRef[];
  /** Where the reader came from: sharp, lower priority. */
  behind: PageRef[];
  /** Nearby pages that only need a preview. */
  nearby: PageRef[];
}

const PREVIEW_QUALITY = 0.7;
const SHARP_QUALITY = 0.86;
/** Sizes are bucketed so small resizes don't trigger re-renders. */
const SIZE_STEP = 64;

export function refKey(ref: PageRef): string {
  return ref.half ? `${ref.page}${ref.half === 'left' ? 'L' : 'R'}` : `${ref.page}`;
}

function regionOf(ref: PageRef): PageRegion | undefined {
  if (!ref.half) return undefined;
  return { x: ref.half === 'left' ? 0 : 0.5, y: 0, width: 0.5, height: 1 };
}

type Listener = (key: string) => void;

/**
 * Turns page requests into compressed images, keeping memory bounded:
 * a preview first, then the sharp version, only for pages near the reader.
 */
export class PageRenderer {
  private queue = new RenderQueue(1);
  private previews: PageCache;
  private sharp: PageCache;
  private tiles: PageCache;
  private listeners = new Set<Listener>();
  private failures = new Set<string>();
  private display: PixelSize = { width: 400, height: 560 };
  private pinned = new Set<string>();
  private destroyed = false;

  constructor(
    private readonly source: PageSource,
    private readonly budget: RenderBudget,
    private readonly pixelRatio: () => number = () => window.devicePixelRatio || 1,
  ) {
    this.previews = new PageCache(Math.round(budget.maxCacheBytes / 4));
    this.sharp = new PageCache(budget.maxCacheBytes);
    // Zoom tiles are large and short-lived: room for about two of them.
    this.tiles = new PageCache(Math.round(budget.maxCacheBytes / 6));
  }

  /** Logical size of a ref (a half page is half as wide). */
  sizeOf(ref: PageRef): PageSize {
    const size = this.source.getPageSize(ref.page);
    return ref.half ? { width: size.width / 2, height: size.height } : size;
  }

  /** CSS-pixel size of one page slot on screen. */
  setDisplaySize(size: PixelSize) {
    const bucket = (n: number) => Math.max(SIZE_STEP, Math.ceil(n / SIZE_STEP) * SIZE_STEP);
    this.display = { width: bucket(size.width), height: bucket(size.height) };
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Sharp image if ready, else the preview, else nothing yet. */
  getImage(ref: PageRef): PageImage | undefined {
    const key = refKey(ref);
    const sharp = this.sharp.peek(this.sharpKey(ref));
    if (sharp) return { ...sharp, tier: 'sharp' };
    const preview = this.previews.peek(key);
    return preview ? { ...preview, tier: 'preview' } : undefined;
  }

  hasFailed(ref: PageRef) {
    return this.failures.has(refKey(ref));
  }

  /** Re-plans all work around what the reader sees now. */
  focus(plan: FocusPlan) {
    const wantedSharp = new Set<string>();
    const wantedPreview = new Set<string>();
    this.pinned = new Set(plan.visible.map((ref) => this.sharpKey(ref)));

    plan.visible.forEach((ref, i) => {
      this.requestPreview(ref, i, wantedPreview);
      this.requestSharp(ref, 10 + i, wantedSharp);
    });
    plan.ahead.forEach((ref, i) => {
      this.requestPreview(ref, 20 + i, wantedPreview);
      this.requestSharp(ref, 30 + i, wantedSharp);
    });
    plan.behind.forEach((ref, i) => {
      this.requestPreview(ref, 40 + i, wantedPreview);
      this.requestSharp(ref, 50 + i, wantedSharp);
    });
    plan.nearby.forEach((ref, i) => this.requestPreview(ref, 60 + i, wantedPreview));

    // Sharp images far from the reader are dropped right away; previews stay
    // (they are tiny and double as thumbnails) until their own budget is hit.
    this.queue.retain(
      (key) => wantedSharp.has(key) || wantedPreview.has(key) || key.startsWith('thumb:'),
    );
    this.sharp.retain((key) => wantedSharp.has(key));
  }

  /** Preview-size image for the thumbnail panel; low priority. */
  requestThumbnail(ref: PageRef) {
    const key = refKey(ref);
    if (this.previews.get(key) || this.failures.has(key)) return;
    this.queue.schedule({
      key: `thumb:${key}`,
      priority: 100,
      run: (signal) => this.renderPreview(ref, signal),
    });
  }

  /**
   * Renders just the visible part of a zoomed page at screen resolution.
   * Only one tile per page is kept; a new request replaces the old one.
   */
  renderTile(ref: PageRef, region: PageRegion, tile: PixelSize, onReady: (url: string) => void) {
    const key = `zoom:${refKey(ref)}`;
    this.queue.cancel(key);
    // Keep within the per-canvas budget.
    const pixels = tile.width * tile.height;
    const shrink =
      pixels > this.budget.maxCanvasPixels ? Math.sqrt(this.budget.maxCanvasPixels / pixels) : 1;
    const width = Math.max(1, Math.floor(tile.width * shrink));
    const height = Math.max(1, Math.floor(tile.height * shrink));
    const half = regionOf(ref);
    // Compose with the half-page region when the sheet holds two pages.
    const sheetRegion = half
      ? {
          x: half.x + region.x * half.width,
          y: region.y,
          width: region.width * half.width,
          height: region.height,
        }
      : region;
    const target = {
      width: width / sheetRegion.width,
      height: height / sheetRegion.height,
      region: sheetRegion,
    };
    this.queue.schedule({
      key,
      priority: -1,
      run: async (signal) => {
        const canvas = await this.source.render(ref.page, target, signal);
        if (signal.aborted || this.destroyed) {
          canvas.width = canvas.height = 0;
          return;
        }
        const image = await encodeCanvas(canvas, SHARP_QUALITY);
        if (signal.aborted || this.destroyed) return;
        const entry = this.tiles.set(key, image.blob, image.width, image.height);
        onReady(entry.url);
      },
    });
  }

  clearTiles() {
    this.queue.retain((key) => !key.startsWith('zoom:'));
    this.tiles.clear();
  }

  pause() {
    this.queue.pause();
  }

  resume() {
    this.queue.resume();
  }

  stats() {
    return {
      previewBytes: this.previews.totalBytes,
      previewCount: this.previews.count,
      sharpBytes: this.sharp.totalBytes,
      sharpCount: this.sharp.count,
      queued: this.queue.size,
    };
  }

  destroy() {
    this.destroyed = true;
    this.queue.clear();
    this.previews.clear();
    this.sharp.clear();
    this.tiles.clear();
    this.listeners.clear();
  }

  private sharpKey(ref: PageRef) {
    return `${refKey(ref)}@${this.display.width}x${this.display.height}`;
  }

  private requestPreview(ref: PageRef, priority: number, wanted: Set<string>) {
    const key = refKey(ref);
    wanted.add(key);
    if (this.previews.get(key) || this.failures.has(key)) return;
    this.queue.schedule({ key, priority, run: (signal) => this.renderPreview(ref, signal) });
  }

  private requestSharp(ref: PageRef, priority: number, wanted: Set<string>) {
    const key = this.sharpKey(ref);
    wanted.add(key);
    if (this.sharp.get(key) || this.failures.has(refKey(ref))) return;
    const display = this.display;
    this.queue.schedule({
      key,
      priority,
      run: (signal) => this.renderSharp(ref, key, display, signal),
    });
  }

  private async renderPreview(ref: PageRef, signal: AbortSignal) {
    const size = previewSize(this.sizeOf(ref), this.budget);
    await this.renderInto(ref, size, PREVIEW_QUALITY, signal, (image) =>
      this.previews.set(refKey(ref), image.blob, image.width, image.height),
    );
  }

  private async renderSharp(ref: PageRef, key: string, display: PixelSize, signal: AbortSignal) {
    const page = this.sizeOf(ref);
    // Fit the page inside the slot, then apply the pixel-ratio and canvas limits.
    const fit = Math.min(display.width / page.width, display.height / page.height);
    const shown = { width: page.width * fit, height: page.height * fit };
    const size = sharpSize(page, shown, this.pixelRatio(), this.budget);
    await this.renderInto(ref, size, SHARP_QUALITY, signal, (image) =>
      this.sharp.set(key, image.blob, image.width, image.height, this.pinned),
    );
  }

  private async renderInto(
    ref: PageRef,
    size: PixelSize,
    quality: number,
    signal: AbortSignal,
    store: (image: { blob: Blob; width: number; height: number }) => void,
  ) {
    const region = regionOf(ref);
    // For a half page, render the full sheet width so the half lands at `size`.
    const target = region
      ? { width: size.width * 2, height: size.height, region }
      : { width: size.width, height: size.height };
    try {
      const canvas = await this.source.render(ref.page, target, signal);
      if (signal.aborted || this.destroyed) {
        canvas.width = canvas.height = 0;
        return;
      }
      const image = await encodeCanvas(canvas, quality);
      if (signal.aborted || this.destroyed) return;
      store(image);
      this.emit(refKey(ref));
    } catch (error) {
      if (signal.aborted || this.destroyed) return;
      this.failures.add(refKey(ref));
      this.emit(refKey(ref));
      console.warn(`[folheia] page ${refKey(ref)} failed to render`, error);
    }
  }

  private emit(key: string) {
    for (const listener of this.listeners) listener(key);
  }
}
