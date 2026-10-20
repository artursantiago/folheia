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

export type LayoutPreference = 'auto' | 'single' | 'double';

export interface ReaderOptions {
  layout: LayoutPreference;
  coverAlone: boolean;
  /** Explicit reading direction; undefined follows the file's own hint. */
  direction: ReadingDirection | undefined;
  hoverPeek: boolean;
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
  private disposers: (() => void)[] = [];
  private refreshQueued = false;

  constructor(private readonly config: ReaderConfig) {
    const { source, container, budget } = config;
    this.options = config.options;
    this.splitSpreads =
      source.kind === 'pdf' &&
      detectEmbeddedSpreads((i) => source.knownPageSize(i), source.pageCount);
    this.renderer = new PageRenderer(source, budget);
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
        this.state.set(this.snapshot(spread, this.flip.isFlipping));
        this.plan();
      }),
      this.flip.onFlipStateChange((flipping) => {
        if (flipping) this.renderer.pause();
        else this.renderer.resume();
        this.state.set((s) => ({ ...s, flipping }));
      }),
    );

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

  setOptions(patch: Partial<ReaderOptions>) {
    const before = this.options;
    this.options = { ...before, ...patch };
    this.flip.setHoverPeek(this.options.hoverPeek);
    const needsRebuild =
      before.layout !== this.options.layout ||
      before.coverAlone !== this.options.coverAlone ||
      before.direction !== this.options.direction;
    if (needsRebuild) this.rebuild(this.resolveMode());
  }

  destroy() {
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
      },
      { mode, coverAlone: this.options.coverAlone, direction: this.direction },
    );
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
      imageOf: (page) => {
        const ref = book.pages[page]?.ref;
        return ref ? this.renderer.getImage(ref)?.url : undefined;
      },
      pageLabel: (page) => this.config.pageLabel(book.pages[page]?.label ?? page + 1),
    };
  }

  private onResize() {
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

  /** Re-plans rendering around the current spread. */
  private plan() {
    const s = this.flip.spread;
    this.renderer.focus({
      visible: this.refs(s),
      ahead: this.refs(s + 1),
      behind: this.refs(s - 1),
      nearby: [...this.refs(s + 2), ...this.refs(s - 2), ...this.refs(s + 3)],
    });
    this.queueRefresh();
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
    };
  }
}
