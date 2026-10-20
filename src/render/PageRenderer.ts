import type { PageRegion, PageSize, PageSource } from '../sources/types';
import { previewSize, SCALE_STEP, sharpSize, type PixelSize, type RenderBudget } from './budget';
import { encodeCanvas, scaleCanvas, type EncodedImage } from './encode';
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
  /** Where the reader is heading (next spreads, nearest first): rendered sharp right after. */
  ahead: PageRef[];
  /** Where the reader came from: sharp, lower priority. */
  behind: PageRef[];
  /** Nearby pages that only need a preview, the ones ahead first. */
  nearby: PageRef[];
}

const PREVIEW_QUALITY = 0.7;
const SHARP_QUALITY = 0.86;
/**
 * A separate preview only pays off when it renders much faster than the sharp
 * page. In image-heavy files (comics, scans) both pay for decoding the full
 * embedded image, so there the sharp render makes the preview too.
 */
const PREVIEW_PAYS_RATIO = 0.6;

export function refKey(ref: PageRef): string {
  return ref.half ? `${ref.page}${ref.half === 'left' ? 'L' : 'R'}` : `${ref.page}`;
}

/** Sharp cache keys are `<ref>@<width>`; each page keeps at most one. */
function sharpPrefix(ref: PageRef) {
  return `${refKey(ref)}@`;
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
  /** Refs on screen: their sharp images are never evicted. */
  private pinned = new Set<string>();
  /** Refs of the turn in progress: also never evicted until it lands. */
  private turnPinned = new Set<string>();
  /**
   * How far each planned ref is from the reader, in planning order: the way
   * ahead counts as nearer than the way back. Over budget, the farthest goes.
   */
  private distance = new Map<string, number>();
  /** Sharp keys holding the file's own image: nothing sharper can come from a render. */
  private originals = new Set<string>();
  /** Sharp pages and zoom tiles as PNG instead of JPEG (lossless option, 18b). */
  private lossless = false;
  /** Sharp keys stored as PNG. */
  private losslessKeys = new Set<string>();
  private destroyed = false;
  /** Running average of how long the source takes per tier, in ms. */
  private cost: Record<Tier, number> = { preview: 0, sharp: 0 };

  constructor(
    private readonly source: PageSource,
    private readonly budget: RenderBudget,
    private readonly pixelRatio: () => number = () => window.devicePixelRatio || 1,
    private readonly scaleStep = SCALE_STEP,
  ) {
    this.previews = new PageCache(Math.round(budget.maxCacheBytes / 4));
    this.sharp = new PageCache(budget.maxCacheBytes, undefined, (key) =>
      this.distanceOf(key.slice(0, key.indexOf('@'))),
    );
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
    this.display = { width: size.width, height: size.height };
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Lossless pages from now on. The pages kept as JPEG stay on screen until
   * their PNG replaces them (re-plan to ask for it); turning it off keeps the
   * PNG ones, which are no worse.
   */
  setLossless(on: boolean) {
    this.lossless = on;
  }

  /** Preview if there is one (small and quick to decode), else the sharp image. */
  getThumbnail(ref: PageRef): string | undefined {
    return (this.previews.peek(refKey(ref)) ?? this.sharp.findByPrefix(sharpPrefix(ref)))?.url;
  }

  /** Sharp image if ready, else the preview, else nothing yet. */
  getImage(ref: PageRef): PageImage | undefined {
    const key = refKey(ref);
    const sharp = this.sharp.findByPrefix(sharpPrefix(ref));
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
    this.pinned = new Set(plan.visible.map(refKey));
    this.distance = new Map();

    // Pages that get a sharp render only need their own preview job when previews are cheap.
    const previewFirst = this.previewsPay;
    plan.visible.forEach((ref, i) => {
      if (previewFirst) this.requestPreview(ref, i, wantedPreview);
      this.requestSharp(ref, 10 + i, wantedSharp);
    });
    plan.ahead.forEach((ref, i) => {
      if (previewFirst) this.requestPreview(ref, 20 + i, wantedPreview);
      this.requestSharp(ref, 30 + i, wantedSharp);
    });
    if (previewFirst)
      plan.behind.forEach((ref, i) => this.requestPreview(ref, 40 + i, wantedPreview));
    // Cheap previews of the pages ahead come before the sharp page behind.
    plan.nearby.forEach((ref, i) => this.requestPreview(ref, 45 + i, wantedPreview));
    plan.behind.forEach((ref, i) => this.requestSharp(ref, 70 + i, wantedSharp));

    // Queued work the plan no longer asks for is dropped. A preview job stays
    // only if a preview is still wanted: once the page is wanted sharp, the
    // sharp render makes its preview.
    this.queue.retain(
      (key) =>
        key.startsWith('thumb:') || (key.includes('@') ? wantedSharp : wantedPreview).has(key),
    );
    // Sharp images far from the reader are dropped right away; previews stay
    // (they are tiny and double as thumbnails) until their own budget is hit.
    this.sharp.retain((key) => {
      const ref = key.slice(0, key.indexOf('@'));
      return wantedSharp.has(ref) || this.turnPinned.has(ref);
    });
  }

  /** Pages of the turn in progress (none once it lands): kept until it ends. */
  pinTurn(refs: PageRef[]) {
    this.turnPinned = new Set(refs.map(refKey));
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
        const image = await encodeCanvas(canvas, SHARP_QUALITY, this.sharpType);
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
      previewMs: Math.round(this.cost.preview),
      sharpMs: Math.round(this.cost.sharp),
    };
  }

  destroy() {
    this.destroyed = true;
    this.queue.clear();
    this.previews.clear();
    this.sharp.clear();
    this.tiles.clear();
    this.originals.clear();
    this.losslessKeys.clear();
    this.listeners.clear();
  }

  private get sharpType() {
    return this.lossless ? 'image/png' : 'image/jpeg';
  }

  /** A sharp image good enough to keep: big enough, and lossless when that's asked for. */
  private serves(existing: CachedImage, size: PixelSize) {
    if (this.originals.has(existing.key)) return true;
    if (this.lossless && !this.losslessKeys.has(existing.key)) return false;
    return existing.width >= size.width;
  }

  private isPinned(ref: string) {
    return this.pinned.has(ref) || this.turnPinned.has(ref);
  }

  /** Unplanned refs are the farthest of all. */
  private distanceOf(ref: string) {
    if (this.isPinned(ref)) return -1;
    return this.distance.get(ref) ?? Infinity;
  }

  private get previewsPay() {
    // The file's own images are ready almost at once; a rendered preview would only delay them.
    if (this.source.original) return false;
    const { preview, sharp } = this.cost;
    return !preview || !sharp || preview < sharp * PREVIEW_PAYS_RATIO;
  }

  /** Device-pixel size a sharp render of `ref` needs right now (on the scale ladder). */
  private sharpTarget(ref: PageRef): PixelSize {
    const page = this.sizeOf(ref);
    // Fit the page inside the slot, then apply the pixel-ratio and canvas limits.
    const fit = Math.min(this.display.width / page.width, this.display.height / page.height);
    const shown = { width: page.width * fit, height: page.height * fit };
    return sharpSize(page, shown, this.pixelRatio(), this.budget, this.scaleStep);
  }

  private requestPreview(ref: PageRef, priority: number, wanted: Set<string>) {
    const key = refKey(ref);
    wanted.add(key);
    if (this.previews.get(key) || this.failures.has(key)) return;
    this.queue.schedule({ key, priority, run: (signal) => this.renderPreview(ref, signal) });
  }

  /**
   * Never worse: a sharp image at least as big as needed is reused as is
   * (one per page), and a smaller one stays on screen until its successor lands.
   */
  private requestSharp(ref: PageRef, priority: number, wanted: Set<string>) {
    const prefix = sharpPrefix(ref);
    wanted.add(refKey(ref));
    if (!this.distance.has(refKey(ref))) this.distance.set(refKey(ref), priority);
    const size = this.sharpTarget(ref);
    const existing = this.sharp.findByPrefix(prefix);
    if (existing && this.serves(existing, size)) {
      this.sharp.get(existing.key);
      return;
    }
    if (this.failures.has(refKey(ref))) return;
    const key = `${prefix}${size.width}`;
    wanted.add(key);
    this.queue.schedule({ key, priority, run: (signal) => this.renderSharp(ref, size, signal) });
  }

  private async renderPreview(ref: PageRef, signal: AbortSignal) {
    // A sharp render may have made it since this job was queued.
    if (this.previews.peek(refKey(ref))) return;
    const size = previewSize(this.sizeOf(ref), this.budget);
    await this.renderInto(ref, size, 'preview', signal, {
      store: (image) => this.previews.set(refKey(ref), image.blob, image.width, image.height),
    });
  }

  private async renderSharp(ref: PageRef, size: PixelSize, signal: AbortSignal) {
    const key = refKey(ref);
    if (await this.storeOriginal(ref, size, signal)) return;
    await this.renderInto(ref, size, 'sharp', signal, {
      // Shrinking the sharp page is far cheaper than rendering a preview.
      derive: async (canvas) => {
        if (this.previews.peek(key)) return;
        const small = scaleCanvas(canvas, previewSize(this.sizeOf(ref), this.budget));
        const preview = await encodeCanvas(small, PREVIEW_QUALITY);
        if (!signal.aborted && !this.destroyed)
          this.previews.set(key, preview.blob, preview.width, preview.height);
      },
      store: (image) =>
        this.storeSharp(ref, size, image, image.blob.type === 'image/png' ? 'png' : 'jpeg'),
    });
  }

  /** Replaces the smaller version this page had, if any. */
  private storeSharp(
    ref: PageRef,
    size: PixelSize,
    image: EncodedImage,
    kind: 'original' | 'png' | 'jpeg',
  ) {
    const prefix = sharpPrefix(ref);
    const key = `${prefix}${size.width}`;
    this.sharp.retain((k) => !k.startsWith(prefix));
    for (const set of [this.originals, this.losslessKeys])
      for (const k of set) if (k.startsWith(prefix)) set.delete(k);
    const pinned = new Set(
      this.sharp.keys().filter((k) => this.isPinned(k.slice(0, k.indexOf('@')))),
    );
    this.sharp.set(key, image.blob, image.width, image.height, pinned);
    if (kind === 'original') this.originals.add(key);
    if (kind === 'png') this.losslessKeys.add(key);
  }

  /**
   * Keeps the file's own image as the sharp page when the source has one and
   * it isn't too big to show as is: lossless, and no decode, draw and
   * re-encode. False means it has to be rendered instead.
   */
  private async storeOriginal(ref: PageRef, size: PixelSize, signal: AbortSignal) {
    if (!this.source.original || ref.half) return false;
    const original = await this.source.original(ref.page, signal).catch(() => undefined);
    if (signal.aborted || this.destroyed) return true;
    if (!original || original.width * original.height > this.budget.maxOriginalPixels) return false;
    this.storeSharp(ref, size, original, 'original');
    this.emit(refKey(ref));
    return true;
  }

  private async renderInto(
    ref: PageRef,
    size: PixelSize,
    tier: Tier,
    signal: AbortSignal,
    steps: {
      /** Runs on the rendered canvas before it is compressed (and released). */
      derive?: (canvas: HTMLCanvasElement) => Promise<void>;
      store: (image: EncodedImage) => void;
    },
  ) {
    const region = regionOf(ref);
    // For a half page, render the full sheet width so the half lands at `size`.
    const target = region
      ? { width: size.width * 2, height: size.height, region }
      : { width: size.width, height: size.height };
    try {
      const started = performance.now();
      const canvas = await this.source.render(ref.page, target, signal);
      if (signal.aborted || this.destroyed) {
        canvas.width = canvas.height = 0;
        return;
      }
      const took = performance.now() - started;
      this.cost[tier] = this.cost[tier] ? this.cost[tier] * 0.7 + took * 0.3 : took;
      await steps.derive?.(canvas);
      const image =
        tier === 'sharp'
          ? await encodeCanvas(canvas, SHARP_QUALITY, this.sharpType)
          : await encodeCanvas(canvas, PREVIEW_QUALITY);
      if (signal.aborted || this.destroyed) return;
      steps.store(image);
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
