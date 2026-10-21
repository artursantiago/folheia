import type { PageSize } from '../sources/types';
import {
  buildBook,
  chooseMode,
  detectEmbeddedSpreads,
  pageTotal,
  spreadForLabel,
  spreadLabel,
} from './book';

const portrait = { width: 600, height: 800 };
const wide = { width: 1200, height: 800 };
const ltrDouble = { mode: 'double', coverAlone: true, direction: 'ltr' } as const;

function input(count: number, sizeOf: (index: number) => PageSize = () => portrait) {
  return { pageCount: count, sizeOf };
}

describe('buildBook', () => {
  it('shows the cover alone, then pairs, with the last page alone if odd', () => {
    const book = buildBook(input(6), ltrDouble);
    expect(book.spreads.map((s) => s.pages)).toEqual([[0], [1, 2], [3, 4], [5]]);
    expect(spreadLabel(book, 1)).toBe('2–3');
    expect(pageTotal(book)).toBe(6);
  });

  it('pairs from the first page when the cover option is off', () => {
    const book = buildBook(input(4), { ...ltrDouble, coverAlone: false });
    expect(book.spreads.map((s) => s.pages)).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it('single mode shows one page at a time', () => {
    const book = buildBook(input(3), { ...ltrDouble, mode: 'single' });
    expect(book.spreads).toHaveLength(3);
  });

  it('splits embedded spreads into halves, read right-first in RTL', () => {
    const sizes = [portrait, wide, wide, portrait];
    const ltr = buildBook({ ...input(4, (i) => sizes[i]!), splitSpreads: true }, ltrDouble);
    expect(ltr.pages.map((p) => p.ref)).toEqual([
      { page: 0 },
      { page: 1, half: 'left' },
      { page: 1, half: 'right' },
      { page: 2, half: 'left' },
      { page: 2, half: 'right' },
      { page: 3 },
    ]);
    expect(ltr.pages[1]?.size).toEqual(portrait);
    const rtl = buildBook(
      { ...input(4, (i) => sizes[i]!), splitSpreads: true },
      { ...ltrDouble, direction: 'rtl' },
    );
    expect(rtl.pages[1]?.ref).toEqual({ page: 1, half: 'right' });
  });

  it('gives double-page images a spread of their own, padding with a blank to stay aligned', () => {
    // cover, p1, [wide p2], p3, p4
    const book = buildBook({ ...input(5), isWide: (i) => i === 2 }, ltrDouble);
    expect(book.spreads.map((s) => s.pages)).toEqual([[0], [1, 2], [3], [4, 5]]);
    expect(book.pages[2]?.ref).toBeNull();
    expect(book.pages[3]?.wide).toBe(true);
    expect(spreadLabel(book, 1)).toBe('2');
    expect(pageTotal(book)).toBe(5);
  });

  it('maps page labels to spreads', () => {
    const book = buildBook(input(10), ltrDouble);
    expect(spreadForLabel(book, 1)).toBe(0);
    expect(spreadForLabel(book, 3)).toBe(1);
    expect(spreadForLabel(book, 99)).toBe(book.spreads.length - 1);
  });
});

describe('pairing by proportion (L4)', () => {
  const pairs = (book: ReturnType<typeof buildBook>) =>
    book.spreads.map((spread) => spread.pages.map((p) => book.pages[p]?.label ?? '_').join('+'));

  it('leaves a fold-out alone and pairs again after it', () => {
    const fold = { width: 1800, height: 800 };
    const book = buildBook(
      input(7, (i) => (i === 3 ? fold : portrait)),
      ltrDouble,
    );
    expect(pairs(book)).toEqual(['1', '2+3', '4+_', '5+6', '7']);
  });

  it('leaves a narrow insert alone', () => {
    const insert = { width: 300, height: 800 };
    const book = buildBook(
      input(6, (i) => (i === 2 ? insert : portrait)),
      ltrDouble,
    );
    expect(pairs(book)).toEqual(['1', '2+_', '3+_', '4+5', '6']);
  });

  it('still pairs the small variations of scanned PDFs', () => {
    const book = buildBook(
      input(5, (i) => (i % 2 ? { width: 612, height: 792 } : { width: 590, height: 800 })),
      ltrDouble,
    );
    expect(pairs(book)).toEqual(['1', '2+3', '4+5']);
  });

  it('never unpairs on guessed sizes', () => {
    const book = buildBook(
      { ...input(5, (i) => (i === 2 ? wide : portrait)), measured: (i) => i !== 2 },
      ltrDouble,
    );
    expect(pairs(book)).toEqual(['1', '2+3', '4+5']);
  });
});

describe('chooseMode', () => {
  const a4 = { width: 595, height: 842 };
  it('uses double pages on a landscape iPad and single on a portrait one', () => {
    expect(chooseMode({ width: 1180, height: 820 }, a4)).toBe('double');
    expect(chooseMode({ width: 820, height: 1180 }, a4)).toBe('single');
  });

  it('keeps landscape documents (slides) on single pages even on wide screens', () => {
    expect(chooseMode({ width: 1440, height: 900 }, { width: 1600, height: 900 })).toBe('single');
  });

  it('uses double pages on a desktop with a portrait book', () => {
    expect(chooseMode({ width: 1440, height: 900 }, a4)).toBe('double');
  });
});

describe('detectEmbeddedSpreads', () => {
  it('detects wide inner sheets after a portrait cover', () => {
    const sizes = [portrait, wide, wide];
    expect(detectEmbeddedSpreads((i) => sizes[i], 10)).toBe(true);
  });

  it('ignores ordinary books and landscape documents', () => {
    expect(detectEmbeddedSpreads(() => portrait, 10)).toBe(false);
    expect(detectEmbeddedSpreads(() => wide, 10)).toBe(false);
    expect(detectEmbeddedSpreads(() => undefined, 10)).toBe(false);
  });
});
