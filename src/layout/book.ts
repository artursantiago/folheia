import type { PageRef } from '../render/PageRenderer';
import type { PageSize, ReadingDirection } from '../sources/types';

/** A page as the reader sees it: a physical page, half of one, or a filler blank. */
export interface LogicalPage {
  /** null for a virtual blank inserted to keep spreads aligned. */
  ref: PageRef | null;
  size: PageSize;
  /** A double-page image (CBZ) that must fill a whole spread on its own. */
  wide: boolean;
  /** 1-based number shown to the reader; null for blanks. */
  label: number | null;
}

/** What is on screen at once, in reading order (first = read first). */
export interface Spread {
  pages: number[];
}

export type LayoutMode = 'single' | 'double';

export interface LayoutOptions {
  mode: LayoutMode;
  /** Show the first page alone, like a closed book's cover. */
  coverAlone: boolean;
  direction: ReadingDirection;
}

export interface BookInput {
  pageCount: number;
  sizeOf: (index: number) => PageSize;
  /** PDF sheets holding two printed pages side by side: split each in halves. */
  splitSpreads?: boolean;
  /** Pages known to be double-page images that should stay whole (CBZ). */
  isWide?: (index: number) => boolean;
}

export interface Book {
  pages: LogicalPage[];
  spreads: Spread[];
  /** Logical page index → spread index. */
  spreadOf: number[];
  options: LayoutOptions;
}

/** Expands physical pages into logical ones (splitting embedded spreads). */
export function logicalPages(input: BookInput, direction: ReadingDirection): LogicalPage[] {
  const pages: LogicalPage[] = [];
  const last = input.pageCount - 1;
  for (let page = 0; page < input.pageCount; page++) {
    const size = input.sizeOf(page);
    const split = input.splitSpreads && page > 0 && (page < last || size.width > size.height);
    if (split) {
      const half = { width: size.width / 2, height: size.height };
      // In right-to-left books the right half is read first.
      const order: ('left' | 'right')[] =
        direction === 'rtl' ? ['right', 'left'] : ['left', 'right'];
      for (const side of order)
        pages.push({ ref: { page, half: side }, size: half, wide: false, label: 0 });
    } else {
      pages.push({ ref: { page }, size, wide: input.isWide?.(page) ?? false, label: 0 });
    }
  }
  pages.forEach((page, i) => (page.label = i + 1));
  return pages;
}

/** Groups logical pages into what's shown at once. May insert virtual blanks. */
export function buildBook(input: BookInput, options: LayoutOptions): Book {
  const source = logicalPages(input, options.direction);
  const pages: LogicalPage[] = [];
  const spreads: Spread[] = [];

  if (options.mode === 'single') {
    source.forEach((page, i) => {
      pages.push(page);
      spreads.push({ pages: [i] });
    });
  } else {
    let pending: number | null = null;
    const flush = () => {
      if (pending !== null) spreads.push({ pages: [pending] });
      pending = null;
    };
    const blankLike = (page: LogicalPage): LogicalPage => ({
      ref: null,
      size: page.size,
      wide: false,
      label: null,
    });

    source.forEach((page, i) => {
      const index = pages.length;
      if (i === 0 && options.coverAlone) {
        pages.push(page);
        spreads.push({ pages: [index] });
        return;
      }
      if (page.wide) {
        if (pending !== null) {
          // A double image must start on the left: pad the half-filled spread.
          const blank = pages.length;
          pages.push(blankLike(pages[pending] ?? page));
          spreads.push({ pages: [pending, blank] });
          pending = null;
        }
        pages.push(page);
        spreads.push({ pages: [pages.length - 1] });
        return;
      }
      pages.push(page);
      if (pending === null) {
        pending = index;
      } else {
        spreads.push({ pages: [pending, index] });
        pending = null;
      }
    });
    flush();
  }

  const spreadOf = new Array<number>(pages.length).fill(0);
  spreads.forEach((spread, s) => spread.pages.forEach((p) => (spreadOf[p] = s)));
  return { pages, spreads, spreadOf, options };
}

/** Visible page labels for the counter: "12–13", "1", or "" for blanks only. */
export function spreadLabel(book: Book, spreadIndex: number): string {
  const labels = (book.spreads[spreadIndex]?.pages ?? [])
    .map((p) => book.pages[p]?.label)
    .filter((label): label is number => label !== null && label !== undefined);
  if (labels.length === 0) return '';
  const first = Math.min(...labels);
  const last = Math.max(...labels);
  return first === last ? `${first}` : `${first}–${last}`;
}

/** Spread to show for a 1-based page label (deep links, "go to page"). */
export function spreadForLabel(book: Book, label: number): number {
  const index = book.pages.findIndex((page) => page.label !== null && page.label >= label);
  return index === -1 ? book.spreads.length - 1 : (book.spreadOf[index] ?? 0);
}

/** Total of real (non-blank) pages, for "/ 51". */
export function pageTotal(book: Book): number {
  return book.pages.reduce((n, page) => (page.label === null ? n : n + 1), 0);
}

/**
 * Picks single or double pages for a viewport: two pages side by side only
 * when they'd still use most of the available height and stay readable.
 */
export function chooseMode(viewport: PageSize, page: PageSize, minPageWidth = 240): LayoutMode {
  const pageRatio = page.width / page.height;
  const viewRatio = viewport.width / viewport.height;
  const fitsTwo = 2 * pageRatio <= viewRatio * 1.15;
  const doubleHeight = Math.min(viewport.height, viewport.width / (2 * pageRatio));
  return fitsTwo && doubleHeight * pageRatio >= minPageWidth ? 'double' : 'single';
}

/**
 * Detects PDFs whose sheets each hold two printed pages: the inner sheets are
 * much wider than the cover. Only measured sizes are trusted.
 */
export function detectEmbeddedSpreads(
  known: (index: number) => PageSize | undefined,
  pageCount: number,
): boolean {
  const cover = known(0);
  if (!cover || pageCount < 3) return false;
  const coverRatio = cover.width / cover.height;
  if (coverRatio > 1) return false;
  const inner = [known(1), known(2)].filter((size): size is PageSize => size !== undefined);
  return inner.length > 0 && inner.every((size) => size.width / size.height >= coverRatio * 1.5);
}
