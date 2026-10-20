import {
  buildBook,
  chooseMode,
  detectEmbeddedSpreads,
  pageTotal,
  spreadForLabel,
  spreadLabel,
  type Book,
} from '../layout/book';
import { createStore, type Store } from '../lib/store';
import { Flip2D } from '../flip/Flip2D';
import type { FlipEngine, FlipHost } from '../flip/types';
import type { RenderBudget } from '../render/budget';
import { PageRenderer, type PageRef } from '../render/PageRenderer';
import type { PageSize, PageSource, ReadingDirection } from '../sources/types';
import { ZoomController } from './ZoomController';

import type { LayoutPreference } from '../storage/preferences';

export type { LayoutPreference };

/** How many pages each way get a preview ready for quick leafing. */
const PREVIEW_PAGES = 6;

export interface ReaderOptions {
  layout: LayoutPreference;
  coverAlone: boolean;
  /** Explicit reading direction; undefined follows the file's own hint. */
  direction: ReadingDirection | undefined;
  hoverPeek: boolean;
  /** Sharp pages and zoom tiles kept as PNG (backlog 18b). */
  lossless: boolean;
}

export interface ReaderState {
  spread: number;
  spreadCount: number;
  /** Visible page labels, e.g. "12–13". */
  label: string;
  /** First visible page number (for deep links and "continue reading"). */
  page: number;
  total: number;
  mode: 'single' | 'double';
  direction: ReadingDirection;
  flipping: boolean;
  atStart: boolean;
  atEnd: boolean;
  /** Embedded two-page sheets were detected and split. */
  splitSpreads: boolean;
  /** 1 = fit; up to 4. */
  zoom: number;
  /** Most pages are long vertical strips (webtoon). */
  tallStrips: boolean;
}

export interface ReaderConfig {
  source: PageSource;
  container: HTMLElement;
  budget: RenderBudget;
  options: ReaderOptions;
  /** Direction found in the file (PDF viewer preferences, ComicInfo). */
  fileDirection?: ReadingDirection | undefined;
  /** 1-based page to open at. */
  initialPage?: number | undefined;
  pageLabel: (page: number) => string;
  /** Shown on pages that can't be drawn. */
  failedText?: string;
}

/**
 * Wires a page source, the layout, the renderer and the flip engine together.
 * Framework-free: the React UI only calls its methods and reads `state`.
 */
export class Reader {
  readonly state: Store<ReaderState>;
  private renderer: PageRenderer;
  private flip: FlipEngine;
  private book!: Book;
  private options: ReaderOptions;
  private splitSpreads: boolean;
  private viewport: PageSize = { width: 0, height: 0 };
  private resizeObserver: ResizeObserver;
  private zoomer: ZoomController;
  private disposers: (() => void)[] = [];
  private refreshQueued = false;

  constructor(private readonly config: ReaderConfig) {
    const { source, container, budget } = config;
    this.options = config.options;
    this.splitSpreads =
      source.kind === 'pdf' &&
      detectEmbeddedSpreads((i) => source.knownPageSize(i), source.pageCount);
    this.renderer = new PageRenderer(source, budget);
    this.renderer.setLossless(this.options.lossless);
    this.flip = new Flip2D(container);
    this.flip.setHoverPeek(this.options.hoverPeek);

    this.viewport = { width: container.clientWidth, height: container.clientHeight };
    this.book = this.build(this.resolveMode());
    const startSpread = config.initialPage ? spreadForLabel(this.book, config.initialPage) : 0;
    this.state = createStore(this.snapshot(startSpread, false));
    this.flip.setBook(this.host(), startSpread);
    this.applySize();

    this.disposers.push(
      this.renderer.subscribe(() => this.queueRefresh()),
      this.flip.onChange((spread) => {
        this.zoomer.reset();
        this.state.set(this.snapshot(spread, this.flip.isFlipping));
        this.plan();
      }),
      this.flip.onFlipStateChange((flipping) => {
        // The pages of a turn stay cached until it lands, whatever the budget.
        this.renderer.pinTurn(this.flip.turning.flatMap((spread) => this.refs(spread)));
        if (flipping) this.renderer.pause();
        else this.renderer.resume();
        this.state.set((s) => ({ ...s, flipping }));
      }),
    );

    this.zoomer = new ZoomController(container, {
      apply: (scale, x, y) => {
        this.flip.setZoom(scale, x, y);
        this.flip.clearTiles();
        this.renderer.clearTiles();
        this.flip.setInteractive(scale === 1);
        const wasZoomed = this.state.get().zoom > 1;
        if (this.state.get().zoom !== scale) this.state.set((s) => ({ ...s, zoom: scale }));
        // Zoom tiles are big: while zoomed in, the neighbors give their memory back,
        // and the pages on screen stay decoded so each new tile only paints.
        if (wasZoomed !== scale > 1) {
          this.keepVisibleDecoded(scale > 1);
          this.plan();
        }
      },
      settle: () => this.renderTiles(),
      takeOver: () => this.flip.cancelGesture(),
    });

    this.disposers.push(source.onSizesChanged(this.onSizesChanged));
    this.updateTallStrips();

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);
    this.plan();
  }

  next() {
    this.flip.next();
  }

  prev() {
    this.flip.prev();
  }

  first() {
    void this.flip.goTo(0, { animate: false });
  }

  last() {
    void this.flip.goTo(this.book.spreads.length - 1, { animate: false });
  }

  goToPage(page: number) {
    void this.flip.goTo(spreadForLabel(this.book, page));
  }

  zoomIn() {
    this.zoomer.zoomIn();
  }

  zoomOut() {
    this.zoomer.zoomOut();
  }

  zoomReset() {
    this.zoomer.reset();
  }

  setOptions(patch: Partial<ReaderOptions>) {
    const before = this.options;
    this.options = { ...before, ...patch };
    this.flip.setHoverPeek(this.options.hoverPeek);
    if (before.lossless !== this.options.lossless) {
      this.renderer.setLossless(this.options.lossless);
      this.plan();
    }
    const needsRebuild =
      before.layout !== this.options.layout ||
      before.coverAlone !== this.options.coverAlone ||
      before.direction !== this.options.direction;
    if (needsRebuild) this.rebuild(this.resolveMode());
  }

  /** Real (non-blank) pages, for the thumbnail grid: label and logical index. */
  pages(): { index: number; label: number }[] {
    return this.book.pages.flatMap((page, index) =>
      page.label === null ? [] : [{ index, label: page.label }],
    );
  }

  /** Small image of a logical page (asks for it if needed). */
  thumbnail(index: number): string | undefined {
    const ref = this.book.pages[index]?.ref;
    if (!ref) return undefined;
    const url = this.renderer.getThumbnail(ref);
    if (!url) this.renderer.requestThumbnail(ref);
    return url;
  }

  /** A single tap in the middle of the book (immersive mode uses it to show its bar). */
  onCenterTap(listener: () => void) {
    return this.flip.onCenterTap(listener);
  }

  /** Notifies when any page image becomes available. */
  onImages(listener: () => void) {
    return this.renderer.subscribe(() => listener());
  }

  /** Page label (1-based) of a physical page index from the file (outline links). */
  labelForPhysical(pageIndex: number): number | undefined {
    return this.book.pages.find((page) => page.ref?.page === pageIndex)?.label ?? undefined;
  }

  /** Visible logical page indices in reading order. */
  visiblePages(): number[] {
    return [...(this.book.spreads[this.flip.spread]?.pages ?? [])];
  }

  stats() {
    return {
      ...this.renderer.stats(),
      mode: this.book.options.mode,
      spreads: this.book.spreads.length,
    };
  }

  destroy() {
    this.config.source.keepDecoded?.([]);
    this.zoomer.destroy();
    this.resizeObserver.disconnect();
    this.disposers.forEach((dispose) => dispose());
    this.flip.destroy();
    this.renderer.destroy();
  }

  // ---- internals -------------------------------------------------------------

  private get direction(): ReadingDirection {
    return this.options.direction ?? this.config.fileDirection ?? 'ltr';
  }

  private sizeOf = (index: number): PageSize => {
    const { source } = this.config;
    return (
      source.knownPageSize(index) ??
      (this.splitSpreads ? source.knownPageSize(1) : source.knownPageSize(0)) ??
      source.getPageSize(index)
    );
  };

  /** Typical single page of this book: drives slot proportions. */
  private referencePage(book: Book): PageSize {
    const page = book.pages.find((p, i) => i > 0 && p.ref && !p.wide) ?? book.pages[0];
    return page?.size ?? { width: 595, height: 842 };
  }

  private resolveMode(): 'single' | 'double' {
    if (this.options.layout !== 'auto') return this.options.layout;
    const probe = buildBook(
      {
        pageCount: this.config.source.pageCount,
        sizeOf: this.sizeOf,
        splitSpreads: this.splitSpreads,
      },
      { mode: 'single', coverAlone: this.options.coverAlone, direction: this.direction },
    );
    if (!this.viewport.width || !this.viewport.height) return 'single';
    return chooseMode(this.viewport, this.referencePage(probe));
  }

  private build(mode: 'single' | 'double'): Book {
    return buildBook(
      {
        pageCount: this.config.source.pageCount,
        sizeOf: this.sizeOf,
        splitSpreads: this.splitSpreads,
        isWide: (index) => this.config.source.isWidePage?.(index) ?? false,
      },
      { mode, coverAlone: this.options.coverAlone, direction: this.direction },
    );
  }

  /** CBZ page sizes arrive as headers are read: re-lay out if double pages appear. */
  private onSizesChanged = () => {
    const { source } = this.config;
    if (!source.isWidePage) return;
    const wide = this.book.pages.filter((page) => page.wide).length;
    let now = 0;
    for (let i = 0; i < source.pageCount; i++) if (source.isWidePage(i)) now++;
    this.updateTallStrips();
    if (now !== wide && !this.flip.isFlipping) this.rebuild(this.book.options.mode);
  };

  /** Webtoon strips (much taller than wide) aren't meant to be flipped. */
  private updateTallStrips() {
    const { source } = this.config;
    let tall = 0;
    let known = 0;
    for (let i = 0; i < Math.min(source.pageCount, 12); i++) {
      const size = source.knownPageSize(i);
      if (!size) continue;
      known++;
      if (size.height > size.width * 3) tall++;
    }
    const tallStrips = known > 0 && tall / known > 0.5;
    if (tallStrips !== this.state.get().tallStrips) this.state.set((s) => ({ ...s, tallStrips }));
  }

  private rebuild(mode: 'single' | 'double') {
    const page = this.state.get().page;
    this.book = this.build(mode);
    const spread = spreadForLabel(this.book, page);
    this.flip.setBook(this.host(), spread);
    this.applySize();
    this.state.set(this.snapshot(spread, false));
    this.plan();
  }

  private host(): FlipHost {
    const book = this.book;
    return {
      spreads: book.spreads,
      mode: book.options.mode,
      direction: book.options.direction,
      isBlank: (page) => !book.pages[page]?.ref,
      isWide: (page) => book.pages[page]?.wide ?? false,
      isFailed: (page) => {
        const ref = book.pages[page]?.ref;
        return ref ? this.renderer.hasFailed(ref) : false;
      },
      imageOf: (page) => {
        const ref = book.pages[page]?.ref;
        return ref ? this.renderer.getImage(ref)?.url : undefined;
      },
      pageLabel: (page) => this.config.pageLabel(book.pages[page]?.label ?? page + 1),
      decorate: (page, node, slot) => this.decorate(page, node, slot),
      ...(this.config.failedText ? { failedText: this.config.failedText } : {}),
    };
  }

  private keepVisibleDecoded(zoomed: boolean) {
    const pages = zoomed ? this.refs(this.flip.spread).map((ref) => ref.page) : [];
    this.config.source.keepDecoded?.([...new Set(pages)]);
  }

  /** Renders the visible part of each zoomed page at screen resolution. */
  private renderTiles() {
    if (!this.zoomer.zoomed) return;
    const stage = this.config.container.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, this.config.budget.maxPixelRatio);
    for (const page of this.visiblePages()) {
      const ref = this.book.pages[page]?.ref;
      const rect = this.flip.pageRect(page);
      if (!ref || !rect || !rect.width || !rect.height) continue;
      const left = Math.max(rect.left, stage.left);
      const top = Math.max(rect.top, stage.top);
      const right = Math.min(rect.right, stage.right);
      const bottom = Math.min(rect.bottom, stage.bottom);
      if (right <= left || bottom <= top) continue;
      const region = {
        x: (left - rect.left) / rect.width,
        y: (top - rect.top) / rect.height,
        width: (right - left) / rect.width,
        height: (bottom - top) / rect.height,
      };
      const tile = {
        width: Math.round((right - left) * ratio),
        height: Math.round((bottom - top) * ratio),
      };
      this.renderer.renderTile(ref, region, tile, (url) => {
        if (this.zoomer.zoomed) this.flip.showTile(page, url, region);
      });
    }
  }

  /**
   * Text layer and links over a resting page. They sit on the area where the
   * image is actually drawn (it's letterboxed when proportions differ).
   */
  private decorate(page: number, node: HTMLElement, slot: PageSize): () => void {
    const { source } = this.config;
    const logical = this.book.pages[page];
    const ref = logical?.ref;
    const controller = new AbortController();
    if (!ref || (!source.renderTextLayer && !source.getLinks)) return () => controller.abort();

    const scale = Math.min(slot.width / logical.size.width, slot.height / logical.size.height);
    const width = logical.size.width * scale;
    const height = logical.size.height * scale;
    const overlay = document.createElement('div');
    overlay.className = 'fx-overlay';
    overlay.style.left = `${(slot.width - width) / 2}px`;
    overlay.style.top = `${(slot.height - height) / 2}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    // Half pages show one side of a wider sheet: lay the whole sheet out and clip.
    const sheet = document.createElement('div');
    sheet.className = 'fx-sheet';
    sheet.style.width = ref.half ? '200%' : '100%';
    sheet.style.left = ref.half === 'right' ? '-100%' : '0';
    overlay.appendChild(sheet);
    node.appendChild(overlay);
    const sheetWidth = ref.half ? width * 2 : width;

    // Wait a beat so a flurry of page turns doesn't parse text for every page.
    const timer = window.setTimeout(() => {
      if (source.renderTextLayer) {
        const text = document.createElement('div');
        text.className = 'fx-text';
        sheet.appendChild(text);
        void source
          .renderTextLayer(ref.page, text, sheetWidth, controller.signal)
          .catch(() => undefined);
      }
      void source.getLinks?.(ref.page).then(
        (links) => {
          if (controller.signal.aborted) return;
          for (const link of links) {
            const anchor = document.createElement('a');
            anchor.className = 'fx-link';
            anchor.style.left = `${link.rect.x * 100}%`;
            anchor.style.top = `${link.rect.y * 100}%`;
            anchor.style.width = `${link.rect.width * 100}%`;
            anchor.style.height = `${link.rect.height * 100}%`;
            if (link.url) {
              anchor.href = link.url;
              anchor.target = '_blank';
              anchor.rel = 'noopener noreferrer';
              anchor.setAttribute('aria-label', link.url);
            } else if (link.pageIndex !== undefined) {
              const label = this.labelForPhysical(link.pageIndex);
              if (label === undefined) continue;
              anchor.href = `#p=${label}`;
              anchor.setAttribute('aria-label', this.config.pageLabel(label));
              anchor.addEventListener('click', (event) => {
                event.preventDefault();
                this.goToPage(label);
              });
            }
            sheet.appendChild(anchor);
          }
        },
        () => undefined,
      );
    }, 120);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }

  private onResize() {
    this.zoomer?.reset();
    const { container } = this.config;
    this.viewport = { width: container.clientWidth, height: container.clientHeight };
    const mode = this.resolveMode();
    if (mode !== this.book.options.mode) this.rebuild(mode);
    else this.applySize();
  }

  /** Fits one page slot (or two side by side) inside the stage. */
  private applySize() {
    const { width, height } = this.viewport;
    if (!width || !height) return;
    const page = this.referencePage(this.book);
    const across = this.book.options.mode === 'double' ? 2 : 1;
    const scale = Math.min(width / (page.width * across), height / page.height);
    const slot = { width: Math.floor(page.width * scale), height: Math.floor(page.height * scale) };
    this.flip.setSize(slot);
    this.renderer.setDisplaySize(slot);
    this.plan();
  }

  private refs(spread: number): PageRef[] {
    const pages = this.book.spreads[spread]?.pages ?? [];
    return pages.map((p) => this.book.pages[p]?.ref).filter((ref): ref is PageRef => !!ref);
  }

  /**
   * Re-plans rendering around the current spread: sharp for this spread, the
   * next two and the previous one; previews for about six pages each way.
   *
   * With turns queued (quick presses), the plan moves on to the spread the
   * next turn reveals and heads toward where the turns end: the spread on
   * screen now is about to be covered, and the queue only gets a moment
   * between turns.
   */
  private plan() {
    const s = this.flip.spread;
    if (this.zoomer?.zoomed) {
      this.renderer.focus({ visible: this.refs(s), ahead: [], behind: [], nearby: [] });
      this.queueRefresh();
      return;
    }
    const target = this.flip.target;
    const step = target < s ? -1 : 1;
    const focus = target === s ? s : s + step;
    // The destination comes first when it lies beyond the usual reach.
    const far = Math.abs(target - focus) > 2 ? this.refs(target) : [];
    const ahead = [...far, ...this.refs(focus + step), ...this.refs(focus + 2 * step)];
    const behind = this.refs(focus - step);
    this.renderer.focus({
      visible: this.refs(focus),
      ahead,
      behind,
      nearby: [
        ...this.previewRefs(focus + 3 * step, step, PREVIEW_PAGES - ahead.length),
        ...this.previewRefs(focus - 2 * step, -step as 1 | -1, PREVIEW_PAGES - behind.length),
      ],
    });
    this.queueRefresh();
  }

  /** Up to `count` refs from spread `start` outward, in `step` direction. */
  private previewRefs(start: number, step: 1 | -1, count: number): PageRef[] {
    const refs: PageRef[] = [];
    for (let s = start; refs.length < count && s >= 0 && s < this.book.spreads.length; s += step)
      refs.push(...this.refs(s));
    return refs;
  }

  private queueRefresh() {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    requestAnimationFrame(() => {
      this.refreshQueued = false;
      this.flip.refreshImages();
    });
  }

  private snapshot(spread: number, flipping: boolean): ReaderState {
    const book = this.book;
    const firstPage = (book.spreads[spread]?.pages ?? [])
      .map((p) => book.pages[p]?.label)
      .find((label): label is number => typeof label === 'number');
    return {
      spread,
      spreadCount: book.spreads.length,
      label: spreadLabel(book, spread),
      page: firstPage ?? 1,
      total: pageTotal(book),
      mode: book.options.mode,
      direction: book.options.direction,
      flipping,
      atStart: spread === 0,
      atEnd: spread === book.spreads.length - 1,
      splitSpreads: this.splitSpreads,
      zoom: this.zoomer?.scale ?? 1,
      tallStrips: this.state?.get().tallStrips ?? false,
    };
  }
}
